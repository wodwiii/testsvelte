import { json } from '@sveltejs/kit';

export async function POST({ request }) {
  try {
    const { first_name, last_name, phone, email, default_device } = await request.json();
    const checkOptions = {
      method: 'GET',
      headers: {
        accept: 'application/json',
        authorization: `${import.meta.env.VITE_PAYMONGO_KEY2}`
      }
    };


    const checkResponse = await fetch(`https://api.paymongo.com/v1/customers?email=${encodeURIComponent(email)}`, checkOptions);
    const checkData = await checkResponse.json();

    if (checkResponse.ok && checkData.data.length > 0) {
      return json({ data: checkData.data[0] }, { status: 200 });
    }

    const createOptions = {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        authorization: `${import.meta.env.VITE_PAYMONGO_KEY2}`
      },
      body: JSON.stringify({
        data: {
          attributes: {
            first_name,
            last_name,
            phone,
            email,
            default_device
          }
        }
      })
    };

    const createResponse = await fetch('https://api.paymongo.com/v1/customers', createOptions);
    const createData = await createResponse.json();

    if (!createResponse.ok) {
      return json({ error: createData }, { status: createResponse.status });
    }
    return json({ data: createData.data }, { status: 200 });

  } catch (error) {
    console.error('Error in customer creation/checking process:', error);
    return json({ error: 'Failed to process customer request' }, { status: 500 });
  }
}
