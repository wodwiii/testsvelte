import { json } from '@sveltejs/kit';

export async function POST({ request }) {
  try {
    const { data } = await request.json();
    const { attributes } = data;

    const { details, billing, type } = attributes;

    const options = {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'Content-Type': 'application/json',
        authorization: `${import.meta.env.VITE_PAYMONGO_KEY2}`
      },
      body: JSON.stringify({
        data: {
          attributes: {
            details,
            billing,
            type
          }
        }
      })
    };

    const response = await fetch('https://api.paymongo.com/v1/payment_methods', options);
    const data2 = await response.json();

    if (!response.ok) {
      console.error('Paymongo API Response:', data2);
      return json({ error: data2 }, { status: response.status });
    }

    return json({ data: data2.data }, { status: 200 });
  } catch (error) {
    console.error('Error creating payment method:', error);
    return json({ error: 'Failed to create payment method' }, { status: 500 });
  }
}