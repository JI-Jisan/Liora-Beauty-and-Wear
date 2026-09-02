import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";

function getCleanValue(val, fallback) {
  if (!val || typeof val !== "string") return fallback;
  const cleaned = val.replace(/^["']|["']$/g, "").trim();
  if (cleaned.length < 5 || cleaned === "undefined" || cleaned === "null") return fallback;
  return cleaned;
}

const rawApiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const apiKey = (rawApiKey && rawApiKey.startsWith("AIzaSy"))
  ? rawApiKey.replace(/^["']|["']$/g, "").trim()
  : "AIzaSyBQbrA8ZVPcyhbvRbllCAMeABCBw0PRYFM";

const firebaseConfig = {
  apiKey: apiKey,
  authDomain: getCleanValue(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, "liora-beauty.firebaseapp.com"),
  projectId: getCleanValue(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID, "liora-beauty"),
  storageBucket: "liora-beauty.firebasestorage.app",
  messagingSenderId: "672128157563",
  appId: getCleanValue(process.env.NEXT_PUBLIC_FIREBASE_APP_ID, "1:672128157563:web:6d617b640f31658c649fde"),
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const auth = getAuth(app);
