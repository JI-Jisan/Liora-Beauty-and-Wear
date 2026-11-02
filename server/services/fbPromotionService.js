const sharp = require('sharp');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const mongoose = require('mongoose');

// Import Models
require('../models/Category');
require('../models/Brand');
const Product = require('../models/Product');
const Brand = require('../models/Brand');

// 5 Luxury Spotlight Themes (11.11 Mega Sale Studio Photoshoot Templates)
const THEMES = {
  teal: {
    name: 'K-Beauty Dewy 11.11',
    bgDark: '#041f27',
    bgMid: '#063f4e',
    spotlight: '#00b4d8',
    glowOpacity: 0.85,
    accent: '#38bdf8',
    ribbon: '#ff1493',
    cardBg: 'rgba(3, 31, 39, 0.82)',
    cardBorder: 'rgba(56, 189, 248, 0.45)',
    template: 'template_1111_kbeauty.jpg',
    templateUrl: 'https://res.cloudinary.com/dlgubaefs/image/upload/v1793654682/liora_store/fb_templates/template_1111_kbeauty.jpg',
    floorY: 870,
    centerX: 680,
  },
  rose: {
    name: '11.11 Burgundy Velvet',
    bgDark: '#260412',
    bgMid: '#4c0824',
    spotlight: '#f43f5e',
    glowOpacity: 0.8,
    accent: '#fb7185',
    ribbon: '#e11d48',
    cardBg: 'rgba(20, 6, 12, 0.85)',
    cardBorder: 'rgba(244, 63, 94, 0.45)',
    template: 'template_1111_burgundy.jpg',
    templateUrl: 'https://res.cloudinary.com/dlgubaefs/image/upload/v1793654673/liora_store/fb_templates/template_1111_burgundy.jpg',
    floorY: 880,
    centerX: 680,
  },
  emerald: {
    name: 'Organic Botanical 11.11',
    bgDark: '#021e14',
    bgMid: '#064e3b',
    spotlight: '#10b981',
    glowOpacity: 0.85,
    accent: '#34d399',
    ribbon: '#f43f5e',
    cardBg: 'rgba(4, 24, 18, 0.85)',
    cardBorder: 'rgba(52, 211, 153, 0.45)',
    template: 'template_1111_kbeauty.jpg',
    templateUrl: 'https://res.cloudinary.com/dlgubaefs/image/upload/v1793654682/liora_store/fb_templates/template_1111_kbeauty.jpg',
    floorY: 870,
    centerX: 680,
  },
  navy: {
    name: 'Midnight Obsidian 11.11',
    bgDark: '#080d1a',
    bgMid: '#14203d',
    spotlight: '#3b82f6',
    glowOpacity: 0.85,
    accent: '#60a5fa',
    ribbon: '#ec4899',
    cardBg: 'rgba(10, 10, 16, 0.85)',
    cardBorder: 'rgba(234, 179, 8, 0.45)',
    template: 'template_1111_midnight.jpg',
    templateUrl: 'https://res.cloudinary.com/dlgubaefs/image/upload/v1793654679/liora_store/fb_templates/template_1111_midnight.jpg',
    floorY: 870,
    centerX: 680,
  },
  gold: {
    name: 'Golden Gala 11.11',
    bgDark: '#211502',
    bgMid: '#452b04',
    spotlight: '#f59e0b',
    glowOpacity: 0.82,
    accent: '#fbbf24',
    ribbon: '#e11d48',
    cardBg: 'rgba(25, 14, 4, 0.85)',
    cardBorder: 'rgba(251, 191, 36, 0.45)',
    template: 'template_1111_burgundy.jpg',
    templateUrl: 'https://res.cloudinary.com/dlgubaefs/image/upload/v1793654673/liora_store/fb_templates/template_1111_burgundy.jpg',
    floorY: 880,
    centerX: 680,
  },
};

const templateBufferCache = new Map();

async function loadTemplateBackground(theme) {
  if (!theme || !theme.template) return null;
  if (templateBufferCache.has(theme.template)) {
    return templateBufferCache.get(theme.template);
  }

  const localCandidates = [
    path.join(process.cwd(), 'public', 'banners', 'fb_templates', theme.template),
    path.join(process.cwd(), 'client', 'public', 'banners', 'fb_templates', theme.template),
    path.join(process.cwd(), '..', 'client', 'public', 'banners', 'fb_templates', theme.template),
    path.join(process.cwd(), 'server', 'public', 'banners', 'fb_templates', theme.template),
    path.join(process.cwd(), '..', 'server', 'public', 'banners', 'fb_templates', theme.template),
  ];

  for (const cand of localCandidates) {
    if (fs.existsSync(cand)) {
      try {
        const buf = fs.readFileSync(cand);
        templateBufferCache.set(theme.template, buf);
        return buf;
      } catch (e) {}
    }
  }

  if (theme.templateUrl) {
    try {
      const buf = await fetchBuffer(theme.templateUrl);
      templateBufferCache.set(theme.template, buf);
      return buf;
    } catch (e) {
      console.warn('Failed to fetch template from Cloudinary:', theme.templateUrl, e.message);
    }
  }

  return null;
}

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchBuffer(res.headers.location).then(resolve).catch(reject);
      }
      const data = [];
      res.on('data', (chunk) => data.push(chunk));
      res.on('end', () => resolve(Buffer.concat(data)));
    }).on('error', reject);
  });
}

function escapeXml(unsafe) {
  return String(unsafe || '').replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
    }
  });
}

function getBgRemovedUrl(url) {
  if (!url) return url;
  if (url.includes('/upload/') && !url.includes('/e_background_removal/')) {
    const withPng = url.replace(/\.(jpg|jpeg|webp)$/i, '.png');
    return withPng.replace('/upload/', '/upload/e_background_removal/');
  }
  return url;
}

async function getProductBuffer(imageUrl) {
  try {
    const bgRemovedUrl = getBgRemovedUrl(imageUrl);
    return await fetchBuffer(bgRemovedUrl);
  } catch (err) {
    return await fetchBuffer(imageUrl);
  }
}

async function cleanTransparentCutout(buffer) {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 110) {
      data[i + 3] = 0;
    }
  }
  return await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .trim()
    .png()
    .toBuffer();
}

// Smart theme detection based on product name / category
function pickSmartTheme(productName = '', categoryName = '') {
  const text = `${productName} ${categoryName}`.toLowerCase();
  if (/hair|shampoo|keratin|conditioner|scalp|oil/i.test(text)) return 'emerald';
  if (/rose|glow|bright|milk|berry|pink|whitening|face wash|lipstick|lip|blush/i.test(text)) return 'rose';
  if (/shower|bath|gel|aqua|water|fresh|cool|body wash|hyaluron/i.test(text)) return 'teal';
  if (/gold|serum|vitamin c|honey|retinol|anti.?aging|sun/i.test(text)) return 'gold';
  if (/men|charcoal|night|deep|black/i.test(text)) return 'navy';
  return 'teal';
}

// Generate FB High-Converting Sales Caption for 11.11 Mega Sale
function generateFBCaption(product, brandName = 'LIORA') {
  const name = product.name;
  let original = Number(product.originalPrice) || 0;
  let offer = Number(product.offerPrice) || original;
  if (original <= offer) {
    original = Math.round(offer * 1.3);
  }
  const savings = Math.max(0, original - offer);
  const discountPct = original > 0 ? Math.round((savings / original) * 100) : 0;
  const siteUrl = 'https://www.liorabeautyandwear.com';
  const productUrl = product.slug
    ? `${siteUrl}/products/${product.slug}`
    : `${siteUrl}/products?search=${encodeURIComponent(name)}`;

  return `🔥 LIORA 11.11 MEGA SALE — BIGGEST BEAUTY DISCOUNTS! 🔥

✨ ${name} ✨

আন্তর্জাতিক মান ও ১০০% অথেনটিক বিউটি কেয়ারের সেরা কালেকশন এখন বছরের সবচেয়ে বড় ধামাকা ছাড়ে! স্টক সীমিত, এখনই বুক করুন আপনার পছন্দের অরিজিনাল প্রোডাক্ট।

💰 রেগুলার MRP: ৳${original}
💥 11.11 অফার প্রাইস: মাত্র ৳${offer}! ${savings > 0 ? `(সরাসরি ৳${savings} সাশ্রয় | ${discountPct}% OFF)` : ''}
🛡️ ১০০% ইন-স্টক ও আসল প্রোডাক্ট গ্যারান্টি

🛍️ অর্ডার করতে সরাসরি প্রোডাক্ট লিংকে যান:
👉 ${productUrl}

📱 পেইজে মেসেজ দিন অথবা সরাসরি কল/হোয়াটসঅ্যাপ করুন:
📞 01837223147

🚚 সারা বাংলাদেশে ক্যাশ অন হোম ডেলিভারি সুবিধা (প্যাকেট দেখে চেক করে রিসিভ করার সুযোগ)!

#LioraBeautyAndWear #1111MegaSale #AuthenticCosmetics #1111Offer #SkincareBD #CosmeticsBD #LioraDeals #MakeupBD #KoreanSkincareBD`;
}

// Split title into clean lines of max 22 characters for banner
function formatBannerTitle(rawName) {
  const words = String(rawName || '').replace(/[()]/g, ' ').split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';
  for (const w of words) {
    if ((current + ' ' + w).trim().length <= 22) {
      current = (current + ' ' + w).trim();
    } else {
      if (current) lines.push(current.toUpperCase());
      current = w;
      if (lines.length >= 2) break;
    }
  }
  if (current && lines.length < 3) lines.push(current.toUpperCase());
  return lines;
}

// Extract volume (e.g. 220 ml, 100g, 50ml)
function extractVolume(name = '') {
  const match = name.match(/(\d+\s*(?:ml|g|gm|kg|oz|pcs|pack|tab|caps))/i);
  return match ? match[1].toLowerCase() : '';
}

// Generate HD 11.11 Studio Photoshoot Banner
async function generateProductBanner(product, customThemeKey = null) {
  const width = 1080;
  const height = 1080;

  const brandName = product.brand?.name || 'LIORA';
  const categoryName = product.category?.name || 'AUTHENTIC BEAUTY';

  let originalPrice = Number(product.originalPrice) || 0;
  let offerPrice = Number(product.offerPrice) || originalPrice;
  if (originalPrice <= offerPrice) {
    originalPrice = Math.round(offerPrice * 1.3);
  }
  const saveAmount = Math.max(0, originalPrice - offerPrice);
  const discountPct = originalPrice > 0 ? Math.round((saveAmount / originalPrice) * 100) : 0;

  const themeKey = customThemeKey || pickSmartTheme(product.name, categoryName);
  const theme = THEMES[themeKey] || THEMES.teal;

  const imageUrl = product.image || (product.images && product.images[0]) || '';
  if (!imageUrl) {
    throw new Error(`Product "${product.name}" does not have an image.`);
  }

  // 1. Fetch & AI Background Removal & auto-grounding
  const rawProduct = await getProductBuffer(imageUrl);
  const trimmed = await cleanTransparentCutout(rawProduct);

  const floorY = theme.floorY || 875;
  const centerX = theme.centerX || 680;

  const { data: resizedBuffer, info: resizedInfo } = await sharp(trimmed)
    .trim({ threshold: 10 })
    .resize({
      width: 440,
      height: 620,
      fit: 'inside',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .toBuffer({ resolveWithObject: true });

  const productTop = floorY - resizedInfo.height;
  const productLeft = Math.round(centerX - resizedInfo.width / 2);

  const titleLines = formatBannerTitle(product.name);
  const safeBrand = escapeXml(brandName);
  const safeCat = escapeXml(categoryName);
  const leftMargin = 65;

  const titleBlockHeight = titleLines.length * 30;
  const priceCardY = 270 + titleBlockHeight + 10;

  const templateBuffer = await loadTemplateBackground(theme);

  const overlaySvg = `
  <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${theme.bgDark}" />
        <stop offset="50%" stop-color="${theme.bgMid}" />
        <stop offset="100%" stop-color="${theme.bgDark}" />
      </linearGradient>

      <radialGradient id="spotlightGlow" cx="65%" cy="50%" r="56%">
        <stop offset="0%" stop-color="${theme.spotlight}" stop-opacity="${theme.glowOpacity}" />
        <stop offset="42%" stop-color="${theme.spotlight}" stop-opacity="0.36" />
        <stop offset="75%" stop-color="${theme.bgMid}" stop-opacity="0.12" />
        <stop offset="100%" stop-color="${theme.bgDark}" stop-opacity="0" />
      </radialGradient>

      <radialGradient id="floorShadow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#000000" stop-opacity="0.85" />
        <stop offset="50%" stop-color="#000000" stop-opacity="0.35" />
        <stop offset="100%" stop-color="#000000" stop-opacity="0" />
      </radialGradient>

      <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#fef08a" />
        <stop offset="50%" stop-color="#eab308" />
        <stop offset="100%" stop-color="#ca8a04" />
      </linearGradient>

      <linearGradient id="badgeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#e11d48" />
        <stop offset="100%" stop-color="#9f1239" />
      </linearGradient>

      <filter id="shadowFilter" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="10" stdDeviation="16" flood-color="#000000" flood-opacity="0.65" />
      </filter>
    </defs>

    ${!templateBuffer ? `
      <rect width="${width}" height="${height}" fill="url(#bgGrad)" />
      <rect width="${width}" height="${height}" fill="url(#spotlightGlow)" />
    ` : ''}

    <!-- Floor Shadow Under Cutout Product -->
    <ellipse cx="${centerX}" cy="${floorY + 12}" rx="${Math.round(resizedInfo.width * 0.46)}" ry="24" fill="url(#floorShadow)" />

    <!-- TOP HEADER: LIORA OFFICIAL BRANDING -->
    <g transform="translate(65, 55)">
      <text x="0" y="22" font-family="'Playfair Display', Georgia, serif" font-weight="900" font-size="28" fill="#FFFFFF" letter-spacing="5">LIORA</text>
      <text x="145" y="22" font-family="'Segoe UI', Roboto, sans-serif" font-weight="700" font-size="13" fill="#fecdd3" letter-spacing="3.5">BEAUTY &amp; WEAR</text>
      <line x1="0" y1="36" x2="310" y2="36" stroke="#f43f5e" stroke-opacity="0.6" stroke-width="1.8" />
    </g>

    <!-- TOP RIGHT: 11.11 MEGA SALE GOLDEN BADGE -->
    <g transform="translate(850, 50)" filter="url(#shadowFilter)">
      <rect x="0" y="0" width="165" height="56" rx="28" fill="url(#goldGrad)" stroke="#ffffff" stroke-width="2" />
      <text x="82" y="26" text-anchor="middle" font-family="'Segoe UI', Roboto, sans-serif" font-weight="900" font-size="15" fill="#881337" letter-spacing="1">11.11 MEGA SALE</text>
      <text x="82" y="44" text-anchor="middle" font-family="'Segoe UI', Roboto, sans-serif" font-weight="800" font-size="11" fill="#713f12" letter-spacing="0.5">LIMITED TIME OFFER</text>
    </g>

    <!-- LEFT PRODUCT INFO -->
    <!-- Brand Name -->
    <g transform="translate(${leftMargin}, 170)">
      <text x="0" y="22" font-family="'Segoe UI', Roboto, sans-serif" font-weight="900" font-size="22" fill="#fef08a" letter-spacing="4">${safeBrand}</text>
      <line x1="0" y1="32" x2="60" y2="32" stroke="#eab308" stroke-width="3" stroke-linecap="round" />
    </g>

    <!-- Category Pill -->
    <g transform="translate(${leftMargin}, 216)">
      <rect x="0" y="0" width="${categoryName.length * 8 + 24}" height="26" rx="13" fill="rgba(255,255,255,0.14)" stroke="rgba(255,255,255,0.25)" stroke-width="1" />
      <text x="12" y="17" font-family="'Segoe UI', Roboto, sans-serif" font-weight="700" font-size="11" fill="#ffffff" letter-spacing="1.5">${safeCat}</text>
    </g>

    <!-- Product Title -->
    <g transform="translate(${leftMargin}, 275)" filter="url(#shadowFilter)">
      <text x="0" y="0" font-family="'Segoe UI', Roboto, sans-serif" font-weight="900" font-size="24" fill="#FFFFFF">${escapeXml(titleLines[0] || '')}</text>
      ${titleLines[1] ? `<text x="0" y="30" font-family="'Segoe UI', Roboto, sans-serif" font-weight="800" font-size="20" fill="rgba(255,255,255,0.9)">${escapeXml(titleLines[1])}</text>` : ''}
      ${titleLines[2] ? `<text x="0" y="58" font-family="'Segoe UI', Roboto, sans-serif" font-weight="700" font-size="16" fill="rgba(255,255,255,0.75)">${escapeXml(titleLines[2])}</text>` : ''}
    </g>

    <!-- 100% ACCURATE 11.11 PRICE CARD (GLASSMORPHISM CARD) -->
    <g transform="translate(${leftMargin}, ${priceCardY})" filter="url(#shadowFilter)">
      <rect width="280" height="205" rx="20" fill="${theme.cardBg || 'rgba(20, 6, 12, 0.85)'}" stroke="${theme.cardBorder || 'rgba(244, 63, 94, 0.45)'}" stroke-width="2" />
      
      <!-- Strikethrough Regular MRP -->
      <g transform="translate(140, 40)">
        <text x="0" y="0" text-anchor="middle" font-family="'Segoe UI', Roboto, sans-serif" font-weight="700" font-size="16" fill="rgba(255,255,255,0.65)">MRP: ৳${originalPrice} TK</text>
        <line x1="-65" y1="-5" x2="65" y2="-5" stroke="#ef4444" stroke-width="2.5" />
      </g>

      <!-- 11.11 Offer Price -->
      <text x="140" y="106" text-anchor="middle" font-family="'Segoe UI', Roboto, sans-serif" font-weight="900" font-size="56" fill="#FFFFFF" letter-spacing="-1">৳ ${offerPrice}</text>
      <text x="140" y="132" text-anchor="middle" font-family="'Segoe UI', Roboto, sans-serif" font-weight="700" font-size="12" fill="#fef08a" letter-spacing="1.5">11.11 SPECIAL OFFER</text>

      <!-- Save & Discount Ribbon -->
      <path d="M 0 156 Q 0 152 0 152 L 280 152 L 280 188 Q 280 205 260 205 L 20 205 Q 0 205 0 188 Z" fill="url(#badgeGrad)" />
      <text x="140" y="184" text-anchor="middle" font-family="'Segoe UI', Roboto, sans-serif" font-weight="900" font-size="14" fill="#FFFFFF" letter-spacing="1">SAVE ৳ ${saveAmount} TAKA (-${discountPct}%)</text>
    </g>

    <!-- TRUST STRIPS -->
    <g transform="translate(${leftMargin}, ${priceCardY + 225})" filter="url(#shadowFilter)">
      <rect x="0" y="0" width="280" height="40" rx="10" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.2)" stroke-width="1" />
      <text x="140" y="25" text-anchor="middle" font-family="'Segoe UI', Roboto, sans-serif" font-weight="800" font-size="12.5" fill="#ffffff">🚚 সারা দেশে হোম ডেলিভারি</text>
    </g>

    <g transform="translate(${leftMargin}, ${priceCardY + 275})" filter="url(#shadowFilter)">
      <rect x="0" y="0" width="280" height="40" rx="10" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.2)" stroke-width="1" />
      <text x="140" y="25" text-anchor="middle" font-family="'Segoe UI', Roboto, sans-serif" font-weight="800" font-size="12.5" fill="#ffffff">🛡️ ১০০% ইন-স্টক আসল প্রোডাক্ট</text>
    </g>

    <!-- BOTTOM CTA BANNER -->
    <g transform="translate(65, 995)">
      <rect x="0" y="0" width="950" height="48" rx="12" fill="rgba(15, 23, 42, 0.75)" stroke="rgba(255,255,255,0.15)" stroke-width="1" />
      <text x="475" y="30" text-anchor="middle" font-family="'Segoe UI', Roboto, sans-serif" font-weight="800" font-size="15" fill="#fef08a" letter-spacing="1">
        🛒 অর্ডার করতে পেইজে ইনবক্স করুন অথবা ভিজিট করুন: liorabd.com 📱 01837223147
      </text>
    </g>
  </svg>
  `;

  if (templateBuffer) {
    return await sharp(templateBuffer)
      .resize(width, height)
      .composite([
        { input: resizedBuffer, top: productTop, left: productLeft },
        { input: Buffer.from(overlaySvg), top: 0, left: 0 }
      ])
      .png({ quality: 95 })
      .toBuffer();
  }

  const bgBuffer = Buffer.from(overlaySvg);
  return await sharp(bgBuffer)
    .composite([
      { input: resizedBuffer, top: productTop, left: productLeft }
    ])
    .png()
    .toBuffer();
}

// BATCH GENERATOR FOR A BRAND
async function batchGenerateBrandPromotions({ brandQuery, limit = 100, onProgress }) {
  let brandDoc = null;
  if (mongoose.Types.ObjectId.isValid(brandQuery)) {
    brandDoc = await Brand.findById(brandQuery);
  } else {
    brandDoc = await Brand.findOne({
      $or: [
        { name: new RegExp(`^${brandQuery}$`, 'i') },
        { slug: new RegExp(`^${brandQuery}$`, 'i') }
      ]
    });
  }

  const query = {};
  if (brandDoc) {
    query.$or = [
      { brand: brandDoc._id },
      { name: new RegExp(brandDoc.name, 'i') }
    ];
  } else if (brandQuery && brandQuery !== 'ALL') {
    query.name = new RegExp(brandQuery, 'i');
  }

  const products = await Product.find(query)
    .populate('brand', 'name slug')
    .populate('category', 'name slug')
    .limit(limit)
    .lean();

  const brandSlug = brandDoc ? brandDoc.slug || brandDoc.name.toLowerCase().replace(/[^a-z0-9]/g, '_') : 'brand_promo';
  const outDir = path.join(__dirname, '..', 'uploads', 'promotions', brandSlug);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const results = [];
  let summaryText = `==========================================================\nLIORA BEAUTY & WEAR - AUTO PROMOTIONS BATCH: ${brandDoc?.name || brandQuery}\nTotal Products: ${products.length}\nGenerated: ${new Date().toLocaleString()}\n==========================================================\n\n`;

  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    const safeFilename = `${i + 1}_${product.slug || product._id}.png`;
    const outputPath = path.join(outDir, safeFilename);

    try {
      const bannerBuffer = await generateProductBanner(product);
      fs.writeFileSync(outputPath, bannerBuffer);

      const caption = generateFBCaption(product, brandDoc?.name || 'LIORA');
      results.push({
        id: product._id,
        name: product.name,
        slug: product.slug,
        imageFile: safeFilename,
        localPath: outputPath,
        imageUrl: `/uploads/promotions/${brandSlug}/${safeFilename}`,
        caption,
        status: 'SUCCESS'
      });

      summaryText += `----------------------------------------------------------\n`;
      summaryText += `[POST #${i + 1}] Product: ${product.name}\n`;
      summaryText += `Image File: ${safeFilename}\n`;
      summaryText += `----------------------------------------------------------\n`;
      summaryText += `${caption}\n\n\n`;

      if (typeof onProgress === 'function') {
        onProgress(i + 1, products.length, product.name);
      }
    } catch (err) {
      console.error(`Error generating promo for ${product.name}:`, err.message);
      results.push({
        id: product._id,
        name: product.name,
        status: 'ERROR',
        error: err.message
      });
    }
  }

  // Write Summary Captions File
  const captionsFilePath = path.join(outDir, 'captions_all_posts.txt');
  fs.writeFileSync(captionsFilePath, summaryText, 'utf8');

  // Create ZIP archive using AdmZip
  const AdmZip = require('adm-zip');
  const zip = new AdmZip();
  const zipFilename = `${brandSlug}_full_bundle.zip`;
  const zipPath = path.join(outDir, zipFilename);

  results.forEach(r => {
    if (r.status === 'SUCCESS' && fs.existsSync(r.localPath)) {
      zip.addLocalFile(r.localPath);
    }
  });
  if (fs.existsSync(captionsFilePath)) {
    zip.addLocalFile(captionsFilePath);
  }
  zip.writeZip(zipPath);

  return {
    brand: brandDoc ? brandDoc.name : brandQuery,
    totalProducts: products.length,
    successful: results.filter(r => r.status === 'SUCCESS').length,
    results,
    zipDownloadUrl: `/uploads/promotions/${brandSlug}/${zipFilename}`,
    summaryTxtUrl: `/uploads/promotions/${brandSlug}/captions_all_posts.txt`
  };
}

// -------------------------------------------------------------
// DIRECT FACEBOOK PUBLISHING & AUTO-PILOT SCHEDULER
// -------------------------------------------------------------

async function publishPhotoToFacebook({ imageBuffer, caption, pageId, pageAccessToken }) {
  if (!pageId || !pageAccessToken) {
    throw new Error('Facebook Page ID and Page Access Token are required.');
  }

  // Step 1: Upload photo asset as unpublished
  const blob = new Blob([imageBuffer], { type: 'image/png' });
  const photoFormData = new FormData();
  photoFormData.append('source', blob, 'promotion_banner.png');
  photoFormData.append('access_token', pageAccessToken);
  photoFormData.append('published', 'false');

  const uploadRes = await fetch(`https://graph.facebook.com/v20.0/${pageId}/photos`, {
    method: 'POST',
    body: photoFormData
  });

  const uploadData = await uploadRes.json();
  if (uploadData.error) {
    throw new Error(uploadData.error.message || 'Photo Upload Failed');
  }

  const photoId = uploadData.id;

  // Step 2: Publish as true News Feed Post via /{pageId}/feed with attached_media
  const feedRes = await fetch(`https://graph.facebook.com/v20.0/${pageId}/feed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: caption,
      attached_media: [{ media_fbid: photoId }],
      access_token: pageAccessToken
    })
  });

  const feedData = await feedRes.json();
  const postId = feedData.id || photoId;

  return {
    success: true,
    photoId,
    postId,
    postUrl: `https://www.facebook.com/${postId}`
  };
}

/**
 * Schedule a Post natively to Meta Business Suite with Banner & Sales Caption
 */
async function schedulePostToFacebook({
  imageBuffer,
  imageUrl,
  caption,
  pageId,
  pageAccessToken,
  scheduledMinutes = 20,
}) {
  if (!pageId || !pageAccessToken) {
    throw new Error('Facebook Page ID and Page Access Token are required.');
  }

  const minutes = Math.max(11, Number(scheduledMinutes) || 20);
  const scheduledPublishTime = Math.floor(Date.now() / 1000) + minutes * 60;

  // Step 1: Upload photo asset as unpublished
  const photoFormData = new FormData();
  photoFormData.append('access_token', pageAccessToken);
  photoFormData.append('published', 'false');

  if (imageBuffer) {
    const blob = new Blob([imageBuffer], { type: 'image/png' });
    photoFormData.append('source', blob, 'promotion_banner.png');
  } else if (imageUrl) {
    photoFormData.append('url', imageUrl);
  }

  const uploadRes = await fetch(`https://graph.facebook.com/v20.0/${pageId}/photos`, {
    method: 'POST',
    body: photoFormData,
  });

  const uploadData = await uploadRes.json();
  if (uploadData.error) {
    throw new Error(`Photo Upload Error: ${uploadData.error.message}`);
  }

  const photoId = uploadData.id;

  // Step 2: Schedule Feed Post via /{pageId}/feed with attached_media
  const feedRes = await fetch(`https://graph.facebook.com/v20.0/${pageId}/feed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: caption,
      attached_media: [{ media_fbid: photoId }],
      published: false,
      scheduled_publish_time: scheduledPublishTime,
      access_token: pageAccessToken,
    }),
  });

  const feedData = await feedRes.json();
  console.log('[FB Scheduled Post Response]:', JSON.stringify(feedData));

  if (feedData.error) {
    throw new Error(`Schedule Post Error: ${feedData.error.message}`);
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
    scheduledDateStr: new Date(scheduledPublishTime * 1000).toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }),
    businessSuiteUrl,
    plannerUrl,
  };
}

// In-Memory Auto-Pilot State
let autoPilotJob = {
  isRunning: false,
  brandName: '',
  totalProducts: 0,
  postedCount: 0,
  failedCount: 0,
  intervalMinutes: 15,
  currentProduct: '',
  nextPostTime: null,
  recentPosts: [],
  timer: null
};

function getAutoPilotStatus() {
  return {
    isRunning: autoPilotJob.isRunning,
    brandName: autoPilotJob.brandName,
    totalProducts: autoPilotJob.totalProducts,
    postedCount: autoPilotJob.postedCount,
    failedCount: autoPilotJob.failedCount,
    intervalMinutes: autoPilotJob.intervalMinutes,
    currentProduct: autoPilotJob.currentProduct,
    nextPostTime: autoPilotJob.nextPostTime,
    recentPosts: autoPilotJob.recentPosts.slice(0, 10)
  };
}

function stopAutoPilot() {
  if (autoPilotJob.timer) {
    clearTimeout(autoPilotJob.timer);
    autoPilotJob.timer = null;
  }
  autoPilotJob.isRunning = false;
  autoPilotJob.nextPostTime = null;
  return { success: true, message: 'Auto-pilot stopped successfully.' };
}

async function startAutoPilot({ brandQuery, intervalMinutes = 15, limit = 50, pageId, pageAccessToken }) {
  if (autoPilotJob.isRunning) {
    stopAutoPilot();
  }

  let products = [];
  let brandNameLabel = 'Ready In-Stock Banners';

  if (brandQuery === 'instock_ready' || brandQuery === 'ALL' || !brandQuery) {
    products = await Product.find({
      inStock: true,
      stockStatus: { $ne: 'Out of Stock' },
      stockQuantity: { $gt: 0 },
      image: { $exists: true, $ne: '' }
    })
    .populate('brand', 'name slug')
    .populate('category', 'name slug')
    .sort({ isFeatured: -1, isTrending: -1, stockQuantity: -1 })
    .limit(limit || 35)
    .lean();
    brandNameLabel = '৩৫টি প্রস্তুতকৃত ইন-স্টক ব্যানার';
  } else {
    let brandDoc = null;
    if (mongoose.Types.ObjectId.isValid(brandQuery)) {
      brandDoc = await Brand.findById(brandQuery);
    } else {
      brandDoc = await Brand.findOne({
        $or: [
          { name: new RegExp(`^${brandQuery}$`, 'i') },
          { slug: new RegExp(`^${brandQuery}$`, 'i') }
        ]
      });
    }

    const query = {};
    if (brandDoc) {
      query.$or = [
        { brand: brandDoc._id },
        { name: new RegExp(brandDoc.name, 'i') }
      ];
      brandNameLabel = brandDoc.name;
    } else {
      query.name = new RegExp(brandQuery, 'i');
      brandNameLabel = brandQuery;
    }

    products = await Product.find(query)
      .populate('brand', 'name slug')
      .populate('category', 'name slug')
      .limit(limit)
      .lean();
  }

  if (!products || products.length === 0) {
    throw new Error(`No products found for "${brandQuery}"`);
  }

  autoPilotJob = {
    isRunning: true,
    brandName: brandNameLabel,
    totalProducts: products.length,
    postedCount: 0,
    failedCount: 0,
    intervalMinutes: Number(intervalMinutes) || 15,
    currentProduct: '',
    nextPostTime: null,
    recentPosts: [],
    timer: null
  };

  const queue = [...products];

  async function processNext() {
    if (!autoPilotJob.isRunning || queue.length === 0) {
      autoPilotJob.isRunning = false;
      autoPilotJob.nextPostTime = null;
      console.log('✅ Auto-Pilot completed all posts in queue.');
      return;
    }

    const product = queue.shift();
    autoPilotJob.currentProduct = product.name;

    try {
      console.log(`[Auto-Pilot] Posting "${product.name}" to Facebook...`);
      const { regenerateBannerForProduct } = require('./dynamicBannerService');
      let bannerBuffer = null;
      try {
        const result = await regenerateBannerForProduct(product._id);
        bannerBuffer = result.buffer;
      } catch (e) {
        bannerBuffer = await generateProductBanner(product);
      }
      const caption = generateFBCaption(product, brandDoc?.name || 'LIORA');

      const fbResult = await publishPhotoToFacebook({
        imageBuffer: bannerBuffer,
        caption,
        pageId,
        pageAccessToken
      });

      autoPilotJob.postedCount++;
      autoPilotJob.recentPosts.unshift({
        productName: product.name,
        time: new Date().toLocaleTimeString(),
        postUrl: fbResult.postUrl,
        status: 'SUCCESS'
      });
      console.log(`[Auto-Pilot] Successfully posted "${product.name}" -> ${fbResult.postUrl}`);
    } catch (err) {
      console.error(`[Auto-Pilot] Failed to post "${product.name}":`, err.message);
      autoPilotJob.failedCount++;
      autoPilotJob.recentPosts.unshift({
        productName: product.name,
        time: new Date().toLocaleTimeString(),
        error: err.message,
        status: 'FAILED'
      });
    }

    // Schedule next product if queue still has items
    if (queue.length > 0 && autoPilotJob.isRunning) {
      const waitMs = autoPilotJob.intervalMinutes * 60 * 1000;
      autoPilotJob.nextPostTime = new Date(Date.now() + waitMs);
      console.log(`[Auto-Pilot] Next post scheduled in ${autoPilotJob.intervalMinutes} mins at ${autoPilotJob.nextPostTime.toLocaleTimeString()}`);
      autoPilotJob.timer = setTimeout(processNext, waitMs);
    } else {
      autoPilotJob.isRunning = false;
      autoPilotJob.nextPostTime = null;
    }
  }

  // Fire first post immediately
  processNext();

  return {
    success: true,
    message: `Auto-pilot started for ${products.length} products (Every ${intervalMinutes} minutes).`,
    initialStatus: getAutoPilotStatus()
  };
}

module.exports = {
  THEMES,
  pickSmartTheme,
  generateFBCaption,
  generateProductBanner,
  batchGenerateBrandPromotions,
  publishPhotoToFacebook,
  schedulePostToFacebook,
  startAutoPilot,
  stopAutoPilot,
  getAutoPilotStatus
};

