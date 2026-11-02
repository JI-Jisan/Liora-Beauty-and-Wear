import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

// Master themes definition
export const STUDIO_THEMES = {
  blue: {
    key: 'blue',
    name: 'Blue Hydration',
    bgTop: '#d8eeff',
    bgMid: '#b2dcfe',
    bgBottom: '#74b6fd',
    accent: '#0047b3',
    cardBorder: '#0284c7',
    badgeHue: 0,
    priceColor: '#002b80',
    subText: '#003399',
  },
  pink: {
    key: 'pink',
    name: 'Blush Rose Glam',
    bgTop: '#ffeaf0',
    bgMid: '#fcbad2',
    bgBottom: '#f17fa9',
    accent: '#be185d',
    cardBorder: '#ec4899',
    badgeHue: 285,
    priceColor: '#831843',
    subText: '#9d174d',
  },
  gold: {
    key: 'gold',
    name: 'Golden Radiance',
    bgTop: '#fffbeb',
    bgMid: '#fde57c',
    bgBottom: '#f59e0b',
    accent: '#b45309',
    cardBorder: '#d97706',
    badgeHue: 175,
    priceColor: '#78350f',
    subText: '#92400e',
  },
  green: {
    key: 'green',
    name: 'Botanical Mint',
    bgTop: '#eefdf4',
    bgMid: '#bbf7d0',
    bgBottom: '#34d399',
    accent: '#047857',
    cardBorder: '#10b981',
    badgeHue: 115,
    priceColor: '#064e3b',
    subText: '#065f46',
  },
  grey: {
    key: 'grey',
    name: 'Minimalist Obsidian',
    bgTop: '#f8fafc',
    bgMid: '#e2e8f0',
    bgBottom: '#94a3b8',
    accent: '#1e293b',
    cardBorder: '#475569',
    badgeHue: 0,
    desaturate: true,
    priceColor: '#0f172a',
    subText: '#1e293b',
  },
};

export async function buildStudioBaseTemplate(themeKey) {
  const theme = STUDIO_THEMES[themeKey] || STUDIO_THEMES.blue;
  const width = 1080;
  const height = 1080;

  // 1. Process 3D Badge (speckle already cleaned)
  const badgeRaw = fs.readFileSync('scratch/badge_3d_transparent.png');
  let badgeSharp = sharp(badgeRaw).resize(410);
  if (theme.desaturate) {
    badgeSharp = badgeSharp.modulate({ saturation: 0.05, brightness: 0.95 });
  } else if (theme.badgeHue) {
    badgeSharp = badgeSharp.modulate({ hue: theme.badgeHue });
  }
  const badgeBuffer = await badgeSharp.png().toBuffer();

  // 2. Process Leaf
  const leafRaw = fs.readFileSync('scratch/real_foreground_leaf.png');
  const leafBuffer = await sharp(leafRaw).resize(200).toBuffer();

  // 3. SVG Base Layer: Studio lighting, podium, branding, price card shell, icons, CTA
  const baseSvg = `
  <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <!-- Studio Lighting Radial & Linear Gradients -->
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="${theme.bgTop}" />
        <stop offset="42%" stop-color="${theme.bgMid}" />
        <stop offset="100%" stop-color="${theme.bgBottom}" />
      </linearGradient>

      <radialGradient id="podiumGlow" cx="30%" cy="62%" r="48%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.9" />
        <stop offset="50%" stop-color="${theme.bgTop}" stop-opacity="0.45" />
        <stop offset="100%" stop-color="${theme.bgBottom}" stop-opacity="0" />
      </radialGradient>

      <!-- 3D White Cylindrical Podium Gradients -->
      <linearGradient id="podiumTopGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#ffffff" />
        <stop offset="65%" stop-color="#f8fafc" />
        <stop offset="100%" stop-color="#e2e8f0" />
      </linearGradient>

      <linearGradient id="podiumBodyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#e2e8f0" />
        <stop offset="45%" stop-color="#cbd5e1" />
        <stop offset="100%" stop-color="#94a3b8" />
      </linearGradient>

      <!-- Floor Drop Shadows -->
      <radialGradient id="podiumFloorShadow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#0f172a" stop-opacity="0.38" />
        <stop offset="50%" stop-color="#0f172a" stop-opacity="0.15" />
        <stop offset="100%" stop-color="#0f172a" stop-opacity="0" />
      </radialGradient>

      <!-- Card Shadow Filter -->
      <filter id="cardShadow" x="-15%" y="-15%" width="130%" height="130%">
        <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#0f172a" flood-opacity="0.12" />
      </filter>
    </defs>

    <!-- 1. STUDIO LIGHTING BACKGROUND -->
    <rect width="${width}" height="${height}" fill="url(#bgGrad)" />
    <rect width="${width}" height="${height}" fill="url(#podiumGlow)" />

    <!-- 2. TOP OFFICIAL BRANDING -->
    <g transform="translate(540, 52)" text-anchor="middle">
      <line x1="-240" y1="20" x2="-155" y2="20" stroke="#94a3b8" stroke-width="1.2" />
      <text x="0" y="24" font-family="'Segoe UI', Roboto, Helvetica, sans-serif" font-weight="900" font-size="28" fill="#1e293b">
        <tspan fill="#e11d48">🌸 LIORA</tspan> BEAUTY &amp; WEAR
      </text>
      <text x="0" y="46" font-family="'Segoe UI', Roboto, Helvetica, sans-serif" font-weight="600" font-size="14" fill="#64748b" letter-spacing="2.5">liorabeautyandwear.com</text>
      <line x1="155" y1="20" x2="240" y2="20" stroke="#94a3b8" stroke-width="1.2" />
    </g>

    <!-- 3. 3D CLEAN WHITE CYLINDRICAL PODIUM (CX: 330, CY: 840) -->
    <!-- Floor Shadow -->
    <ellipse cx="330" cy="918" rx="260" ry="36" fill="url(#podiumFloorShadow)" />

    <!-- Podium Body Cylinder -->
    <path d="M 120 840 
             L 120 885 
             A 210 38 0 0 0 540 885 
             L 540 840 Z" 
          fill="url(#podiumBodyGrad)" />

    <!-- Podium Top Surface -->
    <ellipse cx="330" cy="840" rx="210" ry="38" fill="url(#podiumTopGrad)" stroke="#ffffff" stroke-width="2.5" />

    <!-- 4. RIGHT-HAND PRICE CARD SHELL (Y: 525) -->
    <g transform="translate(605, 525)" filter="url(#cardShadow)">
      <!-- Main White Rounded Card Body -->
      <rect x="0" y="30" width="410" height="175" rx="30" fill="#ffffff" stroke="${theme.cardBorder}" stroke-width="3" />
      
      <!-- Speed burst rays on the right of the card -->
      <g stroke="${theme.cardBorder}" stroke-width="4" stroke-linecap="round">
        <line x1="422" y1="75" x2="444" y2="65" />
        <line x1="426" y1="115" x2="454" y2="115" />
        <line x1="422" y1="155" x2="444" y2="165" />
      </g>

      <!-- 'Offer Price' Pill Badge centered above card -->
      <g transform="translate(205, 0)">
        <rect x="-140" y="0" width="280" height="52" rx="26" fill="${theme.accent}" stroke="#ffffff" stroke-width="3" />
        <text x="0" y="36" text-anchor="middle" font-family="'Segoe UI', Roboto, sans-serif" font-weight="900" font-size="28" fill="#ffffff" letter-spacing="1">Offer Price</text>
      </g>
    </g>

    <!-- 5. THREE BENEFIT ICONS (MINIMALIST LINE ICONS) -->
    <g transform="translate(605, 770)">
      <!-- Item 1: Droplet -->
      <g transform="translate(55, 25)" text-anchor="middle">
        <path d="M 0 -18 Q -16 6 0 16 Q 16 6 0 -18 Z" fill="none" stroke="${theme.accent}" stroke-width="2.5" stroke-linejoin="round" />
        <text x="0" y="38" font-family="'Segoe UI', Roboto, sans-serif" font-weight="800" font-size="13" fill="${theme.priceColor}">100% আসল</text>
        <text x="0" y="55" font-family="'Segoe UI', Roboto, sans-serif" font-weight="600" font-size="11.5" fill="#475569">অথেনটিক প্রোডাক্ট</text>
      </g>

      <line x1="135" y1="0" x2="135" y2="75" stroke="${theme.accent}" stroke-width="1.8" />

      <!-- Item 2: Shield with checkmark -->
      <g transform="translate(205, 25)" text-anchor="middle">
        <path d="M -15 -14 L 15 -14 L 15 2 Q 15 16 0 20 Q -15 16 -15 2 Z" fill="none" stroke="${theme.accent}" stroke-width="2.5" stroke-linejoin="round" />
        <path d="M -7 1 L -2 6 L 8 -4" fill="none" stroke="${theme.accent}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
        <text x="0" y="38" font-family="'Segoe UI', Roboto, sans-serif" font-weight="800" font-size="13" fill="${theme.priceColor}">হোম ডেলিভারি</text>
        <text x="0" y="55" font-family="'Segoe UI', Roboto, sans-serif" font-weight="600" font-size="11.5" fill="#475569">সারা বাংলাদেশে</text>
      </g>

      <line x1="275" y1="0" x2="275" y2="75" stroke="${theme.accent}" stroke-width="1.8" />

      <!-- Item 3: Feather / Leaf -->
      <g transform="translate(355, 25)" text-anchor="middle">
        <path d="M 12 -16 Q -14 -6 -10 16 Q -2 16 12 -16 Z" fill="none" stroke="${theme.accent}" stroke-width="2.5" />
        <line x1="-10" y1="16" x2="6" y2="-8" stroke="${theme.accent}" stroke-width="2" />
        <text x="0" y="38" font-family="'Segoe UI', Roboto, sans-serif" font-weight="800" font-size="13" fill="${theme.priceColor}">ক্যাশ অন ডেলিভারি</text>
        <text x="0" y="55" font-family="'Segoe UI', Roboto, sans-serif" font-weight="600" font-size="11.5" fill="#475569">চেক করে পেমেন্ট</text>
      </g>
    </g>

    <!-- 6. BOTTOM CONTACT CTA BAR -->
    <g transform="translate(580, 940)">
      <rect x="0" y="0" width="460" height="54" rx="27" fill="#ffffff" stroke="${theme.accent}" stroke-width="2.5" />
      <text x="230" y="34" text-anchor="middle" font-family="'Segoe UI', Roboto, sans-serif" font-weight="800" font-size="15" fill="${theme.priceColor}">
        🛒 অর্ডার করতে পেইজে ইনবক্স / কল করুন: <tspan font-weight="900" fill="#e11d48">01837223147</tspan>
      </text>
    </g>
  </svg>
  `;

  // Composite: Base SVG + 3D Badge + Leaf (bottom-left)
  const fullTemplate = await sharp(Buffer.from(baseSvg))
    .composite([
      {
        input: badgeBuffer,
        top: 110,
        left: 605,
      },
      {
        input: leafBuffer,
        top: 770,
        left: 0,
      },
    ])
    .png({ quality: 95 })
    .toBuffer();

  return fullTemplate;
}

// Background Removal for studio packshots
function removeBorderBackground(data, width, height) {
  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0;
  let tail = 0;

  function isBg(idx) {
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
    if (!visited[x] && isBg(topIdx)) { visited[x] = 1; queue[tail++] = x; }
    const botP = (height - 1) * width + x;
    if (!visited[botP] && isBg(botIdx)) { visited[botP] = 1; queue[tail++] = botP; }
  }

  for (let y = 0; y < height; y++) {
    const leftP = y * width;
    const rightP = y * width + (width - 1);
    if (!visited[leftP] && isBg(leftP * 4)) { visited[leftP] = 1; queue[tail++] = leftP; }
    if (!visited[rightP] && isBg(rightP * 4)) { visited[rightP] = 1; queue[tail++] = rightP; }
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
      if (n !== -1 && !visited[n] && isBg(n * 4)) {
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

export async function cleanProductCutout(buffer) {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  removeBorderBackground(data, info.width, info.height);
  return await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .trim({ threshold: 10 })
    .png()
    .toBuffer();
}

export async function renderCompleteCommercialBanner(templateBuffer, product, themeKey) {
  const theme = STUDIO_THEMES[themeKey] || STUDIO_THEMES.blue;

  // 1. Process Product Packshot
  const res = await fetch(product.image);
  const rawBuf = Buffer.from(await res.arrayBuffer());
  const cutout = await cleanProductCutout(rawBuf);

  // Resize product packshot to fit naturally on the podium
  const { data: resizedProd, info: prodInfo } = await sharp(cutout)
    .resize({ width: 380, height: 630, fit: 'inside' })
    .toBuffer({ resolveWithObject: true });

  const podiumCx = 330;
  const podiumTopY = 840;
  const productTop = podiumTopY - prodInfo.height + 15;
  const productLeft = Math.round(podiumCx - prodInfo.width / 2);

  const originalPrice = Number(product.originalPrice) || 0;
  const offerPrice = Number(product.offerPrice) || originalPrice;
  const saveAmount = Math.max(0, originalPrice - offerPrice);
  const discountPct = originalPrice > 0 ? Math.round((saveAmount / originalPrice) * 100) : 0;

  // 2. Dynamic Typography Overlay
  const overlaySvg = `
  <svg width="1080" height="1080" viewBox="0 0 1080 1080" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <!-- Contact Shadow directly under product on podium -->
      <radialGradient id="productContactShadow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#0f172a" stop-opacity="0.45" />
        <stop offset="60%" stop-color="#0f172a" stop-opacity="0.15" />
        <stop offset="100%" stop-color="#0f172a" stop-opacity="0" />
      </radialGradient>
    </defs>

    <!-- Product Contact Shadow on Podium Surface -->
    <ellipse cx="${podiumCx}" cy="${podiumTopY + 3}" rx="${Math.round(prodInfo.width * 0.44)}" ry="16" fill="url(#productContactShadow)" />

    <!-- 1. REGULAR PRICE SECTION (Y: 420 - 475) -->
    <g transform="translate(810, 420)" text-anchor="middle">
      <text x="0" y="0" font-family="'Segoe UI', Roboto, sans-serif" font-weight="800" font-size="25" fill="#334155">Regular Price</text>
      <!-- Strikethrough Price with sharp red diagonal line -->
      <g transform="translate(0, 46)">
        <text x="0" y="0" font-family="'Segoe UI', Roboto, sans-serif" font-weight="900" font-size="46" fill="#1e293b">৳ ${originalPrice.toLocaleString('en-IN')}</text>
        <line x1="-80" y1="4" x2="80" y2="-22" stroke="#ef4444" stroke-width="4.5" stroke-linecap="round" />
      </g>
    </g>

    <!-- 2. OFFER PRICE INSIDE THE WHITE CARD (Y: 642 - 685) -->
    <g transform="translate(810, 642)" text-anchor="middle">
      <!-- Huge bold offer price -->
      <text x="0" y="0" font-family="'Segoe UI', Roboto, sans-serif" font-weight="900" font-size="82" fill="${theme.priceColor}" letter-spacing="-2">৳ ${offerPrice.toLocaleString('en-IN')}</text>

      <!-- Save badge ribbon -->
      <g transform="translate(0, 36)">
        <rect x="-115" y="-15" width="230" height="30" rx="15" fill="#ef4444" />
        <text x="0" y="5" font-family="'Segoe UI', Roboto, sans-serif" font-weight="800" font-size="13" fill="#ffffff" letter-spacing="1">SAVE ৳${saveAmount} (-${discountPct}%)</text>
      </g>
    </g>
  </svg>
  `;

  // 3. Final Composite: Template + Dynamic Text/Shadows + Product
  const finalBanner = await sharp(templateBuffer)
    .composite([
      { input: Buffer.from(overlaySvg), top: 0, left: 0 },
      { input: resizedProd, top: productTop, left: productLeft }
    ])
    .png({ quality: 95 })
    .toBuffer();

  return finalBanner;
}

async function runTest() {
  console.log('Generating perfected 11.11 commercial banners...');

  const clientTplDir = path.join(process.cwd(), 'public', 'banners', 'fb_templates');
  const serverTplDir = path.join(process.cwd(), '..', 'server', 'public', 'banners', 'fb_templates');
  if (!fs.existsSync(clientTplDir)) fs.mkdirSync(clientTplDir, { recursive: true });
  if (!fs.existsSync(serverTplDir)) fs.mkdirSync(serverTplDir, { recursive: true });

  const templates = {};
  for (const key of Object.keys(STUDIO_THEMES)) {
    console.log(`Building base template for: ${key}...`);
    const tpl = await buildStudioBaseTemplate(key);
    templates[key] = tpl;
    fs.writeFileSync(path.join(clientTplDir, `template_3d_${key}.png`), tpl);
    fs.writeFileSync(path.join(serverTplDir, `template_3d_${key}.png`), tpl);
  }

  // 1. Blue Theme: CeraVe Blemish Control Cleanser
  console.log('Rendering CeraVe on Blue Hydration Theme...');
  const ceraveBanner = await renderCompleteCommercialBanner(templates.blue, {
    name: 'CeraVe Blemish Control Cleanser 236ml',
    originalPrice: 3500,
    offerPrice: 2090,
    image: 'https://www.ogerio.com/wp-content/uploads/2025/12/CeraVe-Blemish-Control-Cleanser-236ml.png'
  }, 'blue');
  fs.writeFileSync('scratch/sample_cerave_blue.png', ceraveBanner);
  fs.writeFileSync('C:/Users/atiku/.gemini/antigravity-ide/brain/91e248ab-72d7-46b9-8684-326ea8b3ad3a/sample_cerave_blue.png', ceraveBanner);

  // 2. Green Theme: AXIS-Y Dark Spot Correcting Glow Serum
  console.log('Rendering AXIS-Y on Botanical Mint Theme...');
  const axisBanner = await renderCompleteCommercialBanner(templates.green, {
    name: 'AXIS-Y Dark Spot Correcting Glow Serum – 50ml',
    originalPrice: 1650,
    offerPrice: 1050,
    image: 'https://www.ogerio.com/wp-content/uploads/2023/09/photo_2023-09-23_16-00-05.jpg'
  }, 'green');
  fs.writeFileSync('scratch/sample_axisy_green.png', axisBanner);
  fs.writeFileSync('C:/Users/atiku/.gemini/antigravity-ide/brain/91e248ab-72d7-46b9-8684-326ea8b3ad3a/sample_axisy_green.png', axisBanner);

  // 3. Grey Theme: The Ordinary Niacinamide Serum
  console.log('Rendering The Ordinary on Minimalist Obsidian Theme...');
  const ordBanner = await renderCompleteCommercialBanner(templates.grey, {
    name: 'The Ordinary Niacinamide Serum 10%+Zinc1% – 30ml',
    originalPrice: 1650,
    offerPrice: 1100,
    image: 'https://www.ogerio.com/wp-content/uploads/2022/12/The-Ordinary-Niacinamide-10Zinc1-Serum-30ml.jpg'
  }, 'grey');
  fs.writeFileSync('scratch/sample_ordinary_grey.png', ordBanner);
  fs.writeFileSync('C:/Users/atiku/.gemini/antigravity-ide/brain/91e248ab-72d7-46b9-8684-326ea8b3ad3a/sample_ordinary_grey.png', ordBanner);

  console.log('🎉 All sample banners rendered successfully!');
}

runTest().catch(console.error);
