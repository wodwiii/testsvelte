import { initializeApp, getApps, getApp, deleteApp } from "firebase/app";
import {getAuth, setPersistence, inMemoryPersistence } from "firebase/auth"
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_APIKEY,
  authDomain:import.meta.env.VITE_AUTHDOMAIN,
  databaseURL: import.meta.env.VITE_DATABASEURL,
  projectId: import.meta.env.VITE_PROJECTID,
  storageBucket: import.meta.env.VITE_STORAGEBUCKET,
  messagingSenderId: import.meta.env.VITE_MESSAGINGSENDERID,
  appId: import.meta.env.VITE_APPID,
  measurementId: import.meta.env.VITE_MEASUREMENTID
};


let firebaseApp;
if(!getApps().length){
    firebaseApp = initializeApp(firebaseConfig);
}else{
    firebaseApp = getApp();
    deleteApp(firebaseApp);
    firebaseApp = initializeApp(firebaseConfig);
}

export const auth = getAuth(firebaseApp);
export const database = getDatabase(firebaseApp);