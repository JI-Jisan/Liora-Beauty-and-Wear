const DEFAULT_SERVICE_ACCOUNT = {
  projectId: "liora-beauty",
  clientEmail: "firebase-adminsdk-fbsvc@liora-beauty.iam.gserviceaccount.com",
  privateKey: `-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCvB/alBl+xt2eJ\nAcAED09w0eqBlTrU8s8bDNIwPI9/YJsujTheWnCg4qR4N2rGQILfUcgf93d4lHQL\n+U5ua/APF+kG+GICMKrw6i4ljUZthOYeqiHHvWq7ViJnSP6tsXXOyv894ltSsY2Q\nA18sznyRFq1B0zPwIGePMe8yp/GdiWMhZ3rX7ywszfY3j/07s2vt2FVTBHWin5YV\nfg58YcRJUUivR51y6zy5Al+KNsuBl6945xP6qqLQet+WvrLM+lejgPjRWXlrpg1u\nSRK2kmMEMH6FfH5RUuaqvXdlFSNTFSX1HplUSpl2WCdr7aQ/7hBpYR9Ywx1K113E\ntFWhMlVhAgMBAAECggEAFzzNQTs3kN5tclJB/hKoSdgHXx0tr+BCoG/ofJCgaS6t\nZkCdJ2MGHp39wZtzOLnk23rollyM8dHHwbU0yqfYObDDdnJF1M5FoPF+SexX2X9y\nQRz2RNCVhHnwMa/jvAdaQXz65mo7FJ9PpjsvCMGrO7n71kg7gNmp1hLbk76Z7ypP\nk5M1TgdNqsXJKxAmLcBdmBLPltTJ3drd1KMZH+AADFu9Q8UpZRzlk+T9VBRlyeRv\nvxhRgyhJ/1YpqfwgtPpjg41f8Iq8NP54dj7jS9X+Z2GfkbzIiZgE3v1AZ8C7KAo0\npR1q+gNgQjrOuAFMhUve0ab+ln6FLw04kcb8oDkwnwKBgQDZE5rRf6hFXfcYJGB8\nNkfxgnoCT9kBEex2tGy3qXGgSwJvgK62QBKoInIt56dFHJ6lYwlSNdScHImr26m8\ncr8Lzfl2y/HCuD1lrLghJE1Tokk2NvtKpUZHRAu1DPL3XiR1bu/VEsrJsR6UcXbv\n4pkXoAiRIipwesxsqqeOax0jxwKBgQDOalvsTGqhIiF9UFSxGHMxAdo7chnYVmbq\n9oLufiEHPfM85j6j0qkIcz1Wq8NizegE8gNXSOeWO1g3C9kIbK++5bXGZD5KEPoS\nfpXgJYzUQvwKnKFuVFHUivQ2gQlYwl31i3PNwudTmX3JZ9iaJrjc1GABzf8PXHHV\nYYU1CgXtlwKBgQC5ljdAcSGN3J4KN999knLDmcdx/o4KiiZd/jcMdoM8haSZa6zz\nB6hrsrdnY6vwPF2uDBPGA1u38/YHxg9Bm+CV2Q00cXxJ+3YSXS42t3Cc1hw9i5gf\n41lISHax3VZEAmqtM6E7y4swEIuSYcdLo7E7L4jjfBBIhdQL+4KxEgahtQKBgHkb\nxltaaqWoFOYln8tYgR2b7KM8SxW3fCMYB7JOpqpNGs38eXw9OZgPpUmY9cae8ScV\nqAgqalam8xc5CFn9CxCCTqjcX/+s/kyjoOQmo/5WXvMK+1x0dJ6z+J2SEB3XzLEo\n5QUw+fD++eKV32xyk7xdjwcACkrE/rUnxrRb8SZ5AoGACkzOCuz8eQVA+1eAhHKj\nJXQ6VHgBVPisOvQhm/yqk2cUAV8Op9eddZuEqcmlznWY03s0zIdznFrrBGvMJ7LX\nOltVAtI3QUCqwnPfGsMSVdzJwqIrMAyq/Ps+5ZaGKqb9zLhaDeaF81o+I9nu89Eq\nyX4WZUuG2SFUhjLkbUps4aw=\n-----END PRIVATE KEY-----\n`,
};

async function getFirebaseAdminApp() {
  const projectId = process.env.FIREBASE_PROJECT_ID || DEFAULT_SERVICE_ACCOUNT.projectId;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || DEFAULT_SERVICE_ACCOUNT.clientEmail;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY || DEFAULT_SERVICE_ACCOUNT.privateKey;

  if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
    privateKey = privateKey.slice(1, -1);
  }
  privateKey = privateKey.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey.includes("BEGIN PRIVATE KEY")) {
    return null;
  }

  const { initializeApp, getApps, cert } = await import("firebase-admin/app");
  return getApps().length
    ? getApps()[0]
    : initializeApp({
        credential: cert({ projectId, clientEmail, privateKey }),
      });
}

export async function getUserFromRequest(req) {
  try {
    const header = req.headers.get("authorization") || "";
    if (!header.startsWith("Bearer ")) return null;
    const token = header.slice(7).trim();
    if (!token) return null;

    const app = await getFirebaseAdminApp();
    if (!app) return null;

    const { getAuth } = await import("firebase-admin/auth");
    return await getAuth(app).verifyIdToken(token);
  } catch (err) {
    console.error("Firebase admin auth error:", err?.message);
    return null;
  }
}

export async function verifyAuthAndRole(idToken) {
  try {
    if (!idToken) return null;
    const app = await getFirebaseAdminApp();
    if (!app) return null;

    const { getAuth } = await import("firebase-admin/auth");
    const decodedToken = await getAuth(app).verifyIdToken(idToken);

    // 1. Check Custom Claims directly set on Firebase Auth
    let role = "user";
    if (
      decodedToken.role === "admin" ||
      decodedToken.admin === true ||
      decodedToken.role === "owner"
    ) {
      role = "admin";
    }

    // 2. Check Firestore (users or admins collection in Firebase)
    if (role !== "admin") {
      try {
        const { getFirestore } = await import("firebase-admin/firestore");
        const firestore = getFirestore(app);
        
        // Check users/{uid}
        const userDoc = await firestore.collection("users").doc(decodedToken.uid).get();
        if (userDoc.exists) {
          const uData = userDoc.data() || {};
          if (uData.role === "admin" || uData.isAdmin === true) {
            role = "admin";
          }
        }

        // Check admins/{uid}
        if (role !== "admin") {
          const adminDoc = await firestore.collection("admins").doc(decodedToken.uid).get();
          if (adminDoc.exists) {
            role = "admin";
          }
        }
      } catch (fsErr) {
        // Firestore might not be activated, safe to ignore
      }
    }

    // 3. Check MongoDB Admin collection or predefined admin emails
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
    console.error("verifyAuthAndRole error:", err?.message);
    return null;
  }
}

