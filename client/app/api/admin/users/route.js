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

    const { getAuth } = await import("firebase-admin/auth");
    const { getFirestore } = await import("firebase-admin/firestore");
    const auth = getAuth(app);
    const db = getFirestore(app);

    // 1. Fetch Firestore admins collection
    const adminDocs = await db.collection("admins").get();
    const adminMap = new Map(); // email or uid -> data
    adminDocs.forEach((doc) => {
      adminMap.set(doc.id.toLowerCase(), doc.data());
      const data = doc.data();
      if (data?.email) {
        adminMap.set(data.email.toLowerCase(), data);
      }
      if (data?.uid) {
        adminMap.set(data.uid, data);
      }
    });

    // 2. Fetch all Firebase Auth users
    const listResult = await auth.listUsers(1000);
    const users = listResult.users.map((u) => {
      const cleanEmail = (u.email || "").toLowerCase();
      const hasAdminClaim =
        u.customClaims?.role === "admin" || u.customClaims?.admin === true;
      const hasFirestoreDoc =
        adminMap.has(cleanEmail) || adminMap.has(u.uid);

      const isAdmin = hasAdminClaim || hasFirestoreDoc;

      return {
        uid: u.uid,
        email: u.email || "",
        displayName: u.displayName || "",
        photoURL: u.photoURL || "",
        creationTime: u.metadata?.creationTime || "",
        lastSignInTime: u.metadata?.lastSignInTime || "",
        role: isAdmin ? "admin" : "user",
        isAdmin,
      };
    });

    // 3. Include any pre-authorized emails from Firestore admins that might not have logged in yet
    const existingEmails = new Set(users.map((u) => u.email.toLowerCase()).filter(Boolean));
    adminDocs.forEach((doc) => {
      const docId = doc.id.toLowerCase();
      if (docId.includes("@") && !existingEmails.has(docId)) {
        existingEmails.add(docId);
        users.push({
          uid: doc.data()?.uid || "",
          email: docId,
          displayName: "Pre-authorized Admin",
          photoURL: "",
          creationTime: doc.data()?.updatedAt || "",
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

    // Safety check: Prevent self-demotion
    if (targetRole === "user" && admin.email && admin.email.toLowerCase() === cleanEmail) {
      return NextResponse.json({ message: "আপনি নিজের অ্যাডমিন এক্সেস বাতিল করতে পারবেন না।" }, { status: 400 });
    }

    const app = await getFirebaseAdminApp();
    if (!app) {
      return NextResponse.json({ message: "Firebase Admin ইনিশিয়ালাইজ করা যায়নি" }, { status: 500 });
    }

    const { getAuth } = await import("firebase-admin/auth");
    const { getFirestore } = await import("firebase-admin/firestore");
    const auth = getAuth(app);
    const db = getFirestore(app);

    // Look up user in Firebase Auth
    let firebaseUser = null;
    try {
      firebaseUser = await auth.getUserByEmail(cleanEmail);
    } catch {
      // User might not be registered yet (pre-authorizing)
    }

    if (targetRole === "admin") {
      // 1. Set Custom Claims in Firebase Auth if account exists
      if (firebaseUser) {
        await auth.setCustomUserClaims(firebaseUser.uid, {
          role: "admin",
          admin: true,
        });
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
      if (firebaseUser) {
        await auth.setCustomUserClaims(firebaseUser.uid, {
          role: "user",
          admin: false,
        });
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
