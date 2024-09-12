// @ts-nocheck

import { json } from '@sveltejs/kit';
import { db, auth } from '$lib/firebase/firebaseAdmin.js';
import axios from 'axios';

export async function POST({ request }) {
  try {
    const { data } = await request.json();
    const eventType = data.attributes?.type;
    if (eventType !== 'payment.paid') {
      return json({ error: 'Unhandled event type' }, { status: 400 });
    }
    await handleOtherFunc(data);
    console.log("Webhook processed successfully, Status 200 sent!");
    return json({ message: 'Webhook processed successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}


const handleOtherFunc = async (data) => {
  try {
    const paymentData = data.attributes.data?.attributes;
    const paymentDescription = paymentData?.description;
    if (!paymentDescription) {
      console.error('No description available for this payment.');
      return;
    }
    console.log('Payment successful:');
    console.log(`Description: ${paymentDescription}`);
    const email = paymentData.billing?.email;
    if (!email) {
      console.error('No email found for the payor.');
      return;
    }
    console.log(`Payor email: ${email}`);

    if (paymentData.description.includes('subs_')) {
      const match = paymentDescription.match(/subs_\w+/);
      const subscriptionId = match ? match[0] : null;

      if (!subscriptionId) {
        console.error('Subscription ID not found in description');
        return;
      }

      console.log(`Fetching subscription details for ${subscriptionId}`);
      const subscriptionDetails = await fetchDetails(subscriptionId);

      if (!subscriptionDetails) {
        console.error('Subscription details not found.');
        return;
      }

      console.log('Updating records on the database.');
      const userID = (await auth.getUserByEmail(email)).uid;
      await storeFirebase(userID, subscriptionDetails, data)
      await verifyTransaction(userID, subscriptionId);
    }

    else{
      const paymentIntentID = paymentData.billing?.payment_intent_id;
      const paymentDetails = fetchDetails(paymentIntentID);
      if (!paymentDetails) {
        console.error('Payment details not found.');
        return;
      }
      console.log('Updating records on the database.');
      const userID = (await auth.getUserByEmail(email)).uid;
      await storeFirebase(userID, paymentDetails, data)
      await verifyTransaction(userID, paymentDetails.id);
    }
      

  } catch (error) {

  }
}

const verifyTransaction = async (userID, subscriptionId) => {
  try {
    const response = await fetch('https://testsvelte-payments.vercel.app/api/verify-transactions', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        uid: userID,
        subs_id: subscriptionId
      })
    });
    console.log('Verification response:', response.json());
  } catch (error) {
    console.error('Error verifying transaction:', error);
  }
}
const fetchDetails = async (id) => {
  const queryType = id.includes('subs_')? 'subscriptions' : 'payment_intents';
  try {
    const response = await axios.get(`https://api.paymongo.com/v1/${queryType}/${id}`, {
      headers: {
        accept: 'application/json',
        authorization: `${import.meta.env.VITE_PAYMONGO_KEY2}`
      },
      timeout: 30000
    });
    return response.data.data;
  } catch (err) {
    console.error('Error fetching subscription details:', err);
    return null;
  }
};


const storeFirebase = async (userID, details, data) => {
  const recurring = details.id.includes('subs_')? true: false;
  let path;
  try {
    if(recurring){
      const planSuffix = details.attributes.plan?.name.includes("Pro") ? 'Pro' : 'Lite';
      path = `webhooks/${userID}/${planSuffix}_${details.id}`;
    }
    else{
      const planSuffix = details.attributes.description.includes("Pro") ? 'Pro' : 'Lite';
      path = `webhooks/${userID}/${planSuffix}_${details.id}`;
    }
    
    await db.ref(path).set({
      data: data,
      created_at: Date.now(),
    });

    console.log(`Data stored successfully at path: ${path}`);
  } catch (error) {
    console.error('Error storing data in Firebase:', error);
    throw error;
  }
};