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

// 5 Luxury Spotlight Themes (Shajgoj-inspired Luxury Aesthetics)
export const THEMES = {
  teal: {
    bgDark: "#041f27",
    bgMid: "#063f4e",
    spotlight: "#00b4d8",
    glowOpacity: 0.85,
    accent: "#38bdf8",
    ribbon: "#ff1493", // hot pink
    cardBg: "rgba(3, 31, 39, 0.78)",
    cardBorder: "rgba(56, 189, 248, 0.4)",
  },
  rose: {
    bgDark: "#260412",
    bgMid: "#4c0824",
    spotlight: "#f43f5e",
    glowOpacity: 0.8,
    accent: "#fb7185",
    ribbon: "#f59e0b", // warm gold
    cardBg: "rgba(38, 4, 18, 0.78)",
    cardBorder: "rgba(251, 113, 133, 0.4)",
  },
  emerald: {
    bgDark: "#021e14",
    bgMid: "#064e3b",
    spotlight: "#10b981",
    glowOpacity: 0.85,
    accent: "#34d399",
    ribbon: "#f43f5e", // coral pink
    cardBg: "rgba(2, 30, 20, 0.78)",
    cardBorder: "rgba(52, 211, 153, 0.4)",
  },
  navy: {
    bgDark: "#080d1a",
    bgMid: "#14203d",
    spotlight: "#3b82f6",
    glowOpacity: 0.85,
    accent: "#60a5fa",
    ribbon: "#ec4899", // pink
    cardBg: "rgba(8, 13, 26, 0.78)",
    cardBorder: "rgba(96, 165, 250, 0.4)",
  },
  gold: {
    bgDark: "#211502",
    bgMid: "#452b04",
    spotlight: "#f59e0b",
    glowOpacity: 0.82,
    accent: "#fbbf24",
    ribbon: "#e11d48", // rose
    cardBg: "rgba(33, 21, 2, 0.78)",
    cardBorder: "rgba(251, 191, 36, 0.4)",
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
    return brightness >= 232 && diff <= 24;
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
  if (/hair|shampoo|keratin|conditioner|scalp|oil/i.test(text)) return "emerald";
  if (/rose|glow|bright|milk|berry|pink|whitening|face wash|lipstick|lip|blush/i.test(text)) return "rose";
  if (/shower|bath|gel|aqua|water|fresh|cool|body wash|hyaluron/i.test(text)) return "teal";
  if (/gold|serum|vitamin c|honey|retinol|anti.?aging|sun/i.test(text)) return "gold";
  if (/men|charcoal|night|deep|black/i.test(text)) return "navy";
  return "teal";
}

export function generateFBCaption(product, brandName = "LIORA") {
  const name = product.name;
  const original = product.originalPrice || 0;
  const offer = product.offerPrice || original;
  const savings = Math.max(0, original - offer);
  const siteUrl = "https://www.liorabeautyandwear.com";
  const productUrl = `${siteUrl}/products?search=${encodeURIComponent(name)}`;

  return `✨ ${name} ✨

সৌন্দর্য ও নির্ভরযোগ্য স্কিনকেয়ারের খাঁটি অভিজ্ঞতা নিয়ে এসেছে ${brandName}! ১০০% অথেনটিক এবং অরিজিনাল কসমেটিক্স এখন বিশেষ অফার মূল্যে।

🔥 রেগুলার প্রাইস: ৳${original}
💥 অফার প্রাইস: মাত্র ৳${offer}! ${savings > 0 ? `(৳${savings} সাশ্রয়)` : ""}
💯 ১০০% অরিজিনাল গ্যারান্টিড

🛍️ ঘরে বসে সরাসরি ওয়েবসাইট থেকে অর্ডার করুন:
👉 ${productUrl}

📞 কল অথবা হোয়াটসঅ্যাপে দ্রুত অর্ডার করতে যোগাযোগ করুন:
📱 01837223147

🚚 সারা বাংলাদেশে ক্যাশ অন হোম ডেলিভারি সুবিধা!

#LioraBeautyAndWear #Liora #AuthenticCosmetics #SkincareBD #CosmeticsBD #DiscountOffer #BeautyDealsBD`;
}

export function formatBannerTitle(rawName) {
  const words = String(rawName || "").replace(/[()]/g, " ").split(/\s+/).filter(Boolean);
  if (words.length <= 3) {
    return [words.join(" ").toUpperCase()];
  }
  const mid = Math.ceil(words.length / 2);
  return [
    words.slice(0, mid).join(" ").toUpperCase(),
    words.slice(mid, mid + 3).join(" ").toUpperCase(),
  ];
}

export function extractVolume(name = "") {
  const match = name.match(/(\d+\s*(?:ml|g|gm|kg|oz|pcs|pack|tab|caps))/i);
  return match ? match[1].toLowerCase() : "";
}

export async function generateProductBanner(product, customThemeKey = null) {
  const width = 1080;
  const height = 1080;

  const productId = product._id ? product._id.toString() : "";
  if (productId) {
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
      // continue to live generation
    }
  }

  const brandName = product.brand?.name || "LIORA";
  const categoryName = product.category?.name || "AUTHENTIC BEAUTY";
  const originalPrice = product.originalPrice || 0;
  const offerPrice = product.offerPrice || originalPrice;
  const saveAmount = Math.max(0, originalPrice - offerPrice);
  const volume = extractVolume(product.name);
  const themeKey = customThemeKey || pickSmartTheme(product.name, categoryName);
  const theme = THEMES[themeKey] || THEMES.teal;

  const imageUrl = product.image || (product.images && product.images[0]) || "";
  if (!imageUrl) {
    throw new Error(`Product "${product.name}" does not have an image.`);
  }

  // 1. Fetch Product Buffer
  const rawProduct = await getProductBuffer(imageUrl);

  const floorY = 870;
  const centerX = 640;

  const titleLines = formatBannerTitle(product.name);
  const safeBrand = escapeXml(brandName);
  const safeCat = escapeXml(categoryName);
  const safeSub = escapeXml(product.name.slice(0, 32));
  const safeVolume = escapeXml(volume);
  const leftMargin = 75;

  const renderSvg = ({ productBase64 = "", heroW = 480, heroH = 720, withComposite = false }) => `
  <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${theme.bgDark}" />
        <stop offset="50%" stop-color="${theme.bgMid}" />
        <stop offset="100%" stop-color="${theme.bgDark}" />
      </linearGradient>

      <radialGradient id="spotlightGlow" cx="60%" cy="52%" r="56%">
        <stop offset="0%" stop-color="${theme.spotlight}" stop-opacity="${theme.glowOpacity}" />
        <stop offset="42%" stop-color="${theme.spotlight}" stop-opacity="0.36" />
        <stop offset="75%" stop-color="${theme.bgMid}" stop-opacity="0.12" />
        <stop offset="100%" stop-color="${theme.bgDark}" stop-opacity="0" />
      </radialGradient>

      <radialGradient id="floorShadow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#000000" stop-opacity="0.85" />
        <stop offset="45%" stop-color="#000000" stop-opacity="0.45" />
        <stop offset="100%" stop-color="#000000" stop-opacity="0" />
      </radialGradient>

      <filter id="cardShadow" x="-10%" y="-10%" width="120%" height="130%">
        <feDropShadow dx="0" dy="14" stdDeviation="20" flood-color="#000000" flood-opacity="0.6" />
      </filter>
    </defs>

    <rect width="${width}" height="${height}" fill="url(#bgGrad)" />
    <rect width="${width}" height="${height}" fill="url(#spotlightGlow)" />

    <!-- Floor Shadow Underneath Cutout Product -->
    <ellipse cx="${centerX}" cy="${floorY + 10}" rx="${Math.round(heroW * 0.48)}" ry="26" fill="url(#floorShadow)" />

    <!-- TOP HEADER: LIORA OFFICIAL LOGO & BRANDING -->
    <g transform="translate(75, 65)">
      <text x="0" y="20" font-family="'Playfair Display', Georgia, serif" font-weight="800" font-size="28" fill="#FFFFFF" letter-spacing="6">LIORA</text>
      <text x="145" y="20" font-family="'Segoe UI', Roboto, sans-serif" font-weight="700" font-size="13" fill="${theme.accent}" letter-spacing="4">BEAUTY &amp; WEAR</text>
      <line x1="0" y1="32" x2="310" y2="32" stroke="${theme.accent}" stroke-opacity="0.5" stroke-width="1.5" />
    </g>

    <!-- TOP RIGHT: 100% ORIGINAL AUTHENTIC BADGE -->
    <g transform="translate(950, 85)" filter="url(#cardShadow)">
      <circle cx="0" cy="0" r="48" fill="${theme.ribbon}" stroke="#ffffff" stroke-width="2" />
      <text x="0" y="-8" text-anchor="middle" font-family="'Segoe UI', Roboto, sans-serif" font-weight="900" font-size="14" fill="#FFFFFF">100%</text>
      <text x="0" y="10" text-anchor="middle" font-family="'Segoe UI', Roboto, sans-serif" font-weight="900" font-size="11" fill="#FFFFFF" letter-spacing="1.5">ORIGINAL</text>
      <text x="0" y="25" text-anchor="middle" font-family="'Segoe UI', Roboto, sans-serif" font-weight="800" font-size="9" fill="#ffffff" letter-spacing="1">AUTHENTIC</text>
    </g>

    <!-- LEFT PRODUCT INFO -->
    <!-- Brand Name -->
    <text x="${leftMargin}" y="195" font-family="'Segoe UI', Roboto, sans-serif" font-weight="900" font-size="28" fill="#FFFFFF" letter-spacing="5">${safeBrand}</text>
    <line x1="${leftMargin}" y1="212" x2="${leftMargin + 60}" y2="212" stroke="${theme.accent}" stroke-width="3.5" stroke-linecap="round" />

    <!-- Category -->
    <text x="${leftMargin}" y="250" font-family="'Segoe UI', Roboto, sans-serif" font-weight="800" font-size="14" fill="${theme.accent}" letter-spacing="2.5">${safeCat}</text>

    <!-- Product Title -->
    <text x="${leftMargin}" y="298" font-family="'Segoe UI', Roboto, sans-serif" font-weight="900" font-size="34" fill="#FFFFFF" letter-spacing="0.5">${titleLines[0] || ""}</text>
    ${
      titleLines[1]
        ? `<text x="${leftMargin}" y="338" font-family="'Segoe UI', Roboto, sans-serif" font-weight="900" font-size="26" fill="rgba(255,255,255,0.85)">${titleLines[1]}</text>`
        : ""
    }

    <!-- PRICE CARD (Glassmorphism Card) -->
    <g transform="translate(${leftMargin}, ${titleLines[1] ? 395 : 360})" filter="url(#cardShadow)">
      <rect width="260" height="195" rx="18" fill="${theme.cardBg}" stroke="${theme.cardBorder}" stroke-width="2" />
      
      <!-- Regular Price Strikethrough -->
      <text x="130" y="42" text-anchor="middle" font-family="'Segoe UI', Roboto, sans-serif" font-weight="700" font-size="18" fill="rgba(255,255,255,0.65)" text-decoration="line-through">৳ ${originalPrice} TK</text>
      <line x1="65" y1="36" x2="195" y2="36" stroke="#ef4444" stroke-width="2" />

      <!-- Offer Price -->
      <text x="130" y="116" text-anchor="middle" font-family="'Segoe UI', Roboto, sans-serif" font-weight="900" font-size="62" fill="#FFFFFF" letter-spacing="-1">৳ ${offerPrice}</text>

      <!-- Save Ribbon -->
      <path d="M 0 144 Q 0 140 0 140 L 260 140 L 260 177 Q 260 195 242 195 L 18 195 Q 0 195 0 177 Z" fill="${theme.ribbon}" />
      <text x="130" y="173" text-anchor="middle" font-family="'Segoe UI', Roboto, sans-serif" font-weight="900" font-size="15" fill="#FFFFFF" letter-spacing="1.5">SAVE ৳ ${saveAmount} TAKA</text>
    </g>

    <!-- TRUST BADGES -->
    <g transform="translate(${leftMargin}, ${titleLines[1] ? 635 : 600})">
      <rect x="0" y="0" width="260" height="44" rx="10" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.15)" stroke-width="1" />
      <text x="130" y="27" text-anchor="middle" font-family="'Segoe UI', Roboto, sans-serif" font-weight="800" font-size="13.5" fill="#FFFFFF">🚚 Cash on Home Delivery</text>
    </g>

    ${
      !withComposite && productBase64
        ? `<image href="${productBase64}" x="${Math.round(centerX - heroW / 2)}" y="${floorY - heroH}" width="${heroW}" height="${heroH}" preserveAspectRatio="xMidYMid meet" />`
        : ""
    }

    <!-- FOOTER WEBSITE BAR -->
    <g transform="translate(75, 985)">
      <rect x="0" y="0" width="930" height="52" rx="12" fill="rgba(0,0,0,0.5)" stroke="rgba(255,255,255,0.15)" stroke-width="1" />
      <text x="30" y="32" font-family="'Segoe UI', Roboto, sans-serif" font-weight="800" font-size="15" fill="#FFFFFF">🌐 Order: liorabeautyandwear.com</text>
      <text x="900" y="32" text-anchor="end" font-family="'Segoe UI', Roboto, sans-serif" font-weight="800" font-size="15" fill="${theme.accent}">📱 WhatsApp / Call: 01837223147</text>
    </g>
  </svg>
  `;

  // Try Sharp if available
  try {
    const sharp = await getSharp();
    if (sharp) {
      const trimmed = await cleanTransparentCutout(rawProduct);
      const { data: resizedBuffer, info: resizedInfo } = await sharp(trimmed)
        .resize({
          width: 500,
          height: 740,
          fit: "inside",
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .toBuffer({ resolveWithObject: true });

      const productTop = floorY - resizedInfo.height;
      const productLeft = Math.round(centerX - resizedInfo.width / 2);

      const bgBuffer = Buffer.from(renderSvg({ withComposite: true, heroW: resizedInfo.width, heroH: resizedInfo.height }));
      return await sharp(bgBuffer)
        .composite([
          {
            input: resizedBuffer,
            top: productTop,
            left: productLeft,
          },
        ])
        .png()
        .toBuffer();
    }
  } catch (err) {
    global.__lastSharpError = err.stack || err.message;
    console.warn("Sharp banner generation fallback to SVG:", err.message);
  }

  // Fallback: Embed base64 product
  let imgMime = "image/jpeg";
  if (imageUrl.toLowerCase().includes(".png") || (rawProduct[0] === 0x89 && rawProduct[1] === 0x50)) {
    imgMime = "image/png";
  } else if (imageUrl.toLowerCase().includes(".webp") || (rawProduct[0] === 0x52 && rawProduct[1] === 0x49)) {
    imgMime = "image/webp";
  }
  const embeddedDataUri = `data:${imgMime};base64,${rawProduct.toString("base64")}`;

  return Buffer.from(renderSvg({ productBase64: embeddedDataUri, withComposite: false, heroW: 480, heroH: 720 }));
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

  // ─── Step 1: Upload photo as unpublished ─────────────────────────────────
  const uploadForm = new FormData();
  uploadForm.append("access_token", pageAccessToken);
  uploadForm.append("published", "false"); // upload only, don't post yet

  if (isSvg && imageUrl) {
    uploadForm.append("url", imageUrl);
  } else if (imageBuffer) {
    const blob = new Blob([imageBuffer], { type: "image/png" });
    uploadForm.append("source", blob, "promotion_banner.png");
  } else if (imageUrl) {
    uploadForm.append("url", imageUrl);
  }

  const uploadRes = await fetch(`https://graph.facebook.com/v20.0/${pageId}/photos`, {
    method: "POST",
    body: uploadForm,
  });

  const uploadData = await uploadRes.json();
  console.log("[FB Upload] response:", JSON.stringify(uploadData));
  if (uploadData.error) {
    throw new Error(`Photo Upload Error: ${uploadData.error.message} (code ${uploadData.error.code})`);
  }

  const photoId = uploadData.id;
  console.log("[FB Upload] photoId:", photoId);

  // ─── Step 2: Publish as a feed post with the attached photo ───────────────
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
  console.log("[FB Feed] response:", JSON.stringify(feedData));

  if (feedData.error) {
    const feedErrMsg = `Feed Error: ${feedData.error.message} (code ${feedData.error.code})`;
    console.warn("[FB Feed] failed, trying fallback photos method. Error:", feedErrMsg);

    // Fallback: publish directly as photo with story enabled
    const fallbackForm = new FormData();
    fallbackForm.append("caption", caption);
    fallbackForm.append("access_token", pageAccessToken);
    fallbackForm.append("published", "true");
    if (imageBuffer) {
      const blob2 = new Blob([imageBuffer], { type: "image/png" });
      fallbackForm.append("source", blob2, "promotion_banner.png");
    } else if (imageUrl) {
      fallbackForm.append("url", imageUrl);
    }
    const fallbackRes = await fetch(`https://graph.facebook.com/v20.0/${pageId}/photos`, {
      method: "POST",
      body: fallbackForm,
    });
    const fallbackData = await fallbackRes.json();
    console.log("[FB Fallback] response:", JSON.stringify(fallbackData));
    if (fallbackData.error) {
      throw new Error(`${feedErrMsg} | Fallback Error: ${fallbackData.error.message}`);
    }
    return {
      success: true,
      photoId: fallbackData.id,
      postId: fallbackData.post_id || fallbackData.id,
      postUrl: fallbackData.post_id
        ? `https://www.facebook.com/${fallbackData.post_id}`
        : `https://www.facebook.com/${fallbackData.id}`,
      method: "photos_fallback",
      feedError: feedErrMsg,
    };
  }

  const postId = feedData.id;
  return {
    success: true,
    photoId,
    postId,
    postUrl: `https://www.facebook.com/${postId}`,
    method: "feed_with_media",
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
