import https from "https";
import http from "http";
import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import { Product, Brand, Category, SiteSettings } from "./models.js";
import { connectToDatabase } from "./db.js";

let _sharp = null;
export async function getSharp() {
  if (!_sharp) {
    const mod = await import("sharp");
    _sharp = mod.default || mod;
  }
  return _sharp;
}

let _admZip = null;
export async function getAdmZip() {
  if (!_admZip) {
    const mod = await import("adm-zip");
    _admZip = mod.default || mod;
  }
  return _admZip;
}

// 5 Commercial 3D Studio Themes (11.11 Mega Sale Color-Matched Templates)
export const THEMES = {
  blue: {
    key: "blue",
    name: "Blue Hydration 11.11",
    priceColor: "#002b80",
    accent: "#0047b3",
    template: "template_3d_blue.png",
    podiumCx: 330,
    podiumTopY: 840,
  },
  pink: {
    key: "pink",
    name: "Blush Rose Glam 11.11",
    priceColor: "#831843",
    accent: "#be185d",
    template: "template_3d_pink.png",
    podiumCx: 330,
    podiumTopY: 840,
  },
  gold: {
    key: "gold",
    name: "Golden Radiance 11.11",
    priceColor: "#78350f",
    accent: "#b45309",
    template: "template_3d_gold.png",
    podiumCx: 330,
    podiumTopY: 840,
  },
  green: {
    key: "green",
    name: "Botanical Mint 11.11",
    priceColor: "#064e3b",
    accent: "#047857",
    template: "template_3d_green.png",
    podiumCx: 330,
    podiumTopY: 840,
  },
  grey: {
    key: "grey",
    name: "Minimalist Obsidian 11.11",
    priceColor: "#0f172a",
    accent: "#1e293b",
    template: "template_3d_grey.png",
    podiumCx: 330,
    podiumTopY: 840,
  },
  // Backward compatibility aliases
  teal: {
    key: "blue",
    name: "Blue Hydration 11.11",
    priceColor: "#002b80",
    accent: "#0047b3",
    template: "template_3d_blue.png",
    podiumCx: 330,
    podiumTopY: 840,
  },
  rose: {
    key: "pink",
    name: "Blush Rose Glam 11.11",
    priceColor: "#831843",
    accent: "#be185d",
    template: "template_3d_pink.png",
    podiumCx: 330,
    podiumTopY: 840,
  },
  emerald: {
    key: "green",
    name: "Botanical Mint 11.11",
    priceColor: "#064e3b",
    accent: "#047857",
    template: "template_3d_green.png",
    podiumCx: 330,
    podiumTopY: 840,
  },
  navy: {
    key: "grey",
    name: "Minimalist Obsidian 11.11",
    priceColor: "#0f172a",
    accent: "#1e293b",
    template: "template_3d_grey.png",
    podiumCx: 330,
    podiumTopY: 840,
  },
};

export function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
    client
      .get(url, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return fetchBuffer(res.headers.location).then(resolve).catch(reject);
        }
        const data = [];
        res.on("data", (chunk) => data.push(chunk));
        res.on("end", () => resolve(Buffer.concat(data)));
      })
      .on("error", reject);
  });
}

export function escapeXml(unsafe) {
  return String(unsafe || "").replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case "'":
        return "&apos;";
      case '"':
        return "&quot;";
    }
  });
}

export function getBgRemovedUrl(url) {
  if (!url) return url;
  if (url.includes("/upload/") && !url.includes("/e_background_removal/")) {
    const withPng = url.replace(/\.(jpg|jpeg|webp)$/i, ".png");
    return withPng.replace("/upload/", "/upload/e_background_removal/");
  }
  return url;
}

export async function getProductBuffer(imageUrl) {
  try {
    const bgRemovedUrl = getBgRemovedUrl(imageUrl);
    return await fetchBuffer(bgRemovedUrl);
  } catch (err) {
    return await fetchBuffer(imageUrl);
  }
}

// Connected Border BFS Flood Fill Background Removal
export function removeStudioBackground(data, width, height) {
  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0;
  let tail = 0;

  function isBorderBg(idx) {
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    const brightness = (r + g + b) / 3;
    const diff = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));
    return brightness >= 248 && diff <= 12;
  }

  // Seed from outer boundary pixels
  for (let x = 0; x < width; x++) {
    const topIdx = (0 * width + x) * 4;
    const botIdx = ((height - 1) * width + x) * 4;
    if (!visited[x] && isBorderBg(topIdx)) {
      visited[x] = 1;
      queue[tail++] = x;
    }
    const botP = (height - 1) * width + x;
    if (!visited[botP] && isBorderBg(botIdx)) {
      visited[botP] = 1;
      queue[tail++] = botP;
    }
  }

  for (let y = 0; y < height; y++) {
    const leftP = y * width;
    const rightP = y * width + (width - 1);
    if (!visited[leftP] && isBorderBg(leftP * 4)) {
      visited[leftP] = 1;
      queue[tail++] = leftP;
    }
    if (!visited[rightP] && isBorderBg(rightP * 4)) {
      visited[rightP] = 1;
      queue[tail++] = rightP;
    }
  }

  // BFS expansion
  while (head < tail) {
    const p = queue[head++];
    const px = p % width;
    const py = Math.floor(p / width);

    // Check 4 adjacent neighbors
    const neighbors = [
      px > 0 ? p - 1 : -1,
      px < width - 1 ? p + 1 : -1,
      py > 0 ? p - width : -1,
      py < height - 1 ? p + width : -1,
    ];

    for (const n of neighbors) {
      if (n !== -1 && !visited[n] && isBorderBg(n * 4)) {
        visited[n] = 1;
        queue[tail++] = n;
      }
    }
  }

  // Apply transparency to connected background pixels
  for (let p = 0; p < width * height; p++) {
    if (visited[p]) {
      const idx = p * 4;
      data[idx + 3] = 0;
    }
  }
}

export async function cleanTransparentCutout(buffer) {
  try {
    const sharp = await getSharp();
    if (!sharp) return buffer;
    const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    
    // First, check if already has transparent background
    let alphaCount = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 120) alphaCount++;
    }

    if (alphaCount < data.length * 0.05) {
      // Image has solid white/studio background: run smart border BFS flood-fill removal
      removeStudioBackground(data, info.width, info.height);
    }

    return await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
      .trim()
      .png()
      .toBuffer();
  } catch (err) {
    return buffer;
  }
}

export function pickSmartTheme(productName = "", categoryName = "") {
  const text = `${productName} ${categoryName}`.toLowerCase();
  if (/hair|shampoo|keratin|conditioner|scalp|oil|gold|honey|sun/i.test(text)) return "gold";
  if (/rose|glow|bright|milk|berry|pink|whitening|face wash|lipstick|lip|blush|palette/i.test(text)) return "pink";
  if (/shower|bath|gel|aqua|water|fresh|cool|body wash|hyaluron|cerave|cleanser/i.test(text)) return "blue";
  if (/aloe|tea tree|cica|centella|botanical|green|herb|organic|dark spot/i.test(text)) return "green";
  if (/men|charcoal|night|deep|black|ordinary|niacinamide|grey|obsidian/i.test(text)) return "grey";
  return "blue";
}

const templateBufferCache = new Map();

export async function loadTemplateBackground(theme) {
  if (!theme || !theme.template) return null;
  if (templateBufferCache.has(theme.template)) {
    return templateBufferCache.get(theme.template);
  }

  // 1. Try local filesystem paths
  const localCandidates = [
    path.join(process.cwd(), "public", "banners", "fb_templates", theme.template),
    path.join(process.cwd(), "client", "public", "banners", "fb_templates", theme.template),
    path.join(process.cwd(), "..", "client", "public", "banners", "fb_templates", theme.template),
    path.join(process.cwd(), "server", "public", "banners", "fb_templates", theme.template),
    path.join(process.cwd(), "..", "server", "public", "banners", "fb_templates", theme.template),
  ];

  for (const cand of localCandidates) {
    if (fs.existsSync(cand)) {
      try {
        const buf = fs.readFileSync(cand);
        templateBufferCache.set(theme.template, buf);
        return buf;
      } catch (e) {
        // continue
      }
    }
  }

  // 2. Fetch from Cloudinary CDN fallback
  if (theme.templateUrl) {
    try {
      const buf = await fetchBuffer(theme.templateUrl);
      templateBufferCache.set(theme.template, buf);
      return buf;
    } catch (e) {
      console.warn("Failed to fetch template from Cloudinary:", theme.templateUrl, e.message);
    }
  }

  return null;
}

export function generateFBCaption(product, brandName = "LIORA") {
  const name = product.name;
  let original = Number(product.originalPrice) || 0;
  let offer = Number(product.offerPrice) || original;
  if (original <= offer) {
    original = Math.round(offer * 1.3);
  }
  const savings = Math.max(0, original - offer);
  const discountPct = original > 0 ? Math.round((savings / original) * 100) : 0;
  const siteUrl = "https://www.liorabeautyandwear.com";
  const productUrl = product.slug
    ? `${siteUrl}/products/${product.slug}`
    : `${siteUrl}/products?search=${encodeURIComponent(name)}`;

  return `🔥 LIORA 11.11 MEGA SALE — BIGGEST BEAUTY DISCOUNTS! 🔥

✨ ${name} ✨

আন্তর্জাতিক মান ও ১০০% অথেনটিক বিউটি কেয়ারের সেরা কালেকশন এখন বছরের সবচেয়ে বড় ধামাকা ছাড়ে! স্টক সীমিত, এখনই বুক করুন আপনার পছন্দের অরিজিনাল প্রোডাক্ট।

💰 রেগুলার MRP: ৳${original}
💥 11.11 অফার প্রাইস: মাত্র ৳${offer}! ${savings > 0 ? `(সরাসরি ৳${savings} সাশ্রয় | ${discountPct}% OFF)` : ""}
🛡️ ১০০% ইন-স্টক ও আসল প্রোডাক্ট গ্যারান্টি

🛍️ অর্ডার করতে সরাসরি প্রোডাক্ট লিংকে যান:
👉 ${productUrl}

📱 পেইজে মেসেজ দিন অথবা সরাসরি কল/হোয়াটসঅ্যাপ করুন:
📞 01837223147

🚚 সারা বাংলাদেশে ক্যাশ অন হোম ডেলিভারি সুবিধা (প্যাকেট দেখে চেক করে রিসিভ করার সুযোগ)!

#LioraBeautyAndWear #1111MegaSale #AuthenticCosmetics #1111Offer #SkincareBD #CosmeticsBD #LioraDeals #MakeupBD #KoreanSkincareBD`;
}

export function formatBannerTitle(rawName) {
  const words = String(rawName || "").replace(/[()]/g, " ").split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";
  for (const w of words) {
    if ((current + " " + w).trim().length <= 22) {
      current = (current + " " + w).trim();
    } else {
      if (current) lines.push(current.toUpperCase());
      current = w;
      if (lines.length >= 2) break;
    }
  }
  if (current && lines.length < 3) lines.push(current.toUpperCase());
  return lines;
}

export function extractVolume(name = "") {
  const match = name.match(/(\d+\s*(?:ml|g|gm|kg|oz|pcs|pack|tab|caps))/i);
  return match ? match[1].toLowerCase() : "";
}

export async function generateProductBanner(product, customThemeKey = null) {
  const width = 1080;
  const height = 1080;

  const categoryName = product.category?.name || "AUTHENTIC BEAUTY";

  let originalPrice = Number(product.originalPrice) || Number(product.price) || 0;
  let offerPrice = Number(product.offerPrice) || Number(product.salePrice) || originalPrice;
  if (originalPrice <= offerPrice) {
    originalPrice = Math.round(offerPrice * 1.3);
  }
  const saveAmount = Math.max(0, originalPrice - offerPrice);
  const discountPct = originalPrice > 0 ? Math.round((saveAmount / originalPrice) * 100) : 0;

  const themeKey = customThemeKey || pickSmartTheme(product.name, categoryName);
  const theme = THEMES[themeKey] || THEMES.blue;

  const imageUrl = product.image || (product.images && product.images[0]) || "";
  if (!imageUrl) {
    throw new Error(`Product "${product.name}" does not have an image.`);
  }

  // 1. Fetch Product Buffer
  const rawProduct = await getProductBuffer(imageUrl);

  const podiumCx = theme.podiumCx || 330;
  const podiumTopY = theme.podiumTopY || 840;

  // Try Sharp with 3D Studio Background Template
  try {
    const sharp = await getSharp();
    if (sharp) {
      const trimmed = await cleanTransparentCutout(rawProduct);
      const { data: resizedBuffer, info: resizedInfo } = await sharp(trimmed)
        .trim({ threshold: 10 })
        .resize({
          width: 380,
          height: 630,
          fit: "inside",
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .toBuffer({ resolveWithObject: true });

      const productTop = podiumTopY - resizedInfo.height + 15;
      const productLeft = Math.round(podiumCx - resizedInfo.width / 2);

      // Load 3D Studio template background
      const templateBuffer = await loadTemplateBackground(theme);

      // Exact Commercial Typography & Contact Shadow Overlay
      const overlaySvg = `
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="productContactShadow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#0f172a" stop-opacity="0.45" />
            <stop offset="60%" stop-color="#0f172a" stop-opacity="0.15" />
            <stop offset="100%" stop-color="#0f172a" stop-opacity="0" />
          </radialGradient>
        </defs>

        <!-- Product Contact Shadow on Podium Surface -->
        <ellipse cx="${podiumCx}" cy="${podiumTopY + 3}" rx="${Math.round(resizedInfo.width * 0.44)}" ry="16" fill="url(#productContactShadow)" />

        <!-- 1. REGULAR PRICE SECTION -->
        <g transform="translate(810, 420)" text-anchor="middle">
          <text x="0" y="0" font-family="'Segoe UI', Roboto, sans-serif" font-weight="800" font-size="25" fill="#334155">Regular Price</text>
          <g transform="translate(0, 46)">
            <text x="0" y="0" font-family="'Segoe UI', Roboto, sans-serif" font-weight="900" font-size="46" fill="#1e293b">৳ ${originalPrice.toLocaleString('en-IN')}</text>
            <line x1="-80" y1="4" x2="80" y2="-22" stroke="#ef4444" stroke-width="4.5" stroke-linecap="round" />
          </g>
        </g>

        <!-- 2. OFFER PRICE INSIDE THE WHITE CARD -->
        <g transform="translate(810, 642)" text-anchor="middle">
          <text x="0" y="0" font-family="'Segoe UI', Roboto, sans-serif" font-weight="900" font-size="82" fill="${theme.priceColor}" letter-spacing="-2">৳ ${offerPrice.toLocaleString('en-IN')}</text>
          <g transform="translate(0, 36)">
            <rect x="-115" y="-15" width="230" height="30" rx="15" fill="#ef4444" />
            <text x="0" y="5" font-family="'Segoe UI', Roboto, sans-serif" font-weight="800" font-size="13" fill="#ffffff" letter-spacing="1">SAVE ৳${saveAmount.toLocaleString('en-IN')} (-${discountPct}%)</text>
          </g>
        </g>
      </svg>
      `;

      if (templateBuffer) {
        return await sharp(templateBuffer)
          .resize(width, height)
          .composite([
            { input: Buffer.from(overlaySvg), top: 0, left: 0 },
            { input: resizedBuffer, top: productTop, left: productLeft },
          ])
          .png({ quality: 95 })
          .toBuffer();
      }
    }
  } catch (err) {
    global.__lastSharpError = err.stack || err.message;
    console.warn("Sharp banner generation error:", err.message);
  }

  // Fallback: Embed base64 product
  let imgMime = "image/jpeg";
  if (imageUrl.toLowerCase().includes(".png") || (rawProduct[0] === 0x89 && rawProduct[1] === 0x50)) {
    imgMime = "image/png";
  } else if (imageUrl.toLowerCase().includes(".webp") || (rawProduct[0] === 0x52 && rawProduct[1] === 0x49)) {
    imgMime = "image/webp";
  }
  const embeddedDataUri = `data:${imgMime};base64,${rawProduct.toString("base64")}`;

  return Buffer.from(buildOverlaySvg(440, true, embeddedDataUri, 620));
}

export async function batchGenerateBrandPromotions({ brandQuery, limit = 100 }) {
  await connectToDatabase();
  let brandDoc = null;
  if (mongoose.Types.ObjectId.isValid(brandQuery)) {
    brandDoc = await Brand.findById(brandQuery);
  } else {
    brandDoc = await Brand.findOne({
      $or: [
        { name: new RegExp(`^${brandQuery}$`, "i") },
        { slug: new RegExp(`^${brandQuery}$`, "i") },
      ],
    });
  }

  const query = {};
  if (brandDoc) {
    query.$or = [{ brand: brandDoc._id }, { name: new RegExp(brandDoc.name, "i") }];
  } else if (brandQuery && brandQuery !== "ALL") {
    query.name = new RegExp(brandQuery, "i");
  }

  const products = await Product.find(query)
    .populate("brand", "name slug")
    .populate("category", "name slug")
    .limit(limit)
    .lean();

  const brandSlug = brandDoc ? brandDoc.slug || brandDoc.name.toLowerCase().replace(/[^a-z0-9]/g, "_") : "brand_promo";

  const results = [];
  let summaryText = `==========================================================\nLIORA BEAUTY & WEAR - AUTO PROMOTIONS BATCH: ${brandDoc?.name || brandQuery}\nTotal Products: ${products.length}\nGenerated: ${new Date().toLocaleString()}\n==========================================================\n\n`;

  const AdmZip = await getAdmZip();
  const zip = new AdmZip();

  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    const safeFilename = `${i + 1}_${product.slug || product._id}.png`;

    try {
      const bannerBuffer = await generateProductBanner(product);
      zip.addFile(safeFilename, bannerBuffer);

      const caption = generateFBCaption(product, brandDoc?.name || "LIORA");
      results.push({
        id: product._id,
        name: product.name,
        slug: product.slug,
        imageFile: safeFilename,
        caption,
        status: "SUCCESS",
      });

      summaryText += `----------------------------------------------------------\n`;
      summaryText += `[POST #${i + 1}] Product: ${product.name}\n`;
      summaryText += `Image File: ${safeFilename}\n`;
      summaryText += `----------------------------------------------------------\n`;
      summaryText += `${caption}\n\n\n`;
    } catch (err) {
      console.error(`Error generating promo for ${product.name}:`, err.message);
      results.push({
        id: product._id,
        name: product.name,
        status: "ERROR",
        error: err.message,
      });
    }
  }

  zip.addFile("captions_all_posts.txt", Buffer.from(summaryText, "utf8"));
  const zipBuffer = zip.toBuffer();

  return {
    brand: brandDoc ? brandDoc.name : brandQuery,
    totalProducts: products.length,
    successful: results.filter((r) => r.status === "SUCCESS").length,
    results,
    zipBase64: zipBuffer.toString("base64"),
    zipFilename: `${brandSlug}_full_bundle.zip`,
  };
}

export async function publishPhotoToFacebook({ imageBuffer, imageUrl, caption, pageId, pageAccessToken }) {
  if (!pageId || !pageAccessToken) {
    throw new Error("Facebook Page ID and Page Access Token are required.");
  }

  const isSvg = imageBuffer && imageBuffer.toString("utf8", 0, 100).includes("<svg");

  // Step 1: Upload photo asset as unpublished to obtain the media FBID
  const photoFormData = new FormData();
  photoFormData.append("access_token", pageAccessToken);
  photoFormData.append("published", "false");

  if (isSvg && imageUrl) {
    photoFormData.append("url", imageUrl);
  } else if (imageBuffer) {
    const blob = new Blob([imageBuffer], { type: "image/png" });
    photoFormData.append("source", blob, "promotion_banner.png");
  } else if (imageUrl) {
    photoFormData.append("url", imageUrl);
  }

  const uploadRes = await fetch(`https://graph.facebook.com/v20.0/${pageId}/photos`, {
    method: "POST",
    body: photoFormData,
  });

  const uploadData = await uploadRes.json();
  console.log("[FB Photo Stage] response:", JSON.stringify(uploadData));

  if (uploadData.error) {
    throw new Error(`Photo Upload Error: ${uploadData.error.message} (code ${uploadData.error.code})`);
  }

  const photoId = uploadData.id;

  // Step 2: Publish as a true News Feed Post via /{pageId}/feed with attached_media
  // This creates an authentic Page News Feed Post that immediately increments the Page Post Counter!
  const feedRes = await fetch(`https://graph.facebook.com/v20.0/${pageId}/feed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: caption,
      attached_media: [{ media_fbid: photoId }],
      access_token: pageAccessToken,
    }),
  });

  const feedData = await feedRes.json();
  console.log("[FB Newsfeed Post] response:", JSON.stringify(feedData));

  if (feedData.error) {
    console.warn("[FB Feed Error] Falling back to photo post:", feedData.error.message);
    // Fallback: publish photo directly
    const directRes = await fetch(`https://graph.facebook.com/v20.0/${photoId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        is_published: true,
        message: caption,
        access_token: pageAccessToken,
      }),
    });
    const directData = await directRes.json();
    return {
      success: true,
      photoId,
      postId: photoId,
      postUrl: `https://www.facebook.com/${photoId}`,
      method: "direct_photo_fallback",
    };
  }

  const postId = feedData.id || photoId;
  return {
    success: true,
    photoId,
    postId,
    postUrl: `https://www.facebook.com/${postId}`,
    method: "official_newsfeed_post",
  };
}

/**
 * Schedule a Post natively to Meta Business Suite with Banner & Sales Caption
 * Appears directly in Meta Business Suite Scheduled Posts & Planner!
 */
export async function schedulePostToFacebook({
  imageBuffer,
  imageUrl,
  caption,
  pageId,
  pageAccessToken,
  scheduledMinutes = 20,
}) {
  if (!pageId || !pageAccessToken) {
    throw new Error("Facebook Page ID and Page Access Token are required.");
  }

  // Facebook Graph API requires scheduled_publish_time to be between 10 mins and 75 days in future
  const minutes = Math.max(11, Number(scheduledMinutes) || 20);
  const scheduledPublishTime = Math.floor(Date.now() / 1000) + minutes * 60;

  const isSvg = imageBuffer && imageBuffer.toString("utf8", 0, 100).includes("<svg");

  // Step 1: Upload photo asset as unpublished to obtain the media FBID
  const photoFormData = new FormData();
  photoFormData.append("access_token", pageAccessToken);
  photoFormData.append("published", "false");

  if (isSvg && imageUrl) {
    photoFormData.append("url", imageUrl);
  } else if (imageBuffer) {
    const blob = new Blob([imageBuffer], { type: "image/png" });
    photoFormData.append("source", blob, "promotion_banner.png");
  } else if (imageUrl) {
    photoFormData.append("url", imageUrl);
  }

  const uploadRes = await fetch(`https://graph.facebook.com/v20.0/${pageId}/photos`, {
    method: "POST",
    body: photoFormData,
  });

  const uploadData = await uploadRes.json();
  if (uploadData.error) {
    throw new Error(`Photo Upload Error: ${uploadData.error.message} (code ${uploadData.error.code})`);
  }

  const photoId = uploadData.id;

  // Step 2: Schedule Feed Post via /{pageId}/feed with attached_media
  const feedRes = await fetch(`https://graph.facebook.com/v20.0/${pageId}/feed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: caption,
      attached_media: [{ media_fbid: photoId }],
      published: false,
      scheduled_publish_time: scheduledPublishTime,
      access_token: pageAccessToken,
    }),
  });

  const feedData = await feedRes.json();
  console.log("[FB Scheduled Post Response]:", JSON.stringify(feedData));

  if (feedData.error) {
    throw new Error(`Schedule Post Error: ${feedData.error.message} (code ${feedData.error.code})`);
  }

  const postId = feedData.id;
  const businessSuiteUrl = `https://business.facebook.com/latest/posts/scheduled_posts?page_id=${pageId}`;
  const plannerUrl = `https://business.facebook.com/latest/planner?page_id=${pageId}`;

  return {
    success: true,
    postId,
    photoId,
    scheduledMinutes: minutes,
    scheduledPublishTime,
    scheduledDateStr: new Date(scheduledPublishTime * 1000).toLocaleString("en-US", { timeZone: "Asia/Dhaka" }),
    businessSuiteUrl,
    plannerUrl,
  };
}

// Global in-memory autopilot job
if (!global.__lioraAutoPilotJob) {
  global.__lioraAutoPilotJob = {
    isRunning: false,
    brandName: "",
    totalProducts: 0,
    postedCount: 0,
    failedCount: 0,
    intervalMinutes: 15,
    currentProduct: "",
    nextPostTime: null,
    recentPosts: [],
    timer: null,
  };
}

export function getAutoPilotStatus() {
  const job = global.__lioraAutoPilotJob;
  return {
    isRunning: job.isRunning,
    brandName: job.brandName,
    totalProducts: job.totalProducts,
    postedCount: job.postedCount,
    failedCount: job.failedCount,
    intervalMinutes: job.intervalMinutes,
    currentProduct: job.currentProduct,
    nextPostTime: job.nextPostTime,
    recentPosts: job.recentPosts.slice(0, 10),
  };
}

export function stopAutoPilot() {
  const job = global.__lioraAutoPilotJob;
  if (job.timer) {
    clearTimeout(job.timer);
    job.timer = null;
  }
  job.isRunning = false;
  job.nextPostTime = null;
  return { success: true, message: "Auto-pilot stopped successfully." };
}

export async function startAutoPilot({ brandQuery, intervalMinutes = 15, limit = 50, pageId, pageAccessToken }) {
  await connectToDatabase();
  const job = global.__lioraAutoPilotJob;
  if (job.isRunning) {
    stopAutoPilot();
  }

  let brandDoc = null;
  let products = [];

  if (brandQuery === "instock_ready") {
    const target300Ids = [
      "6a9ab981c63dd531aa8db110", "6a9ab987c63dd531aa8db12a", "6a9ab77134ccee884a4b5cab", "6a9ab74b661657cb254c1bd5", "6a9aad6ae4955f357f776448",
      "6a8ae1ccdbc554e2928be214", "6a8e6c9d6d43fcfea47cad88", "6a8e6d7682271de00ebfa736", "6a8e6e13297e3906134a82f6", "6a8e6eafe9601eacddbf7dbb",
      "6a8e702551c7c127243ea1c1", "6a8e70f151c7c127243ea1c2", "6a8e723151c7c127243ea1c3", "6a8e72fa51c7c127243ea1c4", "6a8e757fc63423be0cf51d31",
      "6a9ab748661657cb254c1bd2", "6a9ab77434ccee884a4b5cae", "6a9ab75b661657cb254c1bdd", "6a9ab70979e75ff1fa1f8a47", "6a9abe31c63dd531aa8dc0b3",
      "6a9ac285c63dd531aa8dcd24", "6a9ac280c63dd531aa8dcd18", "6a9aba0cc63dd531aa8db330", "6a9abf47c63dd531aa8dc404", "6a9ac288c63dd531aa8dcd30",
      "6a9ab77734ccee884a4b5cb0", "6a9ab9f3c63dd531aa8db2dc", "6a9aba53c63dd531aa8db430", "6a9ac1bec63dd531aa8dcb1d", "6a9ac1bac63dd531aa8dcb15",
      "6a9ac11ac63dd531aa8dc96f", "6a9ac0bac63dd531aa8dc881", "6a9ac03bc63dd531aa8dc6e5", "6a9abff3c63dd531aa8dc5fb", "6a9abcf0c63dd531aa8dbc74",
      // Batch 5 (15 items)
      "6aa2ffd70d2b8add7c6efbd0", "6a9ab97dc63dd531aa8db0f6", "6a9ab97fc63dd531aa8db100", "6a9ab97fc63dd531aa8db104", "6a9ab97ec63dd531aa8db0fd",
      "6a9ab97bc63dd531aa8db0f4", "6a9ab97fc63dd531aa8db101", "6a9ab982c63dd531aa8db114", "6a9ab97ec63dd531aa8db0f9", "6a9ab97fc63dd531aa8db107",
      "6a9ab980c63dd531aa8db109", "6a9ab982c63dd531aa8db119", "6a9ab982c63dd531aa8db118", "6a9ab97ec63dd531aa8db0fc", "6a9ab980c63dd531aa8db10c",
      // Batch 6 (20 items)
      "6a9ab989c63dd531aa8db13d", "6a9ab987c63dd531aa8db12b", "6a9ab983c63dd531aa8db11c", "6a9ab989c63dd531aa8db13c", "6a9ab988c63dd531aa8db132",
      "6a9ab986c63dd531aa8db126", "6a9ab989c63dd531aa8db141", "6a9ab98ac63dd531aa8db143", "6a9ab987c63dd531aa8db130", "6a9ab984c63dd531aa8db11e",
      "6a9ab988c63dd531aa8db138", "6a9ab988c63dd531aa8db133", "6a9ab985c63dd531aa8db124", "6a9ab989c63dd531aa8db13b", "6a9ab980c63dd531aa8db10d",
      "6a9ab98cc63dd531aa8db14b", "6a9ab98ac63dd531aa8db148", "6a9ab987c63dd531aa8db129", "6a9ab985c63dd531aa8db121", "6a9ab988c63dd531aa8db137",
      // Batch 7 (20 items)
      "6a9ab996c63dd531aa8db16e", "6a9ab991c63dd531aa8db15b", "6a9ab997c63dd531aa8db173", "6a9ab996c63dd531aa8db167", "6a9ab992c63dd531aa8db15e",
      "6a9ab990c63dd531aa8db156", "6a9ab98ec63dd531aa8db14e", "6a9ab997c63dd531aa8db171", "6a9ab992c63dd531aa8db15d", "6a9ab98ec63dd531aa8db150",
      "6a9ab996c63dd531aa8db166", "6a9ab993c63dd531aa8db161", "6a9ab990c63dd531aa8db155", "6a9ab996c63dd531aa8db16d", "6a9ab98ec63dd531aa8db14d",
      "6a9ab999c63dd531aa8db17a", "6a9ab998c63dd531aa8db178", "6a9ab990c63dd531aa8db157", "6a9ab98fc63dd531aa8db153", "6a9ab993c63dd531aa8db164",
      // Batch 8 (30 items)
      "6a9ab9a1c63dd531aa8db1a2", "6a9ab9a3c63dd531aa8db1aa", "6a9ab99dc63dd531aa8db18a", "6a9ab9a0c63dd531aa8db19b", "6a9ab9a4c63dd531aa8db1b3",
      "6a9ab99cc63dd531aa8db186", "6a9ab9a1c63dd531aa8db1a6", "6a9ab999c63dd531aa8db17b", "6a9ab9a3c63dd531aa8db1ae", "6a9ab99ec63dd531aa8db18e",
      "6a9ab9a0c63dd531aa8db19a", "6a9ab9a5c63dd531aa8db1bc", "6a9ab99cc63dd531aa8db183", "6a9ab9a0c63dd531aa8db19f", "6a9ab9a8c63dd531aa8db1c0",
      "6a9ab9a1c63dd531aa8db1a3", "6a9ab99cc63dd531aa8db188", "6a9ab9a2c63dd531aa8db1a8", "6a9ab9a8c63dd531aa8db1c1", "6a9ab9a3c63dd531aa8db1ab",
      "6a9ab99ec63dd531aa8db18d", "6a9ab9a3c63dd531aa8db1b0", "6a9ab999c63dd531aa8db17e", "6a9ab9a4c63dd531aa8db1b5", "6a9ab99ec63dd531aa8db192",
      "6a9ab9a9c63dd531aa8db1c6", "6a9ab9a8c63dd531aa8db1c4", "6a9ab999c63dd531aa8db180", "6a9ab99fc63dd531aa8db196", "6a9ab9a7c63dd531aa8db1be",
      // Batch 9 (30 items)
      "6a9ab9b0c63dd531aa8db1e7", "6a9ab9b2c63dd531aa8db1f0", "6a9ab9acc63dd531aa8db1d4", "6a9ab9afc63dd531aa8db1e4", "6a9ab9b6c63dd531aa8db1f8",
      "6a9ab9abc63dd531aa8db1d1", "6a9ab9b1c63dd531aa8db1ea", "6a9ab9aac63dd531aa8db1c8", "6a9ab9b5c63dd531aa8db1f4", "6a9ab9aec63dd531aa8db1d9",
      "6a9ab9afc63dd531aa8db1df", "6a9ab9b8c63dd531aa8db1fc", "6a9ab9abc63dd531aa8db1cf", "6a9ab9afc63dd531aa8db1e3", "6a9ab9b8c63dd531aa8db1fe",
      "6a9ab9b1c63dd531aa8db1e9", "6a9ab9acc63dd531aa8db1d3", "6a9ab9b2c63dd531aa8db1ec", "6a9ab9b9c63dd531aa8db202", "6a9ab9b5c63dd531aa8db1f2",
      "6a9ab9aec63dd531aa8db1d7", "6a9ab9b5c63dd531aa8db1f5", "6a9ab9aac63dd531aa8db1cb", "6a9ab9b7c63dd531aa8db1fa", "6a9ab9aec63dd531aa8db1da",
      "6a9ab9bac63dd531aa8db206", "6a9ab9bac63dd531aa8db204", "6a9ab9aac63dd531aa8db1cd", "6a9ab9aec63dd531aa8db1dd", "6a9ab9b8c63dd531aa8db1fd",
      // Batch 10 (30 items)
      "6a9ab9c2c63dd531aa8db229", "6a9ab9c5c63dd531aa8db232", "6a9ab9bec63dd531aa8db218", "6a9ab9c0c63dd531aa8db224", "6a9ab9c7c63dd531aa8db23a",
      "6a9ab9bcc63dd531aa8db212", "6a9ab9c4c63dd531aa8db22f", "6a9ab9bac63dd531aa8db208", "6a9ab9c6c63dd531aa8db237", "6a9ab9bec63dd531aa8db21d",
      "6a9ab9c0c63dd531aa8db223", "6a9ab9c8c63dd531aa8db241", "6a9ab9bcc63dd531aa8db210", "6a9ab9c2c63dd531aa8db228", "6a9ab9c9c63dd531aa8db245",
      "6a9ab9c3c63dd531aa8db22c", "6a9ab9bdc63dd531aa8db216", "6a9ab9c5c63dd531aa8db231", "6a9ab9c9c63dd531aa8db248", "6a9ab9c5c63dd531aa8db235",
      "6a9ab9bec63dd531aa8db219", "6a9ab9c7c63dd531aa8db239", "6a9ab9bbc63dd531aa8db20b", "6a9ab9c7c63dd531aa8db23d", "6a9ab9bfc63dd531aa8db21f",
      "6a9ab9ccc63dd531aa8db24e", "6a9ab9cac63dd531aa8db24c", "6a9ab9bbc63dd531aa8db20e", "6a9ab9c0c63dd531aa8db222", "6a9ab9c8c63dd531aa8db243",
      // Batch 11 (30 items)
      "6a9ab9d5c63dd531aa8db270", "6a9ab9d8c63dd531aa8db279", "6a9ab9d2c63dd531aa8db25f", "6a9ab9d5c63dd531aa8db26d", "6a9ab9dac63dd531aa8db282",
      "6a9ab9d2c63dd531aa8db25b", "6a9ab9d7c63dd531aa8db275", "6a9ab9ccc63dd531aa8db250", "6a9ab9d9c63dd531aa8db27d", "6a9ab9d3c63dd531aa8db264",
      "6a9ab9d4c63dd531aa8db269", "6a9ab9dbc63dd531aa8db286", "6a9ab9cec63dd531aa8db257", "6a9ab9d5c63dd531aa8db26e", "6a9ab9dbc63dd531aa8db28a",
      "6a9ab9d6c63dd531aa8db273", "6a9ab9d2c63dd531aa8db25d", "6a9ab9d8c63dd531aa8db277", "6a9ab9dbc63dd531aa8db28c", "6a9ab9d8c63dd531aa8db27b",
      "6a9ab9d2c63dd531aa8db262", "6a9ab9d9c63dd531aa8db280", "6a9ab9cec63dd531aa8db255", "6a9ab9dac63dd531aa8db283", "6a9ab9d3c63dd531aa8db265",
      "6a9ab9dec63dd531aa8db28f", "6a9ab9dec63dd531aa8db28e", "6a9ab9cec63dd531aa8db256", "6a9ab9d4c63dd531aa8db268", "6a9ab9dbc63dd531aa8db287",
      // Batch 12 (30 items)
      "6a9ab9e6c63dd531aa8db2b5", "6a9ab9e8c63dd531aa8db2be", "6a9ab9e3c63dd531aa8db2a0", "6a9ab9e6c63dd531aa8db2b3", "6a9ab9edc63dd531aa8db2c8",
      "6a9ab9e2c63dd531aa8db29c", "6a9ab9e8c63dd531aa8db2bb", "6a9ab9dfc63dd531aa8db292", "6a9ab9ecc63dd531aa8db2c4", "6a9ab9e4c63dd531aa8db2a7",
      "6a9ab9e5c63dd531aa8db2b1", "6a9ab9efc63dd531aa8db2cc", "6a9ab9e1c63dd531aa8db298", "6a9ab9e6c63dd531aa8db2b4", "6a9ab9efc63dd531aa8db2d0",
      "6a9ab9e7c63dd531aa8db2b9", "6a9ab9e3c63dd531aa8db29f", "6a9ab9e8c63dd531aa8db2bc", "6a9ab9f1c63dd531aa8db2d4", "6a9ab9e9c63dd531aa8db2c1",
      "6a9ab9e3c63dd531aa8db2a1", "6a9ab9ecc63dd531aa8db2c6", "6a9ab9e0c63dd531aa8db294", "6a9ab9edc63dd531aa8db2c9", "6a9ab9e4c63dd531aa8db2ac",
      "6a9ab9f2c63dd531aa8db2d8", "6a9ab9f1c63dd531aa8db2d6", "6a9ab9e1c63dd531aa8db296", "6a9ab9e4c63dd531aa8db2ad", "6a9ab9efc63dd531aa8db2ce",
      // Batch 13 (30 items)
      "6a9ab9fbc63dd531aa8db2fa", "6a9ab9ffc63dd531aa8db304", "6a9ab9f5c63dd531aa8db2e8", "6a9ab9fbc63dd531aa8db2f6", "6a9aba02c63dd531aa8db30e",
      "6a9ab9f5c63dd531aa8db2e4", "6a9ab9fec63dd531aa8db2fe", "6a9ab9f2c63dd531aa8db2da", "6a9aba00c63dd531aa8db308", "6a9ab9f6c63dd531aa8db2ec",
      "6a9ab9f7c63dd531aa8db2f4", "6a9aba02c63dd531aa8db312", "6a9ab9f4c63dd531aa8db2e1", "6a9ab9fbc63dd531aa8db2f7", "6a9aba04c63dd531aa8db316",
      "6a9ab9fdc63dd531aa8db2fc", "6a9ab9f5c63dd531aa8db2e5", "6a9ab9fec63dd531aa8db301", "6a9aba04c63dd531aa8db317", "6a9aba00c63dd531aa8db306",
      "6a9ab9f5c63dd531aa8db2e9", "6a9aba01c63dd531aa8db30c", "6a9ab9f3c63dd531aa8db2de", "6a9aba02c63dd531aa8db30f", "6a9ab9f7c63dd531aa8db2ef",
      "6a9aba05c63dd531aa8db31c", "6a9aba04c63dd531aa8db31a", "6a9ab9f4c63dd531aa8db2e0", "6a9ab9f7c63dd531aa8db2f2", "6a9aba03c63dd531aa8db314",
      // Batch 10 (30 items)
      "6a9aba10c63dd531aa8db340", "6a9aba12c63dd531aa8db349", "6a9aba0bc63dd531aa8db32c", "6a9aba0fc63dd531aa8db33c", "6a9aba14c63dd531aa8db353",
      "6a9aba0ac63dd531aa8db328", "6a9aba11c63dd531aa8db345", "6a9aba06c63dd531aa8db320", "6a9aba14c63dd531aa8db34f", "6a9aba0dc63dd531aa8db334",
      "6a9aba0ec63dd531aa8db33a", "6a9aba18c63dd531aa8db357", "6a9aba19c63dd531aa8db35d", "6a9aba0fc63dd531aa8db33e", "6a9aba1ac63dd531aa8db35f",
      "6a9aba10c63dd531aa8db343", "6a9aba0ac63dd531aa8db32a", "6a9aba11c63dd531aa8db346", "6a9aba1bc63dd531aa8db361", "6a9aba13c63dd531aa8db34d",
      "6a9aba0cc63dd531aa8db332", "6a9aba14c63dd531aa8db351", "6a9aba06c63dd531aa8db321", "6a9aba17c63dd531aa8db355", "6a9aba0dc63dd531aa8db335",
      "6a9aba1cc63dd531aa8db364", "6a9aba1cc63dd531aa8db363", "6a9aba07c63dd531aa8db324", "6a9aba0dc63dd531aa8db336", "6a9aba19c63dd531aa8db35b"
    ];
    const raw = await Product.find({ _id: { $in: target300Ids } })
      .populate("brand", "name")
      .populate("category", "name")
      .lean();
    const map = new Map(raw.map((p) => [p._id.toString(), p]));
    products = target300Ids.map((id) => map.get(id)).filter(Boolean);
  } else {
    if (mongoose.Types.ObjectId.isValid(brandQuery)) {
      brandDoc = await Brand.findById(brandQuery);
    } else {
      brandDoc = await Brand.findOne({
        $or: [
          { name: new RegExp(`^${brandQuery}$`, "i") },
          { slug: new RegExp(`^${brandQuery}$`, "i") },
        ],
      });
    }

    const query = {};
    if (brandDoc) {
      query.$or = [{ brand: brandDoc._id }, { name: new RegExp(brandDoc.name, "i") }];
    } else if (brandQuery && brandQuery !== "ALL") {
      query.name = new RegExp(brandQuery, "i");
    }

    products = await Product.find(query)
      .populate("brand", "name")
      .populate("category", "name")
      .limit(limit)
      .lean();
  }

  if (products.length === 0) {
    throw new Error("No products found for the selected brand to promote.");
  }

  job.isRunning = true;
  job.brandName = brandDoc ? brandDoc.name : brandQuery;
  job.totalProducts = products.length;
  job.postedCount = 0;
  job.failedCount = 0;
  job.intervalMinutes = intervalMinutes;
  job.recentPosts = [];

  let currentIndex = 0;

  async function postNext() {
    if (!job.isRunning || currentIndex >= products.length) {
      job.isRunning = false;
      job.nextPostTime = null;
      return;
    }

    const product = products[currentIndex];
    job.currentProduct = product.name;

    try {
      const bannerBuffer = await generateProductBanner(product);
      const caption = generateFBCaption(product, brandDoc?.name || "LIORA");
      const prodImg = product.image || (product.images && product.images[0]) || "";
      const fbResult = await publishPhotoToFacebook({
        imageBuffer: bannerBuffer,
        imageUrl: prodImg,
        caption,
        pageId,
        pageAccessToken,
      });

      job.postedCount++;
      job.recentPosts.unshift({
        productId: product._id,
        productName: product.name,
        postUrl: fbResult.postUrl,
        timestamp: new Date().toISOString(),
        status: "SUCCESS",
      });
    } catch (err) {
      console.error(`Auto-pilot post failed for "${product.name}":`, err.message);
      job.failedCount++;
      job.recentPosts.unshift({
        productId: product._id,
        productName: product.name,
        error: err.message,
        timestamp: new Date().toISOString(),
        status: "FAILED",
      });
    }

    currentIndex++;
    if (currentIndex < products.length && job.isRunning) {
      const ms = intervalMinutes * 60 * 1000;
      job.nextPostTime = new Date(Date.now() + ms).toISOString();
      job.timer = setTimeout(postNext, ms);
    } else {
      job.isRunning = false;
      job.nextPostTime = null;
    }
  }

  // Fire first post immediately
  postNext();

  const ms = intervalMinutes * 60 * 1000;
  job.nextPostTime = new Date(Date.now() + ms).toISOString();

  return {
    success: true,
    message: `Auto-pilot started for brand ${job.brandName}. Posting 1st product now, then every ${intervalMinutes} mins.`,
    initialStatus: getAutoPilotStatus(),
  };
}
