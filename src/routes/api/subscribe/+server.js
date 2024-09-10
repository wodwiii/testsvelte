import { storeToFirebase } from '$lib/payment-recurring/storeToFirebase';
import { createSubscription } from '$lib/payment-recurring/subscribe';
import { json } from '@sveltejs/kit';
import { auth } from 'firebase-admin';


export async function GET({ url }) {
    try {
        const validPlanCodes = ['LITE', 'PRO'];
        const uid = url.searchParams.get('uid');
        const customer_id = url.searchParams.get('customer_id');
        const plan_code = url.searchParams.get('plan_code');
        //check if required parameters are present
        if(!uid || !customer_id || !plan_code) {
            return json({ error: 'Missing required parameters' }, { status: 400 });
        }
        //check if valid plan code
        if (!validPlanCodes.includes(plan_code)) {
            return json({ error: 'Invalid plan code' }, { status: 400 });
        }

        let user;
        try {
            user = await auth().getUser(uid);
        } catch (error) {
            console.error('Invalid UID:', error);
            return json({ error: 'Invalid UID' }, { status: 400 });
        }

        const subscribeResult = await createSubscription(customer_id, plan_code);
        subscribeResult.uid = uid;
        await storeToFirebase('subscription', subscribeResult);
        return json({ payment_intent_id: subscribeResult.data.attributes.latest_invoice.payment_intent.id }, { status: 200 });
    } catch (error) {
        const err = 'Error processing webhook: ' + error.message;
        console.error(err);
        return json({ error: err }, { status: 500 });
    }
}