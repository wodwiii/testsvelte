import { db } from '$lib/firebase/firebaseAdmin';
import { transactionData } from '$lib/payment/transactionData';
import { updateVerifiedList } from './updateVerifiedList';

const is_dev = `${import.meta.env.VITE_IS_DEV}`
const allowed_checkout_plans = ['P1', 'P3', 'P12', 'L1', 'L3', 'L12'];
const AUTH_TOKEN = `${import.meta.env.VITE_PAYMONGO_KEY2}`

const UID_CHARS = 6;

/**
 * Retrieves the current plan and calculates upgrade cost based on the remaining time of the current plan.
 */
export async function createCheckoutUpgrade(uid, user, plan) {
    const userSubscribed = await checkUserSubscribed(uid);
    if (!userSubscribed) {
        throw new Error('User is not subscribed.');
    }
    // Fetch the most recent verified transaction to get the `paid_at` value
    const mostRecentTransaction = await getMostRecentTransaction(uid);
    if (!mostRecentTransaction) {
        throw new Error('No verified transaction found for the user.');
    }

    const { paid_at, reference_number } = mostRecentTransaction;

    // Extract current plan from the reference_number
    const currentPlanCode = reference_number.split('_')[1].split('-')[0];
    const isLitePlan = currentPlanCode.startsWith('L');
    const planType = isLitePlan ? 'Lite' : 'Pro';

    // Determine if the current plan is already a Lite or Pro plan and handle upgrades
    if (!isLitePlan && plan.startsWith('P')) {
        throw new Error('User is already on a Pro plan');
    }
    else if (isLitePlan && plan.startsWith('L')) {
        throw new Error('User is already on a Lite plan');
    }

    // Calculate the elapsed time since the user started the current plan
    const elapsedTime = calculateElapsedTime(paid_at);

    // Calculate the remaining days and upgrade cost
    const transaction = calculateUpgradeCost(uid, user.email, currentPlanCode, plan, planType, elapsedTime);
    const epochTime = Math.floor(Date.now() / 1000);
    const referenceNumber = `${epochTime}_${transaction.reference_prefix}-${uid}`;

    console.log('Reference Number: ' + referenceNumber + ' | Email: ' + user.email + ' | Name: ' + user.displayName);

    const url = 'https://api.paymongo.com/v1/checkout_sessions';
    const options = {
        method: 'POST',
        headers: {
            accept: 'application/json',
            'Content-Type': 'application/json',
            authorization: AUTH_TOKEN,
        },
        body: JSON.stringify({
            data: {
                attributes: {
                    customer_email: user.email,
                    billing: { name: user.displayName, email: user.email },
                    send_email_receipt: true,
                    show_description: true,
                    show_line_items: false,
                    line_items: [
                        {
                            amount: Math.ceil(transaction.amount / 2000) * 2000,
                            name: transaction.name,
                            currency: 'PHP',
                            quantity: 1,
                        },
                    ],
                    payment_method_types: transaction.payment_methods,
                    description: transaction.name + ' [' + referenceNumber + ']',
                    reference_number: referenceNumber,
                    success_url: !is_dev ? 'https://jur.ph/verify' : 'http://localhost:4173/verify',
                },
            },
        }),
    };

    try {
        const response = await fetch(url, options);
        const data = await response.json();
        data.upgradeFrom = reference_number;
        return data;
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

/**
 * Retrieves the most recent verified transaction for a specific UID.
 */
async function getMostRecentTransaction(uid) {
    const ref = db.ref(`/payment${is_dev}/3_verified`);
    const snapshot = await ref.once('value');

    let verifiedMap = new Map();

    snapshot.forEach(childSnapshot => {
        const reference_number = childSnapshot.val().data.attributes.reference_number;

        // Extract the epochTime and UID from the reference_number
        const epochTime = childSnapshot.val().data.attributes.paid_at;
        const uid = reference_number.split('-').pop();
        const cutUID = uid.substring(0, UID_CHARS);

        // Check if data/attributes/paid_at is null, skip this record if it is
        const paid_at = childSnapshot.val().data.attributes.paid_at;
        if (!paid_at) return;

        // Only store the most recent transaction per UID
        if (!verifiedMap.has(cutUID) || epochTime > verifiedMap.get(cutUID).epochTime) {
            verifiedMap.set(cutUID, { epochTime, reference_number, paid_at });
        }
    });

    // Return the most recent transaction for the given UID
    return verifiedMap.get(uid.substring(0, UID_CHARS));
}

/**
 * Calculates the elapsed time in days since the plan was purchased based on the `paid_at` timestamp.
 */
function calculateElapsedTime(paid_at) {
    const currentTime = Math.floor(Date.now() / 1000); // Current time in seconds
    const elapsedTimeSeconds = currentTime - paid_at; // Time elapsed in seconds
    const elapsedDays = Math.floor(elapsedTimeSeconds / (60 * 60 * 24)); // Convert to days
    return elapsedDays;
}

/**
 * Calculates the upgrade cost based on the remaining time of the current plan.
 */
function calculateUpgradeCost(uid, email, currentPlan, newPlan, currentPlanType, elapsedTime) {
    const currentTransaction = transactionData(uid, email, currentPlan);
    console.log("🚀 ~ calculateUpgradeCost ~ currentTransaction:", currentTransaction)
    const newTransaction = transactionData(uid, email, newPlan);
    console.log("🚀 ~ calculateUpgradeCost ~ newTransaction:", newTransaction)

    // Calculate remaining days in the current plan
    const remainingDays = currentTransaction.daysValid - elapsedTime;

    // Calculate the value of the remaining days
    const currentPlanDailyRate = currentTransaction.amount / currentTransaction.daysValid;
    const currentPlanRemainingValue = currentPlanDailyRate * remainingDays;
    console.log("🚀 ~ calculateUpgradeCost ~ currentPlanRemainingValue:", currentPlanRemainingValue)

    // Calculate the difference in cost for upgrading
    const upgradeCost = newTransaction.amount - currentPlanRemainingValue + (currentTransaction.amount * 0.02);
    console.log("🚀 ~ calculateUpgradeCost ~ upgradeCost:", upgradeCost)

    return {
        reference_prefix: newPlan,
        amount: upgradeCost > 0 ? upgradeCost : 0, // Ensure no negative pricing
        name: `Upgrade from ${currentPlanType} ${currentPlan} to ${newPlan}`,
        payment_methods: newTransaction.payment_methods,
        daysValid: newTransaction.daysValid,
    };
}


async function checkUserSubscribed(uid) {
    const verifiedList = await updateVerifiedList();
    let userSubscribed = false;
    const shortUid = uid.slice(0, 6);
    const normalizedUid = verifiedList.map(item => item.replace('-', ''));
    if (normalizedUid.includes(shortUid)) {
        userSubscribed = true;
    }

    return userSubscribed;
}




