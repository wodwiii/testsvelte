import { auth, db } from "../firebase/firebaseAdmin"
import { saveToFirebase } from "./storeToFirebase";
import { transactionData } from "./transactionData";
import { updateVerifiedList } from "./updateVerifiedList";

const is_dev = `${import.meta.env.VITE_IS_DEV}`;
const AUTH_TOKEN = `${import.meta.env.VITE_PAYMONGO_KEY2}`

export async function createCheckout(uid, user, plan) {
    const transaction = transactionData(uid, user.email, plan);

    const epochTime = Math.floor(Date.now() / 1000);

    // referenceNumber format: {epochTime}_P1-{uid}
    const referenceNumber =
        epochTime
        + '_'
        + transaction.reference_prefix
        + '-' + uid;

    console.log('Reference Number:' + referenceNumber +
        ' | Email:' + user.email + ' | Name:' + user.displayName)

    const url = 'https://api.paymongo.com/v1/checkout_sessions';

    const options = {
        method: 'POST',
        headers: {
            accept: 'application/json',
            'Content-Type': 'application/json',
            authorization: AUTH_TOKEN
        },
        body: JSON.stringify({
            data: {
                attributes: {
                    customer_email: user.email,
                    billing: { name: user.displayName, email: user.email },
                    send_email_receipt: true,
                    show_description: true,
                    show_line_items: false,
                    line_items: [{
                        amount: transaction.amount,
                        name: transaction.name,
                        currency: 'PHP',
                        quantity: 1
                    }],
                    payment_method_types: transaction.payment_methods,
                    description: transaction.name + ' [' + referenceNumber + ']',
                    reference_number: referenceNumber,
                    success_url: !is_dev ? 'https://jur.ph/verify' : 'http://localhost:4173/verify'
                }
            }
        })
    };

    try {
        const response = await fetch(url, options);
        const data = await response.json();
        return data; // Return the fetched JSON data
    } catch (error) {
        console.error('Error:', error);
        throw error; // Re-throw the error for handling at the caller level
    }
}

export async function verifyCheckoutUID(uid) {
    const ref = db.ref(`/payment${is_dev}/2_checkout_uid`);
    const snapshot = await ref.child(uid).orderByKey().once('value');
    let payloads = [];
    snapshot.forEach(childSnapshot => {
        payloads.push(childSnapshot.val());
    });
    payloads.reverse();

    let processedRefs = [];
    for (const payload of payloads) {
        const checkoutId = payload.data.id;
        const reference_number = payload.data.attributes.reference_number;
        // Check if upgradeFrom exists before passing it
        const upgradeFrom = payload.upgradeFrom ? payload.upgradeFrom : null;

        const verified = await verifyCheckoutId(checkoutId, reference_number, upgradeFrom);

        if (verified) {
            processedRefs.push(reference_number);
            break;
        }
    }
    const refId = processedRefs.join('<br>');
    return refId;
}

export async function recentCheckoutUID(uid) {
    const ref = db.ref(`/payment${is_dev}/2_checkout_uid`);
    const snapshot = await ref.child(uid).orderByKey().once('value');
    let payloads = [];
    snapshot.forEach(childSnapshot => {
        payloads.push(childSnapshot.val());
    });
    payloads.reverse();
    for (const payload of payloads) {
        //igonore upgrade transactions
        if(!payload.upgradeFrom) {
            const checkoutId = payload.data.id;
            const reference_number = payload.data.attributes.reference_number;
            //Check if checkout id is verified and valid,
            const recent = await getCheckoutId(checkoutId, reference_number);
            //return the checkout url if checkout session is waiting for payment
            if (recent.checkout_url) {
                return { checkout_url: recent.checkout_url };
            }
            //check if user is on the verified list, and if yes, return verified
            else if (recent.verifiedList) {
                const shortUid = uid.slice(0, 6);
                const normalizedUid = recent.verifiedList.map(item => item.replace('-', ''));
                if (normalizedUid.includes(shortUid)) {
                    return { verified: normalizedUid };
                }
                //if not on the list, return null to proceed to creating new checkout session
                else {
                    return null;
                }
            }
            //if recent is null, return null proceed to creating new checkout session
            return null;
        }
    }
}

export async function verifyCheckoutId(checkoutId, reference_number, upgradeFrom) {
    // console.log('verifyCheckout ID:' + checkoutId);

    // check from db if already verified
    if (reference_number) {
        const ref = db.ref(`/payment${is_dev}/3_verified`);
        const snapshot = await ref.child(reference_number).once('value');
        if (snapshot.exists()) {
            console.log('EXIST IN DB: ' + reference_number);
            return true; // Return if verified
        }
    }

    const url = 'https://api.paymongo.com/v1/checkout_sessions/' + checkoutId;
    const options = {
        method: 'GET',
        headers: {
            accept: 'application/json',
            authorization: AUTH_TOKEN
        }
    };
    try {
        const response = await fetch(url, options);
        const verifiedPayload = await response.json();

        const paid_at = verifiedPayload.data.attributes.paid_at;
        if (!paid_at) {
            console.log("Unpaid ID: " + verifiedPayload.data.id);
            return false; // Unable to verify
        }
        if (upgradeFrom) {
            verifiedPayload.upgradeFrom = upgradeFrom;
            console.log("Upgrade from: " + upgradeFrom);
        }
        // Store the payload in Firebase Realtime Database
        await saveToFirebase("verified", verifiedPayload);

        return true; // Return if verified
        // return verifiedPayload; // Return the fetched JSON data
    } catch (error) {
        console.error('Error:', error);
        throw error; // Re-throw the error for handling at the caller level
    }
}

export async function getCheckoutId(checkoutId, reference_number) {

    const url = 'https://api.paymongo.com/v1/checkout_sessions/' + checkoutId;
    const options = {
        method: 'GET',
        headers: {
            accept: 'application/json',
            authorization: AUTH_TOKEN
        }
    };
    try {
        const response = await fetch(url, options);
        const verifiedPayload = await response.json();
        const paid_at = verifiedPayload.data.attributes.paid_at;
        if (!paid_at && verifiedPayload.data.attributes.status === "active") {
            console.log("Unpaid ID: " + verifiedPayload.data.id);
            return { checkout_url: verifiedPayload.data.attributes.checkout_url }; //resuse the existing active checkout session
        }
        else if (!paid_at && verifiedPayload.data.attributes.status === "expired") {
            console.log("Expired ID: " + verifiedPayload.data.id);
            return null; // Not paid and checkout session is expired so return null so we can proceed to checkout
        }
        await saveToFirebase("verified", verifiedPayload);
        const verifiedList = await updateVerifiedList();
        return { verifiedList }; // return the verified list to check if user is on the list
    } catch (error) {
        console.error('Error:', error);
        throw error; // Re-throw the error for handling at the caller level
    }
}