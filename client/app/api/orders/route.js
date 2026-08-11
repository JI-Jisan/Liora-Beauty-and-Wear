import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Order } from "@/lib/models";

export async function GET() {
  try {
    await connectToDatabase();
    const orders = await Order.find().sort({ createdAt: -1 });
    return NextResponse.json(orders);
  } catch (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const { customerName, phone, address, items, total } = body;

    if (!customerName || !phone || !address || !items || !total) {
      return NextResponse.json({ message: "Missing required order fields" }, { status: 400 });
    }

    const count = await Order.countDocuments();
    const orderNumber = `JT-${10001 + count}`;

    const order = new Order({
      ...body,
      orderNumber,
      status: "Pending",
    });

    await order.save();
    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
