import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Order, Product, Category, SiteSettings, Customer, nextOrderIdentity } from "@/lib/models";
import { getAdminFromRequest } from "@/lib/adminGuard";
import { getUserFromRequest } from "@/lib/firebaseAdmin";
import crypto from "crypto";

export const runtime = "nodejs";

const MAX_QTY_PER_ITEM = 20;

export async function GET(req) {
  const admin = getAdminFromRequest(req);
  if (!admin) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page")) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit")) || 50));
    const status = searchParams.get("status");

    const query = { isDeleted: { $ne: true } };
    if (status) query.status = status;

    const [orders, totalCount] = await Promise.all([
      Order.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Order.countDocuments(query),
    ]);

    return NextResponse.json({
      orders,
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
    });
  } catch (error) {
    console.error("Orders GET error:", error);
    return NextResponse.json({ message: "অর্ডার লোড করা যায়নি" }, { status: 500 });
  }
}

import { normalizeBdPhone, isValidBdPhone } from "@/lib/validate";
import { getCharge } from "@/lib/delivery";
import { allocateFIFO, releaseAllocations, syncProductStock } from "@/lib/inventory";

export async function POST(req) {
  const reserved = [];
  const rollback = async () => {
    for (const r of reserved) {
      await Product.updateOne({ _id: r.id }, { $inc: { stockQuantity: r.qty } }).catch(
        () => {}
      );
    }
  };

  try {
    await connectToDatabase();
    const body = await req.json();


    const customerName = String(body.customerName || "").trim();
    const phone = normalizeBdPhone(body.phone);
    const address = String(body.address || "").trim();
    const note = String(body.note || "").trim().slice(0, 300);
    const deliveryZone = body.zone || body.deliveryZone || "inside_dhaka";

    if (customerName.length < 2)
      return NextResponse.json({ message: "সঠিক নাম লিখুন" }, { status: 400 });

    if (!isValidBdPhone(phone)) {
      return NextResponse.json(
        { message: "সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন (যেমন 01712345678)" },
        { status: 400 }
      );
    }

    // অতিরিক্ত abuse guard: একই নম্বর থেকে ২৪ ঘণ্টায় ৩টির বেশি pending/processing অর্ডার প্রতিরোধ
    const recentOrdersCount = await Order.countDocuments({
      phone,
      status: { $in: ["Pending", "Processing", "pending", "processing"] },
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });

    if (recentOrdersCount >= 3) {
      return NextResponse.json(
        { message: "আপনার একাধিক অর্ডার প্রসেসিং এ আছে। কনফার্ম করতে আমাদের কল করুন।" },
        { status: 429 }
      );
    }

    if (address.length < 8)
      return NextResponse.json({ message: "সম্পূর্ণ ঠিকানা লিখুন" }, { status: 400 });
    if (!Array.isArray(body.items) || body.items.length === 0)
      return NextResponse.json({ message: "কার্ট খালি" }, { status: 400 });
    if (body.items.length > 50)
      return NextResponse.json({ message: "অনেক বেশি আইটেম" }, { status: 400 });

    // ---- দাম ও স্টক: সম্পূর্ণ সার্ভার থেকে FIFO ব্যাচ এলগোরিদম দ্বারা ----
    const items = [];
    const doneAllocations = []; // rollback এর জন্য
    let subtotal = 0;
    let totalCost = 0;

    for (const raw of body.items) {
      const qty = Number(raw.quantity);
      if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY_PER_ITEM) {
        await releaseAllocations(doneAllocations);
        return NextResponse.json({ message: "পরিমাণ সঠিক নয়" }, { status: 400 });
      }

      const productId = raw.productId || raw._id;
      if (!productId || !/^[0-9a-fA-F]{24}$/.test(String(productId))) {
        await releaseAllocations(doneAllocations);
        return NextResponse.json({ message: "ভুল প্রোডাক্ট" }, { status: 400 });
      }

      const p = await Product.findById(productId);
      if (!p) {
        await releaseAllocations(doneAllocations);
        return NextResponse.json({ message: "প্রোডাক্ট পাওয়া যায়নি" }, { status: 404 });
      }

      // FIFO allocation — পুরোনো batch আগে
      const res = await allocateFIFO(p._id, qty, null);
      if (!res.ok) {
        await releaseAllocations(doneAllocations);
        return NextResponse.json(
          {
            message: `"${p.name}" — পর্যাপ্ত স্টকে নেই (আছে ${res.available || 0} পিস)`,
          },
          { status: 409 }
        );
      }

      doneAllocations.push(...res.allocations);

      const price = Number(p.offerPrice ?? p.originalPrice ?? 0);
      subtotal += price * qty;
      totalCost += (res.totalCost || res.avgCost * qty);

      let categoryName = "";
      if (p.category) {
        const cat = await Category.findById(p.category).select("name").lean();
        categoryName = cat?.name || "";
      }

      items.push({
        productId: p._id,
        productName: p.name,
        quantity: qty,
        price,
        purchasePrice: res.avgCost,
        costAtSale: res.avgCost,
        allocations: res.allocations,
        originalPrice: Number(p.originalPrice ?? 0),
        categoryName,
        image: p.image || "",
      });

      await syncProductStock(p._id, Product);
    }

    // ---- ডেলিভারি চার্জও সম্পূর্ণ সার্ভারেই নির্ধারিত হবে ----
    const settings = (await SiteSettings.findOne().lean()) || {};
    const baseCharge = getCharge(deliveryZone);
    const threshold = Number(settings.freeDeliveryThreshold ?? 0);
    const deliveryCharge = threshold > 0 && subtotal >= threshold ? 0 : baseCharge;

    let user = null;
    try {
      user = await getUserFromRequest(req);
    } catch (e) {
      console.error("FIREBASE AUTH SKIP:", e?.message);
      user = null;
    }

    // ---- orderNumber, collision হলে ৩ বার retry ----
    let order = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const { orderNumber, serial } = await nextOrderIdentity();
        order = await Order.create({
          customerName,
          phone,
          address,
          note,
          items,
          deliveryZone,
          deliveryCharge,
          subtotal,
          totalCost,
          total: subtotal + deliveryCharge,
          shippedBy: "Owner",
          stockDeducted: true,
          orderNumber,
          serial,
          accessToken: crypto.randomBytes(12).toString("hex"),
          firebaseUid: user?.uid || null,
          status: "Pending",
        });

        if (user?.uid) {
          Customer.findOneAndUpdate(
            { firebaseUid: user.uid },
            {
              $set: {
                phone,
                address,
                name: customerName,
              },
            },
            { upsert: true }
          ).catch((e) => console.error("Customer sync error:", e?.message));
        }

        break;
      } catch (e) {
        if (e?.code === 11000 && attempt < 2) continue;
        throw e;
      }
    }

    if (!order) {
      await releaseAllocations(doneAllocations);
      throw new Error("অর্ডার তৈরি করা যায়নি");
    }

    return NextResponse.json(
      {
        _id: order._id,
        orderNumber: order.orderNumber,
        total: order.total,
        subtotal: order.subtotal,
        deliveryCharge: order.deliveryCharge,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("ORDER ERROR:", error);
    await rollback();
    return NextResponse.json(
      { message: error?.message || "অর্ডার সম্পন্ন হয়নি, আবার চেষ্টা করুন" },
      { status: 500 }
    );
  }
}
