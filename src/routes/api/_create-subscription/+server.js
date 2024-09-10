import { json } from '@sveltejs/kit';

export async function POST({ request }) {
  try {
    const { customer_id, plan_id } = await request.json();

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
            customer_id,
            plan_id
          }
        }
      })
    };

    const response = await fetch('https://api.paymongo.com/v1/subscriptions', options);
    const data = await response.json();

    if (!response.ok) {
      return json({ error: data }, { status: response.status });
    }

    return json({ data: data.data }, { status: 200 });
  } catch (error) {
    console.error('Error creating subscription:', error);
    return json({ error: 'Failed to create subscription' }, { status: 500 });
  }
}
