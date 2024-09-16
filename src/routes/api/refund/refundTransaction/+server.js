import { db } from "$lib/firebase/firebaseAdmin";
import { updateVerifiedList } from "$lib/payment/updateVerifiedList";
import { json } from "@sveltejs/kit";

export async function POST({ request }) {
    try {
        const { uid, payment_id, reference_number, amount, reason, transaction_type } = await request.json();
        if(!uid || !payment_id || !reference_number || !amount || !reason || !transaction_type ) {
            return json({ error: 'Missing uid, payment_id, reference_number, amount, reason, or transaction_type' }, { status: 400 });
        }
        const response = await handleRefund(uid, payment_id, reference_number, amount, reason, transaction_type);
        return json({ message: 'Transaction cancelled and refunded successfully' }, { status: 200 });
    }
    catch (error) {
        console.error('Error cancelling and refunding:', error);
        return json({ error: error.message }, { status: 500 });
    }
}
async function handleRefund(uid, payment_id, reference_number, amount, reason, transaction_type) {
    const options = {
        method: 'POST',
        headers: {
            accept: 'application/json',
            'Content-Type': 'application/json',
            authorization: `${import.meta.env.VITE_PAYMONGO_KEY2}`
        },
        body: JSON.stringify({
            data: {
                attributes: {
                    amount: amount * 100, // Currently using the captured amount and not the full amount
                    notes: `Refund for transaction ${reference_number}`,
                    payment_id,
                    reason
                }
            }
        })
    };
    // Send the refund request to Paymongo API
    const response = await fetch('https://api.paymongo.com/refunds', options);
    const data = await response.json();

    // Check for any errors or success in the response
    if (response.ok) {
        // Update the transaction status in Firebase to set refunded to true
        await updateFirebase(reference_number , transaction_type);
        data.updated = new Date().toLocaleString('en-US', { timeZone: 'Asia/Singapore' });
        data.epoch = new Date().getTime();
        data.uid = uid;
        data.reference_number = reference_number;
        await saveToFirebase(data, transaction_type);
        await updateVerifiedList();
        console.log('Refund successful:', data);
        return data;
    } else {
        console.error('Refund failed:', data);
        throw new Error(data.errors ? data.errors[0].detail : 'Unknown error');
    }
}

async function updateFirebase(reference_number , transaction_type) {
    if(transaction_type ==='recurring'){
        const ref = db.ref(`/payment/6_invoice`);
        const snapshot = await ref.child(reference_number);
        return snapshot.update({
            refunded: true
        });
    } else if(transaction_type === 'onetimesub'){
        const ref = db.ref(`/payment/3_verified`);
        const snapshot = ref.child(reference_number);
        return snapshot.update({
            refunded: true
        });
    }

}

async function saveToFirebase(data , transaction_type) {
    try {
        const reference_number = data.reference_number;
        const uid = data.uid;
        if(transaction_type ==='recurring'){
            const ref = db.ref(`/refund/2_subscription_refund/`);
            const snapshot = await ref.child(uid).child(reference_number).once('value');
            if (!snapshot.exists()) {
                await ref.child(uid).child(reference_number).set(data);
            }
        } else if(transaction_type === 'onetimesub'){
            const ref = db.ref(`/refund/1_one_time_refund/`);
            const snapshot = await ref.child(uid).child(reference_number).once('value');
            if (!snapshot.exists()) {
                await ref.child(uid).child(reference_number).set(data);
            }
        }
    } catch (error) {
        console.error('Error saving to Firebase:', error);
    }

}

