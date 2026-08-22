import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Order, Product } from "@/lib/models";

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

    // কাস্টমার অর্ডার করার পর স্টক আপডেট করার লজিক
    if (items && Array.isArray(items)) {
      for (const item of items) {
        const productId = item.productId || item._id || item.id;
        if (productId) {
          const product = await Product.findById(productId);
          if (product) {
            // স্টক থেকে অর্ডারের পরিমাণ বাদ দেওয়া
            product.stockQuantity = Math.max(0, (product.stockQuantity || 0) - item.quantity);

            // স্টক স্ট্যাটাস অটো আপডেট
            if (product.stockQuantity === 0) {
              product.stockStatus = "Out of Stock";
            } else if (product.stockQuantity <= 5) {
              product.stockStatus = "Limited Stock";
            }

            await product.save();
          }
        }
      }
    }

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
