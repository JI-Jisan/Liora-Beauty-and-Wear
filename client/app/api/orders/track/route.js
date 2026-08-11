import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Order } from "@/lib/models";

export async function GET(req) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query");

    if (!query || !query.trim()) {
      return NextResponse.json({ message: "Query parameter is required" }, { status: 400 });
    }

    const cleanQuery = query.trim();

    const orders = await Order.find({
      $or: [
        { phone: { $regex: cleanQuery, $options: "i" } },
        { orderNumber: { $regex: cleanQuery, $options: "i" } },
      ],
    }).sort({ createdAt: -1 });

    return NextResponse.json(orders);
  } catch (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
