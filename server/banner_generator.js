const sharp = require('sharp');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

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
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
    }
  });
}

async function generateProductBanner({
  name,
  originalPrice,
  offerPrice,
  imageUrl,
  outputPath
}) {
  const width = 1080;
  const height = 1080;
  const discountPercent = originalPrice > offerPrice
    ? Math.round(((originalPrice - offerPrice) / originalPrice) * 100)
    : 0;
  const saveAmount = Math.max(0, originalPrice - offerPrice);

  // 1. Fetch & resize product image
  const rawImageBuffer = await fetchBuffer(imageUrl);
  const productImgResized = await sharp(rawImageBuffer)
    .resize({
      width: 540,
      height: 540,
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .toBuffer();

  // Create subtle pedestal shadow under product
  const shadowSvg = `
    <svg width="460" height="70" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="shadowGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#0f172a" stop-opacity="0.18" />
          <stop offset="50%" stop-color="#0f172a" stop-opacity="0.08" />
          <stop offset="100%" stop-color="#0f172a" stop-opacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="230" cy="35" rx="220" ry="25" fill="url(#shadowGrad)" />
    </svg>
  `;
  const shadowBuffer = Buffer.from(shadowSvg);

  // 2. Main Plain Studio Background + UI Overlay SVG
  const safeName = escapeXml(name.length > 40 ? name.slice(0, 38) + '...' : name);
  const overlaySvg = `
  <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <style>
      .font-brand { font-family: 'Segoe UI', Helvetica, Arial, sans-serif; font-weight: 800; }
      .font-sub { font-family: 'Segoe UI', Helvetica, Arial, sans-serif; font-weight: 600; }
      .font-regular { font-family: 'Segoe UI', Helvetica, Arial, sans-serif; font-weight: 400; }
    </style>

    <defs>
      <!-- Very subtle, clean studio plain gradient -->
      <linearGradient id="plainBg" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#FFFFFF" />
        <stop offset="55%" stop-color="#FBFBFC" />
        <stop offset="100%" stop-color="#F3F4F6" />
      </linearGradient>

      <!-- Soft card drop shadow -->
      <filter id="cardShadow" x="-10%" y="-10%" width="120%" height="130%">
        <feDropShadow dx="0" dy="8" stdDeviation="16" flood-color="#0f172a" flood-opacity="0.08" />
      </filter>

      <linearGradient id="badgeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#E11D48" />
        <stop offset="100%" stop-color="#BE123C" />
      </linearGradient>

      <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#F59E0B" />
        <stop offset="100%" stop-color="#D97706" />
      </linearGradient>
    </defs>

    <!-- Plain Studio Backdrop -->
    <rect width="${width}" height="${height}" fill="url(#plainBg)" />

    <!-- Subtle framing border -->
    <rect x="24" y="24" width="1032" height="1032" rx="20" fill="none" stroke="#E2E8F0" stroke-width="2" />

    <!-- 1. Header Bar -->
    <!-- Brand Name -->
    <text x="56" y="80" class="font-brand" font-size="34" fill="#0F172A" letter-spacing="2">LIORA</text>
    <text x="175" y="78" class="font-sub" font-size="16" fill="#E11D48" letter-spacing="1.5">BEAUTY &amp; WEAR</text>
    <text x="56" y="104" class="font-sub" font-size="12" fill="#64748B" letter-spacing="0.5">AUTHENTIC SKINCARE &amp; COSMETICS</text>

    <!-- Authenticity Tag (Top Right) -->
    <g transform="translate(810, 52)">
      <rect width="210" height="38" rx="19" fill="#F1F5F9" stroke="#E2E8F0" stroke-width="1.2" />
      <circle cx="24" cy="19" r="6" fill="#10B981" />
      <text x="38" y="24" class="font-sub" font-size="12" fill="#334155" letter-spacing="0.5">100% ORIGINAL</text>
    </g>

    <!-- Discount Ribbon Badge (Prominent Top Right of Product) -->
    ${discountPercent > 0 ? `
    <g transform="translate(830, 180)" filter="url(#cardShadow)">
      <rect width="180" height="76" rx="14" fill="url(#badgeGrad)" />
      <text x="90" y="38" class="font-brand" font-size="28" fill="#FFFFFF" text-anchor="middle" letter-spacing="1">${discountPercent}% OFF</text>
      <text x="90" y="60" class="font-sub" font-size="14" fill="#FFE4E6" text-anchor="middle" letter-spacing="0.5">SAVE ৳${saveAmount}</text>
    </g>
    ` : ''}

    <!-- 2. Product Name & Title (Above Bottom Card) -->
    <text x="540" y="780" class="font-brand" font-size="32" fill="#0F172A" text-anchor="middle">${safeName}</text>

    <!-- 3. Bottom Floating Price Card (Pure Clean Focus) -->
    <g transform="translate(140, 815)" filter="url(#cardShadow)">
      <!-- Main Price Container Card -->
      <rect width="800" height="150" rx="24" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="1.5" />

      <!-- Left Column: Regular Price (Strikethrough) -->
      <g transform="translate(50, 42)">
        <text x="0" y="18" class="font-sub" font-size="16" fill="#64748B">রেগুলার মূল্য:</text>
        <text x="0" y="58" class="font-brand" font-size="34" fill="#94A3B8">৳${originalPrice}</text>
        <!-- Red Strike Line directly through the center of the price -->
        <line x1="-2" y1="47" x2="115" y2="47" stroke="#E11D48" stroke-width="3.5" stroke-linecap="round" />
      </g>

      <!-- Vertical Divider -->
      <line x1="260" y1="25" x2="260" y2="125" stroke="#E2E8F0" stroke-width="1.5" />

      <!-- Center Column: Special Offer Price (Huge Bold Focus) -->
      <g transform="translate(290, 42)">
        <text x="0" y="18" class="font-sub" font-size="16" fill="#E11D48">&#9733; অফার মূল্য (Offer Price):</text>
        <text x="0" y="66" class="font-brand" font-size="54" fill="#0F172A">৳${offerPrice}</text>
      </g>

      <!-- Right Column: Order CTA Button -->
      <g transform="translate(580, 48)">
        <rect width="180" height="56" rx="14" fill="url(#badgeGrad)" />
        <text x="90" y="35" class="font-brand" font-size="16" fill="#FFFFFF" text-anchor="middle" letter-spacing="0.5">অর্ডার করুন</text>
      </g>
    </g>

    <!-- 4. Footer Trust Line with clean bullet symbols -->
    <text x="540" y="1005" class="font-sub" font-size="15" fill="#475569" text-anchor="middle">
      [Cash on Delivery] ক্যাশ অন ডেলিভারি  &#8226;  Order Online: liorabeautyandwear.com  &#8226;  ইনবক্স করুন
    </text>
  </svg>
  `;

  // 3. Composite everything together
  const overlayBuffer = Buffer.from(overlaySvg);

  await sharp(overlayBuffer)
    .composite([
      // 1. Pedestal Shadow
      {
        input: shadowBuffer,
        top: 670,
        left: 310
      },
      // 2. Product Image
      {
        input: productImgResized,
        top: 175,
        left: 270
      }
    ])
    .png()
    .toFile(outputPath);

  console.log(`Banner successfully created at: ${outputPath}`);
}

// Generate sample banner for Skino Strawberry Shower Gel
const sampleProduct = {
  name: 'Skino Strawberry Shower Gel (220ml)',
  originalPrice: 250,
  offerPrice: 200,
  imageUrl: 'https://res.cloudinary.com/dlgubaefs/image/upload/v1787486510/bw1bfntspcmubpcqyuy5.png',
  outputPath: path.join(__dirname, 'sample_banner.png')
};

generateProductBanner(sampleProduct).catch(console.error);
