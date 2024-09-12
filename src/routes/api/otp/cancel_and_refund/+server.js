import { db } from "$lib/firebase/firebaseAdmin";
import { cancelAndRefundTransaction } from "$lib/payment/cancelAndRefund";
import { json } from "@sveltejs/kit";

export async function POST({ request }) {
    try {
        const { uid } = await request.json();

        if (!uid) {
            return json({ error: 'Missing uid' }, { status: 400 });
        }
        const cancelAndRefundResult = await cancelAndRefundTransaction(uid);
        cancelAndRefundResult.updated = new Date().toLocaleString('en-US', { timeZone: 'Asia/Singapore' });
        cancelAndRefundResult.epoch = new Date().getTime();
        cancelAndRefundResult.uid = uid;
        await saveToFirebase(cancelAndRefundResult);
        return json({ message: 'Transaction cancelled and refunded successfully' }, { status: 200 });

    } catch (error) {
        console.error('Error cancelling and refunding:', error);
        return json({ error: error.message }, { status: 500 });
    }
}

async function saveToFirebase(cancelAndRefundResult) {
    try {
        const reference_number = cancelAndRefundResult.reference_number;
        const uid = cancelAndRefundResult.uid;
        const ref = db.ref(`/refund/1_one_time_refund/`);
        const snapshot = await ref.child(uid).child(reference_number).once('value');
        if (!snapshot.exists()) {
            await ref.child(uid).child(reference_number).set(cancelAndRefundResult);
        }
    } catch (error) {
        console.error('Error saving to Firebase:', error);
    }

}
