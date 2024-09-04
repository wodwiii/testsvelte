// @ts-nocheck
import { database } from './firebase.client';
import { ref, get, set } from "firebase/database";
import { auth } from './firebase.client';

export const getSubscription = async () => {
  const user = auth.currentUser;
  if (user) {
    const verifiedRef = ref(database, `verified/${user.uid}/`);
    try {
      const snapshot = await get(verifiedRef);
      if (snapshot.exists()) {
        let latestSubscription = null;
        let latestTimestamp = 0;
        let latestKey = '';
        snapshot.forEach(childSnapshot => {
          const data = childSnapshot.val();
          const timestamp = data.created_at;
          if (timestamp > latestTimestamp) {
            latestTimestamp = timestamp;
            latestSubscription = data;
            latestKey = childSnapshot.key;
          }
        });
        const recurring = latestKey.includes('_subs_') ? true : false;
        console.log(latestSubscription);
        if (latestSubscription.status !== "total_cancelled") {
          const renewalDate = latestSubscription.data.attributes.updated_at
          ? new Date(new Date(latestSubscription.data.attributes.updated_at * 1000).setMonth(new Date(latestSubscription.data.attributes.updated_at * 1000).getMonth() + 1))
                .toISOString()
                .split('T')[0]
          : '';
          return {
            subs_id: latestSubscription.data.id,
            status: latestSubscription.status,
            renewalDate: renewalDate,
            subscriptionPlan: recurring? latestSubscription.data.attributes.plan.description.includes('Lite') ? 'LITE' : 'PRO' : latestSubscription.data.attributes.description.includes('Lite') ? 'LITE' : 'PRO'
          };
        }
        else if (latestSubscription.status === "total_cancelled" && new Date(latestSubscription.data.attributes.updated_at).getMonth+1 > new Date()) {
          return {
            subs_id: latestSubscription.data.id,
            status: latestSubscription.status,
            renewalDate: latestSubscription.data.attributes.next_billing_schedule,
            subscriptionPlan: latestSubscription.data.attributes.plan.description.includes('Lite') ? 'LITE' : 'PRO'
          };
        }      
      }
      return {
        status: "active",
        renewalDate: "FOREVER",
        subscriptionPlan: "FREE"
      };
    } catch (error) {
      console.error("Error fetching subscription:", error);
      throw error;
    }
  } else {
    throw new Error("No user is logged in");
  }
};


export const storeFirebase = async (jsonResponse) => {
  try {
    const { UID, planType, ID, data } = jsonResponse;
    const planSuffix = planType === 'Pro' ? 'Pro' : 'Lite';
    const path = `${planSuffix}_${ID}`;
    const dbRef = ref(database, `subs/${UID}/` + path);

    await set(dbRef, {
      data: data,
      created_at: Date.now(),
    });

    console.log(`Data stored successfully at path: ${path}`);
  } catch (error) {
    console.error('Error storing data in Firebase:', error);
    throw error;
  }
};