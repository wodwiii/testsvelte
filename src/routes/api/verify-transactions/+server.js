// @ts-nocheck
import { json } from '@sveltejs/kit';
import { db, auth } from '$lib/firebase/firebaseAdmin.js';

export async function POST({ request }) {
    try {
      const { uid , id } = await request.json();
      const options = {
        method: 'GET',
        headers: {
          accept: 'application/json',
          authorization: `${import.meta.env.VITE_PAYMONGO_KEY2}`
        }
      };
      const queryType = id.includes('sub_')? 'subscriptions' : 'payment_intents';
      const response = await fetch(`https://api.paymongo.com/v1/${queryType}/${id}`, options);
      const transactionDetails = await response.json();
      if(queryType === "subscriptions"){
        if(transactionDetails.data.attributes.latest_invoice.payment_intent.status !== 'succeeded'){
          console.error('Transaction not valid');
          return json({ message: 'Transaction not valid' }, { status: 500 });
        }
      }
      else{
        if(transactionDetails.data.attributes.status !== 'succeeded'){
          console.error('Transaction not valid');
          return json({ message: 'Transaction not valid' }, { status: 500 });
        }
      }
      await storeFirebase(uid, transactionDetails.data);
      return json({ message: 'Transaction successfully verified' }, { status: 200 });
    } catch (error) {
      console.error('Failed to verify the transaction:', error);
      return json({ message: 'Failed to verify the transaction' }, { status: 500 });
    }
  }


const storeFirebase = async (userID, transactionDetails) => {
    const recurring = transactionDetails.id.includes('subs_')? true: false;
    let path;
    try {
      if(recurring){
        const planSuffix = transactionDetails.attributes.plan?.name.includes("Pro") ? 'Pro' : 'Lite';
        path = `verified/${userID}/${planSuffix}_${transactionDetails.id}`;
      }
      else{
        const planSuffix = transactionDetails.attributes.plan?.name.includes("Pro") ? 'Pro' : 'Lite';
        path = `verified/${userID}/${planSuffix}_${transactionDetails.id}`;
      }
      const planSuffix = transactionDetails.attributes.description.includes("Pro") ? 'Pro' : 'Lite';
      path = `verified/${userID}/${planSuffix}_${transactionDetails.id}`;
      const snapshot = await db.ref(path).once('value');
      //just check snapshot if already existing so we dont rewrite
      // if(snapshot.exists()){
      //   console.log(`Transaction already verified at ${path}`);
      //   return;
      // }
      await db.ref(path).set({
        data: transactionDetails,
        created_at: Date.now(),
        status: "active",
      });
      console.log(`Data stored successfully at path: ${path}`);
    } catch (error) {
      console.error('Error storing data in Firebase:', error);
      throw error;
    }
  };