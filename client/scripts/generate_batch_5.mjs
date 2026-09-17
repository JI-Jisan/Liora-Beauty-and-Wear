import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import sharp from 'sharp';
import { connectToDatabase } from '../lib/db.js';
import { Product } from '../lib/models.js';

const done35Ids = [
  '6a9ab981c63dd531aa8db110', '6a9ab987c63dd531aa8db12a', '6a9ab77134ccee884a4b5cab', '6a9ab74b661657cb254c1bd5', '6a9aad6ae4955f357f776448',
  '6a8ae1ccdbc554e2928be214', '6a8e6c9d6d43fcfea47cad88', '6a8e6d7682271de00ebfa736', '6a8e6e13297e3906134a82f6', '6a8e6eafe9601eacddbf7dbb',
  '6a8e702551c7c127243ea1c1', '6a8e70f151c7c127243ea1c2', '6a8e723151c7c127243ea1c3', '6a8e72fa51c7c127243ea1c4', '6a8e757fc63423be0cf51d31',
  '6a9ab748661657cb254c1bd2', '6a9ab77434ccee884a4b5cae', '6a9ab75b661657cb254c1bdd', '6a9ab70979e75ff1fa1f8a47', '6a9abe31c63dd531aa8dc0b3',
  '6a9ac285c63dd531aa8dcd24', '6a9ac280c63dd531aa8dcd18', '6a9aba0cc63dd531aa8db330', '6a9abf47c63dd531aa8dc404', '6a9ac288c63dd531aa8dcd30',
  '6a9ab77734ccee884a4b5cb0', '6a9ab9f3c63dd531aa8db2dc', '6a9aba53c63dd531aa8db430', '6a9ac1bec63dd531aa8dcb1d', '6a9ac1bac63dd531aa8dcb15',
  '6a9ac11ac63dd531aa8dc96f', '6a9ac0bac63dd531aa8dc881', '6a9ac03bc63dd531aa8dc6e5', '6a9abff3c63dd531aa8dc5fb', '6a9abcf0c63dd531aa8dbc74'
];

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    if (!url) return reject(new Error('No URL'));
    const client = url.startsWith('https') ? https : http;
    client.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchBuffer(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to fetch image: status ${res.statusCode}`));
      }
      const data = [];
      res.on('data', (c) => data.push(c));
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

async function cleanCutout(buffer) {
  try {
    const { data, info } = await sharp(buffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const width = info.width;
    const height = info.height;
    const visited = new Uint8Array(width * height);
    const queue = new Int32Array(width * height);
    let head = 0;
    let tail = 0;

    function isBorderBg(idx) {
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];
      if (a < 50) return true;
      return r > 235 && g > 235 && b > 235;
    }

    for (let x = 0; x < width; x++) {
      if (isBorderBg(x * 4)) { visited[x] = 1; queue[tail++] = x; }
      const bIdx = (height - 1) * width + x;
      if (isBorderBg(bIdx * 4)) { visited[bIdx] = 1; queue[tail++] = bIdx; }
    }
    for (let y = 0; y < height; y++) {
      const lIdx = y * width;
      if (isBorderBg(lIdx * 4)) { visited[lIdx] = 1; queue[tail++] = lIdx; }
      const rIdx = y * width + (width - 1);
      if (isBorderBg(rIdx * 4)) { visited[rIdx] = 1; queue[tail++] = rIdx; }
    }

    while (head < tail) {
      const p = queue[head++];
      const px = p % width;
      const py = Math.floor(p / width);

      const n1 = px > 0 ? p - 1 : -1;
      const n2 = px < width - 1 ? p + 1 : -1;
      const n3 = py > 0 ? p - width : -1;
      const n4 = py < height - 1 ? p + width : -1;

      for (const n of [n1, n2, n3, n4]) {
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

    return await sharp(data, { raw: { width, height, channels: 4 } })
      .trim()
      .png()
      .toBuffer();
  } catch (err) {
    return sharp(buffer).trim().png().toBuffer();
  }
}

async function renderBannerForProduct(product) {
  const bannerSize = 1080;
  const productId = product._id.toString();
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

  let rawBuffer = null;
  const imgUrl = product.image || (product.images && product.images[0]);
  if (imgUrl) {
    try {
      rawBuffer = await fetchBuffer(imgUrl);
    } catch (e) {
      console.warn(`Could not fetch image for ${product.name}: ${e.message}`);
    }
  }

  let cutoutBuffer = null;
  if (rawBuffer) {
    cutoutBuffer = await cleanCutout(rawBuffer);
  }

  const theme = pickTheme(rawTitle, categoryName);

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

  return await bannerSharp.png().toBuffer();
}

async function main() {
  await connectToDatabase();

  const nextProds = await Product.find({
    _id: { $nin: done35Ids },
    inStock: true,
    stockStatus: { $ne: 'Out of Stock' },
    stockQuantity: { $gt: 0 },
    image: { $exists: true, $ne: '' }
  })
  .populate('category', 'name')
  .populate('brand', 'name')
  .sort({ isFeatured: -1, isTrending: -1, stockQuantity: -1 })
  .limit(15)
  .lean();

  console.log(`Found ${nextProds.length} new in-stock products for Batch 5.`);

  const pubDir = path.resolve('public', 'banners');
  const scratchDir = path.resolve('scratch', 'banners');
  if (!fs.existsSync(pubDir)) fs.mkdirSync(pubDir, { recursive: true });
  if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });

  const generatedIds = [];

  for (let i = 0; i < nextProds.length; i++) {
    const p = nextProds[i];
    const pid = p._id.toString();
    console.log(`[${i+1}/${nextProds.length}] Rendering: ${p.name.slice(0, 45)} (৳${p.offerPrice || p.originalPrice})`);
    
    try {
      const bannerBuffer = await renderBannerForProduct(p);
      fs.writeFileSync(path.join(pubDir, `banner_${pid}.png`), bannerBuffer);
      fs.writeFileSync(path.join(pubDir, `${pid}.png`), bannerBuffer);
      fs.writeFileSync(path.join(scratchDir, `banner_${pid}.png`), bannerBuffer);
      generatedIds.push(pid);
      console.log(`  ✓ Saved banner_${pid}.png (${Math.round(bannerBuffer.length / 1024)} KB)`);
    } catch (err) {
      console.error(`  ✗ Failed for ${pid}:`, err.message);
    }
  }

  console.log('\nGenerated Batch 5 IDs:');
  console.log(JSON.stringify(generatedIds, null, 2));

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
