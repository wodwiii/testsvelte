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
    setTimeout(() => handleOtherFunc(data), 0); //run async
    console.log("Webhook processed successfully, Status 200 sent!");
    return json({ message: 'Webhook processed successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}


const handleOtherFunc = async (data) =>{
  console.log("Handling other functions asynchronously...");
  try {
    const paymentData = data.attributes.data?.attributes;
    const paymentDescription = paymentData?.description;
    if(!paymentDescription){
      console.error('No description available for this payment.');
      return;
    }
    console.log('Payment successful:');
    console.log(`Description: ${paymentDescription}`);


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
    await setData(email, subscriptionId, subscriptionDetails);
  } catch (error) {
    
  }
}


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


const setData = async (email, subscriptionId, subscriptionDetails) => {
  const subscriptionData = {
    subs_id: subscriptionId,
    plan: subscriptionDetails.attributes.plan.name,
    next_billing_schedule: subscriptionDetails.attributes.next_billing_schedule,
    status: subscriptionDetails.attributes.status
  };

  const userID = (await auth.getUserByEmail(email)).uid;
  await db.ref(`subscriptions/${userID}`).set(subscriptionData);
  console.error('Successfully updated records on the database.');
};
