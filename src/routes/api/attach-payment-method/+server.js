import { json } from '@sveltejs/kit';

export async function POST({ request }) {
  try {
    const { paymentIntentId, paymentMethodId } = await request.json();

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
            payment_method: paymentMethodId
          }
        }
      })
    };

    const response = await fetch(`https://api.paymongo.com/v1/payment_intents/${paymentIntentId}/attach`, options);
    const data = await response.json();

    if (!response.ok) {
      return json({ error: data }, { status: response.status });
    }

    return json({ data: data.data }, { status: 200 });
  } catch (error) {
    console.error('Error attaching payment method:', error);
    return json({ error: 'Failed to attach payment method' }, { status: 500 });
  }
}
