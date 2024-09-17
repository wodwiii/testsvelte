import { db } from '$lib/firebase/firebaseAdmin';
import { verifyCheckoutId } from '$lib/payment/checkout.js';
import { json } from '@sveltejs/kit';

export const dynamic = 'force-dynamic';

export async function POST({request}){
    try {
        const {reference_number, checkoutId, transaction_type} = await request.json();
        console.log('Reference Number:' + reference_number + '| checkoutID:' + checkoutId + '| transaction_type:' + transaction_type);
        if(transaction_type === 'checkout_session.payment.paid'){
            //check first in the checkout_uid if this is an upgraded transaction
            const uid = reference_number.split('-').pop();
            const ref = await db.ref(`/payment/2_checkout_uid`);
            const snapshot = await ref.child(uid).child(reference_number).once('value');
            const payload = snapshot.val();
            const upgradeFrom = payload.upgradeFrom ? payload.upgradeFrom : null;
            console.log('upgradeFrom:' + upgradeFrom);
            await verifyCheckoutId(checkoutId, reference_number, upgradeFrom);
        }
        else if(transaction_type === 'subscription.invoice.paid'){
        }
        console.log('Verified payload successfully');
        return json({ message: 'Verified payload successfully' }, { status: 200 });
    } catch (error) {
        console.error('Error verifying payload:', error);
        return json({ error: 'Error verifying payload' }, { status: 500 });
    }
}