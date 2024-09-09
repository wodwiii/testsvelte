import { createCheckout, recentCheckoutUID, verifyCheckoutUID } from '$lib/payment/checkout';
import { saveToFirebase } from '$lib/payment/storeToFirebase';
import { json } from '@sveltejs/kit';
import { auth } from 'firebase-admin';

const allowed_checkout_plans = ['P1', 'P3', 'P12', 'L1', 'L3', 'L12'];

export async function GET({ url }) {
    try {
        // Extract 'uid' and 'plan' from query parameters
        const uid = url.searchParams.get('uid');
        const plan = url.searchParams.get('plan') || 'P1';  // Default to 'P1' if no plan is provided

        if (!uid) {
            return json({ error: 'Missing UID' }, { status: 400 });
        }

        if (!allowed_checkout_plans.includes(plan)) {
            return json({ error: 'Invalid plan' }, { status: 400 });
        }

        // Fetch user data from Firebase Auth using the UID
        let user;
        try {
            user = await auth().getUser(uid);
        } catch (error) {
            console.error('Invalid UID:', error);
            return json({ error: 'Invalid UID' }, { status: 400 });
        }

        // Manually verify if the user has an unpaid checkout session
        try {
            const recentCheckoutSession = await recentCheckoutUID(uid);
            if(recentCheckoutSession?.checkout_url) {
                return json({ url: recentCheckoutSession }, { status: 200 });
            }
            else if(recentCheckoutSession?.verified){
                return json({ verified: true }, { status: 200 });
            }
        } catch (error) {
            console.error('Error verifying UID:', error);
        }

        // Create a new checkout session
        const checkoutResult = await createCheckout(uid, user, plan);
        checkoutResult.uid = uid;

        // Save the checkout session to Firebase
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
        console.error('Error processing checkout:', error);
        return json({ error: 'Error processing checkout: ' + error.message }, { status: 500 });
    }
}
