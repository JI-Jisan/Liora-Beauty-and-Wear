import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

const DEFAULT_SERVICE_ACCOUNT = {
  projectId: "liora-beauty",
  clientEmail: "firebase-adminsdk-fbsvc@liora-beauty.iam.gserviceaccount.com",
  privateKey: `-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCvB/alBl+xt2eJ\nAcAED09w0eqBlTrU8s8bDNIwPI9/YJsujTheWnCg4qR4N2rGQILfUcgf93d4lHQL\n+U5ua/APF+kG+GICMKrw6i4ljUZthOYeqiHHvWq7ViJnSP6tsXXOyv894ltSsY2Q\nA18sznyRFq1B0zPwIGePMe8yp/GdiWMhZ3rX7ywszfY3j/07s2vt2FVTBHWin5YV\nfg58YcRJUUivR51y6zy5Al+KNsuBl6945xP6qqLQet+WvrLM+lejgPjRWXlrpg1u\nSRK2kmMEMH6FfH5RUuaqvXdlFSNTFSX1HplUSpl2WCdr7aQ/7hBpYR9Ywx1K113E\ntFWhMlVhAgMBAAECggEAFzzNQTs3kN5tclJB/hKoSdgHXx0tr+BCoG/ofJCgaS6t\nZkCdJ2MGHp39wZtzOLnk23rollyM8dHHwbU0yqfYObDDdnJF1M5FoPF+SexX2X9y\nQRz2RNCVhHnwMa/jvAdaQXz65mo7FJ9PpjsvCMGrO7n71kg7gNmp1hLbk76Z7ypP\nk5M1TgdNqsXJKxAmLcBdmBLPltTJ3drd1KMZH+AADFu9Q8UpZRzlk+T9VBRlyeRv\nvxhRgyhJ/1YpqfwgtPpjg41f8Iq8NP54dj7jS9X+Z2GfkbzIiZgE3v1AZ8C7KAo0\npR1q+gNgQjrOuAFMhUve0ab+ln6FLw04kcb8oDkwnwKBgQDZE5rRf6hFXfcYJGB8\nNkfxgnoCT9kBEex2tGy3qXGgSwJvgK62QBKoInIt56dFHJ6lYwlSNdScHImr26m8\ncr8Lzfl2y/HCuD1lrLghJE1Tokk2NvtKpUZHRAu1DPL3XiR1bu/VEsrJsR6UcXbv\n4pkXoAiRIipwesxsqqeOax0jxwKBgQDOalvsTGqhIiF9UFSxGHMxAdo7chnYVmbq\n9oLufiEHPfM85j6j0qkIcz1Wq8NizegE8gNXSOeWO1g3C9kIbK++5bXGZD5KEPoS\nfpXgJYzUQvwKnKFuVFHUivQ2gQlYwl31i3PNwudTmX3JZ9iaJrjc1GABzf8PXHHV\nYYU1CgXtlwKBgQC5ljdAcSGN3J4KN999knLDmcdx/o4KiiZd/jcMdoM8haSZa6zz\nB6hrsrdnY6vwPF2uDBPGA1u38/YHxg9Bm+CV2Q00cXxJ+3YSXS42t3Cc1hw9i5gf\n41lISHax3VZEAmqtM6E7y4swEIuSYcdLo7E7L4jjfBBIhdQL+4KxEgahtQKBgHkb\nxltaaqWoFOYln8tYgR2b7KM8SxW3fCMYB7JOpqpNGs38eXw9OZgPpUmY9cae8ScV\nqAgqalam8xc5CFn9CxCCTqjcX/+s/kyjoOQmo/5WXvMK+1x0dJ6z+J2SEB3XzLEo\n5QUw+fD++eKV32xyk7xdjwcACkrE/rUnxrRb8SZ5AoGACkzOCuz8eQVA+1eAhHKj\nJXQ6VHgBVPisOvQhm/yqk2cUAV8Op9eddZuEqcmlznWY03s0zIdznFrrBGvMJ7LX\nOltVAtI3QUCqwnPfGsMSVdzJwqIrMAyq/Ps+5ZaGKqb9zLhaDeaF81o+I9nu89Eq\nyX4WZUuG2SFUhjLkbUps4aw=\n-----END PRIVATE KEY-----\n`,
};

const app = getApps().length ? getApps()[0] : initializeApp({
  credential: cert(DEFAULT_SERVICE_ACCOUNT)
});

const auth = getAuth(app);
const db = getFirestore(app);

const action = process.argv[2] || "list";
const target = process.argv[3]?.trim();

async function run() {
  if (action === "list") {
    console.log("📋 Fetching admins from Firestore collection 'admins'...");
    const snap = await db.collection("admins").get();
    snap.forEach((doc) => {
      console.log(` - ID: ${doc.id} =>`, doc.data());
    });
    return;
  }

  if (!target) {
    console.log("Usage:");
    console.log("  node scripts/manage-admin.mjs list");
    console.log("  node scripts/manage-admin.mjs add user@example.com");
    console.log("  node scripts/manage-admin.mjs remove user@example.com");
    return;
  }

  const isEmail = target.includes("@");
  let user = null;

  try {
    if (isEmail) {
      user = await auth.getUserByEmail(target.toLowerCase());
    } else {
      user = await auth.getUser(target);
    }
  } catch (e) {
    console.warn(`Note: Firebase Auth lookup warning (${e.message}). Proceeding with Firestore document.`);
  }

  const cleanEmail = (user?.email || (isEmail ? target : "")).toLowerCase();
  const uid = user?.uid || (!isEmail ? target : null);

  if (action === "add") {
    // 1. Set custom claims in Firebase Auth if user exists
    if (user) {
      await auth.setCustomUserClaims(user.uid, {
        role: "admin",
        admin: true,
      });
      console.log(`✅ Set custom claim { role: 'admin', admin: true } on Firebase Auth UID: ${user.uid}`);
    }

    // 2. Add to Firestore collection 'admins' by email and/or UID
    if (cleanEmail) {
      await db.collection("admins").doc(cleanEmail).set({
        role: "admin",
        email: cleanEmail,
        uid: uid || "",
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      console.log(`✅ Added to Firestore collection 'admins' with document ID: ${cleanEmail}`);
    }

    if (uid) {
      await db.collection("admins").doc(uid).set({
        role: "admin",
        email: cleanEmail || "",
        uid: uid,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      console.log(`✅ Added to Firestore collection 'admins' with document ID: ${uid}`);
    }

    console.log(`🎉 SUCCESS: ${target} is now an ADMIN in Firebase!`);
  } else if (action === "remove") {
    // 1. Remove custom claims
    if (user) {
      await auth.setCustomUserClaims(user.uid, {
        role: "user",
        admin: false,
      });
      console.log(`✅ Removed custom claims on Firebase Auth UID: ${user.uid}`);
    }

    // 2. Remove from Firestore collection 'admins'
    if (cleanEmail) {
      await db.collection("admins").doc(cleanEmail).delete();
      console.log(`✅ Removed from Firestore collection 'admins': ${cleanEmail}`);
    }
    if (uid) {
      await db.collection("admins").doc(uid).delete();
      console.log(`✅ Removed from Firestore collection 'admins': ${uid}`);
    }

    console.log(`🚫 SUCCESS: ${target} admin access has been REVOKED.`);
  }
}

run().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
