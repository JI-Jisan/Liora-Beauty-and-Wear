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

// 5 Luxury Spotlight Themes (Shajgoj-inspired Luxury Aesthetics)
const THEMES = {
  teal: {
    bgDark: '#041f27',
    bgMid: '#063f4e',
    spotlight: '#00b4d8',
    glowOpacity: 0.85,
    accent: '#38bdf8',
    ribbon: '#ff1493', // hot pink
    cardBg: 'rgba(3, 31, 39, 0.78)',
    cardBorder: 'rgba(56, 189, 248, 0.4)',
  },
  rose: {
    bgDark: '#260412',
    bgMid: '#4c0824',
    spotlight: '#f43f5e',
    glowOpacity: 0.8,
    accent: '#fb7185',
    ribbon: '#f59e0b', // warm gold
    cardBg: 'rgba(38, 4, 18, 0.78)',
    cardBorder: 'rgba(251, 113, 133, 0.4)',
  },
  emerald: {
    bgDark: '#021e14',
    bgMid: '#064e3b',
    spotlight: '#10b981',
    glowOpacity: 0.85,
    accent: '#34d399',
    ribbon: '#f43f5e', // coral pink
    cardBg: 'rgba(2, 30, 20, 0.78)',
    cardBorder: 'rgba(52, 211, 153, 0.4)',
  },
  navy: {
    bgDark: '#080d1a',
    bgMid: '#14203d',
    spotlight: '#3b82f6',
    glowOpacity: 0.85,
    accent: '#60a5fa',
    ribbon: '#ec4899', // pink
    cardBg: 'rgba(8, 13, 26, 0.78)',
    cardBorder: 'rgba(96, 165, 250, 0.4)',
  },
  gold: {
    bgDark: '#211502',
    bgMid: '#452b04',
    spotlight: '#f59e0b',
    glowOpacity: 0.82,
    accent: '#fbbf24',
    ribbon: '#e11d48', // rose
    cardBg: 'rgba(33, 21, 2, 0.78)',
    cardBorder: 'rgba(251, 191, 36, 0.4)',
  }
};

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

// Generate FB High-Converting Sales Caption
function generateFBCaption(product, brandName = 'LIORA') {
  const name = product.name;
  const original = product.originalPrice || 0;
  const offer = product.offerPrice || original;
  const savings = Math.max(0, original - offer);
  const slug = product.slug || product._id;
  const siteUrl = 'https://www.liorabeautyandwear.com';
  const productUrl = `${siteUrl}/products?search=${encodeURIComponent(name)}`;

  return `✨ ${name} ✨

সৌন্দর্য ও নির্ভরযোগ্য স্কিনকেয়ারের খাঁটি অভিজ্ঞতা নিয়ে এসেছে ${brandName}! ১০০% অথেনটিক এবং অরিজিনাল কসমেটিক্স এখন বিশেষ অফার মূল্যে।

🔥 রেগুলার প্রাইস: ৳${original}
💥 অফার প্রাইস: মাত্র ৳${offer}! ${savings > 0 ? `(৳${savings} সাশ্রয়)` : ''}
💯 ১০০% অরিজিনাল গ্যারান্টিড

🛍️ ঘরে বসে সরাসরি ওয়েবসাইট থেকে অর্ডার করুন:
👉 ${productUrl}

📞 কল অথবা হোয়াটসঅ্যাপে দ্রুত অর্ডার করতে যোগাযোগ করুন:
📱 01837223147

🚚 সারা বাংলাদেশে ক্যাশ অন হোম ডেলিভারি সুবিধা!

#LioraBeautyAndWear #Liora #AuthenticCosmetics #SkincareBD #CosmeticsBD #DiscountOffer #BeautyDealsBD`;
}

// Split title into 2 clean lines for banner
function formatBannerTitle(rawName) {
  const words = String(rawName || '').replace(/[()]/g, ' ').split(/\s+/).filter(Boolean);
  if (words.length <= 3) {
    return [words.join(' ').toUpperCase()];
  }
  const mid = Math.ceil(words.length / 2);
  return [
    words.slice(0, mid).join(' ').toUpperCase(),
    words.slice(mid, mid + 3).join(' ').toUpperCase()
  ];
}

// Extract volume (e.g. 220 ml, 100g, 50ml)
function extractVolume(name = '') {
  const match = name.match(/(\d+\s*(?:ml|g|gm|kg|oz|pcs|pack|tab|caps))/i);
  return match ? match[1].toLowerCase() : '';
}

// Generate HD Shajgoj Luxury Banner
async function generateProductBanner(product, customThemeKey = null) {
  const width = 1080;
  const height = 1080;

  const brandName = product.brand?.name || 'LIORA';
  const categoryName = product.category?.name || 'AUTHENTIC BEAUTY';
  const originalPrice = product.originalPrice || 0;
  const offerPrice = product.offerPrice || originalPrice;
  const saveAmount = Math.max(0, originalPrice - offerPrice);
  const volume = extractVolume(product.name);
  const themeKey = customThemeKey || pickSmartTheme(product.name, categoryName);
  const theme = THEMES[themeKey] || THEMES.teal;

  const imageUrl = product.image || (product.images && product.images[0]) || '';
  if (!imageUrl) {
    throw new Error(`Product "${product.name}" does not have an image.`);
  }

  // 1. Fetch & AI Background Removal & auto-grounding
  const rawProduct = await getProductBuffer(imageUrl);
  const trimmed = await cleanTransparentCutout(rawProduct);

  const maxHeroWidth = 470;
  const maxHeroHeight = 670;
  const floorY = 830;
  const centerX = 615;

  const { data: resizedBuffer, info: resizedInfo } = await sharp(trimmed)
    .resize({
      width: maxHeroWidth,
      height: maxHeroHeight,
      fit: 'inside',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .toBuffer({ resolveWithObject: true });

  const productTop = floorY - resizedInfo.height;
  const productLeft = Math.round(centerX - resizedInfo.width / 2);
  const shadowRadiusX = Math.round(resizedInfo.width * 0.48);
  const shadowRadiusY = 25;

  const titleLines = formatBannerTitle(product.name);
  const safeBrand = escapeXml(brandName);
  const safeCat = escapeXml(categoryName);
  const safeSub = escapeXml(product.name.slice(0, 32));
  const safeVolume = escapeXml(volume);
  const leftMargin = 75;

  const backgroundSvg = `
  <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="baseBg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${theme.bgDark}" />
        <stop offset="60%" stop-color="${theme.bgMid}" />
        <stop offset="100%" stop-color="${theme.bgDark}" />
      </linearGradient>

      <radialGradient id="spotlightGlow" cx="60%" cy="50%" r="58%">
        <stop offset="0%" stop-color="${theme.spotlight}" stop-opacity="${theme.glowOpacity}" />
        <stop offset="45%" stop-color="${theme.spotlight}" stop-opacity="0.38" />
        <stop offset="75%" stop-color="${theme.bgMid}" stop-opacity="0.12" />
        <stop offset="100%" stop-color="${theme.bgDark}" stop-opacity="0" />
      </radialGradient>

      <radialGradient id="pedestalShadow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#000000" stop-opacity="0.65" />
        <stop offset="35%" stop-color="#000000" stop-opacity="0.3" />
        <stop offset="100%" stop-color="#000000" stop-opacity="0" />
      </radialGradient>

      <filter id="boxShadow" x="-10%" y="-10%" width="120%" height="130%">
        <feDropShadow dx="0" dy="12" stdDeviation="18" flood-color="#000000" flood-opacity="0.5" />
      </filter>
    </defs>

    <rect width="${width}" height="${height}" fill="url(#baseBg)" />
    <rect width="${width}" height="${height}" fill="url(#spotlightGlow)" />
    <ellipse cx="${centerX}" cy="${floorY + 8}" rx="${shadowRadiusX}" ry="${shadowRadiusY}" fill="url(#pedestalShadow)" />

    <text x="${leftMargin}" y="190" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-weight="900" font-size="30" fill="#FFFFFF" letter-spacing="4">${safeBrand}</text>
    <line x1="${leftMargin}" y1="206" x2="${leftMargin + 45}" y2="206" stroke="${theme.accent}" stroke-width="3" stroke-linecap="round" />

    <text x="${leftMargin}" y="248" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-weight="800" font-size="13.5" fill="${theme.accent}" letter-spacing="2.5">${safeCat}</text>

    <text x="${leftMargin}" y="292" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-weight="900" font-size="34" fill="#FFFFFF" letter-spacing="0.5">${titleLines[0] || ''}</text>
    ${titleLines[1] ? `
    <text x="${leftMargin}" y="334" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-weight="900" font-size="34" fill="#FFFFFF" letter-spacing="0.5">${titleLines[1]}</text>
    ` : ''}

    <g transform="translate(${leftMargin}, ${titleLines[1] ? 390 : 350})" filter="url(#boxShadow)">
      <rect width="250" height="190" rx="16" fill="${theme.cardBg}" stroke="${theme.cardBorder}" stroke-width="1.8" />
      <line x1="55" y1="36" x2="195" y2="36" stroke="rgba(255,255,255,0.4)" stroke-width="1.5" />
      <text x="125" y="41" text-anchor="middle" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-weight="700" font-size="20" fill="rgba(255,255,255,0.7)" text-decoration="line-through">${originalPrice} TK</text>
      <text x="125" y="116" text-anchor="middle" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-weight="900" font-size="60" fill="#FFFFFF" letter-spacing="-1">${offerPrice}</text>
      <path d="M 0 140 Q 0 136 0 136 L 250 136 L 250 174 Q 250 190 234 190 L 16 190 Q 0 190 0 174 Z" fill="${theme.ribbon}" />
      <text x="125" y="169" text-anchor="middle" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-weight="900" font-size="15" fill="#FFFFFF" letter-spacing="1.5">SAVE ${saveAmount} TAKA</text>
    </g>

    <g transform="translate(${leftMargin}, ${titleLines[1] ? 615 : 575})">
      <text x="125" y="0" text-anchor="middle" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-weight="700" font-size="14.5" fill="rgba(255,255,255,0.9)">${safeSub}</text>
      ${volume ? `
      <rect x="85" y="16" width="80" height="26" rx="13" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.25)" stroke-width="1" />
      <text x="125" y="34" text-anchor="middle" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-weight="800" font-size="12" fill="#FFFFFF">${safeVolume}</text>
      ` : ''}
    </g>

    <g transform="translate(930, 480)" filter="url(#boxShadow)">
      <circle cx="0" cy="0" r="42" fill="${theme.ribbon}" />
      <text x="0" y="-6" text-anchor="middle" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-weight="900" font-size="13" fill="#FFFFFF">100%</text>
      <text x="0" y="12" text-anchor="middle" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-weight="800" font-size="10.5" fill="#FFFFFF" letter-spacing="1">ORIGINAL</text>
    </g>
  </svg>
  `;

  const bgBuffer = Buffer.from(backgroundSvg);

  return await sharp(bgBuffer)
    .composite([
      {
        input: resizedBuffer,
        top: productTop,
        left: productLeft
      }
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

  const blob = new Blob([imageBuffer], { type: 'image/png' });
  const formData = new FormData();
  formData.append('source', blob, 'promotion_banner.png');
  formData.append('caption', caption);
  formData.append('access_token', pageAccessToken);

  const res = await fetch(`https://graph.facebook.com/v20.0/${pageId}/photos`, {
    method: 'POST',
    body: formData
  });

  const data = await res.json();
  if (data.error) {
    throw new Error(data.error.message || 'Facebook Publishing Failed');
  }

  return {
    success: true,
    photoId: data.id,
    postId: data.post_id || data.id,
    postUrl: data.post_id ? `https://www.facebook.com/${data.post_id}` : `https://www.facebook.com/${data.id}`
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

  if (!products || products.length === 0) {
    throw new Error(`No products found for brand "${brandQuery}"`);
  }

  autoPilotJob = {
    isRunning: true,
    brandName: brandDoc?.name || brandQuery,
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
  startAutoPilot,
  stopAutoPilot,
  getAutoPilotStatus
};

