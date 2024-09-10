import { db } from "$lib/firebase/firebaseAdmin";
import { storeToFirebase } from "./storeToFirebase";

export async function createSubscription(customer_id, plan_code) {
    //plan_id is not dynamically created, it is fixed for our two plans and created via the paymongo api in the dashboard
    const plan_id = plan_code === 'LITE' ? import.meta.env.VITE_PAYMONGO_LITE_PLAN_ID : import.meta.env.VITE_PAYMONGO_PRO_PLAN_ID;
    const options = {
        method: 'POST',
        headers: {
            accept: 'application/json',
            'content-type': 'application/json',
            authorization: `${import.meta.env.VITE_PAYMONGO_KEY2}`
        },
        body: JSON.stringify({
            data: {
                attributes: {
                    customer_id,
                    plan_id
                }
            }
        })
    };
    const response = await fetch('https://api.paymongo.com/v1/subscriptions', options);
    const data = await response.json();
    return data;
}

export async function checkCustomer(email) {
    const options = {
        method: 'GET',
        headers: {
            accept: 'application/json',
            authorization: `${import.meta.env.VITE_PAYMONGO_KEY2}`
        }
    };
    const response = await fetch(`https://api.paymongo.com/v1/customers?email=${encodeURIComponent(email)}`, options);
    return response.json();
}

export async function createCustomer(first_name, last_name, phone, email, default_device) {
    const options = {
        method: 'POST',
        headers: {
            accept: 'application/json',
            'content-type': 'application/json',
            authorization: `${import.meta.env.VITE_PAYMONGO_KEY2}`
        },
        body: JSON.stringify({
            data: {
                attributes: {
                    first_name,
                    last_name,
                    phone,
                    email,
                    default_device
                }
            }
        })
    };
    const response = await fetch('https://api.paymongo.com/v1/customers', options);
    const data = await response.json();
    return data;
}

export async function checkPaymentIntent(payment_intent_id) {
    const options = {
        method: 'GET',
        headers: {
            accept: 'application/json',
            authorization: `${import.meta.env.VITE_PAYMONGO_KEY2}`
        }
    };
    const response = await fetch(`https://api.paymongo.com/v1/payment_intents/${payment_intent_id}`, options);
    return response;
}
export async function checkSubscription(subscription_id) {
    const options = {
        method: 'GET',
        headers: {
            accept: 'application/json',
            authorization: `${import.meta.env.VITE_PAYMONGO_KEY2}`
        }
    };
    const response = await fetch(`https://api.paymongo.com/v1/subscriptions/${subscription_id}`, options);
    return response;
}
export async function attachPaymentIntent(payment_intent_id, payment_method_id) {
    const options = {
        method: 'POST',
        headers: {
            accept: 'application/json',
            'content-type': 'application/json',
            authorization: `${import.meta.env.VITE_PAYMONGO_KEY2}`
        },
        body: JSON.stringify({
            data: {
                attributes: {
                    payment_method: payment_method_id,
                    return_url: 'https://testsvelte-payments.vercel.app/verify'
                }
            }
        })
    };
    const response = await fetch(`https://api.paymongo.com/v1/payment_intents/${payment_intent_id}/attach`, options);
    return response;
}

export async function verifySubscriptionUID(uid) {
    const ref = db.ref(`/payment/5_subscription_uid`);
    const snapshot = await ref.child(uid).orderByKey().once('value');
    let payloads = [];
    snapshot.forEach(childSnapshot => {
        payloads.push(childSnapshot.val());
    });
    payloads.reverse();

    let processedRefs = [];
    for (const payload of payloads) {
        const id = payload.data.id;
        const reference_number = payload.reference_number;
        // Check if upgradeFrom exists before passing it
        const upgradeFrom = payload.upgradeFrom ? payload.upgradeFrom : null;
        await verifySubscriptionID(id, reference_number, upgradeFrom);

        // const verified = await verifySubscriptionID(id, reference_number, upgradeFrom);

        // if (verified) {
        //     processedRefs.push(reference_number);
        //     break;
        // }
    }
    // const refId = processedRefs.join('<br>');
    // return refId;
    return
}

export async function verifySubscriptionID(subscription_id, reference_number, upgradeFrom) {
    //check if already exists in the verified
    // if (reference_number) {
    //     const ref = db.ref(`/payment/3_verified`);
    //     const snapshot = await ref.child(reference_number).once('value');
    //     if (snapshot.exists()) {
    //         console.log('EXIST IN DB: ' + reference_number);
    //         return true; // Return if verified
    //     }
    // }

    const url = 'https://api.paymongo.com/v1/subscriptions/' + subscription_id;
    const options = {
        method: 'GET',
        headers: {
            accept: 'application/json',
            authorization: `${import.meta.env.VITE_PAYMONGO_KEY2}`
        }
    };
    try {
        const response = await fetch(url, options);
        const verifiedPayload = await response.json();
        verifiedPayload.reference_number = reference_number;
        // const active = verifiedPayload.data.attributes.status === 'active';
        // const invoicePaid = verifiedPayload.data.attributes.latest_invoice.status !== 'void';
        //check and fetch the latest invoice of the subscription
        const invoicePayload = await checkInvoice(verifiedPayload.data.attributes.latest_invoice.id);
        //inject reference number to the payload
        invoicePayload.reference_number = reference_number;
        // if (upgradeFrom) {
        //     verifiedPayload.upgradeFrom = upgradeFrom;
        //     console.log("Upgrade from: " + upgradeFrom);
        // }
        // if(invoicePaid && active) {
        //     console.log("Subscription is active: " + verifiedPayload.data.id);
        //     await storeToFirebase("invoice", invoicePayload);
        //     return true; // Latest invoice is not paid
        // }

        //check and store the latest invoice of the subscription
        
        // Store the payload in Firebase Realtime Database
        await storeToFirebase("invoice", invoicePayload);
        return; // Return if verified
    } catch (error) {
        console.error('Error:', error);
        throw error; // Re-throw the error for handling at the caller level
    }

    
}

export async function checkInvoice(invoice_id) {
    console.log("Invoice ID: " + invoice_id);
    const url = 'https://api.paymongo.com/v1/subscriptions/invoices/' + invoice_id;
    const options = {
        method: 'GET',
        headers: {
            accept: 'application/json',
            authorization: `${import.meta.env.VITE_PAYMONGO_KEY2}`
        }
    };
    try {
        const response = await fetch(url, options);
        const invoice = await response.json();
        return invoice;
    } catch (error) {
        console.error('Error:', error);
        throw error; // Re-throw the error for handling at the caller level
    }
}