import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Order } from "@/lib/models";

export async function GET(req) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const no = String(searchParams.get("no") || "").toUpperCase();
    const k = String(searchParams.get("k") || "");

    if (!no || k.length !== 24) {
      return NextResponse.json({ message: "Invalid link" }, { status: 400 });
    }

    const order = await Order.findOne({ orderNumber: no, accessToken: k })
      .select(
        "orderNumber status total subtotal deliveryCharge createdAt customerName " +
        "items.productName items.quantity items.price items.image"
      )
      .lean();

    if (!order) {
      return NextResponse.json({ message: "Order not found" }, { status: 404 });
    }
    return NextResponse.json(order);
  } catch {
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
