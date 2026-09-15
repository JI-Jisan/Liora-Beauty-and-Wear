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
    const {
      status,
      deliveryCharge,
      address,
      note,
      customerName,
      phone,
      district,
      items,
      discount,
    } = body;

    const order = await Order.findById(id);
    if (!order) {
      return NextResponse.json({ message: "Order not found" }, { status: 404 });
    }

    // ১. যদি আইটেম আপডেট করা হয় (ইনভয়েস বা অর্ডার এডিট)
    if (Array.isArray(items) && items.length > 0) {
      let newSubtotal = 0;
      let newTotalCost = 0;

      const formattedItems = items.map((it) => {
        const qty = Math.max(1, Number(it.quantity) || 1);
        const price = Math.max(0, Number(it.price) || 0);
        const purchasePrice = Math.max(0, Number(it.purchasePrice || it.costAtSale) || 0);

        newSubtotal += price * qty;
        newTotalCost += purchasePrice * qty;

        return {
          productId: it.productId || it._id,
          productName: it.productName || it.name || "Product",
          quantity: qty,
          price,
          offerPrice: price,
          purchasePrice,
          costAtSale: purchasePrice,
          originalPrice: Number(it.originalPrice) || price,
          categoryName: it.categoryName || "",
          image: it.image || "",
          allocations: it.allocations || [],
        };
      });

      order.items = formattedItems;
      order.subtotal = newSubtotal;
      order.totalCost = newTotalCost;
    }

    // ২. ডেলিভারি চার্জ ও ডিসকাউন্ট আপডেট
    if (typeof deliveryCharge === "number" || deliveryCharge !== undefined) {
      order.deliveryCharge = Math.max(0, Number(deliveryCharge) || 0);
    }
    if (typeof discount === "number" || discount !== undefined) {
      order.discount = Math.max(0, Number(discount) || 0);
    }

    // মোট প্রদেয় (Total) রিক্য্যালকুলেট
    order.total = Math.max(
      0,
      (order.subtotal || 0) + (order.deliveryCharge || 0) - (order.discount || 0)
    );

    // ৩. কাস্টমার তথ্য আপডেট
    if (customerName && typeof customerName === "string") {
      order.customerName = customerName.trim();
    }
    if (phone && typeof phone === "string") {
      order.phone = phone.trim();
    }
    if (district && typeof district === "string") {
      order.district = district.trim();
    }
    if (address && typeof address === "string") {
      order.address = address.trim();
    }
    if (note !== undefined && typeof note === "string") {
      order.note = note.trim();
    }

    // ৪. স্ট্যাটাস ট্রানজিশন ও স্টক সমন্বয়
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
                inStock: true,
              });
            }
          }
        }
      }
      order.stockRestored = true;
    }

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
                inStock: false,
              });
            }
          }
        }
      }
      order.stockRestored = false;
    }

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
