import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { connectToDatabase } from "@/lib/db";
import { Admin } from "@/lib/models";

const attempts = new Map();

function tooMany(ip) {
  const now = Date.now();
  const rec = attempts.get(ip) || { n: 0, t: now };
  if (now - rec.t > 15 * 60 * 1000) { rec.n = 0; rec.t = now; }
  rec.n++;
  attempts.set(ip, rec);
  return rec.n > 8;
}

export async function POST(req) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  if (tooMany(ip)) {
    return NextResponse.json({ message: "অনেকবার চেষ্টা হয়েছে, ১৫ মিনিট পর আবার" }, { status: 429 });
  }

  try {
    await connectToDatabase();
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password || typeof email !== "string" || typeof password !== "string") {
      return NextResponse.json({ message: "Invalid payload format" }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    const admin = await Admin.findOne({ email: cleanEmail });

    if (!admin) {
      return NextResponse.json({ message: "Invalid email or password" }, { status: 401 });
    }

    const isMatch = await bcrypt.compare(password, admin.password);

    if (!isMatch) {
      return NextResponse.json({ message: "Invalid email or password" }, { status: 401 });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error("JWT_SECRET missing");
      return NextResponse.json({ message: "Server config error" }, { status: 500 });
    }

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
      message: "Login successful",
      token,
      admin: {
        id: admin._id,
        email: admin.email,
        name: admin.name,
      },
    });
  } catch (error) {
    console.error("Login API error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
