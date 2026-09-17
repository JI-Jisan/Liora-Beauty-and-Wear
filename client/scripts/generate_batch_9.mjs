import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import sharp from 'sharp';
import { connectToDatabase } from '../lib/db.js';
import { Product } from '../lib/models.js';

const done120Ids = [
  "6a9ab981c63dd531aa8db110", "6a9ab987c63dd531aa8db12a", "6a9ab77134ccee884a4b5cab", "6a9ab74b661657cb254c1bd5", "6a9aad6ae4955f357f776448",
  "6a8ae1ccdbc554e2928be214", "6a8e6c9d6d43fcfea47cad88", "6a8e6d7682271de00ebfa736", "6a8e6e13297e3906134a82f6", "6a8e6eafe9601eacddbf7dbb",
  "6a8e702551c7c127243ea1c1", "6a8e70f151c7c127243ea1c2", "6a8e723151c7c127243ea1c3", "6a8e72fa51c7c127243ea1c4", "6a8e757fc63423be0cf51d31",
  "6a9ab748661657cb254c1bd2", "6a9ab77434ccee884a4b5cae", "6a9ab75b661657cb254c1bdd", "6a9ab70979e75ff1fa1f8a47", "6a9abe31c63dd531aa8dc0b3",
  "6a9ac285c63dd531aa8dcd24", "6a9ac280c63dd531aa8dcd18", "6a9aba0cc63dd531aa8db330", "6a9abf47c63dd531aa8dc404", "6a9ac288c63dd531aa8dcd30",
  "6a9ab77734ccee884a4b5cb0", "6a9ab9f3c63dd531aa8db2dc", "6a9aba53c63dd531aa8db430", "6a9ac1bec63dd531aa8dcb1d", "6a9ac1bac63dd531aa8dcb15",
  "6a9ac11ac63dd531aa8dc96f", "6a9ac0bac63dd531aa8dc881", "6a9ac03bc63dd531aa8dc6e5", "6a9abff3c63dd531aa8dc5fb", "6a9abcf0c63dd531aa8dbc74",
  "6aa2ffd70d2b8add7c6efbd0", "6a9ab97dc63dd531aa8db0f6", "6a9ab97fc63dd531aa8db100", "6a9ab97fc63dd531aa8db104", "6a9ab97ec63dd531aa8db0fd",
  "6a9ab97bc63dd531aa8db0f4", "6a9ab97fc63dd531aa8db101", "6a9ab982c63dd531aa8db114", "6a9ab97ec63dd531aa8db0f9", "6a9ab97fc63dd531aa8db107",
  "6a9ab980c63dd531aa8db109", "6a9ab982c63dd531aa8db119", "6a9ab982c63dd531aa8db118", "6a9ab97ec63dd531aa8db0fc", "6a9ab980c63dd531aa8db10c",
  "6a9ab989c63dd531aa8db13d", "6a9ab987c63dd531aa8db12b", "6a9ab983c63dd531aa8db11c", "6a9ab989c63dd531aa8db13c", "6a9ab988c63dd531aa8db132",
  "6a9ab986c63dd531aa8db126", "6a9ab989c63dd531aa8db141", "6a9ab98ac63dd531aa8db143", "6a9ab987c63dd531aa8db130", "6a9ab984c63dd531aa8db11e",
  "6a9ab988c63dd531aa8db138", "6a9ab988c63dd531aa8db133", "6a9ab985c63dd531aa8db124", "6a9ab989c63dd531aa8db13b", "6a9ab980c63dd531aa8db10d",
  "6a9ab98cc63dd531aa8db14b", "6a9ab98ac63dd531aa8db148", "6a9ab987c63dd531aa8db129", "6a9ab985c63dd531aa8db121", "6a9ab988c63dd531aa8db137",
  "6a9ab996c63dd531aa8db16e", "6a9ab991c63dd531aa8db15b", "6a9ab997c63dd531aa8db173", "6a9ab996c63dd531aa8db167", "6a9ab992c63dd531aa8db15e",
  "6a9ab990c63dd531aa8db156", "6a9ab98ec63dd531aa8db14e", "6a9ab997c63dd531aa8db171", "6a9ab992c63dd531aa8db15d", "6a9ab98ec63dd531aa8db150",
  "6a9ab996c63dd531aa8db166", "6a9ab993c63dd531aa8db161", "6a9ab990c63dd531aa8db155", "6a9ab996c63dd531aa8db16d", "6a9ab98ec63dd531aa8db14d",
  "6a9ab999c63dd531aa8db17a", "6a9ab998c63dd531aa8db178", "6a9ab990c63dd531aa8db157", "6a9ab98fc63dd531aa8db153", "6a9ab993c63dd531aa8db164",
  "6a9ab9a1c63dd531aa8db1a2", "6a9ab9a3c63dd531aa8db1aa", "6a9ab99dc63dd531aa8db18a", "6a9ab9a0c63dd531aa8db19b", "6a9ab9a4c63dd531aa8db1b3",
  "6a9ab99cc63dd531aa8db186", "6a9ab9a1c63dd531aa8db1a6", "6a9ab999c63dd531aa8db17b", "6a9ab9a3c63dd531aa8db1ae", "6a9ab99ec63dd531aa8db18e",
  "6a9ab9a0c63dd531aa8db19a", "6a9ab9a5c63dd531aa8db1bc", "6a9ab99cc63dd531aa8db183", "6a9ab9a0c63dd531aa8db19f", "6a9ab9a8c63dd531aa8db1c0",
  "6a9ab9a1c63dd531aa8db1a3", "6a9ab99cc63dd531aa8db188", "6a9ab9a2c63dd531aa8db1a8", "6a9ab9a8c63dd531aa8db1c1", "6a9ab9a3c63dd531aa8db1ab",
  "6a9ab99ec63dd531aa8db18d", "6a9ab9a3c63dd531aa8db1b0", "6a9ab999c63dd531aa8db17e", "6a9ab9a4c63dd531aa8db1b5", "6a9ab99ec63dd531aa8db192",
  "6a9ab9a9c63dd531aa8db1c6", "6a9ab9a8c63dd531aa8db1c4", "6a9ab999c63dd531aa8db180", "6a9ab99fc63dd531aa8db196", "6a9ab9a7c63dd531aa8db1be"
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
  emerald: {
    bgStart: '#04231b', bgMid: '#064e3b', bgEnd: '#021611',
    glowColor: '#10b981', cardBorder: '#34d399', cardFill1: '#059669', cardFill2: '#047857',
    accentColor: '#34d399', accentBadge: '#059669'
  },
  purple: {
    bgStart: '#1d0b30', bgMid: '#3b1764', bgEnd: '#11051d',
    glowColor: '#a855f7', cardBorder: '#c084fc', cardFill1: '#9333ea', cardFill2: '#7e22ce',
    accentColor: '#c084fc', accentBadge: '#9333ea'
  },
  rose: {
    bgStart: '#2c0b17', bgMid: '#5c1730', bgEnd: '#1a050d',
    glowColor: '#f43f5e', cardBorder: '#fb7185', cardFill1: '#e11d48', cardFill2: '#be123c',
    accentColor: '#fb7185', accentBadge: '#e11d48'
  },
  amber: {
    bgStart: '#2b1a04', bgMid: '#593407', bgEnd: '#180e02',
    glowColor: '#f59e0b', cardBorder: '#fbbf24', cardFill1: '#d97706', cardFill2: '#b45309',
    accentColor: '#fbbf24', accentBadge: '#d97706'
  }
};

function pickSmartTheme(product) {
  const cat = (product.category?.name || product.category || '').toString().toLowerCase();
  const name = (product.name || '').toLowerCase();

  if (cat.includes('bath') || cat.includes('body') || name.includes('shower') || name.includes('shampoo')) {
    return THEMES.teal;
  }
  if (cat.includes('skin') || cat.includes('serum') || cat.includes('acne') || name.includes('tea tree') || name.includes('cica') || name.includes('cleanser')) {
    return THEMES.emerald;
  }
  if (cat.includes('lip') || cat.includes('lipstick') || cat.includes('tint') || cat.includes('blush') || name.includes('red') || name.includes('berry') || name.includes('rose')) {
    return THEMES.rose;
  }
  if (cat.includes('eye') || cat.includes('kajal') || cat.includes('glam') || name.includes('gold') || name.includes('toner') || name.includes('essence')) {
    return THEMES.amber;
  }
  return THEMES.purple;
}

async function renderBannerForProduct(product) {
  const theme = pickSmartTheme(product);
  const brandName = escapeXml((product.brand?.name || product.brand || 'Liora Exclusive').toString().toUpperCase());
  
  const rawName = (product.name || 'Premium Product').trim();
  const prodTitle = escapeXml(rawName.length > 58 ? rawName.slice(0, 56) + '…' : rawName);

  const price = Number(product.offerPrice || product.price || 0);
  const origPrice = Number(product.originalPrice || 0);
  let discountPercent = 0;
  if (origPrice > price && origPrice > 0) {
    discountPercent = Math.round(((origPrice - price) / origPrice) * 100);
  }
  const savings = origPrice > price ? origPrice - price : 0;

  let prodImg = null;
  let resizedProd = null;
  let posX = 160;
  let posY = 150;

  if (product.image) {
    try {
      const rawBuf = await fetchBuffer(product.image);
      const trimmed = await sharp(rawBuf)
        .trim({ threshold: 12 })
        .toBuffer();

      const fitted = await sharp(trimmed)
        .resize(780, 780, { fit: 'inside', withoutEnlargement: false })
        .png()
        .toBuffer();

      const meta = await sharp(fitted).metadata();
      posX = Math.round((1080 - meta.width) / 2);
      posY = Math.round((950 - meta.height) / 2) + 20;
      resizedProd = fitted;
    } catch (err) {
      console.warn(`Could not process image for ${product.name}:`, err.message);
    }
  }

  const svg = `
  <svg width="1080" height="1080" viewBox="0 0 1080 1080" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="studioGlow" cx="50%" cy="46%" r="58%">
        <stop offset="0%" stop-color="${theme.glowColor}" stop-opacity="0.32" />
        <stop offset="60%" stop-color="${theme.bgMid}" stop-opacity="0.85" />
        <stop offset="100%" stop-color="${theme.bgEnd}" stop-opacity="1" />
      </radialGradient>
      
      <linearGradient id="headerGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#020810" stop-opacity="0.95" />
        <stop offset="100%" stop-color="#020810" stop-opacity="0" />
      </linearGradient>

      <linearGradient id="priceCardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${theme.cardFill1}" />
        <stop offset="100%" stop-color="${theme.cardFill2}" />
      </linearGradient>

      <filter id="heroShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="25" stdDeviation="35" flood-color="#000000" flood-opacity="0.8" />
        <feDropShadow dx="0" dy="10" stdDeviation="15" flood-color="${theme.glowColor}" flood-opacity="0.3" />
      </filter>

      <filter id="pillShadow" x="-10%" y="-20%" width="120%" height="150%">
        <feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#000000" flood-opacity="0.6" />
      </filter>
    </defs>

    <rect width="1080" height="1080" fill="${theme.bgStart}" />
    <rect width="1080" height="1080" fill="url(#studioGlow)" />

    <ellipse cx="540" cy="830" rx="360" ry="60" fill="#000000" opacity="0.55" filter="blur(20px)" />
    <ellipse cx="540" cy="820" rx="280" ry="30" fill="${theme.glowColor}" opacity="0.25" filter="blur(15px)" />

    <rect width="1080" height="170" fill="url(#headerGrad)" />

    <g transform="translate(60, 48)">
      <rect width="210" height="38" rx="8" fill="#FFFFFF" fill-opacity="0.12" stroke="#FFFFFF" stroke-opacity="0.25" stroke-width="1.5" />
      <text x="105" y="24" text-anchor="middle" font-family="Segoe UI, sans-serif" font-weight="900" font-size="14" fill="#FFFFFF" letter-spacing="2.5">LIORA LUXURY</text>
    </g>

    <g transform="translate(285, 48)">
      <rect width="260" height="38" rx="8" fill="${theme.accentBadge}" fill-opacity="0.25" stroke="${theme.cardBorder}" stroke-width="1.5" />
      <text x="130" y="24" text-anchor="middle" font-family="Segoe UI, sans-serif" font-weight="800" font-size="13" fill="${theme.accentColor}" letter-spacing="2">${brandName.slice(0, 20)}</text>
    </g>

    <g transform="translate(790, 48)">
      <rect width="230" height="38" rx="8" fill="#059669" fill-opacity="0.2" stroke="#10b981" stroke-width="1.5" />
      <circle cx="24" cy="19" r="6" fill="#10b981" />
      <text x="125" y="24" text-anchor="middle" font-family="Segoe UI, sans-serif" font-weight="800" font-size="13" fill="#34d399" letter-spacing="1">100% AUTHENTIC</text>
    </g>

    <g transform="translate(60, 102)">
      <text x="0" y="32" font-family="Segoe UI, sans-serif" font-weight="900" font-size="28" fill="#FFFFFF" letter-spacing="0.5">${prodTitle}</text>
    </g>

    ${discountPercent > 0 ? `
    <g transform="translate(850, 160)" filter="url(#pillShadow)">
      <rect width="170" height="64" rx="32" fill="#e11d48" stroke="#ffffff" stroke-width="2.5" />
      <text x="85" y="41" text-anchor="middle" font-family="Segoe UI, sans-serif" font-weight="900" font-size="28" fill="#FFFFFF">${discountPercent}% OFF</text>
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
  await connectToDatabase();

  const nextProds = await Product.find({
    _id: { $nin: done120Ids },
    inStock: true,
    stockStatus: { $ne: 'Out of Stock' },
    stockQuantity: { $gt: 0 },
    image: { $exists: true, $ne: '' }
  })
  .populate('category', 'name')
  .populate('brand', 'name')
  .sort({ isFeatured: -1, isTrending: -1, stockQuantity: -1 })
  .limit(30)
  .lean();

  console.log(`Found ${nextProds.length} new in-stock products for Batch 9.`);

  const pubDir = path.resolve('client', 'public', 'banners');
  const scratchDir = path.resolve('client', 'scratch', 'banners');
  if (!fs.existsSync(pubDir)) fs.mkdirSync(pubDir, { recursive: true });
  if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });

  const generatedIds = [];

  for (let i = 0; i < nextProds.length; i++) {
    const p = nextProds[i];
    const pid = p._id.toString();
    const targetBannerFile = path.join(pubDir, `banner_${pid}.png`);
    if (fs.existsSync(targetBannerFile)) {
      console.log(`  ✓ Already exists banner_${pid}.png`);
      generatedIds.push(pid);
      continue;
    }
    console.log(`[${i+1}/${nextProds.length}] Rendering: ${p.name.slice(0, 45)} (৳${p.offerPrice || p.originalPrice})`);
    
    try {
      const bannerBuffer = await renderBannerForProduct(p);
      fs.writeFileSync(targetBannerFile, bannerBuffer);
      fs.writeFileSync(path.join(pubDir, `${pid}.png`), bannerBuffer);
      fs.writeFileSync(path.join(scratchDir, `banner_${pid}.png`), bannerBuffer);
      generatedIds.push(pid);
      console.log(`  ✓ Saved banner_${pid}.png (${Math.round(bannerBuffer.length / 1024)} KB)`);
    } catch (err) {
      console.error(`  ✗ Failed for ${pid}:`, err.message);
    }
  }

  console.log('\nGenerated Batch 9 IDs:');
  console.log(JSON.stringify(generatedIds, null, 2));

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
