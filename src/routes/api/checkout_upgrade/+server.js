import { db } from '$lib/firebase/firebaseAdmin';
import {  verifyCheckoutUID } from '$lib/payment/checkout';
import { createCheckoutUpgrade } from '$lib/payment/checkoutUpgrade';
import { saveToFirebase } from '$lib/payment/storeToFirebase';
import { json } from '@sveltejs/kit';
import { auth } from 'firebase-admin';

// Define allowed upgrade plans (Pro and Lite with different durations)
const allowed_upgrade_plans = ['P1', 'P3', 'P12', 'L1', 'L3', 'L12'];
const is_dev = `${import.meta.env.VITE_IS_DEV}`;

export async function GET({ url }) {
    try {
        // Extract 'uid' and 'plan' from query parameters
        const uid = url.searchParams.get('uid');
        const newPlan = url.searchParams.get('plan');  // Plan is required for upgrades

        if (!uid) {
            return json({ error: 'Missing UID' }, { status: 400 });
        }

        if (!newPlan || !allowed_upgrade_plans.includes(newPlan)) {
            return json({ error: 'Invalid or missing plan' }, { status: 400 });
        }

        let user;
        try {
            user = await auth().getUser(uid);
        } catch (error) {
            console.error('Invalid UID:', error);
            return json({ error: 'Invalid UID' }, { status: 400 });
        }

        // // Manually verify if the user has any existing unpaid or pending checkout session
        // try {
        //     await verifyCheckoutUID(uid);
        // } catch (error) {
        //     console.error('Error verifying UID:', error);
        // }


        // Create a new checkout session for the upgraded plan
        const checkoutResult = await createCheckoutUpgrade(uid, user, newPlan);
        checkoutResult.uid = uid;
        // Save the upgraded checkout session to Firebase
        await saveToFirebase('checkout', checkoutResult);

        // Retrieve the checkout URL from the response
        const checkout_url = checkoutResult.data.attributes.checkout_url;
        const responsePayload = {
            url: checkout_url,
            ...checkoutResult.data
        };

        // Return the checkout URL or the full response payload in development
        return json(process.env.FUNCTIONS_EMULATOR ? responsePayload : { url: checkout_url });
    } catch (error) {
        console.error('Error processing upgrade checkout:', error);
        return json({ error: 'Error processing upgrade checkout: ' + error.message }, { status: 500 });
    }
}
