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


const handleOtherFunc = async (data) =>{
  try {
    const paymentData = data.attributes.data?.attributes;
    const paymentDescription = paymentData?.description;
    if(!paymentDescription){
      console.error('No description available for this payment.');
      return;
    }
    console.log('Payment successful:');
    console.log(`Description: ${paymentDescription}`);
    if(paymentDescription.includes('subs_')){
      const email = paymentData.billing?.email;
      if(!email){
        console.error('No email found for the payor.');
        return;
      }
      console.log(`Payor email: ${email}`);

      const match = paymentDescription.match(/subs_\w+/);
      const subscriptionId = match ? match[0] : null;

      if(!subscriptionId){
        console.error('Subscription ID not found in description');
        return;
      }
      
      console.log(`Fetching subscription details for ${subscriptionId}`);
      const subscriptionDetails = await fetchSubscriptionDetails(subscriptionId);

      if (!subscriptionDetails) {
        console.error('Subscription details not found.');
        return;
      }

      console.log('Updating records on the database.');
      const userID = (await auth.getUserByEmail(email)).uid;
      await storeFirebase(userID, subscriptionDetails, data )
      await verifyTransaction(userID, subscriptionDetails.attributes.latest_invoice.payment_intent.id);
    } 
    else if(paymentDescription.includes('subscription')){
      const paymentIntentID = paymentData.billing?.payment_intent_id;
      const email = paymentData.billing?.email;
      if(!email){
        console.error('No email found for the payor.');
        return;
      }
      console.log(`Payor email: ${email}`);
      const userID = (await auth.getUserByEmail(email)).uid;
      const paymentDetails = await fetchPaymentDetails(paymentIntentID);
      await storeFirebase(userID, paymentDetails, data )
      await verifyTransaction(userID, paymentIntentID);
    }
    
  } catch (error) {
    
  }
}

const verifyTransaction = async (userID, paymentIntenID) =>{
  try {
    const response = await fetch('https://testsvelte-payments.vercel.app/api/verify-transactions', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        uid : userID,
        paymentIntenID: paymentIntenID
      })
    });
    console.log('Verification response:', response.json());
  } catch (error) {
    console.error('Error verifying transaction:', error);
  }
}

const fetchPaymentDetails = async (paymentIntentID) => {
  try {
    const response = await axios.get(`https://api.paymongo.com/v1/payment_intents/${paymentIntentID}`, {
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
const fetchSubscriptionDetails = async (subscriptionId) => {
  try {
    const response = await axios.get(`https://api.paymongo.com/v1/subscriptions/${subscriptionId}`, {
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


const storeFirebase = async (userID, subscriptionDetails, data) => {
  try {
    const planSuffix = subscriptionDetails.attributes.plan?.name.includes("Pro") ? 'Pro' : 'Lite';
    const path = `webhooks/${userID}/${planSuffix}_${subscriptionDetails.id}`;

    await db.ref(path).set({
      data:data,
      created_at: Date.now(),
    });

    console.log(`Data stored successfully at path: ${path}`);
  } catch (error) {
    console.error('Error storing data in Firebase:', error);
    throw error;
  }
};