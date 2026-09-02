import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBQbrA8ZVPcyhbvRblLCAmEABCBw0PRYFM",
  authDomain: "liora-beauty.firebaseapp.com",
  projectId: "liora-beauty",
  storageBucket: "liora-beauty.firebasestorage.app",
  messagingSenderId: "672128157563",
  appId: "1:672128157563:web:6d617b640f31658c649fde",
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const auth = getAuth(app);
