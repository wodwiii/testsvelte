import { getUserByUID } from '$lib/helper/getByUID';
import { verifySubscriptionUID } from '$lib/payment-recurring/subscribe';
import { updateVerifiedList } from '$lib/payment/updateVerifiedList';
import { json } from '@sveltejs/kit';

export async function POST({ request }) {
  try {
    const { subscription_id, uid } = await request.json();
    if(!subscription_id || !uid) {
      return json({ error: 'Missing required fields' }, { status: 400 });
    }
    const { user, error } = await getUserByUID(uid);
    if (error) {
        return json({ error }, { status: 400 });
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

    const response = await fetch(`https://api.paymongo.com/v1/subscriptions/${subscription_id}/cancel`, options);
    console.log(response);
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Failed to cancel subscription:', errorData);
      return json({ error: 'Failed to cancel subscription', details: errorData }, { status: response.status });
    }
    const data = await response.json();
    await verifySubscriptionUID(uid);
    await updateVerifiedList();
    return json({ message: 'Subscription cancelled successfully', data }, { status: 200 });
  } catch (error) {
    console.error('Error handling cancellation request:', error);
    return json({ error: 'Server error while processing cancellation' }, { status: 500 });
  }
}



