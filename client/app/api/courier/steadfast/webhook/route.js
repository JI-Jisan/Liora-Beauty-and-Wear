import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Order, Product, Customer, ResellerLedger } from "@/lib/models";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    await connectToDatabase();
    const body = await req.json().catch(() => ({}));

    const trackingCode = body.tracking_code || body.trackingCode;
    const invoice = body.invoice || body.invoice_id;
    const consignmentId = body.consignment_id ? String(body.consignment_id) : "";
    const deliveryStatus = (body.status || body.delivery_status || "").toLowerCase().trim();

    if (!trackingCode && !invoice && !consignmentId) {
      return NextResponse.json({ message: "No identifier provided" }, { status: 400 });
    }

    const query = {
      $or: [
        trackingCode ? { "courierDetails.trackingCode": trackingCode } : null,
        consignmentId ? { "courierDetails.consignmentId": consignmentId } : null,
        invoice ? { orderNumber: invoice } : null,
      ].filter(Boolean),
    };

    const order = await Order.findOne(query);
    if (!order) {
      return NextResponse.json({ message: "Order not found" }, { status: 404 });
    }

    if (!order.courierDetails) {
      order.courierDetails = { courierName: "Steadfast" };
    }
    order.courierDetails.courierStatus = deliveryStatus;
    order.courierDetails.lastSyncedAt = new Date();

    // 1. Delivered
    if (deliveryStatus === "delivered" || deliveryStatus === "partial_delivered") {
      order.status = "Delivered";

      // Settle reseller wallet profit if applicable
      if (order.orderType === "reseller") {
        const profit = Number(order.resellerDetails?.resellerProfit) || 0;
        if (profit > 0 && !order.resellerDetails?.settledToWallet) {
          const resEmail = (order.resellerDetails?.resellerEmail || "").toLowerCase().trim();
          const resUid = order.resellerDetails?.resellerUid || "";

          let resCustomer = null;
          if (resUid) {
            resCustomer = await Customer.findOne({ firebaseUid: resUid });
          }
          if (!resCustomer && resEmail) {
            resCustomer = await Customer.findOne({ email: resEmail });
          }

          if (resCustomer) {
            resCustomer.walletBalance = (resCustomer.walletBalance || 0) + profit;
            await resCustomer.save();

            await ResellerLedger.create({
              resellerUid: resCustomer.firebaseUid || resUid,
              resellerEmail: resCustomer.email,
              type: "profit_credit",
              amount: profit,
              balanceAfter: resCustomer.walletBalance,
              status: "completed",
              note: `Steadfast ডেলিভারি সম্পন্ন: অর্ডার #${order.orderNumber || order._id} কমিশন জমা`,
            });

            order.resellerDetails.settledToWallet = true;
          }
        }
      }
    }

    // 2. Cancelled / Returned
    if (deliveryStatus === "cancelled" || deliveryStatus === "return" || deliveryStatus === "delivered_cancelled") {
      if (order.status !== "Cancelled") {
        order.status = "Cancelled";

        // Restore stock if not already restored
        if (!order.stockRestored && Array.isArray(order.items)) {
          for (const item of order.items) {
            if (item.productId) {
              const prod = await Product.findByIdAndUpdate(
                item.productId,
                { $inc: { stockQuantity: item.quantity } },
                { new: true }
              );
              if (prod && prod.stockQuantity > 0 && prod.stockStatus === "Out of Stock") {
                await Product.findByIdAndUpdate(item.productId, {
                  stockStatus: "In Stock",
                  inStock: true,
                });
              }
            }
          }
          order.stockRestored = true;
        }
      }
    }

    await order.save();

    return NextResponse.json({
      success: true,
      message: `Order updated with status: ${deliveryStatus}`,
      orderId: order._id,
      status: order.status,
    });
  } catch (err) {
    console.error("Steadfast webhook error:", err);
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}

