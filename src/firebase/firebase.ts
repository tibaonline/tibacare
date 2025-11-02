import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAYldQVky_Q0zJ_b6D4BT1e2w4CHFIkhnQ",
  authDomain: "tibacare-bf54b.firebaseapp.com",
  projectId: "tibacare-bf54b",
  storageBucket: "tibacare-bf54b.appspot.com",
  messagingSenderId: "834753446358",
  appId: "1:834753446358:web:xxxxxxxxxxxxxxxx", // your App ID
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
