import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';

const uri = 'mongodb://jisan_trends:liora889@ac-2e905xv-shard-00-00.6nzddbx.mongodb.net:27017,ac-2e905xv-shard-00-01.6nzddbx.mongodb.net:27017,ac-2e905xv-shard-00-02.6nzddbx.mongodb.net:27017/jisantrends?ssl=true&replicaSet=atlas-12gikm-shard-0&authSource=admin&retryWrites=true&w=majority';

async function fetchBuffer(url) {
  const res = await fetch(url);
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}

function escapeXml(unsafe) {
  return String(unsafe || '').replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case "'": return '&apos;';
      case '"': return '&quot;';
    }
  });
}

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

async function run() {
  await mongoose.connect(uri);
  const Product = mongoose.models.Product || mongoose.model('Product', new mongoose.Schema({}, { strict: false }));
  const product = await Product.findOne({ name: /relief sun/i, offerPrice: { $gt: 0 } }).lean()
    || await Product.findOne({ name: /beauty of joseon/i, offerPrice: { $gt: 0 } }).lean()
    || await Product.findOne({ name: /snail/i, offerPrice: { $gt: 0 } }).lean();

  console.log('Testing with product:', product.name);
  console.log('Prices -> Offer:', product.offerPrice, 'MRP:', product.originalPrice);

  const templatePath = path.join(process.cwd(), 'client', 'public', 'banners', 'fb_templates', 'template_1111_burgundy.jpg');
  const bgBuffer = fs.readFileSync(templatePath);

  // Download product image
  console.log('Downloading product packshot:', product.image);
  let rawProduct = await fetchBuffer(product.image);

  // Trim & resize product
  const { data: resizedProduct, info: prodInfo } = await sharp(rawProduct)
    .trim({ threshold: 10 })
    .resize({ width: 440, height: 600, fit: 'inside' })
    .toBuffer({ resolveWithObject: true });

  const floorY = 880;
  const centerX = 680;
  const productTop = floorY - prodInfo.height;
  const productLeft = Math.round(centerX - prodInfo.width / 2);

  const brandName = product.brand?.name || (product.name.toLowerCase().includes('joseon') ? 'BEAUTY OF JOSEON' : 'LIORA BRAND');
  const categoryName = product.category?.name || 'KOREAN SKINCARE';
  const originalPrice = product.originalPrice || Math.round(product.offerPrice * 1.35);
  const offerPrice = product.offerPrice;
  const saveAmount = Math.max(0, originalPrice - offerPrice);
  const discountPct = Math.round(((originalPrice - offerPrice) / originalPrice) * 100);
  const titleLines = formatBannerTitle(product.name);

  const leftMargin = 65;

  const titleBlockHeight = titleLines.length * 30;
  const priceCardY = 270 + titleBlockHeight + 10;

  const overlaySvg = `
  <svg width="1080" height="1080" viewBox="0 0 1080 1080" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <!-- Shadow filter -->
      <filter id="shadowFilter" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="10" stdDeviation="16" flood-color="#000000" flood-opacity="0.6" />
      </filter>

      <!-- Floor drop shadow under product -->
      <radialGradient id="floorShadow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#000000" stop-opacity="0.85" />
        <stop offset="50%" stop-color="#000000" stop-opacity="0.35" />
        <stop offset="100%" stop-color="#000000" stop-opacity="0" />
      </radialGradient>

      <!-- Gold gradient -->
      <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#fef08a" />
        <stop offset="50%" stop-color="#eab308" />
        <stop offset="100%" stop-color="#ca8a04" />
      </linearGradient>

      <linearGradient id="badgeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#e11d48" />
        <stop offset="100%" stop-color="#9f1239" />
      </linearGradient>
    </defs>

    <!-- Top contact floor shadow -->
    <ellipse cx="${centerX}" cy="${floorY + 12}" rx="${Math.round(prodInfo.width * 0.46)}" ry="24" fill="url(#floorShadow)" />

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
      <text x="0" y="22" font-family="'Segoe UI', Roboto, sans-serif" font-weight="900" font-size="22" fill="#fef08a" letter-spacing="4">${escapeXml(brandName)}</text>
      <line x1="0" y1="32" x2="60" y2="32" stroke="#eab308" stroke-width="3" stroke-linecap="round" />
    </g>

    <!-- Category Pill -->
    <g transform="translate(${leftMargin}, 216)">
      <rect x="0" y="0" width="${categoryName.length * 8 + 24}" height="26" rx="13" fill="rgba(255,255,255,0.14)" stroke="rgba(255,255,255,0.25)" stroke-width="1" />
      <text x="12" y="17" font-family="'Segoe UI', Roboto, sans-serif" font-weight="700" font-size="11" fill="#ffffff" letter-spacing="1.5">${escapeXml(categoryName)}</text>
    </g>

    <!-- Product Title -->
    <g transform="translate(${leftMargin}, 275)" filter="url(#shadowFilter)">
      <text x="0" y="0" font-family="'Segoe UI', Roboto, sans-serif" font-weight="900" font-size="24" fill="#FFFFFF">${escapeXml(titleLines[0] || '')}</text>
      ${titleLines[1] ? `<text x="0" y="30" font-family="'Segoe UI', Roboto, sans-serif" font-weight="800" font-size="20" fill="rgba(255,255,255,0.9)">${escapeXml(titleLines[1])}</text>` : ''}
      ${titleLines[2] ? `<text x="0" y="58" font-family="'Segoe UI', Roboto, sans-serif" font-weight="700" font-size="16" fill="rgba(255,255,255,0.75)">${escapeXml(titleLines[2])}</text>` : ''}
    </g>

    <!-- 100% ACCURATE 11.11 PRICE CARD (GLASSMORPHISM CARD) -->
    <g transform="translate(${leftMargin}, ${priceCardY})" filter="url(#shadowFilter)">
      <rect width="280" height="205" rx="20" fill="rgba(20, 6, 12, 0.85)" stroke="rgba(244, 63, 94, 0.45)" stroke-width="2" />
      
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
    <g transform="translate(${leftMargin}, ${priceCardY + 225})">
      <rect x="0" y="0" width="280" height="40" rx="10" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.2)" stroke-width="1" />
      <text x="140" y="25" text-anchor="middle" font-family="'Segoe UI', Roboto, sans-serif" font-weight="800" font-size="12.5" fill="#ffffff">🚚 সারা দেশে হোম ডেলিভারি</text>
    </g>

    <g transform="translate(${leftMargin}, ${priceCardY + 275})">
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

  console.log('Compositing studio background, transparent packshot, and 11.11 vector overlay...');
  const finalBanner = await sharp(bgBuffer)
    .resize(1080, 1080)
    .composite([
      { input: resizedProduct, top: productTop, left: productLeft },
      { input: Buffer.from(overlaySvg), top: 0, left: 0 },
    ])
    .png({ quality: 95 })
    .toBuffer();

  const outPath = path.join(process.cwd(), 'client', 'scratch', 'test_1111_fb_banner.png');
  fs.writeFileSync(outPath, finalBanner);
  console.log('✅ Generated 11.11 FB banner saved to:', outPath);
  process.exit(0);
}

run().catch(console.error);
