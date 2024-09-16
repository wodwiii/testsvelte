import { db } from "$lib/firebase/firebaseAdmin";
import { getUserByUID } from "$lib/helper/getByUID";
import { json } from "@sveltejs/kit";

export async function GET({ url }) {
    try {
        const uid = url.searchParams.get('uid');
        if (!uid) {
            return json({ error: 'Missing uid' }, { status: 400 });
        }
        const { user, error } = await getUserByUID(uid);
        if (error) {
            return json({ error }, { status: 400 });
        }
        const { subscription, transactionType } = await searchUID(uid);
        if (!subscription) {
            return json({ error: 'No transaction found' }, { status: 400 });
        }
        return json({ subscription, transactionType }, { status: 200 });
    } catch (error) {
        console.error('Error searching refund:', error);
        return json({ error: error.message }, { status: 500 });
    }
}


async function searchUID(uid) {
    try {
        const ref = db.ref(`/payment/3_verified`);
        const snapshot = await ref.once('value');
        let mostRecentTransaction;
        let mostRecentTimestamp = 0;
        let upgradeFromData;
        // Loop through all transactions in 3_verified and get the most recent one
        snapshot.forEach(childSnapshot => {
            if (childSnapshot.val().refunded) return;
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
        // If there's an upgradeFrom field, fetch the original transaction
        let subscription = [mostRecentTransaction];
        if (mostRecentTransaction && mostRecentTransaction.upgradeFrom) {
            const origRef = db.ref(`/payment/3_verified`);
            const snapshotOrig = await origRef.child(mostRecentTransaction.upgradeFrom).once('value');
            upgradeFromData = snapshotOrig.val();
            if (upgradeFromData) {
                subscription.push(upgradeFromData); // Include the original transaction in the response
            }
        }


        const ref2 = db.ref(`/payment/6_invoice`);
        const snapshot2 = await ref2.once('value');
        let mostRecentReferenceNumber = '';
        let mostRecentReferenceTimestamp = 0;

        // Loop through all transactions in 6_invoice and get the most recent one
        snapshot2.forEach(childSnapshot => {
            const reference_number = childSnapshot.key;
            const uidFromPath = reference_number.split('-').pop();
            if(childSnapshot.val().refunded) return;
            // Check if the UID matches and update the most recent reference number
            if (uidFromPath === uid) {
                const timestamp = parseInt(reference_number.split('_')[0]);
                if (timestamp > mostRecentReferenceTimestamp) {
                    mostRecentReferenceTimestamp = timestamp;
                    mostRecentReferenceNumber = reference_number;
                }
            }
        });

        // Reference to the invoices of the most recent reference number
        let latestInvoice = null;
        let latestInvoiceTimestamp = 0;

        if (mostRecentReferenceNumber) {
            const recentRef = db.ref(`/payment/6_invoice/${mostRecentReferenceNumber}`);
            const recentSnapshot = await recentRef.once('value');

            // Find the most recent invoice
            recentSnapshot.forEach(invoiceSnapshot => {
                const invoiceTimestamp = parseInt(invoiceSnapshot.key.split('_')[0]);
                if (invoiceTimestamp > latestInvoiceTimestamp) {
                    latestInvoiceTimestamp = invoiceTimestamp;
                    latestInvoice = invoiceSnapshot.val();
                }
            });
        }
        //fetch the paymentID and inject it to the invoice since payment id is not available in the invoice
        if(latestInvoice){
            // Get the paymentID, amount and reference_number of the most recent transaction
            const paymentIntentID = latestInvoice?.data?.attributes?.payment_intent?.id;
            latestInvoice.data.attributes.payment_id = await getPaymentID(paymentIntentID);
        }

        if (!mostRecentTransaction && !latestInvoice) {
            console.log(`No recent transactions found for UID ${uid}`);
            return { subscription: null, transactionType: null }; // Return empty values to avoid destructuring error
        }

        // Check which is more recent if both are found
        if (mostRecentTransaction && latestInvoice) {
            if (mostRecentTimestamp > latestInvoiceTimestamp) {
                return {
                    subscription,
                    transactionType: 'onetimesub'
                };
            } else {
                return {
                    subscription: latestInvoice,
                    transactionType: 'recurring'
                };
            }
        }

        // Handle cases where only one is found
        if (mostRecentTransaction) {
            return {
                subscription,
                transactionType: 'onetimesub'
            };
        }

        if (latestInvoice) {
            return {
                subscription: latestInvoice,
                transactionType: 'recurring'
            };
        }

    } catch (error) {
        console.error('Error in searchUID:', error);
        throw error;
    }
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
    return paymentID;
}


