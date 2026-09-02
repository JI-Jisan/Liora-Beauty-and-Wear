import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Order, Product, Category, SiteSettings, nextOrderIdentity } from "@/lib/models";
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

export async function POST(req) {
  const reserved = [];

  const rollback = async () => {
    for (const r of reserved) {
      await Product.updateOne({ _id: r.id }, { $inc: { stockQuantity: r.qty } }).catch(() => {});
    }
  };

  try {
    await connectToDatabase();
    const body = await req.json();

    const customerName = String(body.customerName || "").trim();
    const phone = String(body.phone || "").trim();
    const address = String(body.address || "").trim();
    const note = String(body.note || "").trim().slice(0, 300);
    const deliveryZone = body.deliveryZone === "outside" ? "outside" : "inside";

    if (customerName.length < 2)
      return NextResponse.json({ message: "সঠিক নাম লিখুন" }, { status: 400 });
    if (!/^01[3-9]\d{8}$/.test(phone))
      return NextResponse.json(
        { message: "সঠিক ফোন নাম্বার দিন (যেমন 017XXXXXXXX)" },
        { status: 400 }
      );
    if (address.length < 10)
      return NextResponse.json({ message: "সম্পূর্ণ ঠিকানা লিখুন" }, { status: 400 });
    if (!Array.isArray(body.items) || body.items.length === 0)
      return NextResponse.json({ message: "কার্ট খালি" }, { status: 400 });
    if (body.items.length > 50)
      return NextResponse.json({ message: "অনেক বেশি আইটেম" }, { status: 400 });

    // ---- দাম ও স্টক: সম্পূর্ণ সার্ভার থেকে, ক্লায়েন্টের পাঠানো দাম উপেক্ষিত ----
    const items = [];
    let subtotal = 0;

    for (const raw of body.items) {
      const qty = Number(raw.quantity);
      if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY_PER_ITEM) {
        await rollback();
        return NextResponse.json({ message: "পরিমাণ সঠিক নয়" }, { status: 400 });
      }

      const productId = raw.productId || raw._id;
      if (!productId || !/^[0-9a-fA-F]{24}$/.test(String(productId))) {
        await rollback();
        return NextResponse.json({ message: "ভুল প্রোডাক্ট" }, { status: 400 });
      }

      // atomic: স্টক থাকলে তবেই কমবে, তাই oversell অসম্ভব
      const p = await Product.findOneAndUpdate(
        { _id: productId, stockQuantity: { $gte: qty } },
        { $inc: { stockQuantity: -qty } },
        { new: true }
      );

      if (!p) {
        await rollback();
        const exists = await Product.findById(productId).select("name").lean();
        return NextResponse.json(
          {
            message: exists
              ? `"${exists.name}" পর্যাপ্ত স্টকে নেই`
              : "প্রোডাক্টটি আর পাওয়া যাচ্ছে না",
          },
          { status: 409 }
        );
      }
      reserved.push({ id: p._id, qty });

      const price = Number(p.offerPrice ?? p.originalPrice ?? 0);
      subtotal += price * qty;

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
        purchasePrice: Number(p.purchasePrice ?? 0),
        originalPrice: Number(p.originalPrice ?? 0),
        categoryName,
        image: p.image || "",
      });

      const newStatus =
        p.stockQuantity === 0
          ? "Out of Stock"
          : p.stockQuantity <= 5
          ? "Limited Stock"
          : "In Stock";
      if (newStatus !== p.stockStatus) {
        await Product.updateOne({ _id: p._id }, { stockStatus: newStatus });
      }
    }

    // ---- ডেলিভারি চার্জও সার্ভারেই ঠিক হবে ----
    const settings = (await SiteSettings.findOne().lean()) || {};
    const baseCharge =
      deliveryZone === "outside"
        ? Number(settings.deliveryOutside ?? 110)
        : Number(settings.deliveryInside ?? 65);
    const threshold = Number(settings.freeDeliveryThreshold ?? 0);
    const deliveryCharge = threshold > 0 && subtotal >= threshold ? 0 : baseCharge;

    const user = await getUserFromRequest(req);

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
          total: subtotal + deliveryCharge,
          orderNumber,
          serial,
          accessToken: crypto.randomBytes(12).toString("hex"),
          firebaseUid: user?.uid || null,
          status: "Pending",
        });
        break;
      } catch (e) {
        if (e?.code === 11000 && attempt < 2) continue;
        throw e;
      }
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
    console.error("Orders POST error:", error);
    await rollback();
    return NextResponse.json(
      { message: "অর্ডার সম্পন্ন হয়নি, আবার চেষ্টা করুন" },
      { status: 500 }
    );
  }
}
