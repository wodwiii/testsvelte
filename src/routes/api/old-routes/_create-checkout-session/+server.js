// @ts-nocheck
import { db } from '$lib/firebase/firebaseAdmin';
import { json } from '@sveltejs/kit';

export async function POST({ request }) {
  const { plan , uid } = await request.json();

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
          send_email_receipt: false,
          show_description: true,
          show_line_items: true,
          description: `Payment for 1-Month ${plan} Subscription`,
          payment_method_types: ['gcash', 'card'],
          success_url: 'https://testsvelte-payments.vercel.app/verify-checkout',
          line_items: [
            {
              currency: 'PHP',
              amount: plan === 'Lite' ? 30000 : 60000,
              description: `${plan} Plan`,
              name: `${plan} Plan`,
              quantity: 1
            }
          ]
        }
      }
    })
  };

  try {
    const response = await fetch('https://api.paymongo.com/v1/checkout_sessions', options);
    const data = await response.json();
    await storeFirebase(uid, data.data)
    return json({ checkout_url: data.data.attributes.checkout_url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}

const storeFirebase = async (userID, data) => {
  try {
      const planSuffix = data.attributes.description.includes("Pro") ? 'Pro' : 'Lite';
      const path = `checkouts/${userID}/${planSuffix}_${data.id}`;

    
    await db.ref(path).set({
      data: data,
      created_at: Date.now(),
    });

    console.log(`Data stored successfully at path: ${path}`);
  } catch (error) {
    console.error('Error storing data in Firebase:', error);
    throw error;
  }
};
