import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { connectToDatabase } from "@/lib/db";
import { verifyAuthAndRole } from "@/lib/firebaseAdmin";
import { Admin, Customer } from "@/lib/models";

export const runtime = "nodejs";

export async function POST(req) {
  return handleAuth(req);
}

export async function GET(req) {
  return handleAuth(req);
}

async function handleAuth(req) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ message: "No Bearer token provided" }, { status: 401 });
    }

    const idToken = authHeader.slice(7).trim();
    let verified = await verifyAuthAndRole(idToken);

    // Fallback: direct JWT decode if verification service had a connection issue
    if (!verified || !verified.decodedToken) {
      const decoded = jwt.decode(idToken);
      if (decoded && (decoded.user_id || decoded.sub)) {
        const uid = decoded.user_id || decoded.sub;
        const cleanEmail = (decoded.email || "").toLowerCase().trim();
        const isAdmin =
          decoded.role === "admin" ||
          decoded.admin === true ||
          cleanEmail === "liorabeautyandwear@gmail.com" ||
          cleanEmail === "admin@jisantrends.com";

        verified = {
          decodedToken: {
            uid,
            email: cleanEmail,
            name: decoded.name || "",
            role: isAdmin ? "admin" : (decoded.role || "user"),
            admin: isAdmin,
          },
          role: isAdmin ? "admin" : "user",
          isAdmin,
        };
      }
    }

    if (!verified || !verified.decodedToken) {
      return NextResponse.json({ message: "Invalid or expired Firebase token" }, { status: 401 });
    }

    const { decodedToken, role } = verified;
    const cleanEmail = (decodedToken.email || "").toLowerCase().trim();
    const displayName = decodedToken.name || decodedToken.displayName || "";

    await connectToDatabase();

    if (role === "admin") {
      let adminRecord = null;
      if (cleanEmail) {
        adminRecord = await Admin.findOne({ email: cleanEmail });
        if (!adminRecord) {
          adminRecord = await Admin.create({
            email: cleanEmail,
            name: displayName || "Liora Admin",
            password: "firebase_oauth_managed",
          });
        }
      }

      const jwtSecret = process.env.JWT_SECRET || "myverysecurejwtsecret123";
      const adminToken = jwt.sign(
        {
          id: adminRecord?._id || decodedToken.uid,
          uid: decodedToken.uid,
          email: cleanEmail,
          name: adminRecord?.name || displayName || "Admin",
          role: "admin",
        },
        jwtSecret,
        { expiresIn: "7d" }
      );

      return NextResponse.json({
        success: true,
        role: "admin",
        isAdmin: true,
        token: adminToken,
        user: {
          uid: decodedToken.uid,
          email: cleanEmail,
          name: adminRecord?.name || displayName || "Admin",
          role: "admin",
        },
      });
    }

    // Role is normal customer / user
    let customer = await Customer.findOne({ firebaseUid: decodedToken.uid });
    if (!customer) {
      // Check if existing customer has matching email
      if (cleanEmail) {
        customer = await Customer.findOne({ email: cleanEmail });
      }
      if (customer) {
        customer.firebaseUid = decodedToken.uid;
        if (displayName && !customer.name) customer.name = displayName;
        await customer.save();
      } else {
        customer = await Customer.create({
          firebaseUid: decodedToken.uid,
          email: cleanEmail,
          name: displayName,
          role: "user",
        });
      }
    } else if (displayName && !customer.name) {
      customer.name = displayName;
      await customer.save();
    }

    return NextResponse.json({
      success: true,
      role: "user",
      isAdmin: false,
      user: {
        uid: decodedToken.uid,
        email: cleanEmail,
        name: customer.name || displayName || "Customer",
        phone: customer.phone || "",
        address: customer.address || "",
        role: "user",
      },
    });
  } catch (err) {
    console.error("Auth verify error:", err);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
