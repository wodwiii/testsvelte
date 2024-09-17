import { db } from "$lib/firebase/firebaseAdmin";

export async function refundSubscription(uid) {
    try {
        // Reference to the path containing all invoices
        const ref = db.ref(`/payment/6_invoice`);
        const snapshot = await ref.once('value');

        let mostRecentReferenceNumber = '';
        let mostRecentTimestamp = 0;

        // Find the most recent reference number
        snapshot.forEach(childSnapshot => {
            const reference_number = childSnapshot.key;
            const uidFromPath = reference_number.split('-')[1];

            // Check if the UID matches and update the most recent reference number
            if (uidFromPath === uid) {
                const timestamp = parseInt(reference_number.split('_')[0]);
                if (timestamp > mostRecentTimestamp) {
                    mostRecentTimestamp = timestamp;
                    mostRecentReferenceNumber = reference_number;
                }
            }
        });

        // If no reference number found, throw an error
        if (!mostRecentReferenceNumber) {
            throw new Error('No recent transactions found for UID ' + uid);
        }

        // Reference to the invoices of the most recent reference number
        const recentRef = db.ref(`/payment/6_invoice/${mostRecentReferenceNumber}`);
        const recentSnapshot = await recentRef.once('value');

        let latestInvoice = null;
        let latestInvoiceTimestamp = 0;

        // Find the most recent invoice
        recentSnapshot.forEach(invoiceSnapshot => {
            const invoiceTimestamp = parseInt(invoiceSnapshot.key.split('_')[0]);
            if (invoiceTimestamp > latestInvoiceTimestamp) {
                latestInvoiceTimestamp = invoiceTimestamp;
                latestInvoice = invoiceSnapshot.val();
            }
        });

        // If no invoice found, throw an error
        if (!latestInvoice) {
            throw new Error('No recent invoice found for reference number ' + mostRecentReferenceNumber);
        }
        // Check if a most recent transaction was found and if yes, proceed with cancellation and refund
        if (latestInvoice) {
            // Get the paymentID, amount and reference_number of the most recent transaction
            const paymentIntentID = latestInvoice?.data?.attributes?.payment_intent?.id;
            const paymentID = await getPaymentID(paymentIntentID);
            console.log('latestInvoice:', latestInvoice);
            const amount = latestInvoice?.data?.attributes?.amount;
            const reference_number = mostRecentReferenceNumber;

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
    const ref = db.ref(`/payment/6_invoice`);
    const snapshot = ref.child(reference_number);
    return snapshot.update({
        refunded: true
    });
}

async function getPaymentID(paymentIntentID) {
    const options = {
        method: 'GET',
        headers: {
            accept: 'application/json',
            'Content-Type': 'application/json',
            authorization: `${import.meta.env.VITE_PAYMONGO_KEY2}`
        }
    };
    const response = await fetch(`https://api.paymongo.com/v1/payment_intents/${paymentIntentID}`, options);
    const data = await response.json();
    const paymentID = data.data.attributes.payments[0].id;
    console.log("🚀 ~ getPaymentID ~ paymentID:", paymentID)
    return paymentID;
}