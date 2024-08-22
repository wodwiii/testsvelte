// @ts-nocheck
import { writable } from "svelte/store";
import {auth} from "../lib/firebase/firebase.client";
import { createUserWithEmailAndPassword, GoogleAuthProvider, sendPasswordResetEmail, signInWithEmailAndPassword, signInWithPopup, signOut, updatePassword } from "firebase/auth";
import { getSubscription } from "$lib/firebase/subscription.client";

export const authStore = writable({
    isLoading: false,
    currentUser: null,
})

export const subscription = writable(null);

export const fetchSubscription = async () => {
  const data = await getSubscription();
  subscription.set(data);
};

export const authHandlers = {
    login: async(email, password) =>{
        await signInWithEmailAndPassword(auth, email, password);
    },
    signup: async(email,password) =>{
        await createUserWithEmailAndPassword(auth,email,password)
    },
    logout: async () =>{
        await signOut(auth)
    },
    google: async() => {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider)
    }
}