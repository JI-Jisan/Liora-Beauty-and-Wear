import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Order, Product, Category, SiteSettings, Customer, Brand, nextOrderIdentity } from "@/lib/models";
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
import { isLocationInsideDhaka } from "@/lib/bdLocations";
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
    const admin = getAdminFromRequest(req);
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

    // অতিরিক্ত abuse guard: একই নম্বর থেকে ২৪ ঘণ্টায় পেন্ডিং/প্রসেসিং অর্ডার চেক
    const recentOrdersCount = await Order.countDocuments({
      phone,
      status: { $in: ["Pending", "Processing", "pending", "processing"] },
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });

    // চরম স্প্যাম বা রোবট প্রতিরোধ: যদি একই নম্বর থেকে ২৪ ঘণ্টায় ৮টির বেশি অর্ডার জমে থাকে, কেবল তখনই ব্লক হবে
    if (recentOrdersCount >= 8) {
      return NextResponse.json(
        { message: "অতিরিক্ত পেন্ডিং অর্ডারের কারণে সাময়িক স্থগিত। আপনার আগের অর্ডারগুলো কনফার্ম করতে দয়া করে আমাদের হেল্পলাইনে সরাসরি কল করুন।" },
        { status: 429 }
      );
    }

    // গ্রাহকের আগের অর্ডার পেন্ডিং থাকলে অর্ডারটি গ্রহণ হবে এবং সতর্কতামূলক ফ্ল্যাগ যুক্ত হবে যাতে অ্যাডমিন প্যানেলে অ্যালার্ট দেখতে পান
    const isFlagged = recentOrdersCount >= 1;
    const flagReason = isFlagged
      ? `গ্রাহকের পূর্বের ${recentOrdersCount}টি অর্ডার পেন্ডিং/প্রসেসিং অবস্থায় আছে`
      : "";

    if (address.length < 8)
      return NextResponse.json({ message: "সম্পূর্ণ ঠিকানা লিখুন" }, { status: 400 });
    if (!Array.isArray(body.items) || body.items.length === 0)
      return NextResponse.json({ message: "কার্ট খালি" }, { status: 400 });
    if (body.items.length > 50)
      return NextResponse.json({ message: "অনেক বেশি আইটেম" }, { status: 400 });

    // Identify user role and order type
    let authUser = null;
    let customerDoc = null;
    try {
      authUser = await getUserFromRequest(req);
      if (authUser?.uid) {
        customerDoc = await Customer.findOne({ firebaseUid: authUser.uid }).lean();
        if (!customerDoc && authUser.email) {
          customerDoc = await Customer.findOne({ email: authUser.email.toLowerCase().trim() }).lean();
        }
      }
    } catch (e) {
      authUser = null;
    }

    const requestedType = String(body.orderType || "").toLowerCase();
    const isWholesaleReq =
      requestedType === "wholesale" ||
      body.isWholesale === true ||
      (customerDoc?.role === "wholesale" && requestedType !== "retail");
    const isResellerReq =
      requestedType === "reseller" ||
      body.isReseller === true ||
      ((customerDoc?.role === "reseller" || customerDoc?.role === "team_leader") && requestedType !== "retail");

    const orderType = isWholesaleReq ? "wholesale" : isResellerReq ? "reseller" : "retail";
    const itemMaxLimit = orderType === "wholesale" ? 1000 : MAX_QTY_PER_ITEM;

    // ---- দাম ও স্টক: সার্ভার থেকে FIFO ব্যাচ এলগোরিদম দ্বারা (অ্যাডমিন কাস্টম দাম সাপোর্টসহ) ----
    const items = [];
    const doneAllocations = []; // rollback এর জন্য
    let subtotal = 0;
    let totalCost = 0;
    let totalSavings = 0;

    for (const raw of body.items) {
      const qty = Number(raw.quantity);
      if (!Number.isInteger(qty) || qty < 1 || qty > itemMaxLimit) {
        await releaseAllocations(doneAllocations);
        return NextResponse.json({ message: `পরিমাণ সঠিক নয় (সর্বোচ্চ ${itemMaxLimit} পিস)` }, { status: 400 });
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

      // দাম নির্ধারণ: হোলসেল বা রিসেলার অনুযায়ী
      const defaultRetailPrice = Number(p.offerPrice ?? p.originalPrice ?? 0);
      let calculatedPrice = defaultRetailPrice;

      if (orderType === "wholesale") {
        if (p.wholesalePrice > 0) {
          calculatedPrice = Number(p.wholesalePrice);
        } else {
          let marginPct = 7;
          if (p.brand) {
            const b = await Brand.findById(p.brand).select("wholesaleMarginPct").lean();
            if (b && typeof b.wholesaleMarginPct === "number") {
              marginPct = b.wholesaleMarginPct;
            }
          }
          const baseCost = Number(p.purchasePrice > 0 ? p.purchasePrice : defaultRetailPrice * 0.70);
          calculatedPrice = Math.round(baseCost * (1 + marginPct / 100));
        }
        totalSavings += Math.max(0, defaultRetailPrice - calculatedPrice) * qty;
      } else if (orderType === "reseller") {
        if (p.resellerPrice > 0) {
          calculatedPrice = Number(p.resellerPrice);
        } else {
          // Standard: 8% discount from retail. Weekly Star: 10% discount from retail!
          let isStar = false;
          const rEmail = (body.resellerDetails?.resellerEmail || customerEmail || "").toLowerCase().trim();
          if (rEmail) {
            const rc = await Customer.findOne({ email: rEmail }).select("isWeeklyStar").lean();
            if (rc?.isWeeklyStar) isStar = true;
          }
          const discountPct = isStar ? 10 : 8;
          calculatedPrice = Math.round(defaultRetailPrice * (1 - discountPct / 100));
        }
      }

      const price = (admin && raw.price !== undefined && raw.price !== null && !isNaN(Number(raw.price)))
        ? Math.max(0, Number(raw.price))
        : calculatedPrice;

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

    const district = String(body.district || "").trim() || "Dhaka";
    const thana = String(body.thana || "").trim();
    const isDhaka = isLocationInsideDhaka(district, thana);
    const finalDeliveryZone = isDhaka ? "inside_dhaka" : "outside_dhaka";
    const deliveryType = String(body.deliveryType || "standard").trim().toLowerCase();
    const isUrgent = isDhaka && deliveryType === "urgent";

    // ---- ডেলিভারি চার্জ নির্ধারণ (অ্যাডমিন কাস্টম ডেলিভারি ফি সাপোর্টসহ) ----
    const settings = (await SiteSettings.findOne().lean()) || {};
    const baseCharge = isUrgent ? 250 : (isDhaka ? 70 : 130);
    const threshold = Number(settings.freeDeliveryThreshold ?? 0);
    const defaultDeliveryCharge = (!isUrgent && threshold > 0 && subtotal >= threshold) ? 0 : baseCharge;

    const deliveryCharge = (admin && body.deliveryCharge !== undefined && body.deliveryCharge !== null && !isNaN(Number(body.deliveryCharge)))
      ? Math.max(0, Number(body.deliveryCharge))
      : defaultDeliveryCharge;

    const discount = (admin && body.discount !== undefined && !isNaN(Number(body.discount)))
      ? Math.max(0, Number(body.discount))
      : 0;

    const commission = (admin && body.commission !== undefined && !isNaN(Number(body.commission)))
      ? Math.max(0, Number(body.commission))
      : 0;

    const commissionNote = admin && body.commissionNote
      ? String(body.commissionNote).trim().slice(0, 200)
      : "";

    const total = Math.max(0, subtotal + deliveryCharge - discount);

    let user = authUser;
    if (!user) {
      try {
        user = await getUserFromRequest(req);
      } catch (e) {
        user = null;
      }
    }

    const firebaseUid = user?.uid || body.firebaseUid || null;
    const customerEmail = (user?.email || body.customerEmail || "").toLowerCase().trim();

    // Reseller profit and customer COD collection setup
    const customerCodAmount = orderType === "reseller"
      ? Math.max(subtotal + deliveryCharge, Number(body.customerCodAmount || body.codAmount || total))
      : total;
    const resellerProfit = orderType === "reseller"
      ? Math.max(0, customerCodAmount - subtotal - deliveryCharge)
      : 0;

    // ---- orderNumber, collision হলে ৩ বার retry ----
    let order = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const { orderNumber, serial } = await nextOrderIdentity();
        order = await Order.create({
          customerName,
          customerEmail,
          phone,
          district,
          thana,
          address,
          note,
          items,
          deliveryZone: finalDeliveryZone,
          deliveryType: isUrgent ? "urgent" : "standard",
          deliveryCharge,
          discount,
          commission,
          commissionNote,
          subtotal,
          totalCost,
          total,
          shippedBy: "Jisan",
          stockDeducted: true,
          orderNumber,
          serial,
          accessToken: crypto.randomBytes(12).toString("hex"),
          firebaseUid,
          status: "Pending",
          isFlagged,
          flagReason,
          pendingOrdersCount: recentOrdersCount,
          orderType,
          resellerDetails: orderType === "reseller" ? {
            resellerUid: user?.uid || customerDoc?.firebaseUid || "",
            resellerEmail: customerEmail || customerDoc?.email || "",
            resellerName: customerDoc?.name || user?.name || "Reseller",
            storeName: body.storeName || customerDoc?.resellerStoreName || "",
            storePhone: body.storePhone || customerDoc?.resellerStorePhone || "",
            customerCodAmount,
            baseCost: subtotal,
            deliveryFee: deliveryCharge,
            resellerProfit,
            settledToWallet: false,
          } : undefined,
          wholesaleDetails: orderType === "wholesale" ? {
            businessName: body.businessName || customerDoc?.businessName || "",
            tradeLicense: body.tradeLicense || "",
            totalItemsQty: items.reduce((s, it) => s + it.quantity, 0),
            wholesaleSavings: totalSavings,
          } : undefined,
        });

        if (firebaseUid) {
          Customer.findOneAndUpdate(
            { firebaseUid },
            {
              $set: {
                phone,
                district,
                thana,
                address,
                name: customerName,
                ...(customerEmail ? { email: customerEmail } : {}),
              },
            },
            { upsert: true }
          ).catch((e) => console.error("Customer sync error:", e?.message));
        }

        // Asynchronously send order confirmation email if customer email exists
        if (customerEmail) {
          import("@/lib/mailer")
            .then(({ sendOrderConfirmationEmail }) => {
              sendOrderConfirmationEmail(order).catch((err) =>
                console.error("Async email dispatch error:", err?.message)
              );
            })
            .catch(() => {});
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
        isFlagged: order.isFlagged,
        pendingOrdersCount: order.pendingOrdersCount,
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
