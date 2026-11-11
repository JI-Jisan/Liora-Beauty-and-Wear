import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { Product, Category, Brand } from "@/lib/models";
import { requireAdmin } from "@/lib/adminGuard";
import { calculateSafeCampusPrice } from "@/lib/campusPricingHelper";

export const runtime = "nodejs";

export async function GET(req) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";
    const category = searchParams.get("category") || "all";
    const brand = searchParams.get("brand") || "all";
    const stockStatus = searchParams.get("stockStatus") || "all";
    const marginStatus = searchParams.get("marginStatus") || "all";
    const maxMargin = searchParams.get("maxMargin");
    const mode = searchParams.get("mode") || "retail"; // 'retail' | 'diu15' | 'student15' | 'wholesale' | 'reseller' | 'ogerio'
    const sortBy = searchParams.get("sortBy") || "profit_desc";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(200, Math.max(10, parseInt(searchParams.get("limit") || "60", 10)));

    // 1. Build Base Match Query
    const query = {};

    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    if (category && category !== "all") {
      if (mongoose.Types.ObjectId.isValid(category)) {
        query.category = new mongoose.Types.ObjectId(category);
      } else {
        // Find category by name
        const catDoc = await Category.findOne({ name: new RegExp(`^${category}$`, "i") }).lean();
        if (catDoc) query.category = catDoc._id;
      }
    }

    if (brand && brand !== "all") {
      if (mongoose.Types.ObjectId.isValid(brand)) {
        query.brand = new mongoose.Types.ObjectId(brand);
      } else {
        const brandDoc = await Brand.findOne({
          $or: [{ name: new RegExp(`^${brand}$`, "i") }, { slug: new RegExp(`^${brand}$`, "i") }],
        }).lean();
        if (brandDoc) query.brand = brandDoc._id;
      }
    }

    if (stockStatus && stockStatus !== "all") {
      if (stockStatus === "in_stock") {
        query.stockQuantity = { $gt: 5 };
      } else if (stockStatus === "low_stock") {
        query.stockQuantity = { $gt: 0, $lte: 5 };
      } else if (stockStatus === "out_of_stock") {
        query.stockQuantity = { $lte: 0 };
      }
    }

    // 2. Fetch Products
    const rawProducts = await Product.find(query)
      .populate("category", "name slug")
      .populate("brand", "name slug wholesaleMarginPct")
      .lean();

    // 3. Enrich products with Live Profit & Margin Calculations based on active mode
    let enriched = rawProducts.map((p) => {
      const purchasePrice = Number(p.purchasePrice) || 0;
      const originalPrice = Number(p.originalPrice) || Number(p.price) || 0;
      const offerPrice = Number(p.offerPrice) || Number(p.salePrice) || originalPrice;
      const ogerioPrice = Number(p.ogerioPrice) || 0;
      const stockQty = Number(p.stockQuantity) || 0;

      // Smart wholesale price fallback: if not set, cost + brand wholesale margin % (default 7%)
      const brandMargin = p.brand?.wholesaleMarginPct || 7;
      const wholesalePrice =
        Number(p.wholesalePrice) > 0
          ? Number(p.wholesalePrice)
          : Math.round(purchasePrice > 0 ? purchasePrice * (1 + brandMargin / 100) : offerPrice * 0.85);

      // Smart reseller price fallback: cost + 12% margin or offerPrice - 10%
      const resellerPrice =
        Number(p.resellerPrice) > 0
          ? Number(p.resellerPrice)
          : Math.round(purchasePrice > 0 ? purchasePrice * 1.12 : offerPrice * 0.9);

      const wholesaleMinQty = Number(p.wholesaleMinQty) || 3;
      const campusDiscountPct = Number(p.campusDiscountPct) || 15;

      // Determine effective selling price & channel details based on Mode
      let effectiveSellingPrice = offerPrice;
      let modeNote = "Regular Web Offer";

      if (mode === "diu15") {
        const safeRes = calculateSafeCampusPrice(offerPrice, purchasePrice, campusDiscountPct, 12);
        effectiveSellingPrice = safeRes.price;
        modeNote = `DIU15 (-${safeRes.discountPct}%)`;
      } else if (mode === "student15") {
        const safeRes = calculateSafeCampusPrice(offerPrice, purchasePrice, 15, 12);
        effectiveSellingPrice = safeRes.price;
        modeNote = `Student15 (-${safeRes.discountPct}%)`;
      } else if (mode === "wholesale") {
        effectiveSellingPrice = wholesalePrice;
        modeNote = `Wholesale (Min ${wholesaleMinQty} pcs)`;
      } else if (mode === "reseller") {
        effectiveSellingPrice = resellerPrice;
        modeNote = "Reseller Dropship";
      } else if (mode === "ogerio") {
        effectiveSellingPrice = offerPrice;
        modeNote = "Ogerio Comparison";
      }

      const unitProfit = effectiveSellingPrice - purchasePrice;
      const profitMarginPct =
        effectiveSellingPrice > 0 ? parseFloat(((unitProfit / effectiveSellingPrice) * 100).toFixed(1)) : 0;
      const markupPct = purchasePrice > 0 ? parseFloat(((unitProfit / purchasePrice) * 100).toFixed(1)) : 0;

      // Bundle wholesale profit
      const wholesaleBundleProfit = (wholesalePrice - purchasePrice) * wholesaleMinQty;

      // Competitor comparison (Ogerio)
      const ogerioDiff = ogerioPrice > 0 ? ogerioPrice - offerPrice : null;
      let competitorStatus = "none";
      if (ogerioPrice > 0) {
        if (offerPrice < ogerioPrice) competitorStatus = "cheaper"; // LIORA is cheaper!
        else if (offerPrice > ogerioPrice) competitorStatus = "expensive";
        else competitorStatus = "equal";
      }

      // Margin health status classification
      let marginHealth = "healthy"; // healthy (15% - 35%)
      if (purchasePrice === 0) {
        marginHealth = "no_cost"; // buying price not entered
      } else if (unitProfit <= 0) {
        marginHealth = "loss"; // zero or negative profit!
      } else if (profitMarginPct < 15) {
        marginHealth = "low"; // low profit (1-15%)
      } else if (profitMarginPct >= 35) {
        marginHealth = "high"; // high profit (35%+)
      }

      return {
        _id: p._id,
        name: p.name,
        slug: p.slug,
        image: p.image || (p.images && p.images[0]) || "",
        category: p.category ? { _id: p.category._id, name: p.category.name } : null,
        brand: p.brand ? { _id: p.brand._id, name: p.brand.name } : null,
        purchasePrice,
        originalPrice,
        offerPrice,
        pre1111OfferPrice: p.pre1111OfferPrice || null,
        is1111Applied: Boolean(p.is1111Applied),
        ogerioPrice,
        wholesalePrice,
        wholesaleMinQty,
        resellerPrice,
        campusDiscountPct,
        stockQuantity: stockQty,
        stockStatus: p.stockStatus || (stockQty > 5 ? "In Stock" : stockQty > 0 ? "Limited Stock" : "Out of Stock"),
        inStock: p.inStock,
        // Computed metrics for current active mode
        mode,
        modeNote,
        effectiveSellingPrice,
        unitProfit,
        profitMarginPct,
        markupPct,
        wholesaleBundleProfit,
        ogerioDiff,
        competitorStatus,
        marginHealth,
      };
    });

    // 4. Apply Margin Health & Custom Max Margin Filters
    if (marginStatus && marginStatus !== "all") {
      if (marginStatus === "under_10") {
        enriched = enriched.filter((p) => p.purchasePrice > 0 && p.profitMarginPct < 10);
      } else if (marginStatus === "under_5") {
        enriched = enriched.filter((p) => p.purchasePrice > 0 && p.profitMarginPct <= 5);
      } else {
        enriched = enriched.filter((p) => p.marginHealth === marginStatus);
      }
    }

    if (maxMargin !== null && maxMargin !== "" && !isNaN(Number(maxMargin))) {
      const maxVal = parseFloat(maxMargin);
      enriched = enriched.filter((p) => p.purchasePrice > 0 && p.profitMarginPct <= maxVal);
    }

    // 5. Storewide Summary KPIs (calculated over all matching products)
    let totalInventoryCost = 0;
    let totalProjectedRevenue = 0;
    let totalProjectedProfit = 0;
    let lossCount = 0;
    let under10Count = 0;
    let lowMarginCount = 0;
    let healthyMarginCount = 0;
    let highMarginCount = 0;
    let missingCostCount = 0;

    enriched.forEach((p) => {
      const qty = Math.max(0, p.stockQuantity);
      totalInventoryCost += p.purchasePrice * qty;
      totalProjectedRevenue += p.effectiveSellingPrice * qty;
      totalProjectedProfit += p.unitProfit * qty;

      if (p.purchasePrice > 0 && p.profitMarginPct < 10) under10Count++;

      if (p.marginHealth === "loss") lossCount++;
      else if (p.marginHealth === "low") lowMarginCount++;
      else if (p.marginHealth === "healthy") healthyMarginCount++;
      else if (p.marginHealth === "high") highMarginCount++;
      else if (p.marginHealth === "no_cost") missingCostCount++;
    });

    const avgProfitMargin =
      totalProjectedRevenue > 0
        ? parseFloat(((totalProjectedProfit / totalProjectedRevenue) * 100).toFixed(1))
        : 0;

    // 6. Sorting
    enriched.sort((a, b) => {
      if (sortBy === "profit_desc") return b.unitProfit - a.unitProfit;
      if (sortBy === "profit_asc") return a.unitProfit - b.unitProfit;
      if (sortBy === "margin_desc") return b.profitMarginPct - a.profitMarginPct;
      if (sortBy === "margin_asc") return a.profitMarginPct - b.profitMarginPct;
      if (sortBy === "price_desc") return b.effectiveSellingPrice - a.effectiveSellingPrice;
      if (sortBy === "price_asc") return a.effectiveSellingPrice - b.effectiveSellingPrice;
      if (sortBy === "stock_desc") return b.stockQuantity - a.stockQuantity;
      if (sortBy === "stock_asc") return a.stockQuantity - b.stockQuantity;
      if (sortBy === "name_asc") return a.name.localeCompare(b.name);
      return 0;
    });

    // 7. Pagination
    const totalCount = enriched.length;
    const totalPages = Math.ceil(totalCount / limit) || 1;
    const startIndex = (page - 1) * limit;
    const paginatedProducts = enriched.slice(startIndex, startIndex + limit);

    // 8. Categories and Brands for dropdown lists
    const [allCategories, allBrands] = await Promise.all([
      Category.find({ isActive: { $ne: false } }).select("name slug").sort({ name: 1 }).lean(),
      Brand.find({ isActive: { $ne: false } }).select("name slug").sort({ name: 1 }).lean(),
    ]);

    return NextResponse.json({
      success: true,
      mode,
      summary: {
        totalProducts: totalCount,
        totalInventoryCost: Math.round(totalInventoryCost),
        totalProjectedRevenue: Math.round(totalProjectedRevenue),
        totalProjectedProfit: Math.round(totalProjectedProfit),
        avgProfitMargin,
        lossCount,
        under10Count,
        lowMarginCount,
        healthyMarginCount,
        highMarginCount,
        missingCostCount,
      },
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
      },
      products: paginatedProducts,
      categories: allCategories,
      brands: allBrands,
    });
  } catch (err) {
    console.error("Error in profit-matrix GET:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const body = await req.json();

    const { productId } = body;
    if (!productId) {
      return NextResponse.json({ success: false, error: "Product ID is required." }, { status: 400 });
    }

    const updates = {};
    if (body.purchasePrice !== undefined) updates.purchasePrice = Math.max(0, Number(body.purchasePrice));
    if (body.originalPrice !== undefined) updates.originalPrice = Math.max(0, Number(body.originalPrice));
    if (body.offerPrice !== undefined) updates.offerPrice = Math.max(0, Number(body.offerPrice));
    if (body.ogerioPrice !== undefined) updates.ogerioPrice = Math.max(0, Number(body.ogerioPrice));
    if (body.wholesalePrice !== undefined) updates.wholesalePrice = Math.max(0, Number(body.wholesalePrice));
    if (body.wholesaleMinQty !== undefined) updates.wholesaleMinQty = Math.max(1, Number(body.wholesaleMinQty));
    if (body.resellerPrice !== undefined) updates.resellerPrice = Math.max(0, Number(body.resellerPrice));
    if (body.campusDiscountPct !== undefined) {
      updates.campusDiscountPct = Math.min(25, Math.max(0, Number(body.campusDiscountPct)));
    }
    if (body.stockQuantity !== undefined) {
      const qty = Math.max(0, Number(body.stockQuantity));
      updates.stockQuantity = qty;
      updates.stockStatus = qty <= 0 ? "Out of Stock" : qty <= 5 ? "Limited Stock" : "In Stock";
      updates.inStock = qty > 0;
    }

    const updated = await Product.findByIdAndUpdate(productId, { $set: updates }, { new: true })
      .populate("category", "name")
      .populate("brand", "name")
      .lean();

    if (!updated) {
      return NextResponse.json({ success: false, error: "Product not found." }, { status: 404 });
    }

    // Calculate updated profit metrics
    const purchasePrice = updated.purchasePrice || 0;
    const offerPrice = updated.offerPrice || updated.originalPrice || 0;
    const unitProfit = offerPrice - purchasePrice;
    const profitMarginPct = offerPrice > 0 ? parseFloat(((unitProfit / offerPrice) * 100).toFixed(1)) : 0;

    return NextResponse.json({
      success: true,
      message: `Pricing updated for "${updated.name}"!`,
      product: {
        _id: updated._id,
        purchasePrice: updated.purchasePrice,
        originalPrice: updated.originalPrice,
        offerPrice: updated.offerPrice,
        ogerioPrice: updated.ogerioPrice,
        wholesalePrice: updated.wholesalePrice,
        wholesaleMinQty: updated.wholesaleMinQty,
        resellerPrice: updated.resellerPrice,
        campusDiscountPct: updated.campusDiscountPct,
        stockQuantity: updated.stockQuantity,
        stockStatus: updated.stockStatus,
        unitProfit,
        profitMarginPct,
      },
    });
  } catch (err) {
    console.error("Error in profit-matrix PATCH:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
