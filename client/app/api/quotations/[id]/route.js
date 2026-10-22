import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { WholesaleQuotation } from "@/lib/models";

export const runtime = "nodejs";

export async function GET(req, { params }) {
  try {
    await connectToDatabase();
    const { id } = await params;

    // Search by ObjectId or quoteNumber
    let doc = null;
    if (/^[0-9a-fA-F]{24}$/.test(id)) {
      doc = await WholesaleQuotation.findById(id).lean();
    }
    if (!doc) {
      doc = await WholesaleQuotation.findOne({ quoteNumber: id }).lean();
    }

    if (!doc) {
      return NextResponse.json({ message: "কোটেশন বা ইনভয়েস পাওয়া যায়নি" }, { status: 404 });
    }

    // Mask sensitive profit and internal buying cost fields for public buyer view
    const safeItems = (doc.items || []).map((it) => ({
      name: it.name,
      brandName: it.brandName,
      categoryName: it.categoryName,
      image: it.image,
      originalPrice: it.originalPrice,
      wholesalePrice: it.wholesalePrice,
      quantity: it.quantity,
      lineTotal: it.lineTotal,
      discountPct: it.discountPct,
    }));

    const safeQuotation = {
      _id: doc._id,
      quoteNumber: doc.quoteNumber,
      clientInfo: doc.clientInfo,
      items: safeItems,
      totalItems: doc.totalItems,
      totalQty: doc.totalQty,
      totalMarketSum: doc.totalMarketSum,
      totalWholesaleSum: doc.totalWholesaleSum,
      totalSavings: doc.totalSavings,
      status: doc.status,
      createdAt: doc.createdAt,
    };

    return NextResponse.json({ quotation: safeQuotation });
  } catch (error) {
    return NextResponse.json({ message: "ত্রুটি: " + error.message }, { status: 500 });
  }
}
