import { json } from '@sveltejs/kit';
import { db } from '$lib/firebase/firebaseAdmin.js';

export async function POST({ request }) {
  try {
    const { data } = await request.json();

    console.log(data);
    const eventType = data.attributes?.type;
    if (eventType !== 'payment.paid') {
      return json({ error: 'Unhandled event type' }, { status: 400 });
    }
    const paymentData = data.attributes.data?.attributes;
    const billing = paymentData?.billing;
    const email = billing.email;
    const paymentStatus = paymentData?.status;
    const payerDetails = paymentData?.source;
    const paymentDescription = paymentData?.description;
    if (paymentStatus !== 'paid') {
      return json({ error: 'Payment not successful' }, { status: 400 });
    }
    const subscriptionData = {
      description: paymentData.description
    }
    console.log('Payment successful:');
    console.log(`Payer: ${payerDetails?.brand} - ${payerDetails?.last4}`);
    console.log(`Description: ${paymentDescription}`);
    console.log(`Amount Paid: ${paymentData?.amount / 100} ${paymentData?.currency}`);
    await db.ref(`subscriptions/${email}`).set(subscriptionData)
    return json({ message: 'Payment processed successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}