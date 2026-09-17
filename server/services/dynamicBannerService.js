const sharp = require('sharp');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const Product = require('../models/Product');
require('../models/Category');
require('../models/Brand');

const bannersDir = path.join(__dirname, '..', 'uploads', 'banners');
const cutoutsDir = path.join(__dirname, '..', 'uploads', 'cutouts');

if (!fs.existsSync(bannersDir)) fs.mkdirSync(bannersDir, { recursive: true });
if (!fs.existsSync(cutoutsDir)) fs.mkdirSync(cutoutsDir, { recursive: true });

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    if (!url) return reject(new Error("No URL provided"));
    const client = url.startsWith('https') ? https : http;
    client.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchBuffer(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to fetch image: status ${res.statusCode}`));
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

// Color palettes tailored to product types
const THEMES = {
  teal: {
    bgStart: '#041f27', bgMid: '#063f4e', bgEnd: '#021319',
    glowColor: '#00b4d8', cardBorder: '#38bdf8', cardFill1: '#0284c7', cardFill2: '#0369a1',
    accentColor: '#38bdf8', accentBadge: '#0284c7'
  },
  rose: {
    bgStart: '#260412', bgMid: '#4c0824', bgEnd: '#130209',
    glowColor: '#f43f5e', cardBorder: '#fb7185', cardFill1: '#e11d48', cardFill2: '#be123c',
    accentColor: '#fb7185', accentBadge: '#e11d48'
  },
  emerald: {
    bgStart: '#021e14', bgMid: '#064e3b', bgEnd: '#010f0a',
    glowColor: '#10b981', cardBorder: '#34d399', cardFill1: '#059669', cardFill2: '#047857',
    accentColor: '#34d399', accentBadge: '#059669'
  },
  gold: {
    bgStart: '#211502', bgMid: '#452b04', bgEnd: '#110a01',
    glowColor: '#f59e0b', cardBorder: '#fbbf24', cardFill1: '#d97706', cardFill2: '#b45309',
    accentColor: '#fbbf24', accentBadge: '#d97706'
  },
  navy: {
    bgStart: '#080d1a', bgMid: '#14203d', bgEnd: '#04070d',
    glowColor: '#3b82f6', cardBorder: '#60a5fa', cardFill1: '#2563eb', cardFill2: '#1d4ed8',
    accentColor: '#60a5fa', accentBadge: '#2563eb'
  }
};

function pickTheme(productName = '', categoryName = '') {
  const text = `${productName} ${categoryName}`.toLowerCase();
  if (/hair|shampoo|keratin|conditioner|scalp|cucumber|herbal/i.test(text)) return THEMES.emerald;
  if (/rose|glow|strawberry|pink|lipstick|lip|blush|berry/i.test(text)) return THEMES.rose;
  if (/shower|bath|gel|cleanser|fresh|aqua|water|aloe|hyaluron|face wash/i.test(text)) return THEMES.teal;
  if (/gold|serum|vitamin|retinol|anti.?aging|sun|sunscreen|pore/i.test(text)) return THEMES.gold;
  return THEMES.navy;
}

function cleanCutout(buffer) {
  return sharp(buffer)
    .ensureAlpha()
    .trim()
    .png()
    .toBuffer();
}

/**
 * Generates and saves banner for a product ID.
 * Returns { bannerPath, buffer }
 */
async function regenerateBannerForProduct(productId) {
  const product = await Product.findById(productId)
    .populate('category', 'name')
    .populate('brand', 'name')
    .lean();

  if (!product) {
    throw new Error(`Product not found with ID: ${productId}`);
  }

  const bannerSize = 1080;
  const brandName = product.brand?.name || 'LIORA';
  const categoryName = product.category?.name || 'BEAUTY CARE';
  const rawTitle = product.name || 'Liora Authentic Product';

  const offerPrice = Number(product.offerPrice) || Number(product.originalPrice) || 0;
  const regularPrice = Number(product.originalPrice) || Math.round(offerPrice * 1.35);
  const savePrice = Math.max(0, regularPrice - offerPrice);
  const discountPercent = regularPrice > offerPrice
    ? Math.round(((regularPrice - offerPrice) / regularPrice) * 100)
    : 0;

  const discountPill = discountPercent > 0 ? `${discountPercent}% OFF DISCOUNT` : 'SPECIAL OFFER';

  // 1. Check or extract Cutout
  const cutoutPath = path.join(cutoutsDir, `${productId}.png`);
  let cutoutBuffer = null;

  if (fs.existsSync(cutoutPath)) {
    cutoutBuffer = fs.readFileSync(cutoutPath);
  } else {
    // Check if client scratch directory has it
    const clientScratchCutout = path.join(__dirname, '..', '..', 'client', 'scratch', 'banners', `banner_${productId}.png`);
    const imageUrl = product.image || (product.images && product.images[0]);
    if (imageUrl) {
      try {
        let rawBuffer = null;
        // If cloudinary, check e_background_removal
        if (imageUrl.includes('/upload/') && !imageUrl.includes('/e_background_removal/')) {
          const cldBgRemoved = imageUrl.replace('/upload/', '/upload/e_background_removal/').replace(/\.(jpg|jpeg|webp)$/i, '.png');
          try {
            rawBuffer = await fetchBuffer(cldBgRemoved);
          } catch (cldErr) {
            rawBuffer = await fetchBuffer(imageUrl);
          }
        } else {
          rawBuffer = await fetchBuffer(imageUrl);
        }
        cutoutBuffer = await cleanCutout(rawBuffer);
        fs.writeFileSync(cutoutPath, cutoutBuffer);
      } catch (err) {
        console.warn(`Could not process cutout for ${productId}:`, err.message);
      }
    }
  }

  const theme = pickTheme(rawTitle, categoryName);

  // Resize product inside 540x780
  const maxW = 540;
  const maxH = 780;
  let resizedProd = null;
  let resizedInfo = { width: 500, height: 700 };

  if (cutoutBuffer) {
    const res = await sharp(cutoutBuffer)
      .resize({ width: maxW, height: maxH, fit: 'inside', kernel: 'lanczos3' })
      .toBuffer({ resolveWithObject: true });
    resizedProd = res.data;
    resizedInfo = res.info;
  }

  const posX = Math.round((bannerSize - resizedInfo.width) / 2);
  const posY = Math.round(180 + (maxH - resizedInfo.height) / 2);
  const shadowY = posY + resizedInfo.height - 12;
  const prodWidth = resizedInfo.width;

  const svg = `
  <svg width="${bannerSize}" height="${bannerSize}" viewBox="0 0 ${bannerSize} ${bannerSize}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg_${productId}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${theme.bgStart}" />
        <stop offset="50%" stop-color="${theme.bgMid}" />
        <stop offset="100%" stop-color="${theme.bgEnd}" />
      </linearGradient>

      <radialGradient id="glow_${productId}" cx="50%" cy="50%" r="55%">
        <stop offset="0%" stop-color="${theme.glowColor}" stop-opacity="0.30" />
        <stop offset="50%" stop-color="${theme.glowColor}" stop-opacity="0.08" />
        <stop offset="100%" stop-color="${theme.bgEnd}" stop-opacity="0" />
      </radialGradient>

      <radialGradient id="sh_${productId}" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#000000" stop-opacity="0.9" />
        <stop offset="45%" stop-color="#000000" stop-opacity="0.45" />
        <stop offset="100%" stop-color="#000000" stop-opacity="0" />
      </radialGradient>

      <linearGradient id="cg_${productId}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${theme.cardFill1}" />
        <stop offset="100%" stop-color="${theme.cardFill2}" />
      </linearGradient>

      <filter id="bglow_${productId}" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="8" stdDeviation="14" flood-color="${theme.glowColor}" flood-opacity="0.35" />
      </filter>
    </defs>

    <rect width="${bannerSize}" height="${bannerSize}" fill="url(#bg_${productId})" />
    <rect width="${bannerSize}" height="${bannerSize}" fill="url(#glow_${productId})" />

    <!-- Top Header -->
    <g transform="translate(${bannerSize/2}, 55)" text-anchor="middle">
      <text x="0" y="24" font-family="Segoe UI, sans-serif" font-weight="800" font-size="30" fill="#FFFFFF" letter-spacing="8">LIORA</text>
      <text x="0" y="46" font-family="Segoe UI, sans-serif" font-weight="700" font-size="12" fill="${theme.accentColor}" letter-spacing="5">BEAUTY &amp; WEAR</text>
      <line x1="-120" y1="56" x2="120" y2="56" stroke="${theme.accentColor}" stroke-opacity="0.4" stroke-width="1.5" />
    </g>

    <!-- Top Badges -->
    <g transform="translate(80, 75)">
      <rect x="0" y="0" width="160" height="34" rx="17" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.2)" stroke-width="1.2" />
      <text x="80" y="22" text-anchor="middle" font-family="Segoe UI, sans-serif" font-weight="800" font-size="12" fill="${theme.accentColor}" letter-spacing="1.5">★ 100% ORIGINAL</text>
    </g>

    <g transform="translate(840, 75)">
      <rect x="0" y="0" width="160" height="34" rx="17" fill="${theme.accentBadge}" />
      <text x="80" y="22" text-anchor="middle" font-family="Segoe UI, sans-serif" font-weight="800" font-size="12" fill="#FFFFFF" letter-spacing="1">SAVE ৳ ${savePrice} TK</text>
    </g>

    <!-- Subtitle -->
    <g transform="translate(${bannerSize/2}, 160)" text-anchor="middle">
      <text x="0" y="0" font-family="Segoe UI, sans-serif" font-weight="900" font-size="15" fill="${theme.accentColor}" letter-spacing="4">${escapeXml(brandName)} • ${escapeXml(categoryName.toUpperCase())}</text>
    </g>

    <!-- Floor Shadow -->
    <ellipse cx="${bannerSize/2}" cy="${shadowY + 18}" rx="${Math.round(prodWidth * 0.46)}" ry="22" fill="url(#sh_${productId})" />
    <ellipse cx="${bannerSize/2}" cy="${shadowY + 20}" rx="${Math.round(prodWidth * 0.65)}" ry="13" fill="url(#sh_${productId})" opacity="0.6" />

    <!-- Left High-Contrast Price Card -->
    <g transform="translate(65, 440)" filter="url(#bglow_${productId})">
      <rect width="215" height="162" rx="20" fill="url(#cg_${productId})" stroke="${theme.cardBorder}" stroke-width="2.5" />
      
      <rect x="18" y="14" width="179" height="26" rx="13" fill="#ef4444" />
      <text x="107" y="32" text-anchor="middle" font-family="Segoe UI, sans-serif" font-weight="900" font-size="12" fill="#FFFFFF" letter-spacing="1.2">★ ${escapeXml(discountPill)}</text>
      
      <text x="107" y="66" text-anchor="middle" font-family="Segoe UI, sans-serif" font-weight="700" font-size="15" fill="rgba(255,255,255,0.85)">
        REGULAR <tspan text-decoration="line-through">৳ ${regularPrice}</tspan>
      </text>

      <text x="107" y="123" text-anchor="middle" font-family="Segoe UI, sans-serif" font-weight="900" font-size="52" fill="#FFFFFF" letter-spacing="-1">৳ ${offerPrice}</text>
      
      <text x="107" y="148" text-anchor="middle" font-family="Segoe UI, sans-serif" font-weight="800" font-size="11" fill="rgba(255,255,255,0.9)" letter-spacing="1">SPECIAL OFFER PRICE</text>
    </g>

    <!-- Right Feature Badge -->
    <g transform="translate(805, 455)">
      <rect width="210" height="145" rx="18" fill="rgba(15,23,42,0.88)" stroke="rgba(255,255,255,0.15)" stroke-width="1.5" />
      <text x="105" y="36" text-anchor="middle" font-family="Segoe UI, sans-serif" font-weight="800" font-size="12" fill="${theme.accentColor}">✦ AUTHENTIC CARE</text>
      <text x="105" y="74" text-anchor="middle" font-family="Segoe UI, sans-serif" font-weight="900" font-size="13" fill="#FFFFFF">LIMITED STOCK OFFER</text>
      <text x="105" y="112" text-anchor="middle" font-family="Segoe UI, sans-serif" font-weight="800" font-size="12" fill="rgba(255,255,255,0.75)">BEST PRICE GUARANTEE</text>
    </g>

    <!-- Footer -->
    <g transform="translate(80, 990)">
      <rect x="0" y="0" width="920" height="52" rx="14" fill="rgba(0,0,0,0.65)" stroke="rgba(255,255,255,0.12)" stroke-width="1" />
      <text x="35" y="32" font-family="Segoe UI, sans-serif" font-weight="800" font-size="15" fill="#FFFFFF">🚚 Cash on Delivery All Over Bangladesh</text>
      <text x="885" y="32" text-anchor="end" font-family="Segoe UI, sans-serif" font-weight="800" font-size="15" fill="${theme.accentColor}">📱 01837223147 • liorabeautyandwear.com</text>
    </g>
  </svg>
  `;

  let bannerSharp = sharp(Buffer.from(svg));
  if (resizedProd) {
    bannerSharp = bannerSharp.composite([
      {
        input: resizedProd,
        top: posY,
        left: posX
      }
    ]);
  }

  const bannerBuffer = await bannerSharp.png().toBuffer();
  const bannerFile = path.join(bannersDir, `${productId}.png`);
  fs.writeFileSync(bannerFile, bannerBuffer);

  // Also sync to client scratch banners if available
  const clientBannersDir = path.join(__dirname, '..', '..', 'client', 'scratch', 'banners');
  if (fs.existsSync(clientBannersDir)) {
    fs.writeFileSync(path.join(clientBannersDir, `banner_${productId}.png`), bannerBuffer);
  }

  console.log(`[DynamicBannerService] Successfully generated live banner for ${productId} (${rawTitle}) at ৳${offerPrice}`);
  return { bannerPath: bannerFile, buffer: bannerBuffer };
}

module.exports = {
  regenerateBannerForProduct,
  getBannerFilePath: (productId) => path.join(bannersDir, `${productId}.png`)
};
