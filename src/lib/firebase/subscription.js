// @ts-nocheck
import { database } from './firebase.client';
import { ref, get, set } from "firebase/database";
import { auth } from './firebase.client';

export const getSubscription = async () => {
  const user = auth.currentUser;
  if (user) {
    const verifiedRef = ref(database, 'verified');
    try {
      const snapshot = await get(verifiedRef);
      if (snapshot.exists()) {
        const allVerified = snapshot.val();
        const userSubscriptionKey = Object.keys(allVerified).find(key => key.startsWith(user.uid));
        
        if (userSubscriptionKey) {
          const subscriptionData = allVerified[userSubscriptionKey];
          const planType = userSubscriptionKey.split('_')[1];
          
          return {
            subs_id: subscriptionData.data.id,
            status: subscriptionData.status,
            renewalDate: subscriptionData.data.attributes.next_billing_schedule,
            subscriptionPlan: planType
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
    const path = `${UID}_${planSuffix}_${ID}`;
    const dbRef = ref(database,'subs/'+ path);

    await set(dbRef, {
      data:data,
      created_at: Date.now(),
    });

    console.log(`Data stored successfully at path: ${path}`);
  } catch (error) {
    console.error('Error storing data in Firebase:', error);
    throw error;
  }
};