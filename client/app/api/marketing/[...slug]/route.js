import { NextResponse } from "next/server";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";
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

const TARGET_35_IDS = [
  "6a9ab981c63dd531aa8db110", // APLB Glutathione Niacinamide Tablet
  "6a9ab987c63dd531aa8db12a", // Beauty of Joseon Relief Sun
  "6a9ab77134ccee884a4b5cab", // The Ordinary Niacinamide
  "6a9ab74b661657cb254c1bd5", // I'M From Rice Toner
  "6a9aad6ae4955f357f776448", // Axis-y Dark Spot Glow Serum 5ml
  "6a8ae1ccdbc554e2928be214", // Skino Strawberry Shower Gel
  "6a8e6c9d6d43fcfea47cad88", // Skin O Keratin Shampoo
  "6a8e6d7682271de00ebfa736", // Skin O Anti Hair Fall Shampoo
  "6a8e6e13297e3906134a82f6", // Skin O Lavender Gel
  "6a8e6eafe9601eacddbf7dbb", // Skin O Vitamin E Milk Face Wash
  "6a8e702551c7c127243ea1c1", // Skin O Rose Shower Gel
  "6a8e70f151c7c127243ea1c2", // Innsaei Low pH 5.5 Cleanser
  "6a8e723151c7c127243ea1c3", // Innsaei Salicylic Acid Foam
  "6a8e72fa51c7c127243ea1c4", // Skin O Daily Refresh Gel
  "6a8e757fc63423be0cf51d31", // Skin O Miracle Anti Acne Foam
  "6a9ab748661657cb254c1bd2", // Beauty Glazed Lipliner B114
  "6a9ab77434ccee884a4b5cae", // Laikou Octopus Cleansing Brush
  "6a9ab75b661657cb254c1bdd", // Ponds Super Light Gel
  "6a9ab70979e75ff1fa1f8a47", // Bob Long Lasting Waterproof Kajal
  "6a9abe31c63dd531aa8dc0b3", // COSRX Salicylic Acid Cleanser
  "6a9ac285c63dd531aa8dcd24", // Covercoco 24k Gold Ampoule
  "6a9ac280c63dd531aa8dcd18", // YC Cucumber Face Wash
  "6a9aba0cc63dd531aa8db330", // Laikou Whitening Sunscreen
  "6a9abf47c63dd531aa8dc404", // Imagic Liquid Matte Lipstick
  "6a9ac288c63dd531aa8dcd30", // Maybelline Baby Skin Pore Eraser
  "6a9ab77734ccee884a4b5cb0", // AXIS-Y Glow Serum 50ml
  "6a9ab9f3c63dd531aa8db2dc", // W7 HD Foundation Suede
  "6a9aba53c63dd531aa8db430", // Laikou Vitamin C Set
  "6a9ac1bec63dd531aa8dcb1d", // Wet N Wild Buff Bisque
  "6a9ac1bac63dd531aa8dcb15", // Wet N Wild Bronze Beige
  "6a9ac11ac63dd531aa8dc96f", // Nirvana Color Berry Lips
  "6a9ac0bac63dd531aa8dc881", // Laikou CC Cream Tan
  "6a9ac03bc63dd531aa8dc6e5", // Ponds Bright Beauty Face Wash
  "6a9abff3c63dd531aa8dc5fb", // Care:Nel Whitening Cream
  "6a9abcf0c63dd531aa8dbc74", // Swiss Beauty Blusher
];

function getStoredBannerBuffer(productId) {
  try {
    const candidates = [
      path.join(process.cwd(), "public", "banners", `banner_${productId}.png`),
      path.join(process.cwd(), "scratch", "banners", `banner_${productId}.png`),
      path.join(process.cwd(), "public", "banners", `${productId}.png`),
      path.join(process.cwd(), "..", "client", "scratch", "banners", `banner_${productId}.png`),
    ];
    for (const cand of candidates) {
      if (fs.existsSync(cand)) {
        return fs.readFileSync(cand);
      }
    }
  } catch (e) {
    // silent
  }
  return null;
}

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

      const enriched = [
        {
          _id: "instock_ready",
          name: "🔥 প্রস্তুতকৃত ৩৫টি ইন-স্টক ব্যানার (Ready 35 Banners)",
          slug: "instock_ready",
          productCount: 35,
        },
        ...brands
          .map((b) => ({
            _id: b._id,
            name: b.name,
            slug: b.slug,
            productCount: countMap[b._id.toString()] || 0,
          }))
          .filter((b) => b.productCount > 0),
      ];

      return NextResponse.json({ success: true, brands: enriched });
    }

    // 2. /api/marketing/products?brandId=...
    if (action === "products") {
      const brandId = url.searchParams.get("brandId");
      if (!brandId) {
        return NextResponse.json({ success: false, error: "brandId is required" }, { status: 400 });
      }

      let products = [];
      if (brandId === "instock_ready") {
        const raw = await Product.find({ _id: { $in: TARGET_35_IDS } })
          .populate("category", "name")
          .populate("brand", "name")
          .lean();
        const map = new Map(raw.map((p) => [p._id.toString(), p]));
        products = TARGET_35_IDS.map((id) => map.get(id)).filter(Boolean);
      } else {
        const query = {
          $or: [
            { brand: brandId },
            ...(mongoose.Types.ObjectId.isValid(brandId) ? [{ brand: new mongoose.Types.ObjectId(brandId) }] : []),
          ],
        };

        products = await Product.find(query)
          .populate("category", "name")
          .populate("brand", "name")
          .limit(100)
          .lean();
      }

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

      let bannerBuffer = getStoredBannerBuffer(productId);
      let isSvg = false;
      if (!bannerBuffer) {
        bannerBuffer = await generateProductBanner(product, theme);
        isSvg = bannerBuffer.toString("utf8", 0, 100).includes("<svg");
      }
      const mime = isSvg ? "image/svg+xml" : "image/png";

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
        isSvg,
        bannerBase64: `data:${mime};base64,${bannerBuffer.toString("base64")}`,
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

      let bannerBuffer = getStoredBannerBuffer(productId);
      let isSvg = false;
      if (!bannerBuffer) {
        bannerBuffer = await generateProductBanner(product, theme);
        isSvg = bannerBuffer.toString("utf8", 0, 100).includes("<svg");
      }
      const contentType = isSvg ? "image/svg+xml" : "image/png";
      const filename = `banner_${product.slug || product._id}.${isSvg ? "svg" : "png"}`;

      return new NextResponse(bannerBuffer, {
        headers: {
          "Content-Type": contentType,
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

    // 7. /api/marketing/image-proxy?url=...
    if (action === "image-proxy") {
      const targetUrl = url.searchParams.get("url");
      if (!targetUrl) return new NextResponse("url is required", { status: 400 });
      const imgRes = await fetch(targetUrl);
      const arrayBuffer = await imgRes.arrayBuffer();
      const contentType = imgRes.headers.get("content-type") || "image/jpeg";
      return new NextResponse(Buffer.from(arrayBuffer), {
        headers: {
          "Content-Type": contentType,
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "public, max-age=86400",
        },
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

      let bannerBuffer = getStoredBannerBuffer(productId);
      if (!bannerBuffer) {
        bannerBuffer = await generateProductBanner(product, theme);
      }
      const caption = customCaption || generateFBCaption(product, product.brand?.name || "LIORA");

      const prodImg = product.image || (product.images && product.images[0]) || "";
      const fbResult = await publishPhotoToFacebook({
        imageBuffer: bannerBuffer,
        imageUrl: prodImg,
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
