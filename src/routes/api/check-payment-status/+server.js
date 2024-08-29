// @ts-nocheck
import { json } from '@sveltejs/kit';

export async function GET({ url }) {
	const subscriptionId = url.searchParams.get('id');
    if(!subscriptionId){
        return json({ error: 'No payment intend id' }, { status: 400 });
    }
	const response = await fetch(`https://api.paymongo.com/v1/subscriptions/${subscriptionId}`, {
		method: 'GET',
		headers: {
			accept: 'application/json',
			authorization: 'Basic c2tfdGVzdF9EMVRkRm1id0dqaTRFRzFQTHRmYngxUmg6'
		}
	});

	const data = await response.json();
	return json(data);
}