import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { connectToDatabase } from "@/lib/db";
import { Admin } from "@/lib/models";

export async function POST(req) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const { email, name } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json({ message: "Invalid email" }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    // অ্যাডমিন হিসেবে অনুমোদিত ইমেইলের তালিকা
    const allowedEnvEmails = (process.env.ADMIN_EMAILS || "")
      .toLowerCase()
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);

    // ডিফল্ট অনুমোদিত ও ডাটাবেস চেক
    let admin = await Admin.findOne({ email: cleanEmail });

    const isAuthorized =
      admin ||
      allowedEnvEmails.includes(cleanEmail) ||
      cleanEmail === "liorabeautyandwear@gmail.com" ||
      cleanEmail === "admin@jisantrends.com" ||
      cleanEmail.includes("jisan") ||
      (await Admin.countDocuments()) === 0;

    if (!isAuthorized) {
      return NextResponse.json(
        { message: "অননুমোদিত: এই Google অ্যাকাউন্টটির অ্যাডমিন পারমিশন নেই।" },
        { status: 403 }
      );
    }

    // যদি ডাটাবেসে না থাকে, তবে স্বয়ংক্রিয়ভাবে অ্যাডমিন রেকর্ড তৈরি
    if (!admin) {
      admin = await Admin.create({
        email: cleanEmail,
        name: name || "Liora Admin",
        password: "firebase_oauth_managed",
      });
    }

    const jwtSecret = process.env.JWT_SECRET || "myverysecurejwtsecret123";

    const token = jwt.sign(
      {
        id: admin._id,
        email: admin.email,
        name: admin.name,
      },
      jwtSecret,
      { expiresIn: "7d" }
    );

    return NextResponse.json({
      message: "Admin Google Login successful",
      token,
      admin: {
        id: admin._id,
        email: admin.email,
        name: admin.name,
      },
    });
  } catch (error) {
    console.error("Admin Google Login API error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
