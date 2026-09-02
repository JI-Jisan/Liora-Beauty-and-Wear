import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Order, Product } from "@/lib/models";

export async function GET(req, { params }) {
  try {
    await connectToDatabase();
    const { id } = await params;

    let order = null;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      order = await Order.findById(id);
    }
    if (!order) {
      order = await Order.findOne({ orderNumber: id });
    }

    if (!order) {
      return NextResponse.json({ message: "Order not found" }, { status: 404 });
    }

    return NextResponse.json(order);
  } catch (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const body = await req.json();
    const { status, deliveryCharge, address, note } = body;

    const order = await Order.findById(id);
    if (!order) {
      return NextResponse.json({ message: "Order not found" }, { status: 404 });
    }

    // ১. যদি স্ট্যাটাস Cancelled করা হয় এবং আগে স্টক ফেরত দেওয়া না হয়ে থাকে -> স্টক যোগ হবে
    if (status === "Cancelled" && !order.stockRestored) {
      if (Array.isArray(order.items)) {
        for (const item of order.items) {
          if (item.productId) {
            const prod = await Product.findByIdAndUpdate(
              item.productId,
              {
                $inc: { stockQuantity: item.quantity },
              },
              { new: true }
            );

            if (prod && prod.stockQuantity > 0 && prod.stockStatus === "Out of Stock") {
              await Product.findByIdAndUpdate(item.productId, {
                stockStatus: "In Stock",
              });
            }
          }
        }
      }
      order.stockRestored = true;
    }

    // ২. যদি Cancelled করার পর পুনরায় এক্টিভ স্ট্যাটাসে নেওয়া হয় -> স্টক আবার কমবে
    if (status && status !== "Cancelled" && order.stockRestored) {
      if (Array.isArray(order.items)) {
        for (const item of order.items) {
          if (item.productId) {
            const prod = await Product.findByIdAndUpdate(
              item.productId,
              {
                $inc: { stockQuantity: -item.quantity },
              },
              { new: true }
            );

            if (prod && prod.stockQuantity <= 0) {
              await Product.findByIdAndUpdate(item.productId, {
                stockStatus: "Out of Stock",
              });
            }
          }
        }
      }
      order.stockRestored = false;
    }

    if (typeof deliveryCharge === "number" && deliveryCharge >= 0) {
      order.deliveryCharge = deliveryCharge;
      order.total = (order.subtotal || 0) + deliveryCharge;
    }
    if (address && typeof address === "string") order.address = address.trim();
    if (note !== undefined && typeof note === "string") order.note = note.trim();
    if (status) order.status = status;

    await order.save();

    return NextResponse.json(order);
  } catch (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    await connectToDatabase();
    const { id } = await params;

    const deleted = await Order.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ message: "Order not found" }, { status: 404 });
    }
    return NextResponse.json({ message: "Order deleted successfully" });
  } catch (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
