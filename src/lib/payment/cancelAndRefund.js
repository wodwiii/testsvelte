import { db } from "$lib/firebase/firebaseAdmin";

export async function cancelAndRefundTransaction(uid) {
    try {
        const ref = db.ref(`/payment/3_verified`);
        const snapshot = await ref.once('value');
        let mostRecentTransaction;
        let mostRecentTimestamp = 0;

        // Loop through all transactions and get the most recent one
        snapshot.forEach(childSnapshot => {
            if(childSnapshot.val().refunded) return;
            const reference_number = childSnapshot.key;
            const uidFromPath = reference_number.split('-').pop();

            if (uidFromPath === uid) {
                const timestamp = parseInt(reference_number.split('_')[0]);
                if (timestamp > mostRecentTimestamp) {
                    mostRecentTimestamp = timestamp;
                    mostRecentTransaction = childSnapshot.val();
                }
            }
        });

        // Check if a most recent transaction was found and if yes, proceed with cancellation and refund
        if (mostRecentTransaction) {
            // Get the paymentID, amount and reference_number of the most recent transaction
            const paymentID = mostRecentTransaction?.data?.attributes?.payments?.[0]?.id;
            const amount = mostRecentTransaction?.data?.attributes?.payments?.[0]?.attributes?.amount;
            const reference_number = mostRecentTransaction?.data?.attributes?.reference_number;

            // Add detailed logging
            console.log('paymentID:', paymentID);
            console.log('amount:', amount);
            console.log('reference_number:', reference_number);

            if (!paymentID || !amount || !reference_number) {
                throw new Error('Required transaction fields are missing.');
            }

            // Make the cancellation and refund request to PayMongo API
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
                            amount, // Currently using the captured amount and not the full amount
                            notes: `Refund for transaction ${reference_number}`,
                            payment_id: paymentID,
                            reason: 'requested_by_customer'
                        }
                    }
                })
            };

            // Send the refund request to Paymongo API
            const response = await fetch('https://api.paymongo.com/refunds', options);
            const data = await response.json();

            // Check for any errors or success in the response
            if (response.ok) {
                // Update the transaction status in Firebase set refunded to true
                await updateFirebase(reference_number);
                data.reference_number = reference_number;
                console.log('Refund successful:', data);
                return data;
            } else {
                console.error('Refund failed:', data);
                throw new Error(data.errors ? data.errors[0].detail : 'Unknown error');
            }
        } else {
            console.log(`No recent transactions found for UID ${uid}`);
            throw new Error('No recent transactions found');
        }
    } catch (error) {
        console.error('Error in cancelAndRefundTransaction:', error);
        throw error;
    }
}

async function updateFirebase(reference_number) {
    const ref = db.ref(`/payment/3_verified`);
    const snapshot = ref.child(reference_number);
    return snapshot.update({
        refunded: true
    });
}
