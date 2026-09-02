import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBQbrA8ZVPcyhbvRbllCAMeABCBw0PRYFM",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "liora-beauty.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "liora-beauty",
  storageBucket: "liora-beauty.firebasestorage.app",
  messagingSenderId: "672128157563",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:672128157563:web:6d617b640f31658c649fde",
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const auth = getAuth(app);
