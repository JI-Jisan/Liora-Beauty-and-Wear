import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import mongoose from "mongoose";
import { Product, Category, Brand } from "@/lib/models";
import { buildPayload } from "@/lib/productPayload";
import { getAdminFromRequest } from "@/lib/adminGuard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

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

    const collection = searchParams.get("collection");
    if (collection) {
      const col = collection.toLowerCase().trim();
      if (col === "combo" || col === "combo-offer" || col === "combos") {
        const comboCat = await Category.findOne({ name: /combo/i }).select("_id").lean();
        const comboCatIds = comboCat ? [comboCat._id] : [];
        if (comboCat) {
          const kids = await Category.find({ ancestors: comboCat._id }).select("_id").lean();
          comboCatIds.push(...kids.map(k => k._id));
        }
        query.$or = [
          ...(comboCatIds.length ? [{ category: { $in: comboCatIds } }] : []),
          { name: { $regex: /combo/i } }
        ];
      } else if (col === "clearance" || col === "clearance-sale") {
        const clearCat = await Category.findOne({ name: /clearance/i }).select("_id").lean();
        const clearCatIds = clearCat ? [clearCat._id] : [];
        if (clearCat) {
          const kids = await Category.find({ ancestors: clearCat._id }).select("_id").lean();
          clearCatIds.push(...kids.map(k => k._id));
        }
        query.$or = [
          ...(clearCatIds.length ? [{ category: { $in: clearCatIds } }] : []),
          { name: { $regex: /clearance/i } },
          { isFeatured: true }
        ];
      } else if (col === "flash-sales" || col === "flash-sale" || col === "flash") {
        const flashCat = await Category.findOne({ name: /flash sale/i }).select("_id").lean();
        const flashCatIds = flashCat ? [flashCat._id] : [];
        if (flashCat) {
          const kids = await Category.find({ ancestors: flashCat._id }).select("_id").lean();
          flashCatIds.push(...kids.map(k => k._id));
        }
        query.$or = [
          ...(flashCatIds.length ? [{ category: { $in: flashCatIds } }] : []),
          { name: { $regex: /flash/i } },
          { isFeatured: true }
        ];
      }
    }

    if (category) {
      let targetCat = null;
      if (mongoose.Types.ObjectId.isValid(category)) {
        targetCat = await Category.findById(category).select("_id").lean();
      }
      if (!targetCat) {
        targetCat = await Category.findOne({
          $or: [
            { slug: category },
            { name: { $regex: new RegExp(`^${category.replace(/-/g, " ")}$`, "i") } }
          ]
        }).select("_id").lean();
      }

      if (targetCat) {
        const allMatchingIds = new Set([String(targetCat._id)]);
        let frontier = [targetCat._id];
        for (let lvl = 0; lvl < 4 && frontier.length > 0; lvl++) {
          const children = await Category.find({
            $or: [
              { parent: { $in: frontier } },
              { ancestors: { $in: frontier } }
            ]
          }).select("_id").lean();
          frontier = [];
          for (const c of children) {
            const cid = String(c._id);
            if (!allMatchingIds.has(cid)) {
              allMatchingIds.add(cid);
              frontier.push(c._id);
            }
          }
        }
        query.category = { $in: Array.from(allMatchingIds).map((id) => new mongoose.Types.ObjectId(id)) };
      }
    }
    if (type === "featured") {
      query.isFeatured = true;
      if (!isAdmin) query.inStock = true;
    } else if (type === "trending" || type === "hot") {
      if (!isAdmin) {
        query.inStock = true;
        // Exclude products already shown in Featured to avoid repetitive duplicate sections
        query.isFeatured = { $ne: true };
      }
      query.$or = [
        { isTrending: true },
        { discountBadge: { $in: ["20", "25", "30", "35", "40", "45", "50", "55", "60", "65", "67", "68", "70", "72", "75"] } }
      ];
    } else if (type === "new") {
      if (!isAdmin) {
        query.inStock = true;
        // Exclude products already shown in Featured or Hot Deals to keep New Arrivals fresh and unique
        query.isFeatured = { $ne: true };
        query.isTrending = { $ne: true };
        query.discountBadge = { $nin: ["20", "25", "30", "35", "40", "45", "50", "55", "60", "65", "67", "68", "70", "72", "75"] };
      }
      query.isNewArrival = true;
    } else if (type === "slider") {
      query.isSlider = true;
      if (!isAdmin) query.inStock = true;
    }

    const search = searchParams.get("search");
    if (search && search.trim()) {
      const cleanSearch = search.trim();
      const words = cleanSearch.split(/\s+/).filter(Boolean);

      const matchingCats = await Category.find({ name: { $regex: escapeRegex(cleanSearch), $options: "i" } }).select("_id").lean();
      const matchingCatIds = matchingCats.map((c) => c._id);

      const matchingBrands = await Brand.find({ name: { $regex: escapeRegex(cleanSearch), $options: "i" } }).select("_id").lean();
      const matchingBrandIds = matchingBrands.map((b) => b._id);

      const directOrConditions = [
        { name: { $regex: escapeRegex(cleanSearch), $options: "i" } },
        { description: { $regex: escapeRegex(cleanSearch), $options: "i" } },
      ];
      if (matchingCatIds.length > 0) {
        directOrConditions.push({ category: { $in: matchingCatIds } });
      }
      if (matchingBrandIds.length > 0) {
        directOrConditions.push({ brand: { $in: matchingBrandIds } });
      }

      let searchCondition = null;
      if (words.length > 1) {
        const wordConditions = words.map((w) => {
          const reg = { $regex: escapeRegex(w), $options: "i" };
          return {
            $or: [{ name: reg }, { description: reg }],
          };
        });

        searchCondition = {
          $or: [
            ...directOrConditions,
            { $and: wordConditions },
          ],
        };
      } else {
        searchCondition = { $or: directOrConditions };
      }

      if (query.$and) {
        query.$and.push(searchCondition);
      } else {
        query.$and = [searchCondition];
      }
    }

    const exclude = searchParams.get("exclude");
    if (exclude && /^[0-9a-fA-F]{24}$/.test(exclude)) query._id = { $ne: exclude };

    const isPaginated = searchParams.get("paginate") === "1";
    const page = Math.max(1, parseInt(searchParams.get("page"), 10) || 1);
    const maxLimit = 20000;
    const limitParam = parseInt(searchParams.get("limit"), 10);
    const limit = limitParam ? Math.min(maxLimit, limitParam) : (isAdmin ? 20000 : 100);
    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      Product.find(query)
        .select(isAdmin ? "" : "-purchasePrice")
        .populate("category", "name")
        .sort(
          type && type !== "all"
            ? { createdAt: -1 }
            : { inStock: -1, isFeatured: -1, createdAt: -1 }
        )
        .skip(isPaginated ? skip : 0)
        .limit(limit)
        .lean(),
      Product.countDocuments(query),
    ]);

    if (isPaginated) {
      return NextResponse.json(
        {
          products,
          total,
          totalPages: Math.ceil(total / limit) || 1,
          currentPage: page,
          limit,
        },
        {
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
          },
        }
      );
    }

    return NextResponse.json(products, {
      headers: {
        "X-Total-Count": String(total),
        "X-Total-Pages": String(Math.ceil(total / limit) || 1),
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
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
