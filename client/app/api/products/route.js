import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import mongoose from "mongoose";
import { Product, Category, Brand } from "@/lib/models";
import { buildPayload } from "@/lib/productPayload";
import { getAdminFromRequest } from "@/lib/adminGuard";

export const runtime = "nodejs";

export async function GET(req) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const isAdmin = !!getAdminFromRequest(req);

    const query = {};
    const category = searchParams.get("category");
    const type = searchParams.get("type");
    const brand = searchParams.get("brand");

    if (brand) {
      const isId = /^[0-9a-fA-F]{24}$/.test(brand);
      const doc = isId ? { _id: brand } : { slug: brand };
      const b = await Brand.findOne(doc).select('_id name');
      if (b) {
        query.$or = [
          { brand: b._id },
          { name: { $regex: b.name, $options: "i" } }
        ];
      } else {
        query.name = { $regex: brand.replace(/-/g, " "), $options: "i" };
      }
    }

    if (category && mongoose.Types.ObjectId.isValid(category)) {
      const kids = await Category.find({ ancestors: category }).select("_id").lean();
      query.category = { $in: [new mongoose.Types.ObjectId(category), ...kids.map((k) => k._id)] };
    }
    if (type === "featured") query.isFeatured = true;
    if (type === "trending") query.isTrending = true;
    if (type === "new") query.isNewArrival = true;
    if (type === "slider") query.isSlider = true;

    const search = searchParams.get("search");
    if (search && search.trim()) {
      const words = search.trim().split(/\s+/).filter(Boolean);
      if (words.length > 1) {
        const wordRegexes = words.map(w => ({
          $or: [
            { name: { $regex: w, $options: "i" } },
            { description: { $regex: w, $options: "i" } }
          ]
        }));
        if (query.$and) {
          query.$and.push(...wordRegexes);
        } else {
          query.$and = wordRegexes;
        }
      } else {
        query.$or = [
          { name: { $regex: search.trim(), $options: "i" } },
          { description: { $regex: search.trim(), $options: "i" } }
        ];
      }
    }

    const exclude = searchParams.get("exclude");
    if (exclude && /^[0-9a-fA-F]{24}$/.test(exclude)) query._id = { $ne: exclude };

    const isPaginated = searchParams.get("paginate") === "1";
    const page = Math.max(1, parseInt(searchParams.get("page"), 10) || 1);
    const maxLimit = isAdmin ? 10000 : 1000;
    const limitParam = parseInt(searchParams.get("limit"), 10);
    const limit = limitParam ? Math.min(maxLimit, limitParam) : (isAdmin ? 10000 : 100);
    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      Product.find(query)
        .select(isAdmin ? "" : "-purchasePrice")
        .populate("category", "name")
        .populate("brand", "name slug")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(query),
    ]);

    if (isPaginated) {
      return NextResponse.json({
        products,
        total,
        totalPages: Math.ceil(total / limit) || 1,
        currentPage: page,
        limit,
      });
    }

    return NextResponse.json(products, {
      headers: {
        "X-Total-Count": String(total),
        "X-Total-Pages": String(Math.ceil(total / limit) || 1),
      },
    });
  } catch (error) {
    console.error("Products GET:", error);
    return NextResponse.json({ message: "প্রোডাক্ট লোড হয়নি" }, { status: 500 });
  }
}

export async function POST(req) {
  const admin = getAdminFromRequest(req);
  if (!admin) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  try {
    await connectToDatabase();
    const body = await req.json();
    const payload = buildPayload(body);          // whitelist, mass assignment নয়

    const product = await Product.create(payload);
    return NextResponse.json(product.toJSON(), { status: 201 });
  } catch (error) {
    console.error("Products POST:", error);
    const isValidation = error?.name === "ValidationError" || error?.message?.length < 120;
    return NextResponse.json(
      { message: isValidation ? error.message : "প্রোডাক্ট সেভ হয়নি" },
      { status: isValidation ? 400 : 500 }
    );
  }
}
