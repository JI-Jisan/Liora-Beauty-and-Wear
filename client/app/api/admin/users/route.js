import { NextResponse } from "next/server";
import { getAdminFromRequest } from "@/lib/adminGuard";
import { getFirebaseAdminApp } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

export async function GET(req) {
  const admin = getAdminFromRequest(req);
  if (!admin) {
    return NextResponse.json({ message: "অননুমোদিত: অ্যাডমিন টোকেন প্রয়োজন" }, { status: 401 });
  }

  try {
    const app = await getFirebaseAdminApp();
    if (!app) {
      return NextResponse.json({ message: "Firebase Admin ইনিশিয়ালাইজ করা যায়নি" }, { status: 500 });
    }

    // 1. Fetch Firestore admins collection (does NOT depend on jwks-rsa/jose)
    const adminMap = new Map();
    try {
      const { getFirestore } = await import("firebase-admin/firestore");
      const db = getFirestore(app);
      const adminDocs = await db.collection("admins").get();
      adminDocs.forEach((doc) => {
        const data = doc.data() || {};
        const docId = doc.id.toLowerCase();
        adminMap.set(docId, data);
        if (data.email) adminMap.set(data.email.toLowerCase(), data);
        if (data.uid) adminMap.set(data.uid, data);
      });
    } catch (fsErr) {
      console.warn("Firestore admins fetch warning:", fsErr?.message);
    }

    const users = [];
    const knownEmails = new Map();

    // 2. Fetch all Firebase Auth users (safely wrapped)
    try {
      const { getAuth } = await import("firebase-admin/auth");
      const auth = getAuth(app);
      const listResult = await auth.listUsers(1000);
      listResult.users.forEach((u) => {
        const cleanEmail = (u.email || "").toLowerCase();
        const hasAdminClaim =
          u.customClaims?.role === "admin" || u.customClaims?.admin === true;
        const hasFirestoreDoc =
          adminMap.has(cleanEmail) || adminMap.has(u.uid);

        const isAdmin = hasAdminClaim || hasFirestoreDoc;
        const userObj = {
          uid: u.uid,
          email: u.email || "",
          displayName: u.displayName || "",
          photoURL: u.photoURL || "",
          creationTime: u.metadata?.creationTime || "",
          lastSignInTime: u.metadata?.lastSignInTime || "",
          role: isAdmin ? "admin" : "user",
          isAdmin,
        };
        users.push(userObj);
        if (cleanEmail) knownEmails.set(cleanEmail, userObj);
      });
    } catch (authErr) {
      console.warn("Firebase Auth listUsers warning, falling back to DB:", authErr?.message);
    }

    // 3. Fallback / Merge with MongoDB Customer collection
    try {
      const { connectToDatabase } = await import("@/lib/db");
      const { Customer } = await import("@/lib/models");
      await connectToDatabase();
      const dbCustomers = await Customer.find({}).sort({ createdAt: -1 }).limit(1000).lean();
      dbCustomers.forEach((c) => {
        const cEmail = (c.email || "").toLowerCase().trim();
        if (cEmail && !knownEmails.has(cEmail)) {
          const isAdmin = adminMap.has(cEmail) || (c.firebaseUid && adminMap.has(c.firebaseUid));
          const userObj = {
            uid: c.firebaseUid || c._id?.toString() || "",
            email: cEmail,
            displayName: c.name || "",
            photoURL: "",
            creationTime: c.createdAt ? new Date(c.createdAt).toISOString() : "",
            lastSignInTime: "",
            role: isAdmin ? "admin" : "user",
            isAdmin,
          };
          users.push(userObj);
          knownEmails.set(cEmail, userObj);
        }
      });
    } catch (dbErr) {
      console.warn("Customer DB fallback warning:", dbErr?.message);
    }

    // 4. Include any pre-authorized emails from Firestore admins that might not be in auth or customer list yet
    adminMap.forEach((data, key) => {
      if (key.includes("@") && !knownEmails.has(key)) {
        knownEmails.set(key, true);
        users.push({
          uid: data?.uid || "",
          email: key,
          displayName: "Pre-authorized Admin",
          photoURL: "",
          creationTime: data?.updatedAt || "",
          lastSignInTime: "",
          role: "admin",
          isAdmin: true,
          isPreAuthorized: true,
        });
      }
    });

    // Sort admins first, then by creation date
    users.sort((a, b) => {
      if (a.isAdmin && !b.isAdmin) return -1;
      if (!a.isAdmin && b.isAdmin) return 1;
      return (b.creationTime || "").localeCompare(a.creationTime || "");
    });

    return NextResponse.json({
      success: true,
      users,
      totalCount: users.length,
      adminCount: users.filter((u) => u.isAdmin).length,
    });
  } catch (err) {
    console.error("GET /api/admin/users error:", err);
    return NextResponse.json({ message: "ইউজার লোড করতে সমস্যা হয়েছে: " + err.message }, { status: 500 });
  }
}

export async function POST(req) {
  const admin = getAdminFromRequest(req);
  if (!admin) {
    return NextResponse.json({ message: "অননুমোদিত: অ্যাডমিন টোকেন প্রয়োজন" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { email, role } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ message: "সঠিক ইমেইল অ্যাড্রেস প্রদান করুন" }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const targetRole = role === "admin" ? "admin" : "user";

    const app = await getFirebaseAdminApp();
    if (!app) {
      return NextResponse.json({ message: "Firebase Admin ইনিশিয়ালাইজ করা যায়নি" }, { status: 500 });
    }

    const { getFirestore } = await import("firebase-admin/firestore");
    const db = getFirestore(app);

    // Look up user in Firebase Auth safely
    let firebaseUser = null;
    let auth = null;
    try {
      const { getAuth } = await import("firebase-admin/auth");
      auth = getAuth(app);
      firebaseUser = await auth.getUserByEmail(cleanEmail);
    } catch (authErr) {
      console.warn("Auth user lookup note:", authErr?.message);
    }

    if (targetRole === "admin") {
      // 1. Set Custom Claims in Firebase Auth if account exists
      if (auth && firebaseUser) {
        try {
          await auth.setCustomUserClaims(firebaseUser.uid, {
            role: "admin",
            admin: true,
          });
        } catch (claimErr) {
          console.warn("setCustomUserClaims note:", claimErr?.message);
        }
      }

      // 2. Set doc in Firestore admins collection by email and UID
      await db.collection("admins").doc(cleanEmail).set({
        role: "admin",
        email: cleanEmail,
        uid: firebaseUser?.uid || "",
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      if (firebaseUser?.uid) {
        await db.collection("admins").doc(firebaseUser.uid).set({
          role: "admin",
          email: cleanEmail,
          uid: firebaseUser.uid,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      }

      return NextResponse.json({
        success: true,
        message: `${cleanEmail} কে সফলভাবে অ্যাডমিন পারমিশন দেওয়া হয়েছে!`,
        role: "admin",
      });
    } else {
      // Revoke admin role
      if (auth && firebaseUser) {
        try {
          await auth.setCustomUserClaims(firebaseUser.uid, {
            role: "user",
            admin: false,
          });
        } catch (claimErr) {
          console.warn("revoke setCustomUserClaims note:", claimErr?.message);
        }
      }

      // Remove from Firestore admins collection
      await db.collection("admins").doc(cleanEmail).delete();
      if (firebaseUser?.uid) {
        await db.collection("admins").doc(firebaseUser.uid).delete();
      }

      return NextResponse.json({
        success: true,
        message: `${cleanEmail}-এর অ্যাডমিন এক্সেস বাতিল করা হয়েছে।`,
        role: "user",
      });
    }
  } catch (err) {
    console.error("POST /api/admin/users error:", err);
    return NextResponse.json({ message: "অপারেশন সম্পন্ন করতে সমস্যা হয়েছে: " + err.message }, { status: 500 });
  }
}
