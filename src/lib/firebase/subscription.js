import { database } from './firebase.client';
import { ref, get } from "firebase/database";
import { auth } from './firebase.client';

export const getSubscription = async () => {
  const user = auth.currentUser;
  if (user) {
    const subscriptionRef = ref(database, 'subscriptions/' + user.uid);
    return get(subscriptionRef).then(snapshot => {
      if (snapshot.exists()) {
        return snapshot.val();
      } else {
        return null;
      }
    });
  } else {
    throw new Error("No user is logged in");
  }
};