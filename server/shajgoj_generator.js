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
    // replace extension with .png to preserve alpha transparency
    const withPng = url.replace(/\.(jpg|jpeg|webp)$/i, '.png');
    return withPng.replace('/upload/', '/upload/e_background_removal/');
  }
  return url;
}

async function getProductBuffer(imageUrl) {
  try {
    const bgRemovedUrl = getBgRemovedUrl(imageUrl);
    console.log(`Fetching AI Background-Removed cutout: ${bgRemovedUrl}`);
    return await fetchBuffer(bgRemovedUrl);
  } catch (err) {
    console.warn('Fallback to original image buffer:', err.message);
    return await fetchBuffer(imageUrl);
  }
}

// 5 Luxury Spotlight Themes (Shajgoj style with dynamic variety)
const THEMES = {
  teal: {
    bgDark: '#041f27',
    bgMid: '#063f4e',
    spotlight: '#00b4d8',
    glowOpacity: 0.85,
    accent: '#38bdf8',
    ribbon: '#ff1493', // hot pink
    cardBg: 'rgba(3, 31, 39, 0.75)',
    cardBorder: 'rgba(56, 189, 248, 0.35)',
  },
  rose: {
    bgDark: '#260412',
    bgMid: '#4c0824',
    spotlight: '#f43f5e',
    glowOpacity: 0.8,
    accent: '#fb7185',
    ribbon: '#f59e0b', // warm gold
    cardBg: 'rgba(38, 4, 18, 0.75)',
    cardBorder: 'rgba(251, 113, 133, 0.35)',
  },
  emerald: {
    bgDark: '#021e14',
    bgMid: '#064e3b',
    spotlight: '#10b981',
    glowOpacity: 0.85,
    accent: '#34d399',
    ribbon: '#f43f5e', // coral pink
    cardBg: 'rgba(2, 30, 20, 0.75)',
    cardBorder: 'rgba(52, 211, 153, 0.35)',
  },
  navy: {
    bgDark: '#080d1a',
    bgMid: '#14203d',
    spotlight: '#3b82f6',
    glowOpacity: 0.85,
    accent: '#60a5fa',
    ribbon: '#ec4899', // pink
    cardBg: 'rgba(8, 13, 26, 0.75)',
    cardBorder: 'rgba(96, 165, 250, 0.35)',
  },
  amber: {
    bgDark: '#211103',
    bgMid: '#4a2608',
    spotlight: '#f59e0b',
    glowOpacity: 0.8,
    accent: '#fbbf24',
    ribbon: '#e11d48', // crimson
    cardBg: 'rgba(33, 17, 3, 0.75)',
    cardBorder: 'rgba(251, 191, 36, 0.35)',
  }
};

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

async function generateShajgojStyleBanner({
  brand = 'LIORA',
  category = 'BATH & BODY CARE',
  title = 'STRAWBERRY\nSHOWER GEL',
  subtitle = 'Skino Strawberry Scented Gel',
  volume = '220 ml',
  originalPrice = 250,
  offerPrice = 200,
  badgeText = 'SPECIAL\nOFFER',
  themeKey = 'teal',
  imageUrl,
  outputPath
}) {
  const width = 1080;
  const height = 1080;
  const theme = THEMES[themeKey] || THEMES.teal;
  const saveAmount = Math.max(0, originalPrice - offerPrice);

  // 1. Fetch & prepare product image (with AI Background Removal & auto-grounding)
  const rawProduct = await getProductBuffer(imageUrl);
  
  // Clean transparent edges and trim margins to get true product bounds
  const trimmed = await cleanTransparentCutout(rawProduct);
  
  // Target dimensions for hero product placement (shifted towards center)
  const maxHeroWidth = 470;
  const maxHeroHeight = 670;
  const floorY = 830; // Exact ground level
  const centerX = 615; // Centered hero product focus

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

  // 2. SVG Studio Spotlight Background & Typography
  const titleLines = String(title).split('\n').map(escapeXml);
  const safeBrand = escapeXml(brand);
  const safeCat = escapeXml(category);
  const safeSub = escapeXml(subtitle);
  const safeVolume = escapeXml(volume);

  const leftMargin = 75;

  const backgroundSvg = `
  <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <!-- Base Deep Studio Gradient -->
      <linearGradient id="baseBg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${theme.bgDark}" />
        <stop offset="60%" stop-color="${theme.bgMid}" />
        <stop offset="100%" stop-color="${theme.bgDark}" />
      </linearGradient>

      <!-- Center-Right Spotlight Radial Glow behind hero products -->
      <radialGradient id="spotlightGlow" cx="60%" cy="50%" r="58%">
        <stop offset="0%" stop-color="${theme.spotlight}" stop-opacity="${theme.glowOpacity}" />
        <stop offset="45%" stop-color="${theme.spotlight}" stop-opacity="0.38" />
        <stop offset="75%" stop-color="${theme.bgMid}" stop-opacity="0.12" />
        <stop offset="100%" stop-color="${theme.bgDark}" stop-opacity="0" />
      </radialGradient>

      <!-- Floor/Pedestal Ellipse Shadow directly under product base -->
      <radialGradient id="pedestalShadow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#000000" stop-opacity="0.65" />
        <stop offset="35%" stop-color="#000000" stop-opacity="0.3" />
        <stop offset="100%" stop-color="#000000" stop-opacity="0" />
      </radialGradient>

      <!-- Card Shadow -->
      <filter id="boxShadow" x="-10%" y="-10%" width="120%" height="130%">
        <feDropShadow dx="0" dy="12" stdDeviation="18" flood-color="#000000" flood-opacity="0.5" />
      </filter>
    </defs>

    <!-- 1. Background Fill -->
    <rect width="${width}" height="${height}" fill="url(#baseBg)" />
    <!-- 2. Spotlight Glow -->
    <rect width="${width}" height="${height}" fill="url(#spotlightGlow)" />

    <!-- 3. Dynamic Floor Shadow directly under product -->
    <ellipse cx="${centerX}" cy="${floorY + 8}" rx="${shadowRadiusX}" ry="${shadowRadiusY}" fill="url(#pedestalShadow)" />

    <!-- 4. Top-Left Brand Logo -->
    <text x="${leftMargin}" y="190" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-weight="900" font-size="30" fill="#FFFFFF" letter-spacing="4">${safeBrand}</text>
    <line x1="${leftMargin}" y1="206" x2="${leftMargin + 45}" y2="206" stroke="${theme.accent}" stroke-width="3" stroke-linecap="round" />

    <!-- 5. Category Pill/Subtitle -->
    <text x="${leftMargin}" y="248" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-weight="800" font-size="13.5" fill="${theme.accent}" letter-spacing="2.5">${safeCat}</text>

    <!-- 6. Bold Hero Titles -->
    <text x="${leftMargin}" y="292" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-weight="900" font-size="34" fill="#FFFFFF" letter-spacing="0.5">${titleLines[0] || ''}</text>
    ${titleLines[1] ? `
    <text x="${leftMargin}" y="334" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-weight="900" font-size="34" fill="#FFFFFF" letter-spacing="0.5">${titleLines[1]}</text>
    ` : ''}

    <!-- 7. SHAJGOJ SIGNATURE PRICE BOX -->
    <g transform="translate(${leftMargin}, ${titleLines[1] ? 390 : 350})" filter="url(#boxShadow)">
      <!-- Main Outer Card -->
      <rect width="250" height="190" rx="16" fill="${theme.cardBg}" stroke="${theme.cardBorder}" stroke-width="1.8" />

      <!-- Top cut price display: ~~250 TK~~ -->
      <line x1="55" y1="36" x2="195" y2="36" stroke="rgba(255,255,255,0.4)" stroke-width="1.5" />
      <text x="125" y="41" text-anchor="middle" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-weight="700" font-size="20" fill="rgba(255,255,255,0.7)" text-decoration="line-through">${originalPrice} TK</text>

      <!-- Bold Massive Offer Price: 200 -->
      <text x="125" y="116" text-anchor="middle" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-weight="900" font-size="60" fill="#FFFFFF" letter-spacing="-1">${offerPrice}</text>

      <!-- Bottom SAVE Strip Badge -->
      <path d="M 0 140 Q 0 136 0 136 L 250 136 L 250 174 Q 250 190 234 190 L 16 190 Q 0 190 0 174 Z" fill="${theme.ribbon}" />
      <text x="125" y="169" text-anchor="middle" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-weight="900" font-size="15" fill="#FFFFFF" letter-spacing="1.5">SAVE ${saveAmount} TAKA</text>
    </g>

    <!-- 8. Product Specific Subtitle / Volume under Card -->
    <g transform="translate(${leftMargin}, ${titleLines[1] ? 615 : 575})">
      <text x="125" y="0" text-anchor="middle" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-weight="700" font-size="14.5" fill="rgba(255,255,255,0.9)">${safeSub}</text>
      ${volume ? `
      <!-- Volume Pill -->
      <rect x="85" y="16" width="80" height="26" rx="13" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.25)" stroke-width="1" />
      <text x="125" y="34" text-anchor="middle" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-weight="800" font-size="12" fill="#FFFFFF">${safeVolume}</text>
      ` : ''}
    </g>

    <!-- 9. 100% Authentic Circular Badge floating on right -->
    <g transform="translate(930, 480)" filter="url(#boxShadow)">
      <circle cx="0" cy="0" r="42" fill="${theme.ribbon}" />
      <text x="0" y="-6" text-anchor="middle" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-weight="900" font-size="13" fill="#FFFFFF">100%</text>
      <text x="0" y="12" text-anchor="middle" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-weight="800" font-size="10.5" fill="#FFFFFF" letter-spacing="1">ORIGINAL</text>
    </g>
  </svg>
  `;

  const bgBuffer = Buffer.from(backgroundSvg);

  // Composite: Background SVG + Product Image on right seamlessly on floor
  await sharp(bgBuffer)
    .composite([
      {
        input: resizedBuffer,
        top: productTop,
        left: productLeft
      }
    ])
    .png()
    .toFile(outputPath);

  console.log(`Created Shajgoj-style banner [Theme: ${themeKey}]: ${outputPath}`);
}

async function run() {
  await generateShajgojStyleBanner({
    brand: 'LIORA',
    category: 'BATH & BODY CARE',
    title: 'STRAWBERRY\nSHOWER GEL',
    subtitle: 'Skino Strawberry Scented Gel',
    volume: '220 ml',
    originalPrice: 250,
    offerPrice: 200,
    themeKey: 'teal',
    imageUrl: 'https://res.cloudinary.com/dlgubaefs/image/upload/v1787486510/bw1bfntspcmubpcqyuy5.png',
    outputPath: path.join(__dirname, 'shajgoj_teal.png')
  });
}

module.exports = {
  generateShajgojStyleBanner,
  THEMES
};

if (require.main === module) {
  run().catch(console.error);
}

