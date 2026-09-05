import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getUserFromRequest } from "@/lib/firebaseAdmin";
import { Customer } from "@/lib/models";

export const runtime = "nodejs";

export async function GET(req) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    let customer = await Customer.findOne({ firebaseUid: user.uid }).lean();
    if (!customer && user.email) {
      customer = await Customer.findOne({ email: user.email.toLowerCase().trim() }).lean();
    }

    return NextResponse.json({
      uid: user.uid,
      email: user.email || customer?.email || "",
      name: customer?.name || user.name || "",
      phone: customer?.phone || "",
      address: customer?.address || "",
    });
  } catch (err) {
    console.error("Profile GET error:", err);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const name = String(body.name || "").trim();
    const phone = String(body.phone || "").trim();
    const address = String(body.address || "").trim();

    await connectToDatabase();
    let customer = await Customer.findOne({ firebaseUid: user.uid });

    if (!customer) {
      customer = await Customer.create({
        firebaseUid: user.uid,
        email: user.email ? user.email.toLowerCase().trim() : "",
        name,
        phone,
        address,
      });
    } else {
      if (name) customer.name = name;
      if (phone) customer.phone = phone;
      if (address) customer.address = address;
      await customer.save();
    }

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
      profile: {
        uid: user.uid,
        email: customer.email,
        name: customer.name,
        phone: customer.phone,
        address: customer.address,
      },
    });
  } catch (err) {
    console.error("Profile PUT error:", err);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
