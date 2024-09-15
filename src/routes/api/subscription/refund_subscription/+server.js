import { db } from '$lib/firebase/firebaseAdmin';
import { getUserByUID } from '$lib/helper/getByUID';
import { refundSubscription } from '$lib/payment-recurring/refundSubscription';
import { updateVerifiedList } from '$lib/payment/updateVerifiedList';
import { json } from '@sveltejs/kit';

export async function POST({ request }) {
  try {
    const { uid } = await request.json();
    if (!uid) {
      return json({ error: 'Missing uid' }, { status: 400 });
    }
    const { user, error } = await getUserByUID(uid);
    if (error) {
        return json({ error }, { status: 400 });
    }
    const refundResult = await refundSubscription(uid);
    refundResult.updated = new Date().toLocaleString('en-US', { timeZone: 'Asia/Singapore' });
    refundResult.epoch = new Date().getTime();
    refundResult.uid = uid;
    await saveToFirebase(refundResult);
    await updateVerifiedList();
    return json({ message: 'Subscription refunded successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error refunding:', error);
    return json({ error: error.message }, { status: 500 });
  }
}

async function saveToFirebase(cancelAndRefundResult) {
    try {
        const reference_number = cancelAndRefundResult.reference_number;
        const uid = cancelAndRefundResult.uid;
        const ref = db.ref(`/refund/2_subscription_refund/`);
        const snapshot = await ref.child(uid).child(reference_number).once('value');
        if (!snapshot.exists()) {
            await ref.child(uid).child(reference_number).set(cancelAndRefundResult);
        }
    } catch (error) {
        console.error('Error saving to Firebase:', error);
    }

}