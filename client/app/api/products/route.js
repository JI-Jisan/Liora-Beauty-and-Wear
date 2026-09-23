import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import mongoose from "mongoose";
import { Product, Category, Brand } from "@/lib/models";
import { buildPayload } from "@/lib/productPayload";
import { getAdminFromRequest } from "@/lib/adminGuard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import {
  cleanSearchTerm,
  getFuzzyVariantsForToken,
  scoreProductRelevance,
  escapeRegex,
  SEARCH_STOP_WORDS,
} from "@/lib/searchEngine";

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

    const rawSearch = searchParams.get("search");
    let isSearchActive = false;
    let cleanSearchPhrase = "";
    let searchTokens = [];

    const exclude = searchParams.get("exclude");
    if (exclude && /^[0-9a-fA-F]{24}$/.test(exclude)) query._id = { $ne: exclude };

    const isPaginated = searchParams.get("paginate") === "1";
    const page = Math.max(1, parseInt(searchParams.get("page"), 10) || 1);
    const maxLimit = 20000;
    const limitParam = parseInt(searchParams.get("limit"), 10);
    const limit = limitParam ? Math.min(maxLimit, limitParam) : (isAdmin ? 20000 : 100);
    const skip = (page - 1) * limit;

    let products = [];
    let total = 0;

    if (rawSearch && rawSearch.trim()) {
      isSearchActive = true;
      const parsed = cleanSearchTerm(rawSearch);
      cleanSearchPhrase = parsed.cleanPhrase;
      searchTokens = parsed.tokens;
      const meaningfulTokens = searchTokens.filter((t) => !SEARCH_STOP_WORDS.has(t) && t.length >= 2);

      const candidateMap = new Map();
      const addCandidates = (docs) => {
        for (const doc of docs) {
          const id = String(doc._id);
          if (!candidateMap.has(id)) {
            candidateMap.set(id, doc);
          }
        }
      };

      // Match categories and brands for key variants
      const allSearchVariants = new Set();
      if (cleanSearchPhrase) allSearchVariants.add(cleanSearchPhrase);
      for (const t of searchTokens) {
        if (!SEARCH_STOP_WORDS.has(t)) {
          allSearchVariants.add(t);
          const { words } = getFuzzyVariantsForToken(t);
          words.forEach((w) => allSearchVariants.add(w));
        }
      }

      const catBrandConditions = Array.from(allSearchVariants)
        .filter((w) => w.length >= 2)
        .slice(0, 15)
        .map((w) => ({ name: { $regex: escapeRegex(w), $options: "i" } }));

      const [matchingCats, matchingBrands] = await Promise.all([
        catBrandConditions.length > 0 ? Category.find({ $or: catBrandConditions }).select("_id").lean() : [],
        catBrandConditions.length > 0 ? Brand.find({ $or: catBrandConditions }).select("_id name").lean() : []
      ]);
      const matchingCatIds = matchingCats.map(c => c._id);
      const matchingBrandIds = matchingBrands.map(b => b._id);

      // Base query criteria (category, brand, exclude, inStock, featured)
      const baseSearchQuery = { ...query };

      // Tier 1: Exact or substring phrase match in name or description
      if (cleanSearchPhrase) {
        const phraseMatches = await Product.find({
          ...baseSearchQuery,
          $or: [
            { name: { $regex: escapeRegex(cleanSearchPhrase), $options: "i" } },
            { description: { $regex: escapeRegex(cleanSearchPhrase), $options: "i" } }
          ]
        })
          .select(isAdmin ? "" : "-purchasePrice")
          .populate("category", "name")
          .populate("brand", "name slug")
          .limit(100)
          .lean();
        addCandidates(phraseMatches);
      }

      // Tier 2: All meaningful tokens matching in name together ($and)
      if (meaningfulTokens.length > 1) {
        const combinedRegex = meaningfulTokens.map(t => `(?=.*${escapeRegex(t)})`).join("");
        const andMatches = await Product.find({
          ...baseSearchQuery,
          name: { $regex: new RegExp(combinedRegex, "i") }
        })
          .select(isAdmin ? "" : "-purchasePrice")
          .populate("category", "name")
          .populate("brand", "name slug")
          .limit(100)
          .lean();
        addCandidates(andMatches);
      }

      // Tier 3: Matching Brand or Category
      if (matchingBrandIds.length > 0) {
        const brandMatches = await Product.find({
          ...baseSearchQuery,
          brand: { $in: matchingBrandIds }
        })
          .select(isAdmin ? "" : "-purchasePrice")
          .populate("category", "name")
          .populate("brand", "name slug")
          .limit(100)
          .lean();
        addCandidates(brandMatches);
      }

      // Tier 4: Broad match for meaningful tokens & typo variants
      if (candidateMap.size < 100 && meaningfulTokens.length > 0) {
        const tokenOr = [];
        for (const t of meaningfulTokens.slice(0, 6)) {
          tokenOr.push({ name: { $regex: escapeRegex(t), $options: "i" } });
          const { words, patterns } = getFuzzyVariantsForToken(t);
          for (const w of words) tokenOr.push({ name: { $regex: escapeRegex(w), $options: "i" } });
          for (const p of patterns) tokenOr.push({ name: { $regex: p, $options: "i" } });
        }
        if (matchingCatIds.length > 0) {
          tokenOr.push({ category: { $in: matchingCatIds } });
        }
        if (tokenOr.length > 0) {
          const broadMatches = await Product.find({
            ...baseSearchQuery,
            $or: tokenOr
          })
            .select(isAdmin ? "" : "-purchasePrice")
            .populate("category", "name")
            .populate("brand", "name slug")
            .limit(150)
            .lean();
          addCandidates(broadMatches);
        }
      }

      // Tier 5: Fallback typo search if 0 products found
      if (candidateMap.size === 0 && searchTokens.length > 0) {
        const fallbackOr = [];
        for (const t of searchTokens) {
          if (t.length >= 3 && !SEARCH_STOP_WORDS.has(t)) {
            fallbackOr.push({ name: { $regex: escapeRegex(t.slice(0, 3)), $options: "i" } });
          }
        }
        if (fallbackOr.length > 0) {
          const fallbackMatches = await Product.find({
            ...baseSearchQuery,
            $or: fallbackOr
          })
            .select(isAdmin ? "" : "-purchasePrice")
            .populate("category", "name")
            .populate("brand", "name slug")
            .limit(50)
            .lean();
          addCandidates(fallbackMatches);
        }
      }

      products = Array.from(candidateMap.values());
      products.forEach((p) => {
        p._score = scoreProductRelevance(p, cleanSearchPhrase, searchTokens);
      });
      products.sort((a, b) => (b._score || 0) - (a._score || 0));
      total = products.length;

      if (isPaginated) {
        products = products.slice(skip, skip + limit);
      }
    } else {
      [products, total] = await Promise.all([
        Product.find(query)
          .select(isAdmin ? "" : "-purchasePrice")
          .populate("category", "name")
          .populate("brand", "name slug")
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
    }

    const cacheHeader = isAdmin
      ? "no-store, no-cache, must-revalidate, max-age=0"
      : "public, s-maxage=60, stale-while-revalidate=300";

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
            "Cache-Control": cacheHeader,
          },
        }
      );
    }

    return NextResponse.json(products, {
      headers: {
        "X-Total-Count": String(total),
        "X-Total-Pages": String(Math.ceil(total / limit) || 1),
        "Cache-Control": cacheHeader,
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
