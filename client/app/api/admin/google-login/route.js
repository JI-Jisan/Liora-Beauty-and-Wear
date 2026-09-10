import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { getFirebaseAdminApp } from "@/lib/firebaseAdmin";

export async function POST(req) {
  try {
    const body = await req.json();
    const { email, name } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json({ message: "Invalid email" }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    // অ্যাডমিন হিসেবে অনুমোদিত ইমেইলের তালিকা (Environment variable)
    const allowedEnvEmails = (process.env.ADMIN_EMAILS || "")
      .toLowerCase()
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);

    // Check Firestore admins collection
    let firestoreAdmin = false;
    try {
      const app = await getFirebaseAdminApp();
      if (app) {
        const { getFirestore } = await import("firebase-admin/firestore");
        const db = getFirestore(app);
        const doc = await db.collection("admins").doc(cleanEmail).get();
        if (doc.exists) firestoreAdmin = true;
      }
    } catch (fsErr) {
      console.warn("Firestore check warning:", fsErr?.message);
    }

    const isAuthorized = firestoreAdmin || allowedEnvEmails.includes(cleanEmail);

    if (!isAuthorized) {
      return NextResponse.json(
        { message: "অননুমোদিত: এই Google অ্যাকাউন্টটির অ্যাডমিন পারমিশন নেই।" },
        { status: 403 }
      );
    }

    const jwtSecret = process.env.JWT_SECRET || "myverysecurejwtsecret123";

    const token = jwt.sign(
      {
        email: cleanEmail,
        name: name || "Liora Admin",
        role: "admin",
      },
      jwtSecret,
      { expiresIn: "7d" }
    );

    return NextResponse.json({
      message: "Admin Google Login successful",
      token,
      admin: {
        email: cleanEmail,
        name: name || "Liora Admin",
        role: "admin",
      },
    });
  } catch (error) {
    console.error("Admin Google Login API error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
