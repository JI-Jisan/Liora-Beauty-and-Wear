import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Order, Customer } from "@/lib/models";
import { getUserFromRequest } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

export async function GET(req) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    // Look up customer document to check phone or alternate identifiers
    const customer = await Customer.findOne({ firebaseUid: user.uid }).lean();
    const queryConditions = [{ firebaseUid: user.uid }];

    if (customer?.phone) {
      queryConditions.push({ phone: customer.phone });
    }
    if (user.phone_number) {
      const cleanPhone = user.phone_number.replace(/^\+88/, "").trim();
      queryConditions.push({ phone: cleanPhone });
    }
    if (user.email) {
      queryConditions.push({ customerEmail: user.email.toLowerCase().trim() });
    }

    const orders = await Order.find({
      $or: queryConditions,
      isDeleted: { $ne: true },
    })
      .select(
        "orderNumber serial status total subtotal deliveryCharge items customerName customerEmail phone district address deliveryZone note createdAt accessToken"
      )
      .sort({ createdAt: -1 })
      .limit(60)
      .lean();

    // Ensure any orders that had null firebaseUid get claimed if matched by verified phone or email
    const claimOr = [];
    if (customer?.phone) claimOr.push({ phone: customer.phone });
    if (user.email) claimOr.push({ customerEmail: user.email.toLowerCase().trim() });
    if (claimOr.length > 0) {
      Order.updateMany(
        { firebaseUid: null, $or: claimOr },
        { $set: { firebaseUid: user.uid } }
      ).catch(() => {});
    }

    return NextResponse.json({ orders });
  } catch (err) {
    console.error("my-orders API error:", err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
