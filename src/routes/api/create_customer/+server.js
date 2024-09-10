import { checkCustomer, createCustomer } from '$lib/payment-recurring/subscribe.js';
import { json } from '@sveltejs/kit';

export async function POST({ request }) {
  try {
    const { first_name, last_name, phone, email, default_device } = await request.json();


    // check for existing data in the paymongo database of the customer based on the email
    const checkResponse = await checkCustomer(email);
    //if the customer exists, return the customer data instead
    if (checkResponse.data.length > 0) {
      return json({ data: checkResponse.data }, { status: 200 });
    }
    const createData = await createCustomer(first_name, last_name, phone, email, default_device);
    return json({ data: createData.data }, { status: 200 });

  } catch (error) {
    console.error('Error in customer creation/checking process:', error);
    return json({ error: 'Failed to process customer request' }, { status: 500 });
  }
}
