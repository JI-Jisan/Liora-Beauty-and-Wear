import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { connectToDatabase } from "@/lib/db";
import { Admin } from "@/lib/models";

export async function POST(req) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password || typeof email !== "string" || typeof password !== "string") {
      return NextResponse.json({ message: "Invalid payload format" }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if any admin exists, if not seed default admin
    const adminCount = await Admin.countDocuments();
    if (adminCount === 0) {
      const defaultPassword = process.env.ADMIN_PASSWORD || "admin123456";
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);
      await Admin.create({
        name: "Jisan Admin",
        email: "admin@jisantrends.com",
        password: hashedPassword,
      });
    }

    const admin = await Admin.findOne({ email: cleanEmail });

    if (!admin) {
      return NextResponse.json({ message: "Invalid email or password" }, { status: 401 });
    }

    const isMatch = await bcrypt.compare(password, admin.password);

    if (!isMatch) {
      return NextResponse.json({ message: "Invalid email or password" }, { status: 401 });
    }

    const jwtSecret = process.env.JWT_SECRET;

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
    return NextResponse.json({ message: error.message || "Internal server error" }, { status: 500 });
  }
}
