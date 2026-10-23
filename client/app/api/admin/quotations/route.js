import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { WholesaleQuotation } from "@/lib/models";
import { requireAdmin } from "@/lib/adminGuard";

export const runtime = "nodejs";

export async function GET(req) {
  const admin = await requireAdmin(req);
  if (!admin) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const search = (searchParams.get("search") || "").trim();
    const status = searchParams.get("status");
    const page = Math.max(1, parseInt(searchParams.get("page")) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit")) || 30));

    const query = {};
    if (status && status !== "all") {
      query.status = status;
    }

    if (search) {
      const reg = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      query.$or = [
        { quoteNumber: reg },
        { "clientInfo.clientName": reg },
        { "clientInfo.clientPhone": reg },
        { "clientInfo.clientAddress": reg },
      ];
    }

    const [quotations, totalCount] = await Promise.all([
      WholesaleQuotation.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      WholesaleQuotation.countDocuments(query),
    ]);

    return NextResponse.json({
      quotations,
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
    });
  } catch (error) {
    console.error("Quotations GET error:", error);
    return NextResponse.json({ message: "কোটেশন লোড করতে সমস্যা হয়েছে" }, { status: 500 });
  }
}

export async function POST(req) {
  const admin = await requireAdmin(req);
  if (!admin) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectToDatabase();
    const body = await req.json();

    const clientName = String(body.clientInfo?.clientName || "").trim();
    if (!clientName) {
      return NextResponse.json(
        { message: "অনুগ্রহ করে ক্লায়েন্ট বা প্রতিষ্ঠানের নাম দিন" },
        { status: 400 }
      );
    }

    const items = Array.isArray(body.items) ? body.items : [];
    if (items.length === 0) {
      return NextResponse.json(
        { message: "অনুগ্রহ করে অন্তত ১টি প্রোডাক্ট সিলেক্ট করুন" },
        { status: 400 }
      );
    }

    // Auto-generate unique Quote Number
    const quoteNumber =
      body.quoteNumber ||
      `WS-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 90 + 10)}`;

    let totalQty = 0;
    let totalMarketSum = 0;
    let totalWholesaleSum = 0;
    let estimatedCost = 0;

    const sanitizedItems = items.map((it) => {
      const qty = Math.max(1, parseInt(it.quantity) || 1);
      const wsPrice = Math.max(0, Number(it.wholesalePrice) || 0);
      const mktPrice = Math.max(0, Number(it.originalPrice) || 0);
      const costPrice = Math.max(0, Number(it.purchasePrice) || 0);
      const lineTotal = wsPrice * qty;

      totalQty += qty;
      totalMarketSum += mktPrice * qty;
      totalWholesaleSum += lineTotal;
      estimatedCost += costPrice * qty;

      const discountPct =
        mktPrice > wsPrice ? Math.round(((mktPrice - wsPrice) / mktPrice) * 100) : 0;

      return {
        productId: it.productId || it._id || null,
        name: String(it.name || "Product Item").trim(),
        brandName: String(it.brandName || "").trim(),
        categoryName: String(it.categoryName || "").trim(),
        image: String(it.image || "").trim(),
        originalPrice: mktPrice,
        purchasePrice: costPrice,
        wholesalePrice: wsPrice,
        quantity: qty,
        lineTotal,
        discountPct,
      };
    });

    const totalSavings = Math.max(0, totalMarketSum - totalWholesaleSum);
    const estimatedProfit = Math.max(0, totalWholesaleSum - estimatedCost);

    const doc = await WholesaleQuotation.create({
      quoteNumber,
      clientInfo: {
        clientName,
        clientPhone: String(body.clientInfo?.clientPhone || "").trim(),
        clientAddress: String(body.clientInfo?.clientAddress || "").trim(),
        note: String(body.clientInfo?.note || "").trim(),
      },
      items: sanitizedItems,
      profitPercent: Number(body.profitPercent) || 5,
      brandProfitOverrides: body.brandProfitOverrides || {},
      totalItems: sanitizedItems.length,
      totalQty,
      totalMarketSum,
      totalWholesaleSum,
      totalSavings,
      estimatedCost,
      estimatedProfit,
      status: body.status || "Draft",
    });

    return NextResponse.json({ ok: true, quotation: doc }, { status: 201 });
  } catch (error) {
    console.error("Quotation POST error:", error);
    return NextResponse.json({ message: "কোটেশন সংরক্ষণ করতে ব্যর্থ হয়েছে: " + error.message }, { status: 500 });
  }
}
