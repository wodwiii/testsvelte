// @ts-nocheck
import { json } from '@sveltejs/kit';
import { db, auth } from '$lib/firebase/firebaseAdmin.js';

export async function POST({ request }) {
    try {
      const { uid , subs_id } = await request.json();
      const options = {
        method: 'GET',
        headers: {
          accept: 'application/json',
          authorization: `${import.meta.env.VITE_PAYMONGO_KEY2}`
        }
      };

      const response = await fetch(`https://api.paymongo.com/v1/subscriptions/${subs_id}`, options);
      const subscriptionDetails = await response.json();
      if(subscriptionDetails.data.attributes.latest_invoice.payment_intent.status !== 'succeeded'){
        console.error('Transaction not valid');
        return json({ message: 'Transaction not valid' }, { status: 500 });
      }
      await storeFirebase(uid, subscriptionDetails.data);
      return json({ message: 'Transaction successfully verified' }, { status: 200 });
    } catch (error) {
      console.error('Failed to verify the transaction:', error);
      return json({ message: 'Failed to verify the transaction' }, { status: 500 });
    }
  }


const storeFirebase = async (userID, subscriptionDetails) => {
    try {
      const planSuffix = subscriptionDetails.attributes.plan?.name.includes("Pro") ? 'Pro' : 'Lite';
      const path = `verified/${userID}/${planSuffix}_${subscriptionDetails.id}`;
      const snapshot = await db.ref(path).once('value');
      //just check snapshot if already existing so we dont rewrite
      if(snapshot.exists()){
        console.log(`Transaction already verified at ${path}`);
        return;
      }
      await db.ref(path).set({
        data: subscriptionDetails,
        created_at: Date.now(),
        status: "active",
      });
      console.log(`Data stored successfully at path: ${path}`);
    } catch (error) {
      console.error('Error storing data in Firebase:', error);
      throw error;
    }
  };