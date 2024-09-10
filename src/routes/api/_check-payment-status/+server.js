// @ts-nocheck
import { json } from '@sveltejs/kit';

export async function GET({ url }) {
	const id = url.searchParams.get('id');
    if(!id){
        return json({ error: 'No payment intend id' }, { status: 400 });
    }
	const queryType = id.includes("subs_")? "subscriptions" : "payment_intents";
	const response = await fetch(`https://api.paymongo.com/v1/${queryType}/${id}`, {
		method: 'GET',
		headers: {
			accept: 'application/json',
			authorization: `${import.meta.env.VITE_PAYMONGO_KEY2}`
		}
	});
	const data = await response.json();
	return json(data);
}