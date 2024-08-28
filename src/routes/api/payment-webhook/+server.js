// @ts-nocheck

import { json } from '@sveltejs/kit';
import { db, auth } from '$lib/firebase/firebaseAdmin.js';

export async function POST({ request }) {
  try {
    const { data } = await request.json();

    console.log(data);
    const eventType = data.attributes?.type;
    if (eventType !== 'payment.paid') {
      return json({ error: 'Unhandled event type' }, { status: 400 });
    }
    setTimeout(() => handleOtherFunc(data), 0); //run async
    return json({ message: 'Webhook processed successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}


const handleOtherFunc = async (data) =>{
  try {
    const paymentData = data.attributes.data?.attributes;
    const email = paymentData.billing?.email;
    const paymentDescription = paymentData?.description;
    const match = paymentDescription.match(/subs_\w+/);
    const subscriptionId = match ? match[0] : null;

    if(!subscriptionId){
      console.error('Subscription ID not found in description');
      return;
    }

    const subscriptionDetails = await fetchSubscriptionDetails(subscriptionId);

    if (!subscriptionDetails) {
      console.error('Failed to fetch subscription details');
      return;
    }
    
    console.log('Payment successful:');
    console.log(`Description: ${paymentDescription}`);
    await setData(email, subscriptionId, subscriptionDetails);
  } catch (error) {
    
  }
}


const fetchSubscriptionDetails = async (subscriptionId) => {
  const options = {
    method: 'GET',
    headers: {
      accept: 'application/json',
      authorization: `${import.meta.env.VITE_PAYMONGO_KEY2}`
    }
  };

  try {
    const response = await fetch(`https://api.paymongo.com/v1/subscriptions/${subscriptionId}`, options);
    if (!response.ok) {
      console.error('Failed to fetch subscription details:', response.statusText);
      return null;
    }
    const data = await response.json();
    return data.data;
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
};
