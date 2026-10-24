import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Customer } from "@/lib/models";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const {
      email,
      name,
      phone,
      businessName,
      address,
      tradeLicense,
      note,
    } = body;

    if (!email || !email.includes("@")) {
      return NextResponse.json({ message: "সঠিক ইমেইল ঠিকানা দিন" }, { status: 400 });
    }
    if (!phone || phone.length < 11) {
      return NextResponse.json({ message: "সঠিক মোবাইল নম্বর দিন" }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    let customer = await Customer.findOne({ email: cleanEmail });
    if (customer) {
      customer.role = "wholesale";
      customer.status = customer.status === "active" ? "active" : "pending";
      if (businessName) customer.businessName = String(businessName).trim();
      if (name && !customer.name) customer.name = String(name).trim();
      if (phone && !customer.phone) customer.phone = String(phone).trim();
      if (address && !customer.address) customer.address = String(address).trim();
      customer.note = `${customer.note ? customer.note + " | " : ""}Application: ${tradeLicense || ""} ${note || ""}`;
      await customer.save();
    } else {
      customer = await Customer.create({
        email: cleanEmail,
        name: String(name || "").trim() || cleanEmail.split("@")[0],
        phone: String(phone || "").trim(),
        address: String(address || "").trim(),
        role: "wholesale",
        status: "pending",
        businessName: String(businessName || "").trim(),
        note: `New wholesale application. Trade/FB: ${tradeLicense || ""} ${note || ""}`,
      });
    }

    return NextResponse.json({
      success: true,
      message: "আপনার আবেদনটি গৃহীত হয়েছে। অ্যাডমিন টিম শীঘ্রই আপনার পাইকারি এক্সেস অনুমোদন করবে।",
    });
  } catch (err) {
    console.error("Wholesale application error:", err);
    return NextResponse.json({ message: "আবেদন প্রক্রিয়াকরণে সমস্যা: " + err.message }, { status: 500 });
  }
}
