import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import sharp from 'sharp';
import { connectToDatabase } from '../lib/db.js';
import { Product } from '../lib/models.js';

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
  emerald: {
    bgStart: '#04231b', bgMid: '#064e3b', bgEnd: '#021611',
    glowColor: '#10b981', cardBorder: '#34d399', cardFill1: '#059669', cardFill2: '#047857',
    accentColor: '#34d399', accentBadge: '#059669'
  },
  rose: {
    bgStart: '#250714', bgMid: '#4c0f2b', bgEnd: '#15030b',
    glowColor: '#f43f5e', cardBorder: '#fb7185', cardFill1: '#e11d48', cardFill2: '#be123c',
    accentColor: '#fb7185', accentBadge: '#f43f5e'
  },
  royal: {
    bgStart: '#0e1133', bgMid: '#1a1f59', bgEnd: '#07091a',
    glowColor: '#6366f1', cardBorder: '#818cf8', cardFill1: '#4f46e5', cardFill2: '#3730a3',
    accentColor: '#818cf8', accentBadge: '#6366f1'
  },
  gold: {
    bgStart: '#201802', bgMid: '#423306', bgEnd: '#110c01',
    glowColor: '#f59e0b', cardBorder: '#fbbf24', cardFill1: '#d97706', cardFill2: '#b45309',
    accentColor: '#fbbf24', accentBadge: '#d97706'
  }
};

function pickTheme(name = '', category = '') {
  const text = `${name} ${category}`.toLowerCase();
  if (text.includes('gold') || text.includes('serum') || text.includes('ampoule') || text.includes('honey')) return THEMES.gold;
  if (text.includes('rose') || text.includes('lip') || text.includes('blush') || text.includes('strawberry')) return THEMES.rose;
  if (text.includes('green') || text.includes('tea') || text.includes('aloe') || text.includes('natural') || text.includes('rice') || text.includes('oil')) return THEMES.emerald;
  if (text.includes('cleanser') || text.includes('wash') || text.includes('aqua') || text.includes('sun') || text.includes('water') || text.includes('hydra') || text.includes('micellar')) return THEMES.teal;
  return THEMES.royal;
}

async function renderBannerForProduct(product) {
  const theme = pickTheme(product.name, product.category?.name);
  const brandName = (product.brand?.name || 'LIORA AUTHENTIC').toUpperCase();
  const catName = (product.category?.name || 'PREMIUM CARE').toUpperCase();
  const title = product.name || 'Authentic Premium Product';

  const price = product.offerPrice || product.originalPrice || product.price || 0;
  const origPrice = product.originalPrice && product.originalPrice > price ? product.originalPrice : Math.round(price * 1.35);
  const savings = Math.max(0, origPrice - price);
  const discountPercent = origPrice > price ? Math.round(((origPrice - price) / origPrice) * 100) : 25;

  let imgUrl = product.image;
  if (!imgUrl && Array.isArray(product.images) && product.images.length > 0) {
    imgUrl = product.images[0];
  }

  let resizedProd = null;
  let heroW = 560;
  let heroH = 560;
  let posX = Math.round((1080 - heroW) / 2);
  let posY = 290;

  if (imgUrl) {
    try {
      const rawBuf = await fetchBuffer(imgUrl);
      const prodMeta = await sharp(rawBuf).metadata();
      const rawW = prodMeta.width || 500;
      const rawH = prodMeta.height || 500;
      const aspect = rawW / rawH;

      const maxHeroH = 580;
      const maxHeroW = 600;

      if (aspect > 1) {
        heroW = Math.min(maxHeroW, 600);
        heroH = Math.round(heroW / aspect);
      } else {
        heroH = Math.min(maxHeroH, 580);
        heroW = Math.round(heroH * aspect);
      }

      posX = Math.round((1080 - heroW) / 2);
      posY = Math.round(300 + (570 - heroH) / 2);

      resizedProd = await sharp(rawBuf)
        .resize(heroW, heroH, { fit: 'inside' })
        .png()
        .toBuffer();
    } catch (err) {
      console.warn(`    ⚠️ Product image fetch error for ${product._id}:`, err.message);
    }
  }

  const cleanTitle = escapeXml(title);
  const words = cleanTitle.split(' ');
  let line1 = '';
  let line2 = '';
  for (const w of words) {
    if ((line1 + ' ' + w).trim().length <= 32 && !line2) {
      line1 = (line1 + ' ' + w).trim();
    } else {
      line2 = (line2 + ' ' + w).trim();
    }
  }
  if (line2.length > 36) {
    line2 = line2.slice(0, 33) + '...';
  }

  const svg = `
  <svg width="1080" height="1080" viewBox="0 0 1080 1080" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${theme.bgStart}" />
        <stop offset="50%" stop-color="${theme.bgMid}" />
        <stop offset="100%" stop-color="${theme.bgEnd}" />
      </linearGradient>

      <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="${theme.glowColor}" stop-opacity="0.38" />
        <stop offset="60%" stop-color="${theme.glowColor}" stop-opacity="0.12" />
        <stop offset="100%" stop-color="${theme.glowColor}" stop-opacity="0" />
      </radialGradient>

      <radialGradient id="podiumGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="${theme.glowColor}" stop-opacity="0.55" />
        <stop offset="45%" stop-color="${theme.glowColor}" stop-opacity="0.22" />
        <stop offset="100%" stop-color="${theme.glowColor}" stop-opacity="0" />
      </radialGradient>

      <linearGradient id="priceCardGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="${theme.cardFill1}" stop-opacity="0.96" />
        <stop offset="100%" stop-color="${theme.cardFill2}" stop-opacity="0.96" />
      </linearGradient>

      <filter id="heroShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="16" stdDeviation="22" flood-color="#000000" flood-opacity="0.7" />
      </filter>
    </defs>

    <rect width="1080" height="1080" fill="url(#bgGrad)" />
    <circle cx="540" cy="530" r="460" fill="url(#centerGlow)" />
    <ellipse cx="540" cy="855" rx="340" ry="40" fill="#000000" fill-opacity="0.65" filter="blur(16px)" />
    <ellipse cx="540" cy="848" rx="280" ry="24" fill="url(#podiumGlow)" />

    <g transform="translate(60, 55)">
      <g>
        <text x="0" y="32" font-family="Georgia, serif" font-weight="900" font-size="34" fill="#FFFFFF" letter-spacing="6">LIORA</text>
        <text x="145" y="32" font-family="Segoe UI, sans-serif" font-weight="800" font-size="14" fill="${theme.accentColor}" letter-spacing="3.5">BEAUTY &amp; WEAR</text>
      </g>
      <rect x="760" y="2" width="200" height="38" rx="19" fill="#FFFFFF" fill-opacity="0.12" stroke="${theme.accentColor}" stroke-width="1.5" />
      <circle cx="780" cy="21" r="5" fill="#22c55e" />
      <text x="795" y="26" font-family="Segoe UI, sans-serif" font-weight="800" font-size="13" fill="#FFFFFF" letter-spacing="1">100% ORIGINAL</text>
    </g>

    <g transform="translate(60, 140)">
      <text x="0" y="24" font-family="Segoe UI, sans-serif" font-weight="900" font-size="20" fill="${theme.accentColor}" letter-spacing="3">${escapeXml(brandName)}</text>
      <text x="0" y="70" font-family="Segoe UI, sans-serif" font-weight="900" font-size="38" fill="#FFFFFF">${line1}</text>
      ${line2 ? `
      <text x="0" y="116" font-family="Segoe UI, sans-serif" font-weight="800" font-size="32" fill="#FFFFFF" opacity="0.95">${line2}</text>
      ` : ''}
    </g>

    ${discountPercent > 0 ? `
    <g transform="translate(860, 135)" filter="url(#heroShadow)">
      <circle cx="55" cy="55" r="55" fill="#ef4444" stroke="#ffffff" stroke-width="3.5" />
      <text x="55" y="48" text-anchor="middle" font-family="Segoe UI, sans-serif" font-weight="900" font-size="30" fill="#FFFFFF">${discountPercent}%</text>
      <text x="55" y="74" text-anchor="middle" font-family="Segoe UI, sans-serif" font-weight="800" font-size="15" fill="#FFFFFF" letter-spacing="1">OFF</text>
    </g>
    ` : ''}

    <g transform="translate(60, 890)" filter="url(#heroShadow)">
      <rect width="960" height="135" rx="20" fill="url(#priceCardGrad)" stroke="${theme.cardBorder}" stroke-width="3" />

      <g transform="translate(35, 28)">
        <text x="0" y="20" font-family="Segoe UI, sans-serif" font-weight="700" font-size="14" fill="#FFFFFF" opacity="0.9" letter-spacing="1.5">SPECIAL OFFER PRICE</text>
        <text x="0" y="74" font-family="Segoe UI, sans-serif" font-weight="900" font-size="52" fill="#FFFFFF">৳${price.toLocaleString()}</text>
        ${origPrice > price ? `
        <text x="210" y="70" font-family="Segoe UI, sans-serif" font-weight="700" font-size="26" fill="#FFFFFF" opacity="0.65" text-decoration="line-through">৳${origPrice.toLocaleString()}</text>
        ` : ''}
      </g>

      ${savings > 0 ? `
      <g transform="translate(430, 42)">
        <rect width="190" height="50" rx="25" fill="#ffffff" fill-opacity="0.18" stroke="#ffffff" stroke-width="1.5" />
        <text x="95" y="32" text-anchor="middle" font-family="Segoe UI, sans-serif" font-weight="800" font-size="19" fill="#FFFFFF">৳${savings} সাশ্রয়!</text>
      </g>
      ` : ''}

      <g transform="translate(690, 36)">
        <rect width="235" height="62" rx="14" fill="#FFFFFF" />
        <text x="117" y="39" text-anchor="middle" font-family="Segoe UI, sans-serif" font-weight="900" font-size="20" fill="#020810" letter-spacing="1">ORDER NOW ❯</text>
      </g>
    </g>

    <g transform="translate(95, 1032)">
      <text x="0" y="16" font-family="Segoe UI, sans-serif" font-weight="800" font-size="14" fill="#94a3b8" letter-spacing="0.5">🚚 Cash on Delivery All Over Bangladesh</text>
      <text x="890" y="16" text-anchor="end" font-family="Segoe UI, sans-serif" font-weight="800" font-size="14" fill="${theme.accentColor}" letter-spacing="0.5">📱 01837223147 • liorabeautyandwear.com</text>
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
  const batchSize = parseInt(process.argv[2] || '30', 10);
  await connectToDatabase();

  const pubDir = path.resolve('client', 'public', 'banners');
  const scratchDir = path.resolve('client', 'scratch', 'banners');
  if (!fs.existsSync(pubDir)) fs.mkdirSync(pubDir, { recursive: true });
  if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });

  const existingBannerFiles = fs.readdirSync(pubDir).filter(f => f.startsWith('banner_') && f.endsWith('.png'));
  const doneIds = new Set(existingBannerFiles.map(f => f.replace('banner_', '').replace('.png', '')));
  console.log(`Currently completed banners on disk: ${doneIds.size}`);

  const nextProds = await Product.find({
    _id: { $nin: Array.from(doneIds) },
    inStock: true,
    stockStatus: { $ne: 'Out of Stock' },
    stockQuantity: { $gt: 0 },
    image: { $exists: true, $ne: '' }
  })
  .populate('category', 'name')
  .populate('brand', 'name')
  .sort({ isFeatured: -1, isTrending: -1, stockQuantity: -1 })
  .limit(batchSize)
  .lean();

  console.log(`Found ${nextProds.length} next in-stock products to process.`);
  if (nextProds.length === 0) {
    console.log('All in-stock products with valid images have been processed!');
    process.exit(0);
  }

  const generatedItems = [];

  for (let i = 0; i < nextProds.length; i++) {
    const p = nextProds[i];
    const pid = p._id.toString();
    const targetBannerFile = path.join(pubDir, `banner_${pid}.png`);
    const price = p.offerPrice || p.originalPrice || p.price || 0;
    const cleanName = p.name.replace(/"/g, "'").slice(0, 50);

    console.log(`[${i+1}/${nextProds.length}] Rendering: ${p.name.slice(0, 45)} (৳${price})`);
    
    try {
      const bannerBuffer = await renderBannerForProduct(p);
      fs.writeFileSync(targetBannerFile, bannerBuffer);
      fs.writeFileSync(path.join(pubDir, `${pid}.png`), bannerBuffer);
      fs.writeFileSync(path.join(scratchDir, `banner_${pid}.png`), bannerBuffer);
      generatedItems.push({ id: pid, name: cleanName, price });
      console.log(`  ✓ Saved banner_${pid}.png (${Math.round(bannerBuffer.length / 1024)} KB)`);
    } catch (err) {
      console.error(`  ✗ Failed for ${pid}:`, err.message);
    }
  }

  console.log(`\nSuccessfully rendered ${generatedItems.length} new banners!`);
  console.log(`Total ready banners now: ${doneIds.size + generatedItems.length}`);

  // Print the snippet to append to route.js
  console.log('\n--- CODE SNIPPET TO APPEND TO route.js ---');
  generatedItems.forEach(item => {
    console.log(`  "${item.id}", // ${item.name} (৳${item.price})`);
  });

  // Print the raw IDs
  console.log('\n--- RAW IDS FOR MARKETING & FB SERVICE ---');
  const rawIdLines = [];
  for (let i = 0; i < generatedItems.length; i += 5) {
    const chunk = generatedItems.slice(i, i + 5).map(it => `"${it.id}"`).join(', ');
    rawIdLines.push('  ' + chunk + (i + 5 < generatedItems.length ? ',' : ''));
  }
  console.log(rawIdLines.join('\n'));

  // Save batch metadata to a temp file so automated scripts can consume it
  fs.writeFileSync('client/scripts/last_batch.json', JSON.stringify({
    count: generatedItems.length,
    total: doneIds.size + generatedItems.length,
    items: generatedItems
  }, null, 2));

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
