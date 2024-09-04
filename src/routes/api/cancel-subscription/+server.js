// @ts-nocheck
import { db } from '$lib/firebase/firebaseAdmin';
import { json } from '@sveltejs/kit';

export async function POST({ request }) {
  try {
    const { subscriptionId } = await request.json();
    if (!subscriptionId) {
      return json({ error: 'Subscription ID is required' }, { status: 400 });
    }

    const options = {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'authorization': `${import.meta.env.VITE_PAYMONGO_KEY2}`
      },
      body: JSON.stringify({data: {attributes: {cancellation_reason: 'unused'}}})
    };

    const response = await fetch(`https://api.paymongo.com/v1/subscriptions/${subscriptionId}/cancel`, options);
    console.log(response);
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Failed to cancel subscription:', errorData);
      return json({ error: 'Failed to cancel subscription', details: errorData }, { status: response.status });
    }
    const data = await response.json();
    return json({ message: 'Subscription cancelled successfully', data }, { status: 200 });
  } catch (error) {
    console.error('Error handling cancellation request:', error);
    return json({ error: 'Server error while processing cancellation' }, { status: 500 });
  }
}


