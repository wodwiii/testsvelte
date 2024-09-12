import { auth, db } from "../firebase/firebaseAdmin"
import { saveToFirebase } from "./storeToFirebase";
import { transactionData } from "./transactionData";
import {processRecurringInvoices} from '../payment-recurring/verifyRecurring';

const is_dev = `${import.meta.env.VITE_IS_DEV}`;
const UID_CHARS = 6;
const all_plans = ['P1', 'P3', 'P6', 'P12', 'L1', 'L3', 'L6', 'L12'];

export async function updateVerifiedList() {
    // Get all data from 3_verified
    const ref = db.ref(`/payment${is_dev}/3_verified`);
    const snapshot = await ref.once('value');

    // Create a map to track the most recent transaction per UID
    let verifiedMap = new Map();
    // Initialize verifiedList
    let verifiedList = [];

    snapshot.forEach(childSnapshot => {
        //ignore refunded transactions
        if(childSnapshot.val().refunded) return; 

        const reference_number = childSnapshot.val().data.attributes.reference_number;
        // Extract epochTime and UID from the reference_number
        const epochTime = childSnapshot.val().data.attributes.paid_at;
        const uid = reference_number.split('-').pop();
        const cutUID = uid.substring(0, UID_CHARS);
        // Check if data/attributes/paid_at is null, skip this record if it is
        let paid_at = childSnapshot.val().data.attributes.paid_at;
        if (!paid_at) return;
        // Only store the most recent transaction per UID
        if (!verifiedMap.has(cutUID) || epochTime > verifiedMap.get(cutUID).epochTime) {
            verifiedMap.set(cutUID, { epochTime, reference_number, paid_at, upgradeFrom: childSnapshot.val().upgradeFrom ? childSnapshot.val().upgradeFrom : null });
        }
        return;


    });

    // Validate and add the most recent transactions to verifiedList
    for (let [cutUID, { reference_number, paid_at, upgradeFrom }] of verifiedMap) {
        //use the paid_at value of the original transaction if this is an upgrade transaction
        if (upgradeFrom) {
            const previousTransactionRef = db.ref(`/payment${is_dev}/3_verified/${upgradeFrom}`);
            try {
                const previousSnapshot = await previousTransactionRef.once('value');
                if (previousSnapshot.exists()) {
                    const previousTransactionData = previousSnapshot.val();
                    paid_at = previousTransactionData.data.attributes.paid_at;
                }
            } catch (error) {
                console.error("Error fetching previous transaction:", error);
            }
        }

        const validPlanCode = validity_plan_code(paid_at, reference_number);
        try {
            if (validPlanCode) {  // Check if validPlanCode is not null
                if (validPlanCode.startsWith('P')) {
                    verifiedList.push(cutUID);
                } else if (validPlanCode.startsWith('L')) {
                    verifiedList.push('-' + cutUID);
                } else {
                    verifiedList.push('?' + cutUID);
                }
            }
        } catch (error) {
            console.error('Error startsWith:', error);
        }
    }

    // Process verifiedList, retaining entries without prefixes if a prefixed version exists
    let verifiedList2 = [];
    for (const cutUID of verifiedList) {
        if (cutUID.startsWith('-') || cutUID.startsWith('?')) {
            const cutUID2 = cutUID.substring(1);
            if (!verifiedList.includes(cutUID2)) {
                verifiedList2.push(cutUID);
            }
        } else {
            verifiedList2.push(cutUID);
        }
    }
    verifiedList = verifiedList2;

    // Retrieve whitelisted users and update verifiedList
    try {
        const whitelistRef = db.ref(`/payment${is_dev}/whitelist`);
        const whitelistSnapshot = await whitelistRef.once('value');
        whitelistSnapshot.forEach(childSnapshot => {
            let uid = childSnapshot.val().uid.substring(0, UID_CHARS);
            let expiration = childSnapshot.val().expiration || Date.now() + 2592000000; // 30 days default expiration
            if (expiration < 1000000000000) expiration *= 1000; // Convert to ms if necessary
            const plan = childSnapshot.val().plan || 'pro';
            const currentTime = Date.now();

            if (currentTime < expiration) {
                // Ensure whitelist entries take precedence over verifiedList entries
                verifiedList = verifiedList.filter(v => v !== uid && v !== '-' + uid);

                if (plan === 'contributor') {
                    uid = '+' + uid;
                } else if (plan === 'lite') {
                    uid = '-' + uid;
                }

                // Insert whitelisted user at index 1
                verifiedList.splice(1, 0, uid);
            }
        });
    } catch (error) {
        console.error('Error retrieving whitelist:', error);
    }
    
    // Added recurring transactions from 6_invoice to verifiedList
    // this loops the 6_invoice collection and add any verified recurring transactions to verifiedList
    verifiedList = await processRecurringInvoices(db, is_dev, verifiedList, UID_CHARS);
    await saveToFirebase("gist", verifiedList);

    // // Update gist and backup if needed
    // const gisted = await gistVerifiedList(verifiedList);
    // let saved = false;
    // if (gisted) {
    //     saved = saveToFirebase("gist", verifiedList);
    // }

    // // Backup payment if necessary
    // if (saved === true && verifiedList.length % 20 === 0) {
    //     await gistBackupPayment();
    // }

    return verifiedList;
}

function validity_plan_code(paid_at, reference_number) {
    if (!paid_at) {
        console.log('validity_plan_code NULL | Reference Number: ' + reference_number);
        return null;
    }

    // referenceNumber format: {epochTime}_[P/L]1-{uid}
    const plan = reference_number.split('_').pop().split('-').shift() + '';

    if (!all_plans.includes(plan)) { //must be historical, all_plans instead of allowed_plans
        console.error('validity_plan_code Invalid Plan ' + plan);
        return null;
    }

    const transaction =
        transactionData(null, null, plan); // args uid, email, plan
    let valid_days;
    try {
        valid_days = transaction.daysValid; // 30 days
    } catch (error) {
        console.error('validity_plan_code valid_days Error:', error);
        return null;
    }

    if (!valid_days || valid_days < 0) { //must be historical, all_plans instead of allowed_plans
        console.error('validity_plan_code Invalid valid_days ' + valid_days);
        return null;
    }

    // convert epoch paid_at to date (e.g of epoch 1707282015)
    // IMPORTANT! multiply by 1000 to convert to milliseconds
    const paid_date = new Date(paid_at * 1000); // paymongo paid_at is in epoch in seconds
    const now = new Date();
    // console.log('now:' + now + ' | paid_date:' + paid_date)

    const diff = now - paid_date;
    const diff_days = Math.floor(diff / (1000 * 60 * 60 * 24));
    // console.log('diff_days:' + diff_days + ' | valid_days:' + valid_days)
    if (diff_days < valid_days) {
        console.log('VALID | Reference Number: ' + reference_number + ' | plan:' + plan);
        return plan;
    }

    console.log('validity_plan_code EXPIRED | Reference Number: ' + reference_number + ' | plan:' + plan);
    return null;
}



