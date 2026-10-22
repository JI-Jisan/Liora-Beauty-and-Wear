import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { WholesaleQuotation, Order, Product, Category, nextOrderIdentity } from "@/lib/models";
import { requireAdmin } from "@/lib/adminGuard";
import { allocateFIFO, releaseAllocations, syncProductStock } from "@/lib/inventory";
import crypto from "crypto";

export const runtime = "nodejs";

export async function POST(req, { params }) {
  const admin = await requireAdmin(req);
  if (!admin) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectToDatabase();
    const { id } = await params;
    const quotation = await WholesaleQuotation.findById(id);

    if (!quotation) {
      return NextResponse.json({ message: "কোটেশন পাওয়া যায়নি" }, { status: 404 });
    }

    if (quotation.status === "Converted" && quotation.convertedOrderId) {
      return NextResponse.json(
        {
          message: `এই কোটেশনটি ইতিমধ্যে অর্ডার #${quotation.convertedOrderNumber || quotation.convertedOrderId} এ কনভার্ট করা হয়েছে!`,
        },
        { status: 400 }
      );
    }

    const orderItems = [];
    const doneAllocations = [];

    for (const item of quotation.items) {
      const qty = item.quantity || 1;
      let p = null;

      if (item.productId) {
        p = await Product.findById(item.productId);
      }
      if (!p && item.name) {
        p = await Product.findOne({ name: item.name });
      }

      if (p) {
        // FIFO Stock Allocation
        const res = await allocateFIFO(p._id, qty, null);
        if (!res.ok) {
          await releaseAllocations(doneAllocations);
          return NextResponse.json(
            {
              message: `"${item.name}" পর্যাপ্ত স্টকে নেই! স্টকে আছে: ${res.available || 0} পিস, ইনভয়েসে চাওয়া হয়েছে: ${qty} পিস`,
            },
            { status: 409 }
          );
        }

        doneAllocations.push(...res.allocations);

        let categoryName = item.categoryName || "";
        if (!categoryName && p.category) {
          const cat = await Category.findById(p.category).select("name").lean();
          categoryName = cat?.name || "";
        }

        orderItems.push({
          productId: p._id,
          productName: p.name,
          quantity: qty,
          price: item.wholesalePrice,
          purchasePrice: res.avgCost || item.purchasePrice || p.purchasePrice || 0,
          costAtSale: res.avgCost || item.purchasePrice || p.purchasePrice || 0,
          allocations: res.allocations,
          originalPrice: item.originalPrice || p.originalPrice || 0,
          categoryName,
          image: item.image || p.image || "",
        });

        await syncProductStock(p._id, Product);
      } else {
        // Product not currently in database by ID, record as ad-hoc item
        orderItems.push({
          productId: null,
          productName: item.name,
          quantity: qty,
          price: item.wholesalePrice,
          purchasePrice: item.purchasePrice || 0,
          costAtSale: item.purchasePrice || 0,
          allocations: [],
          originalPrice: item.originalPrice || 0,
          categoryName: item.categoryName || "",
          image: item.image || "",
        });
      }
    }

    // Generate Order Number
    const { orderNumber, serial } = await nextOrderIdentity();
    const accessToken = crypto.randomBytes(16).toString("hex");

    const newOrder = await Order.create({
      orderNumber,
      serial,
      accessToken,
      customerName: quotation.clientInfo.clientName,
      phone: quotation.clientInfo.clientPhone || "01800000000",
      address: quotation.clientInfo.clientAddress || "Wholesale Partner",
      district: "Dhaka",
      thana: "Wholesale",
      items: orderItems,
      subtotal: quotation.totalWholesaleSum,
      deliveryCharge: 0,
      discount: quotation.totalSavings,
      total: quotation.totalWholesaleSum,
      paidAmount: 0,
      paymentStatus: "Unpaid",
      paymentMethod: "Wholesale B2B / Cash",
      status: "Confirmed",
      isPaid: false,
      note: `[Wholesale Invoice #${quotation.quoteNumber}] ${quotation.clientInfo.note || ""}`.trim(),
    });

    // Update quotation status
    quotation.status = "Converted";
    quotation.convertedOrderId = newOrder._id;
    quotation.convertedOrderNumber = newOrder.orderNumber;
    await quotation.save();

    return NextResponse.json({
      ok: true,
      message: `কোটেশনটি সফলভাবে অর্ডার #${newOrder.orderNumber} এ কনভার্ট হয়েছে এবং স্টক সমন্বয় করা হয়েছে!`,
      order: newOrder,
      quotation,
    });
  } catch (error) {
    console.error("Convert quote to order error:", error);
    return NextResponse.json({ message: "অর্ডারে কনভার্ট করতে ব্যর্থ: " + error.message }, { status: 500 });
  }
}
