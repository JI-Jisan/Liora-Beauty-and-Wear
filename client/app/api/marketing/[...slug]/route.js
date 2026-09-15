import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { Brand, Product, SiteSettings } from "@/lib/models";
import {
  generateFBCaption,
  generateProductBanner,
  batchGenerateBrandPromotions,
  pickSmartTheme,
  publishPhotoToFacebook,
  startAutoPilot,
  stopAutoPilot,
  getAutoPilotStatus,
} from "@/lib/fbPromotionService";

export const runtime = "nodejs";

export async function GET(req, { params }) {
  try {
    await connectToDatabase();
    const resolvedParams = await params;
    const slug = resolvedParams.slug || [];
    const action = slug[0];
    const url = new URL(req.url);

    // 1. /api/marketing/brands
    if (action === "brands") {
      const brands = await Brand.find().sort({ name: 1 }).lean();
      const counts = await Product.aggregate([
        { $match: { brand: { $ne: null } } },
        { $group: { _id: "$brand", count: { $sum: 1 } } },
      ]);
      const countMap = {};
      counts.forEach((c) => {
        countMap[c._id.toString()] = c.count;
      });

      const enriched = brands
        .map((b) => ({
          _id: b._id,
          name: b.name,
          slug: b.slug,
          productCount: countMap[b._id.toString()] || 0,
        }))
        .filter((b) => b.productCount > 0);

      return NextResponse.json({ success: true, brands: enriched });
    }

    // 2. /api/marketing/products?brandId=...
    if (action === "products") {
      const brandId = url.searchParams.get("brandId");
      if (!brandId) {
        return NextResponse.json({ success: false, error: "brandId is required" }, { status: 400 });
      }

      const query = {
        $or: [
          { brand: brandId },
          ...(mongoose.Types.ObjectId.isValid(brandId) ? [{ brand: new mongoose.Types.ObjectId(brandId) }] : []),
        ],
      };

      const products = await Product.find(query)
        .populate("category", "name")
        .populate("brand", "name")
        .limit(100)
        .lean();

      return NextResponse.json({
        success: true,
        total: products.length,
        products: products.map((p) => ({
          _id: p._id,
          name: p.name,
          originalPrice: p.originalPrice,
          offerPrice: p.offerPrice,
          image: p.image || (p.images && p.images[0]) || "",
          category: p.category?.name || "",
          brand: p.brand?.name || "",
          smartTheme: pickSmartTheme(p.name, p.category?.name),
        })),
      });
    }

    // 3. /api/marketing/preview/:productId?theme=...
    if (action === "preview") {
      const productId = slug[1];
      const theme = url.searchParams.get("theme");

      const product = await Product.findById(productId)
        .populate("category", "name")
        .populate("brand", "name")
        .lean();

      if (!product) {
        return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });
      }

      const caption = generateFBCaption(product, product.brand?.name || "LIORA");
      const bannerBuffer = await generateProductBanner(product, theme);

      return NextResponse.json({
        success: true,
        product: {
          _id: product._id,
          name: product.name,
          originalPrice: product.originalPrice,
          offerPrice: product.offerPrice,
          brand: product.brand?.name || "LIORA",
        },
        theme: theme || pickSmartTheme(product.name, product.category?.name),
        caption,
        bannerBase64: `data:image/png;base64,${bannerBuffer.toString("base64")}`,
      });
    }

    // 4. /api/marketing/banner-download/:productId?theme=...
    if (action === "banner-download") {
      const productId = slug[1];
      const theme = url.searchParams.get("theme");

      const product = await Product.findById(productId)
        .populate("category", "name")
        .populate("brand", "name")
        .lean();

      if (!product) {
        return new NextResponse("Product not found", { status: 404 });
      }

      const bannerBuffer = await generateProductBanner(product, theme);
      const filename = `banner_${product.slug || product._id}.png`;

      return new NextResponse(bannerBuffer, {
        headers: {
          "Content-Type": "image/png",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    // 5. /api/marketing/fb-config
    if (action === "fb-config") {
      let settings = await SiteSettings.findOne().lean();
      if (!settings) {
        settings = await SiteSettings.create({});
      }
      return NextResponse.json({
        success: true,
        fbPageId: settings.fbPageId || "1213659151838727",
        hasToken: !!settings.fbPageAccessToken,
        tokenMasked: settings.fbPageAccessToken
          ? `${settings.fbPageAccessToken.slice(0, 10)}...${settings.fbPageAccessToken.slice(-6)}`
          : "",
        fbAppId: settings.fbAppId || "974777838976699",
      });
    }

    // 6. /api/marketing/autopilot-status
    if (action === "autopilot-status") {
      return NextResponse.json({
        success: true,
        status: getAutoPilotStatus(),
      });
    }

    return NextResponse.json({ success: false, error: `Unknown marketing endpoint: ${action}` }, { status: 404 });
  } catch (err) {
    console.error("Marketing API GET error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req, { params }) {
  try {
    await connectToDatabase();
    const resolvedParams = await params;
    const slug = resolvedParams.slug || [];
    const action = slug[0];
    const body = await req.json().catch(() => ({}));

    // 1. /api/marketing/batch-generate
    if (action === "batch-generate") {
      const { brandId, brandName, limit = 100 } = body;
      const brandQuery = brandId || brandName;
      if (!brandQuery) {
        return NextResponse.json({ success: false, error: "brandId or brandName is required" }, { status: 400 });
      }

      const result = await batchGenerateBrandPromotions({
        brandQuery,
        limit: Number(limit) || 100,
      });

      return NextResponse.json({
        success: true,
        data: result,
      });
    }

    // 2. /api/marketing/fb-config
    if (action === "fb-config") {
      const { fbPageId, fbPageAccessToken } = body;
      let settings = await SiteSettings.findOne();
      if (!settings) settings = new SiteSettings();

      if (fbPageId) settings.fbPageId = fbPageId.trim();
      let inputToken = fbPageAccessToken ? fbPageAccessToken.trim() : settings.fbPageAccessToken;
      
      // Auto-extract access_token if user pasted the entire browser address bar URL
      if (inputToken && inputToken.includes("access_token=")) {
        const match = inputToken.match(/access_token=([^&]+)/);
        if (match) {
          inputToken = decodeURIComponent(match[1]);
        }
      }
      settings.fbPageAccessToken = inputToken;

      let pageName = "Liora Beauty & Wear";
      let verified = false;

      // 1. Check if token is a User Token that can provide Page Token from /me/accounts
      try {
        const accountsRes = await fetch(
          `https://graph.facebook.com/v20.0/me/accounts?access_token=${inputToken}`
        );
        const accountsData = await accountsRes.json();
        if (accountsData && Array.isArray(accountsData.data) && accountsData.data.length > 0) {
          const matchedPage = accountsData.data.find((p) => p.id === settings.fbPageId) || accountsData.data[0];
          if (matchedPage && matchedPage.access_token) {
            settings.fbPageAccessToken = matchedPage.access_token;
            if (matchedPage.id) settings.fbPageId = matchedPage.id;
            pageName = matchedPage.name;
            verified = true;
          }
        }
      } catch (e) {
        console.warn("Accounts lookup failed, checking page directly:", e.message);
      }

      // 2. If not verified via /me/accounts, test directly on Page ID
      if (!verified && settings.fbPageAccessToken) {
        try {
          const verifyRes = await fetch(
            `https://graph.facebook.com/v20.0/${settings.fbPageId}?fields=id,name&access_token=${settings.fbPageAccessToken}`
          );
          const verifyData = await verifyRes.json();
          if (verifyData && verifyData.id) {
            pageName = verifyData.name || pageName;
            verified = true;
          }
        } catch (e) {
          console.warn("Facebook token verification warning:", e.message);
        }
      }

      await settings.save();

      return NextResponse.json({
        success: true,
        verified,
        pageName,
        fbPageId: settings.fbPageId,
      });
    }

    // 3. /api/marketing/publish-single
    if (action === "publish-single") {
      const { productId, customCaption, theme } = body;
      const settings = await SiteSettings.findOne().lean();

      const pageId = settings?.fbPageId || "1213659151838727";
      const pageAccessToken = settings?.fbPageAccessToken;

      if (!pageAccessToken) {
        return NextResponse.json(
          {
            success: false,
            error: "Facebook Page Access Token is not set. Please save your Page Token in Settings.",
          },
          { status: 400 }
        );
      }

      const product = await Product.findById(productId)
        .populate("category", "name")
        .populate("brand", "name")
        .lean();

      if (!product) {
        return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });
      }

      const bannerBuffer = await generateProductBanner(product, theme);
      const caption = customCaption || generateFBCaption(product, product.brand?.name || "LIORA");

      const fbResult = await publishPhotoToFacebook({
        imageBuffer: bannerBuffer,
        caption,
        pageId,
        pageAccessToken,
      });

      return NextResponse.json({
        success: true,
        fbResult,
      });
    }

    // 4. /api/marketing/start-autopilot
    if (action === "start-autopilot") {
      const { brandId, brandName, intervalMinutes = 15, limit = 50 } = body;
      const brandQuery = brandId || brandName;
      const settings = await SiteSettings.findOne().lean();

      const pageId = settings?.fbPageId || "61593176967507";
      const pageAccessToken = settings?.fbPageAccessToken;

      if (!pageAccessToken) {
        return NextResponse.json(
          {
            success: false,
            error: "Facebook Page Access Token not configured. Please save your Page Token first.",
          },
          { status: 400 }
        );
      }

      const result = await startAutoPilot({
        brandQuery,
        intervalMinutes: Number(intervalMinutes) || 15,
        limit: Number(limit) || 50,
        pageId,
        pageAccessToken,
      });

      return NextResponse.json(result);
    }

    // 5. /api/marketing/stop-autopilot
    if (action === "stop-autopilot") {
      const result = stopAutoPilot();
      return NextResponse.json(result);
    }

    return NextResponse.json({ success: false, error: `Unknown marketing action: ${action}` }, { status: 404 });
  } catch (err) {
    console.error("Marketing API POST error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
