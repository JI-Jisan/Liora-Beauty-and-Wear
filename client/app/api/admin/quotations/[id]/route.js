import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { WholesaleQuotation } from "@/lib/models";
import { requireAdmin } from "@/lib/adminGuard";

export const runtime = "nodejs";

export async function GET(req, { params }) {
  const admin = await requireAdmin(req);
  if (!admin) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectToDatabase();
    const { id } = await params;
    const doc = await WholesaleQuotation.findById(id).lean();
    if (!doc) {
      return NextResponse.json({ message: "কোটেশন পাওয়া যায়নি" }, { status: 404 });
    }
    return NextResponse.json({ quotation: doc });
  } catch (error) {
    return NextResponse.json({ message: "ত্রুটি: " + error.message }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  const admin = await requireAdmin(req);
  if (!admin) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectToDatabase();
    const { id } = await params;
    const body = await req.json();

    const existing = await WholesaleQuotation.findById(id);
    if (!existing) {
      return NextResponse.json({ message: "কোটেশন পাওয়া যায়নি" }, { status: 404 });
    }

    if (body.clientInfo) {
      existing.clientInfo = {
        ...existing.clientInfo,
        ...body.clientInfo,
      };
    }

    if (body.status) {
      existing.status = body.status;
    }

    if (Array.isArray(body.items)) {
      let totalQty = 0;
      let totalMarketSum = 0;
      let totalWholesaleSum = 0;
      let estimatedCost = 0;

      existing.items = body.items.map((it) => {
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

      existing.totalItems = existing.items.length;
      existing.totalQty = totalQty;
      existing.totalMarketSum = totalMarketSum;
      existing.totalWholesaleSum = totalWholesaleSum;
      existing.totalSavings = Math.max(0, totalMarketSum - totalWholesaleSum);
      existing.estimatedCost = estimatedCost;
      existing.estimatedProfit = Math.max(0, totalWholesaleSum - estimatedCost);
    }

    if (body.profitPercent !== undefined) {
      existing.profitPercent = Number(body.profitPercent) || 5;
    }

    await existing.save();

    return NextResponse.json({ ok: true, quotation: existing });
  } catch (error) {
    return NextResponse.json({ message: "আপডেট করতে ব্যর্থ: " + error.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  const admin = await requireAdmin(req);
  if (!admin) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectToDatabase();
    const { id } = await params;
    const deleted = await WholesaleQuotation.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ message: "কোটেশন পাওয়া যায়নি" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, message: "কোটেশন সফলভাবে ডিলিট করা হয়েছে" });
  } catch (error) {
    return NextResponse.json({ message: "ডিলিট করতে ব্যর্থ: " + error.message }, { status: 500 });
  }
}
