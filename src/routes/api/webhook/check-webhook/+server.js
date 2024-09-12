// @ts-nocheck
import { json } from '@sveltejs/kit';

export async function GET({ url }) {
	const response = await fetch(`https://api.paymongo.com/v1/webhooks`, {
		method: 'GET',
		headers: {
			accept: 'application/json',
			authorization: `${import.meta.env.VITE_PAYMONGO_KEY2}`
		}
	});
	const data = await response.json();
	return json(data);
}