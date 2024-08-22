import { database } from './firebase.client';
import { ref, get, set } from "firebase/database";
import { auth } from './firebase.client';

export const getSubscription = async () => {
  const user = auth.currentUser;
  if (user) {
    const subscriptionRef = ref(database, 'subscriptions/' + user.uid);
    return get(subscriptionRef).then(snapshot => {
      if (snapshot.exists()) {
        return snapshot.val();
      } else {
        const subs = addSubscription(user.uid, "FREE", "FOREVER");
        return subs;
      }
    });
  } else {
    throw new Error("No user is logged in");
  }
};

// @ts-ignore
export const addSubscription = async (userId, plan, expires) => {
  try {
    const subscriptionRef = ref(database, 'subscriptions/' + userId);
    await set(subscriptionRef, {
      plan: plan,
      expires: expires
    });
    console.log('Subscription added for user:', userId);
    return get(subscriptionRef).then(snapshot =>{
      return snapshot.val();
    });
  } catch (error) {
    console.error('Error adding subscription:', error);
    return null;
  }
};