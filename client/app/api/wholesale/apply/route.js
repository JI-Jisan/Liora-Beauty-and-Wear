import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Customer } from "@/lib/models";
import { getFirebaseAdminApp } from "@/lib/firebaseAdmin";

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
      storeName,
      address,
      tradeLicense,
      fbPageLink,
      note,
      role = "wholesale",
      firebaseUid,
    } = body;

    if (!email || !email.includes("@")) {
      return NextResponse.json({ message: "সঠিক ইমেইল ঠিকানা দিন" }, { status: 400 });
    }
    if (!phone || phone.replace(/\D/g, "").length < 10) {
      return NextResponse.json({ message: "সঠিক মোবাইল নম্বর দিন (কমপক্ষে ১০-১১ ডিজিট)" }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = String(phone || "").trim();
    const cleanName = String(name || "").trim();
    const cleanAddress = String(address || "").trim();
    const targetRole = role === "reseller" ? "reseller" : "wholesale";
    const resolvedStore = String(storeName || businessName || "").trim();

    // Check if tradeLicense contains Facebook link or if explicit fbPageLink passed
    const rawTrade = String(tradeLicense || "").trim();
    const rawFb = String(fbPageLink || "").trim();
    const isFbInTrade =
      rawTrade.includes("facebook.com") ||
      rawTrade.includes("fb.com") ||
      rawTrade.includes("fb.watch") ||
      rawTrade.includes("share/");
    const resolvedFb = rawFb || (isFbInTrade ? rawTrade : "");
    const resolvedTrade = !isFbInTrade ? rawTrade : "";

    // Resolve Firebase UID if user is logged in
    let finalUid = undefined;
    try {
      const authHeader = req.headers.get("authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.split(" ")[1];
        const app = await getFirebaseAdminApp();
        if (app) {
          const { getAuth } = await import("firebase-admin/auth");
          const decoded = await getAuth(app).verifyIdToken(token);
          if (decoded?.uid) finalUid = decoded.uid;
        }
      }
    } catch {
      // Ignore token decoding error for guest applicants
    }

    if (!finalUid && typeof firebaseUid === "string" && firebaseUid.trim()) {
      finalUid = firebaseUid.trim();
    }

    // Lookup existing customer
    let customer = null;
    if (finalUid) {
      customer = await Customer.findOne({ firebaseUid: finalUid });
    }
    if (!customer && cleanEmail) {
      customer = await Customer.findOne({ email: cleanEmail });
    }
    if (!customer && cleanPhone) {
      customer = await Customer.findOne({ phone: cleanPhone });
    }

    const appSummary = `[${new Date().toLocaleDateString("en-GB")}] Application for ${targetRole.toUpperCase()}: Store=${resolvedStore || "N/A"} | FB=${resolvedFb || "N/A"} | Trade=${resolvedTrade || "N/A"}${cleanAddress ? ` | Address=${cleanAddress}` : ""}${note ? ` | Note=${note}` : ""}`;

    if (customer) {
      if (finalUid && !customer.firebaseUid) {
        customer.firebaseUid = finalUid;
      }
      // Preserve admin role if already admin, otherwise set to requested role
      if (customer.role !== "admin") {
        customer.role = targetRole;
      }
      if (customer.status !== "active") {
        customer.status = "pending";
      }
      customer.appliedRole = targetRole;
      customer.appliedAt = new Date();

      if (cleanName) customer.name = cleanName;
      if (cleanPhone) customer.phone = cleanPhone;
      if (cleanAddress) customer.address = cleanAddress;
      if (resolvedFb) customer.fbPageLink = resolvedFb;
      if (resolvedTrade) customer.tradeLicense = resolvedTrade;

      if (targetRole === "reseller") {
        if (resolvedStore) customer.resellerStoreName = resolvedStore;
        if (cleanPhone) customer.resellerStorePhone = cleanPhone;
        if (!customer.businessName && resolvedStore) customer.businessName = resolvedStore;
      } else {
        if (resolvedStore) customer.businessName = resolvedStore;
      }

      customer.note = customer.note ? `${customer.note}\n${appSummary}` : appSummary;
      await customer.save();
    } else {
      const newCustomerData = {
        email: cleanEmail,
        name: cleanName || cleanEmail.split("@")[0],
        phone: cleanPhone,
        address: cleanAddress,
        role: targetRole,
        appliedRole: targetRole,
        status: "pending",
        appliedAt: new Date(),
        businessName: resolvedStore,
        resellerStoreName: resolvedStore,
        resellerStorePhone: cleanPhone,
        fbPageLink: resolvedFb,
        tradeLicense: resolvedTrade,
        note: appSummary,
      };

      if (finalUid) {
        newCustomerData.firebaseUid = finalUid;
      }

      customer = await Customer.create(newCustomerData);
    }

    const roleNameBn = targetRole === "reseller" ? "রিসেলার" : "পাইকারি (হোলসেল)";
    return NextResponse.json({
      success: true,
      message: `আপনার ${roleNameBn} আবেদনটি সফলভাবে গৃহীত হয়েছে! অ্যাডমিন টিম শীঘ্রই আপনার আবেদনটি যাচাই করে একাউন্ট অনুমোদন করবে।`,
      user: {
        id: customer._id,
        email: customer.email,
        name: customer.name,
        role: customer.role,
        status: customer.status,
      },
    });
  } catch (err) {
    console.error("Application submission error:", err);
    return NextResponse.json(
      { message: "আবেদন প্রক্রিয়াকরণে সমস্যা: " + err.message },
      { status: 500 }
    );
  }
}
