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

const READY_IN_STOCK_IDS = [
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
  // Batch 5 (15 items)
  "6aa2ffd70d2b8add7c6efbd0", // Cosrx Salicylic Acid Daily Gentle Cleanser (৳949)
  "6a9ab97dc63dd531aa8db0f6", // Dot & Key Barrier Repair Face Wash (৳440)
  "6a9ab97fc63dd531aa8db100", // Simple Replenishing Rich Moisturiser (৳620)
  "6a9ab97fc63dd531aa8db104", // Caplino Makeup Sponge – Deep Magenta (৳160)
  "6a9ab97ec63dd531aa8db0fd", // Caplino Makeup Sponge – Magenta (৳160)
  "6a9ab97bc63dd531aa8db0f4", // Caplino 1% Retinol Serum (৳790)
  "6a9ab97fc63dd531aa8db101", // SKIN1004 Tone Brightening Ampoule (৳1670)
  "6a9ab982c63dd531aa8db114", // Bioaqua Salicylic Acid Cleanser (৳270)
  "6a9ab97ec63dd531aa8db0f9", // w7 Dip Liquid Eyeliner (৳240)
  "6a9ab97fc63dd531aa8db107", // Technic Mega Glow Highlighter (৳370)
  "6a9ab980c63dd531aa8db109", // BREYLEE Acne Treatment Serum (৳270)
  "6a9ab982c63dd531aa8db119", // Handaiyan Liquid Blush Coral 03 (৳175)
  "6a9ab982c63dd531aa8db118", // Missha Aqua Sunscreen SPF50+ (৳880)
  "6a9ab97ec63dd531aa8db0fc", // Beauty Glazed Lipliner B118 (৳115)
  "6a9ab980c63dd531aa8db10c", // CAPLINO Liquid Matte Lipstick 10 (৳380)
  // Batch 6 (20 items)
  "6a9ab989c63dd531aa8db13d", // Hchana Rice Serum 15ml (৳140)
  "6a9ab987c63dd531aa8db12b", // Lanbena Lavender Foot Peel Mask (৳270)
  "6a9ab983c63dd531aa8db11c", // Sunsilk Power Shot Treatment (৳104)
  "6a9ab989c63dd531aa8db13c", // LAIKOU Sakura Mud Mask (৳30)
  "6a9ab988c63dd531aa8db132", // Bioaqua Honey Moisturizing Sheet Mask (৳45)
  "6a9ab986c63dd531aa8db126", // skinO Hydration Boost Gel Moisturizer (৳370)
  "6a9ab989c63dd531aa8db141", // Laikou Japan Sakura Skin Care Set (৳70)
  "6a9ab98ac63dd531aa8db143", // Purito Seoul Azelaic Acid 10 Serum (৳1600)
  "6a9ab987c63dd531aa8db130", // Fafamoon Peptide Lip Tint Espresso (৳160)
  "6a9ab984c63dd531aa8db11e", // Beauty Glazed Lip Crayon Espresso (৳145)
  "6a9ab988c63dd531aa8db138", // Beauty Glazed Matte Liquid Lipstick (৳85)
  "6a9ab988c63dd531aa8db133", // Fenyi Vitamin C Cleanser (৳190)
  "6a9ab985c63dd531aa8db124", // Bioaqua Kiwi Fruit Brighten Sheet Mask (৳45)
  "6a9ab989c63dd531aa8db13b", // Beauty Glazed Volume Lip Gloss 104 (৳165)
  "6a9ab980c63dd531aa8db10d", // Beauty Glazed Volume Lip Gloss 102 (৳165)
  "6a9ab98cc63dd531aa8db14b", // Bioaqua Pearl Whitening Facial Mask (৳65)
  "6a9ab98ac63dd531aa8db148", // Swiss Beauty Cover Play Concealer (৳340)
  "6a9ab987c63dd531aa8db129", // Handaiyan 12 Colors Liquid Set (৳680)
  "6a9ab985c63dd531aa8db121", // Caplino Lavender Essential Oil (৳340)
  "6a9ab988c63dd531aa8db137", // Matrix Opti Care Straight Hair Masque (৳1490)
  // Batch 7 (20 items)
  "6a9ab996c63dd531aa8db16e", // NIVEA Fresh Natural Roll On 50ml (৳230)
  "6a9ab991c63dd531aa8db15b", // Caplino Tea Tree Essential Oil (৳340)
  "6a9ab997c63dd531aa8db173", // CAPLINO Liquid Matte Lipstick Red Velvet (৳380)
  "6a9ab996c63dd531aa8db167", // Imagic Waterproof Matte Long Lasting Lipstick (৳300)
  "6a9ab992c63dd531aa8db15e", // Dot & Key Vitamin C + E Moisturizer (৳910)
  "6a9ab990c63dd531aa8db156", // Ponds Super Light Gel 50ml (৳170)
  "6a9ab98ec63dd531aa8db14e", // MARS Lipliner Blood Brown Mocha (৳90)
  "6a9ab997c63dd531aa8db171", // Swiss Beauty Pure Matte Lipstick Bare (৳310)
  "6a9ab992c63dd531aa8db15d", // Beauty Glazed Dark Brown Kajal Gel Liner (৳130)
  "6a9ab98ec63dd531aa8db150", // Beauty Glazed Lip Crayon Dusty B110 (৳145)
  "6a9ab996c63dd531aa8db166", // Swiss Beauty Eye Define Auto Kajal (৳300)
  "6a9ab993c63dd531aa8db161", // Bioaqua Vitamin E Honey Sheet Mask (৳45)
  "6a9ab990c63dd531aa8db155", // Melao 10% Azelaic Acid Serum (৳500)
  "6a9ab996c63dd531aa8db16d", // Beauty Glazed Glow Lip Oil Meet 101 (৳150)
  "6a9ab98ec63dd531aa8db14d", // I’m From Mugwort Essence (৳720)
  "6a9ab999c63dd531aa8db17a", // SkinO Acne Spot Treatment Serum (৳460)
  "6a9ab998c63dd531aa8db178", // Organikaon Lip Balm Orange & Shea (৳190)
  "6a9ab990c63dd531aa8db157", // Caplino Rosemary Essential Oil (৳340)
  "6a9ab98fc63dd531aa8db153", // Beauty Glazed Lip Crayon Dark Brown (৳145)
  "6a9ab993c63dd531aa8db164", // NIVEA Pearl & Beauty Roll On (৳240)
  // Batch 8 (30 items)
  "6a9ab9a1c63dd531aa8db1a2", // Wet n Wild Color Icon Blush – Mellow Wine (৳519)
  "6a9ab9a3c63dd531aa8db1aa", // Lanbena Blackhead Remover Peel Off Mask – 50g (৳209)
  "6a9ab99dc63dd531aa8db18a", // Cosrx Low Ph Good Morning Gel Cleanser – 50ml (৳520)
  "6a9ab9a0c63dd531aa8db19b", // Lanbena Nail Repair Essence Serum – 15ml (৳250)
  "6a9ab9a4c63dd531aa8db1b3", // Technic Mega Matte Blush 4 Color (৳370)
  "6a9ab99cc63dd531aa8db186", // Tresemme Keratin Smooth Conditioner – 190ml (৳325)
  "6a9ab9a1c63dd531aa8db1a6", // Laikou Hyaluronic Acid Cream – 25g (৳240)
  "6a9ab999c63dd531aa8db17b", // IUNIK Centella Calming Gel Cream – 60ml (৳1090)
  "6a9ab9a3c63dd531aa8db1ae", // Skin cafe – Aloe Vera Gel 100% pure & Natural (৳470)
  "6a9ab99ec63dd531aa8db18e", // Mixiu Lip Scru Cream – 11.5 G (৳130)
  "6a9ab9a0c63dd531aa8db19a", // Essence I Love Extreme Crazy Volume Mascara (৳510)
  "6a9ab9a5c63dd531aa8db1bc", // Arencia TXA Booster Shot for Face and Eye (৳1290)
  "6a9ab99cc63dd531aa8db183", // Cosrx Advanced Snail 92 All In One Cream – 50ml (৳849)
  "6a9ab9a0c63dd531aa8db19f", // LANBENA Aloe Deep Cleansing Nose Strips – 1 P (৳30)
  "6a9ab9a8c63dd531aa8db1c0", // Mars Loose Powder – Soft Light (৳319)
  "6a9ab9a1c63dd531aa8db1a3", // J Cat Indense Mineral Compact Powder (৳580)
  "6a9ab99cc63dd531aa8db188", // Beauty Glazed Lip Liner Waterproof (৳115)
  "6a9ab9a2c63dd531aa8db1a8", // Zafran Hair Mask -120ml (৳190)
  "6a9ab9a8c63dd531aa8db1c1", // Beauty Glazed Banana Loose Powder Luxury 15g (৳395)
  "6a9ab9a3c63dd531aa8db1ab", // Wet N Wild Color Icon Kohl Liner Pencil Black (৳270)
  "6a9ab99ec63dd531aa8db18d", // LAIKOU Japan Sakura Tone Up Cream 30gm (৳170)
  "6a9ab9a3c63dd531aa8db1b0", // Beauty Glazed 4 In 1 Color Board Palette 60 (৳1220)
  "6a9ab999c63dd531aa8db17e", // Swiss Beauty Full Coverage Foundation Fair (৳560)
  "6a9ab9a4c63dd531aa8db1b5", // W7 Banana Dreams Loose Powder – 20gm (৳500)
  "6a9ab99ec63dd531aa8db192", // Ribana Saffron Brightening Gel -130ml (৳705)
  "6a9ab9a9c63dd531aa8db1c6", // MARS Matte Mousse Lipstick Queen 03 (৳370)
  "6a9ab9a8c63dd531aa8db1c4", // Swiss Beauty Moist Heist Tinted Lip Gloss Ber (৳310)
  "6a9ab999c63dd531aa8db180", // Kota Cosmetics Hair Color Cherry Red (৳750)
  "6a9ab99fc63dd531aa8db196", // Cosrx Advanced Snail 92 All In One Cream – 100ml (৳1599)
  "6a9ab9a7c63dd531aa8db1be", // PONDS Super Light Gel Hydrated 50ml India (৳370)
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
          name: `🔥 প্রস্তুতকৃত ${READY_IN_STOCK_IDS.length}টি ইন-স্টক ব্যানার (Ready ${READY_IN_STOCK_IDS.length} Banners)`,
          slug: "instock_ready",
          productCount: READY_IN_STOCK_IDS.length,
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
        const raw = await Product.find({ _id: { $in: READY_IN_STOCK_IDS } })
          .populate("category", "name")
          .populate("brand", "name")
          .lean();
        const map = new Map(raw.map((p) => [p._id.toString(), p]));
        products = READY_IN_STOCK_IDS.map((id) => map.get(id)).filter(Boolean);
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
