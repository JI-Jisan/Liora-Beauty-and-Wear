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

// 5 Commercial 3D Studio Themes (11.11 Mega Sale Color-Matched Templates)
const THEMES = {
  blue: {
    key: 'blue',
    name: 'Blue Hydration 11.11',
    priceColor: '#002b80',
    accent: '#0047b3',
    template: 'template_3d_blue.png',
    podiumCx: 330,
    podiumTopY: 840,
  },
  pink: {
    key: 'pink',
    name: 'Blush Rose Glam 11.11',
    priceColor: '#831843',
    accent: '#be185d',
    template: 'template_3d_pink.png',
    podiumCx: 330,
    podiumTopY: 840,
  },
  gold: {
    key: 'gold',
    name: 'Golden Radiance 11.11',
    priceColor: '#78350f',
    accent: '#b45309',
    template: 'template_3d_gold.png',
    podiumCx: 330,
    podiumTopY: 840,
  },
  green: {
    key: 'green',
    name: 'Botanical Mint 11.11',
    priceColor: '#064e3b',
    accent: '#047857',
    template: 'template_3d_green.png',
    podiumCx: 330,
    podiumTopY: 840,
  },
  grey: {
    key: 'grey',
    name: 'Minimalist Obsidian 11.11',
    priceColor: '#0f172a',
    accent: '#1e293b',
    template: 'template_3d_grey.png',
    podiumCx: 330,
    podiumTopY: 840,
  },
  // Backward compatibility aliases
  teal: {
    key: 'blue',
    name: 'Blue Hydration 11.11',
    priceColor: '#002b80',
    accent: '#0047b3',
    template: 'template_3d_blue.png',
    podiumCx: 330,
    podiumTopY: 840,
  },
  rose: {
    key: 'pink',
    name: 'Blush Rose Glam 11.11',
    priceColor: '#831843',
    accent: '#be185d',
    template: 'template_3d_pink.png',
    podiumCx: 330,
    podiumTopY: 840,
  },
  emerald: {
    key: 'green',
    name: 'Botanical Mint 11.11',
    priceColor: '#064e3b',
    accent: '#047857',
    template: 'template_3d_green.png',
    podiumCx: 330,
    podiumTopY: 840,
  },
  navy: {
    key: 'grey',
    name: 'Minimalist Obsidian 11.11',
    priceColor: '#0f172a',
    accent: '#1e293b',
    template: 'template_3d_grey.png',
    podiumCx: 330,
    podiumTopY: 840,
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

function removeStudioBackground(data, width, height) {
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

  while (head < tail) {
    const p = queue[head++];
    const px = p % width;
    const py = Math.floor(p / width);
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

  for (let p = 0; p < width * height; p++) {
    if (visited[p]) {
      data[p * 4 + 3] = 0;
    }
  }
}

async function cleanTransparentCutout(buffer) {
  try {
    const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let alphaCount = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 120) alphaCount++;
    }
    if (alphaCount < data.length * 0.05) {
      removeStudioBackground(data, info.width, info.height);
    }
    return await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
      .trim({ threshold: 10 })
      .png()
      .toBuffer();
  } catch (err) {
    return buffer;
  }
}

// Smart theme detection based on product name / category
function pickSmartTheme(productName = '', categoryName = '') {
  const text = `${productName} ${categoryName}`.toLowerCase();
  if (/hair|shampoo|keratin|conditioner|scalp|oil|gold|honey|sun/i.test(text)) return 'gold';
  if (/rose|glow|bright|milk|berry|pink|whitening|face wash|lipstick|lip|blush|palette/i.test(text)) return 'pink';
  if (/shower|bath|gel|aqua|water|fresh|cool|body wash|hyaluron|cerave|cleanser/i.test(text)) return 'blue';
  if (/aloe|tea tree|cica|centella|botanical|green|herb|organic|dark spot/i.test(text)) return 'green';
  if (/men|charcoal|night|deep|black|ordinary|niacinamide|grey|obsidian/i.test(text)) return 'grey';
  return 'blue';
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

  const categoryName = product.category?.name || 'AUTHENTIC BEAUTY';

  let originalPrice = Number(product.originalPrice) || Number(product.price) || 0;
  let offerPrice = Number(product.offerPrice) || Number(product.salePrice) || originalPrice;
  if (originalPrice <= offerPrice) {
    originalPrice = Math.round(offerPrice * 1.3);
  }
  const saveAmount = Math.max(0, originalPrice - offerPrice);
  const discountPct = originalPrice > 0 ? Math.round((saveAmount / originalPrice) * 100) : 0;

  const themeKey = customThemeKey || pickSmartTheme(product.name, categoryName);
  const theme = THEMES[themeKey] || THEMES.blue;

  const imageUrl = product.image || (product.images && product.images[0]) || '';
  if (!imageUrl) {
    throw new Error(`Product "${product.name}" does not have an image.`);
  }

  // 1. Fetch Product Buffer
  const rawProduct = await getProductBuffer(imageUrl);
  const trimmed = await cleanTransparentCutout(rawProduct);

  const podiumCx = theme.podiumCx || 330;
  const podiumTopY = theme.podiumTopY || 840;

  const { data: resizedBuffer, info: resizedInfo } = await sharp(trimmed)
    .trim({ threshold: 10 })
    .resize({
      width: 380,
      height: 630,
      fit: 'inside',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .toBuffer({ resolveWithObject: true });

  const productTop = podiumTopY - resizedInfo.height + 15;
  const productLeft = Math.round(podiumCx - resizedInfo.width / 2);

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
        { input: resizedBuffer, top: productTop, left: productLeft }
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

