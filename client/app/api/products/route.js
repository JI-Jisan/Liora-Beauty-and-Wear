import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import mongoose from "mongoose";
import { Product, Category, Brand } from "@/lib/models";
import { buildPayload } from "@/lib/productPayload";

export const runtime = "nodejs";

export async function GET(req) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);

    const query = {};
    const category = searchParams.get("category");
    const type = searchParams.get("type");
    const brandSlug = searchParams.get("brand");

    if (brandSlug) {
      const b = await Brand.findOne({ slug: brandSlug }).select('_id').lean();
      query.brand = b?._id ?? null;
    }

    if (category && mongoose.Types.ObjectId.isValid(category)) {
      const kids = await Category.find({ ancestors: category }).select("_id").lean();
      query.category = { $in: [new mongoose.Types.ObjectId(category), ...kids.map((k) => k._id)] };
    }
    if (type === "featured") query.isFeatured = true;
    if (type === "trending") query.isTrending = true;
    if (type === "new") query.isNewArrival = true;
    if (type === "slider") query.isSlider = true;

    const limit = Math.min(100, parseInt(searchParams.get("limit")) || 100);
    const exclude = searchParams.get("exclude");
    if (exclude && /^[0-9a-fA-F]{24}$/.test(exclude)) query._id = { $ne: exclude };

    const products = await Product.find(query)
      .populate("category", "name")   // related products ও ক্যাটাগরি নাম ঠিক করবে
      .populate("brand", "name slug")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json(products);
  } catch (error) {
    console.error("Products GET:", error);
    return NextResponse.json({ message: "প্রোডাক্ট লোড হয়নি" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const payload = buildPayload(body);          // whitelist, mass assignment নয়

    const product = await Product.create(payload);
    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error("Products POST:", error);
    const isValidation = error?.name === "ValidationError" || error?.message?.length < 120;
    return NextResponse.json(
      { message: isValidation ? error.message : "প্রোডাক্ট সেভ হয়নি" },
      { status: isValidation ? 400 : 500 }
    );
  }
}
