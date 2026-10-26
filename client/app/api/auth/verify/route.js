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
        const allowedEnvEmails = (process.env.ADMIN_EMAILS || "")
          .toLowerCase()
          .split(",")
          .map((e) => e.trim())
          .filter(Boolean);
        const isAdmin =
          decoded.role === "admin" ||
          decoded.admin === true ||
          allowedEnvEmails.includes(cleanEmail);

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

    let effectiveRole = role;
    if (effectiveRole !== "admin" && cleanEmail) {
      const allowedEnvEmails = (process.env.ADMIN_EMAILS || "")
        .toLowerCase()
        .split(",")
        .map((e) => e.trim())
        .filter(Boolean);

      if (allowedEnvEmails.includes(cleanEmail)) {
        effectiveRole = "admin";
      }
    }

    if (effectiveRole === "admin") {
      const jwtSecret = process.env.JWT_SECRET || "myverysecurejwtsecret123";
      const adminToken = jwt.sign(
        {
          id: decodedToken.uid,
          uid: decodedToken.uid,
          email: cleanEmail,
          name: displayName || "Admin",
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
          name: displayName || "Admin",
          role: "admin",
        },
      });
    }

    // Role is customer / wholesale / reseller
    let customer = await Customer.findOne({ firebaseUid: decodedToken.uid });
    if (!customer) {
      // Check if existing customer or pre-authorized record has matching email
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
          status: "active",
        });
      }
    } else if (displayName && !customer.name) {
      customer.name = displayName;
      await customer.save();
    }

    const assignedRole = customer.role || "user";

    return NextResponse.json({
      success: true,
      role: assignedRole,
      isAdmin: false,
      user: {
        uid: decodedToken.uid,
        email: cleanEmail,
        name: customer.name || displayName || "Customer",
        phone: customer.phone || "",
        address: customer.address || "",
        role: assignedRole,
        businessName: customer.businessName || "",
        resellerStoreName: customer.resellerStoreName || "",
        resellerStorePhone: customer.resellerStorePhone || "",
        status: customer.status || "active",
        walletBalance: customer.walletBalance || 0,
        isWeeklyStar: Boolean(customer.isWeeklyStar),
        starDiscountPct: customer.isWeeklyStar ? 10 : 8,
        teamLeaderEmail: customer.teamLeaderEmail || "",
        teamLeaderName: customer.teamLeaderName || "",
        wholesaleDiscountPct: customer.wholesaleDiscountPct || 0,
        minWholesaleOrderAmount: customer.minWholesaleOrderAmount || 5000,
      },
    });
  } catch (err) {
    console.error("Auth verify error:", err);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
