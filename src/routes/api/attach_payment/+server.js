import { attachPaymentIntent } from '$lib/payment-recurring/subscribe';
import { json } from '@sveltejs/kit';

export async function POST({ request }) {
  try {
    const { paymentIntentID, paymentMethodID } = await request.json();

    if(!paymentIntentID || !paymentMethodID) {
      return json({ error: 'Missing paymentIntentID or paymentMethodID' }, { status: 400 });
    }
    const attachResult = await attachPaymentIntent(paymentIntentID, paymentMethodID);
    const attachData = await attachResult.json();

    if (!attachResult.ok) {
      return json({ error: attachData }, { status: attachResult.status });
    }
    
    return json({ data: attachData.data }, { status: 200 });
  } catch (error) {
    console.error('Error attaching payment method:', error);
    return json({ error: 'Failed to attach payment method' }, { status: 500 });
  }
}
