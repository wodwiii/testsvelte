import { createCheckout, recentCheckoutUID, verifyCheckoutUID } from '$lib/payment/checkout';
import { saveToFirebase } from '$lib/payment/storeToFirebase';
import { json } from '@sveltejs/kit';
import { auth } from '$lib/firebase/firebaseAdmin.js';
import { getUserByUID } from '$lib/helper/getByUID';

const allowed_checkout_plans = ['P1', 'P3', 'P12', 'L1', 'L3', 'L12'];
export const dynamic = 'force-dynamic';
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
        const { user, error } = await getUserByUID(uid);
        if (error) {
            return json({ error }, { status: 400 });
        }

        // added 09/09/2024: check if uid has pending checkout. if so, return that checkout url
        // check also if user is already verified, if verified, return verified: true
        // added price update reference timestamp and get only same plan checkout
        try {
            const recentCheckoutSession = await recentCheckoutUID(plan, uid);
            if(recentCheckoutSession?.checkout_url) {
                return json({ url: recentCheckoutSession.checkout_url }, { status: 200 });
            }
            else if(recentCheckoutSession?.verified){
                return json({ verified: true }, { status: 200 });
            }
        } catch (error) {
            console.error('Error verifying UID:', error);
        }
        //this is the snippet in the current to trigger verify if uid has been paid if user left payment page
        // try {
        //     // manual trigger verify if uid has been paid if user left payment page
        //     await verifyCheckoutUID(uid);
        // } catch (e) {
        //     console.error('Error verifying UID:', e);
        // }

        // If user has no pending checkout session or not verified, ceate a new checkout session
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
