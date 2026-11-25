import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Order } from "@/lib/models";
import { getAdminFromRequest } from "@/lib/adminGuard";
import { createSteadfastOrder } from "@/lib/steadfast";

export const runtime = "nodejs";

export async function POST(req) {
  const admin = getAdminFromRequest(req);
  if (!admin) {
    return NextResponse.json({ message: "Unauthorized. Admin token required." }, { status: 401 });
  }

  try {
    await connectToDatabase();
    const body = await req.json();
    const { orderId, note, overrideCod } = body;

    if (!orderId) {
      return NextResponse.json({ message: "orderId আবশ্যক" }, { status: 400 });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return NextResponse.json({ message: "অর্ডার খুঁজে পাওয়া যায়নি" }, { status: 404 });
    }

    // Check if already dispatched to Steadfast
    if (order.courierDetails?.trackingCode) {
      return NextResponse.json(
        {
          message: `এই অর্ডারটি ইতিমধ্যে Steadfast-এ বুক করা আছে। ট্র্যাকিং কোড: ${order.courierDetails.trackingCode}`,
          trackingCode: order.courierDetails.trackingCode,
          consignmentId: order.courierDetails.consignmentId,
          alreadyDispatched: true,
          order,
        },
        { status: 400 }
      );
    }

    // Determine COD amount
    let codAmount = order.total;
    if (order.orderType === "reseller" && order.resellerDetails?.customerCodAmount > 0) {
      codAmount = order.resellerDetails.customerCodAmount;
    }
    if (typeof overrideCod !== "undefined" && !isNaN(Number(overrideCod))) {
      codAmount = Math.max(0, Number(overrideCod));
    }

    // Combine detailed address
    const fullAddress = [
      order.address,
      order.thana ? `থানা: ${order.thana}` : "",
      order.district ? `জেলা: ${order.district}` : "",
    ]
      .filter(Boolean)
      .join(", ");

    // Generate readable invoice ID
    const invoiceId = order.orderNumber || `LIORA-${String(order._id).slice(-6).toUpperCase()}`;

    // Item summary description
    const itemDesc = Array.isArray(order.items)
      ? order.items.map((i) => `${i.productName || i.name} (x${i.quantity || 1})`).join(", ")
      : "Cosmetics & Skincare";

    const customNote = note || order.note || "LIORA Authentic Beauty & Wear - Cash on Delivery";

    // Call Steadfast API
    const result = await createSteadfastOrder({
      invoice: invoiceId,
      recipient_name: order.customerName,
      recipient_phone: order.phone,
      recipient_address: fullAddress,
      cod_amount: codAmount,
      note: customNote,
      item_description: itemDesc,
    });

    // Update Order with tracking and consignment info
    order.courierDetails = {
      courierName: "Steadfast",
      consignmentId: result.consignmentId,
      trackingCode: result.trackingCode,
      courierStatus: result.status,
      codAmount: codAmount,
      dispatchedAt: new Date(),
      lastSyncedAt: new Date(),
    };

    // Auto mark as Shipped if currently Pending or Confirmed
    if (order.status === "Pending" || order.status === "Confirmed") {
      order.status = "Shipped";
      order.isFlagged = false;
    }

    await order.save();

    return NextResponse.json({
      success: true,
      message: `🎉 Steadfast-এ সফলভাবে বুকিং সম্পন্ন হয়েছে! ট্র্যাকিং কোড: ${result.trackingCode}`,
      consignmentId: result.consignmentId,
      trackingCode: result.trackingCode,
      status: result.status,
      order,
    });
  } catch (err) {
    console.error("Steadfast send error:", err);
    return NextResponse.json(
      { message: err.message || "Steadfast পার্সেল বুকিং ব্যর্থ হয়েছে" },
      { status: 500 }
    );
  }
}

