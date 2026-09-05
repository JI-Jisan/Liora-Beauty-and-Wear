const DEFAULT_SERVICE_ACCOUNT = {
  projectId: "liora-beauty",
  clientEmail: "firebase-adminsdk-fbsvc@liora-beauty.iam.gserviceaccount.com",
  privateKey: `-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCvB/alBl+xt2eJ\nAcAED09w0eqBlTrU8s8bDNIwPI9/YJsujTheWnCg4qR4N2rGQILfUcgf93d4lHQL\n+U5ua/APF+kG+GICMKrw6i4ljUZthOYeqiHHvWq7ViJnSP6tsXXOyv894ltSsY2Q\nA18sznyRFq1B0zPwIGePMe8yp/GdiWMhZ3rX7ywszfY3j/07s2vt2FVTBHWin5YV\nfg58YcRJUUivR51y6zy5Al+KNsuBl6945xP6qqLQet+WvrLM+lejgPjRWXlrpg1u\nSRK2kmMEMH6FfH5RUuaqvXdlFSNTFSX1HplUSpl2WCdr7aQ/7hBpYR9Ywx1K113E\ntFWhMlVhAgMBAAECggEAFzzNQTs3kN5tclJB/hKoSdgHXx0tr+BCoG/ofJCgaS6t\nZkCdJ2MGHp39wZtzOLnk23rollyM8dHHwbU0yqfYObDDdnJF1M5FoPF+SexX2X9y\nQRz2RNCVhHnwMa/jvAdaQXz65mo7FJ9PpjsvCMGrO7n71kg7gNmp1hLbk76Z7ypP\nk5M1TgdNqsXJKxAmLcBdmBLPltTJ3drd1KMZH+AADFu9Q8UpZRzlk+T9VBRlyeRv\nvxhRgyhJ/1YpqfwgtPpjg41f8Iq8NP54dj7jS9X+Z2GfkbzIiZgE3v1AZ8C7KAo0\npR1q+gNgQjrOuAFMhUve0ab+ln6FLw04kcb8oDkwnwKBgQDZE5rRf6hFXfcYJGB8\nNkfxgnoCT9kBEex2tGy3qXGgSwJvgK62QBKoInIt56dFHJ6lYwlSNdScHImr26m8\ncr8Lzfl2y/HCuD1lrLghJE1Tokk2NvtKpUZHRAu1DPL3XiR1bu/VEsrJsR6UcXbv\n4pkXoAiRIipwesxsqqeOax0jxwKBgQDOalvsTGqhIiF9UFSxGHMxAdo7chnYVmbq\n9oLufiEHPfM85j6j0qkIcz1Wq8NizegE8gNXSOeWO1g3C9kIbK++5bXGZD5KEPoS\nfpXgJYzUQvwKnKFuVFHUivQ2gQlYwl31i3PNwudTmX3JZ9iaJrjc1GABzf8PXHHV\nYYU1CgXtlwKBgQC5ljdAcSGN3J4KN999knLDmcdx/o4KiiZd/jcMdoM8haSZa6zz\nB6hrsrdnY6vwPF2uDBPGA1u38/YHxg9Bm+CV2Q00cXxJ+3YSXS42t3Cc1hw9i5gf\n41lISHax3VZEAmqtM6E7y4swEIuSYcdLo7E7L4jjfBBIhdQL+4KxEgahtQKBgHkb\nxltaaqWoFOYln8tYgR2b7KM8SxW3fCMYB7JOpqpNGs38eXw9OZgPpUmY9cae8ScV\nqAgqalam8xc5CFn9CxCCTqjcX/+s/kyjoOQmo/5WXvMK+1x0dJ6z+J2SEB3XzLEo\n5QUw+fD++eKV32xyk7xdjwcACkrE/rUnxrRb8SZ5AoGACkzOCuz8eQVA+1eAhHKj\nJXQ6VHgBVPisOvQhm/yqk2cUAV8Op9eddZuEqcmlznWY03s0zIdznFrrBGvMJ7LX\nOltVAtI3QUCqwnPfGsMSVdzJwqIrMAyq/Ps+5ZaGKqb9zLhaDeaF81o+I9nu89Eq\nyX4WZUuG2SFUhjLkbUps4aw=\n-----END PRIVATE KEY-----\n`,
};

const FIREBASE_API_KEY =
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBQbrA8ZVPcyhbvRblLCAmEABCBw0PRYFM";

async function getFirebaseAdminApp() {
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID || DEFAULT_SERVICE_ACCOUNT.projectId;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || DEFAULT_SERVICE_ACCOUNT.clientEmail;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY || DEFAULT_SERVICE_ACCOUNT.privateKey;

    if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
      privateKey = privateKey.slice(1, -1);
    }
    privateKey = privateKey.replace(/\\n/g, "\n");

    const { initializeApp, getApps, cert } = await import("firebase-admin/app");
    return getApps().length
      ? getApps()[0]
      : initializeApp({
          credential: cert({ projectId, clientEmail, privateKey }),
        });
  } catch (e) {
    console.error("getFirebaseAdminApp error:", e?.message);
    return null;
  }
}

// Fallback verification using Google Identity Toolkit REST API
async function verifyViaGoogleIdentity(idToken) {
  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      }
    );

    if (!res.ok) return null;
    const data = await res.json();
    const u = data.users?.[0];
    if (!u) return null;

    let customClaims = {};
    if (u.customAttributes) {
      try {
        customClaims = JSON.parse(u.customAttributes);
      } catch {}
    }

    return {
      uid: u.localId,
      email: u.email,
      name: u.displayName || "",
      role: customClaims.role || (customClaims.admin ? "admin" : null),
      admin: customClaims.admin === true,
      ...customClaims,
    };
  } catch (e) {
    console.error("Google Identity verify error:", e?.message);
    return null;
  }
}

export async function getUserFromRequest(req) {
  try {
    const header = req.headers.get("authorization") || "";
    if (!header.startsWith("Bearer ")) return null;
    const token = header.slice(7).trim();
    if (!token) return null;

    // 1. Try Firebase Admin SDK
    try {
      const app = await getFirebaseAdminApp();
      if (app) {
        const { getAuth } = await import("firebase-admin/auth");
        return await getAuth(app).verifyIdToken(token);
      }
    } catch {}

    // 2. Fallback to Google Identity Toolkit REST API
    let user = await verifyViaGoogleIdentity(token);
    if (user) return user;

    // 3. Fallback to direct JWT decode
    try {
      const { default: jwt } = await import("jsonwebtoken");
      const decoded = jwt.decode(token);
      if (decoded && (decoded.user_id || decoded.sub)) {
        return {
          uid: decoded.user_id || decoded.sub,
          email: (decoded.email || "").toLowerCase().trim(),
          name: decoded.name || decoded.displayName || "",
          phone_number: decoded.phone_number || "",
          ...decoded,
        };
      }
    } catch {}

    return null;
  } catch (err) {
    console.error("Firebase auth error:", err?.message);
    return null;
  }
}

export async function verifyAuthAndRole(idToken) {
  try {
    if (!idToken) return null;

    let decodedToken = null;

    // Method 1: Firebase Admin SDK verifyIdToken
    try {
      const app = await getFirebaseAdminApp();
      if (app) {
        const { getAuth } = await import("firebase-admin/auth");
        decodedToken = await getAuth(app).verifyIdToken(idToken);
      }
    } catch (e) {
      console.warn("Firebase Admin SDK verify failed, trying Google API:", e?.message);
    }

    // Method 2: Google Identity Toolkit API fallback
    if (!decodedToken) {
      decodedToken = await verifyViaGoogleIdentity(idToken);
    }

    if (!decodedToken || !decodedToken.uid) {
      return null;
    }

    // 1. Check Custom Claims
    let role = "user";
    if (
      decodedToken.role === "admin" ||
      decodedToken.admin === true ||
      decodedToken.role === "owner"
    ) {
      role = "admin";
    }

    // 2. Check Firestore (users, admins, or {uid} collection)
    if (role !== "admin") {
      try {
        const app = await getFirebaseAdminApp();
        if (app) {
          const { getFirestore } = await import("firebase-admin/firestore");
          const firestore = getFirestore(app);

          // Check users/{uid}
          const userDoc = await firestore.collection("users").doc(decodedToken.uid).get();
          if (userDoc.exists && (userDoc.data()?.role === "admin" || userDoc.data()?.isAdmin === true)) {
            role = "admin";
          }

          // Check admins/{uid}
          if (role !== "admin") {
            const adminDoc = await firestore.collection("admins").doc(decodedToken.uid).get();
            if (adminDoc.exists) role = "admin";
          }

          // Check {uid}/{uid}
          if (role !== "admin") {
            const directDoc = await firestore.collection(decodedToken.uid).doc(decodedToken.uid).get();
            if (directDoc.exists && directDoc.data()?.role === "admin") role = "admin";
          }
        }
      } catch (fsErr) {
        console.warn("Firestore role check warning:", fsErr?.message);
      }
    }

    // 3. Check Known Emails or MongoDB Admin collection
    if (role !== "admin" && decodedToken.email) {
      const cleanEmail = decodedToken.email.toLowerCase().trim();
      const allowedEnvEmails = (process.env.ADMIN_EMAILS || "")
        .toLowerCase()
        .split(",")
        .map((e) => e.trim())
        .filter(Boolean);

      if (
        allowedEnvEmails.includes(cleanEmail) ||
        cleanEmail === "liorabeautyandwear@gmail.com" ||
        cleanEmail === "admin@jisantrends.com"
      ) {
        role = "admin";
      } else {
        try {
          const { connectToDatabase } = await import("@/lib/db");
          const { Admin } = await import("@/lib/models");
          await connectToDatabase();
          const adminRecord = await Admin.findOne({ email: cleanEmail });
          if (adminRecord) {
            role = "admin";
          }
        } catch (dbErr) {
          console.error("DB Admin check error:", dbErr?.message);
        }
      }
    }

    return {
      decodedToken,
      role,
      isAdmin: role === "admin",
    };
  } catch (err) {
    console.error("verifyAuthAndRole general error:", err?.message);
    return null;
  }
}
