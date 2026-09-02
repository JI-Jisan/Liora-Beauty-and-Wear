import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

let ready = null;

function init() {
  if (ready !== null) return ready;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY || "";

  // Vercel-এ কোটেশনসহ পেস্ট হলে সেগুলো সরানো
  if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
    privateKey = privateKey.slice(1, -1);
  }
  privateKey = privateKey.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey.includes("BEGIN PRIVATE KEY")) {
    console.error("Firebase admin env missing/malformed");
    ready = false;
    return ready;
  }

  try {
    if (!getApps().length) {
      initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
    }
    ready = true;
  } catch (e) {
    console.error("Firebase admin init failed:", e.message);
    ready = false;
  }
  return ready;
}

// Firebase ভাঙলেও null ফেরত দেয় — অর্ডার route কখনো ক্র্যাশ করবে না
export async function getUserFromRequest(req) {
  const header = req.headers.get("authorization") || "";
  if (!header.startsWith("Bearer ")) return null;
  if (!init()) return null;
  try {
    return await getAuth().verifyIdToken(header.slice(7));
  } catch {
    return null;
  }
}
