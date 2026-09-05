const sharp = require('sharp');
const https = require('https');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

const COMBOS = [
  {
    id: '6a9abfbfc63dd531aa8dc560',
    slug: 'combo-melasma',
    url: 'https://www.ogerio.com/wp-content/uploads/2025/05/Combo12.png',
    items: ['Caplino Niacinamide Serum 10%', 'Beaute Melasma-x Glutathione Cream'],
    cutX: 375,
  },
  {
    id: '6a9abfbec63dd531aa8dc55e',
    slug: 'combo-niacinamide',
    url: 'https://www.ogerio.com/wp-content/uploads/2025/05/Combo10.png',
    items: ['Caplino Niacinamide Serum 10%', 'AXIS-Y Dark Spot Serum 5ml'],
    cutX: 375,
  },
  {
    id: '6a9abfbac63dd531aa8dc54b',
    slug: 'combo-facial-turmeric',
    url: 'https://www.ogerio.com/wp-content/uploads/2025/06/Combo1.png',
    items: ['Caplino Turmeric Cleanser', 'Laikou Silicone Cleansing Brush'],
    cutX: 375,
  },
  {
    id: '6a9abfbac63dd531aa8dc54a',
    slug: 'combo-lipstick-4',
    url: 'https://www.ogerio.com/wp-content/uploads/2025/06/Combo7.png',
    items: ['Caplino Liquid Matte Lipstick', 'Swiss Beauty Pure Matte Lipstick'],
    cutX: 375,
  },
  {
    id: '6a9abfbfc63dd531aa8dc564',
    slug: 'combo-cosrx-snail',
    url: 'https://www.ogerio.com/wp-content/uploads/2025/05/Combo13.png',
    items: ['COSRX Snail 96 Essence 100ml', 'COSRX Snail 92 Cream 100ml'],
    cutX: 375,
  },
  {
    id: '6a9abc88c63dd531aa8dbb21',
    slug: 'combo-lipstick-eye',
    url: 'https://www.ogerio.com/wp-content/uploads/2025/06/Combo9.png',
    items: ['Caplino Liquid Matte Lipstick', 'W7 Waterproof Gel Kajal'],
    cutX: 375,
  },
  {
    id: '6a9abc89c63dd531aa8dbb24',
    slug: 'combo-lipstick-3',
    url: 'https://www.ogerio.com/wp-content/uploads/2025/06/Combo6.png',
    items: ['Caplino Liquid Matte Lipstick', 'Swiss Beauty Pure Matte Lipstick'],
    cutX: 375,
  },
  {
    id: '6a9abc8ac63dd531aa8dbb27',
    slug: 'combo-lipstick-2',
    url: 'https://www.ogerio.com/wp-content/uploads/2025/06/Combo5.png',
    items: ['Caplino Liquid Matte Lipstick', 'Swiss Beauty Pure Matte Lipstick'],
    cutX: 375,
  },
  {
    id: '6a9abc8ac63dd531aa8dbb2a',
    slug: 'combo-lipstick-1',
    url: 'https://www.ogerio.com/wp-content/uploads/2025/06/Combo4.png',
    items: ['Caplino Liquid Matte Lipstick', 'Swiss Beauty Pure Matte Lipstick'],
    cutX: 375,
  },
  {
    id: '6a9abc8ac63dd531aa8dbb26',
    slug: 'combo-turmeric-ponds',
    url: 'https://www.ogerio.com/wp-content/uploads/2025/06/Combo3.png',
    items: ['Caplino Turmeric Serum 30ml', 'Ponds Super Light Gel 100ml'],
    cutX: 375,
  },
];

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      const data = [];
      res.on('data', chunk => data.push(chunk));
      res.on('end', () => resolve(Buffer.concat(data)));
    }).on('error', reject);
  });
}

function toBengaliDigits(num) {
  const bn = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(num).replace(/\d/g, d => bn[d]);
}

function generateSvgOverlay(offerPrice, originalPrice, items, cutX = 375) {
  const savings = Math.max(0, originalPrice - offerPrice);
  const bnOffer = toBengaliDigits(offerPrice);
  const bnOriginal = toBengaliDigits(originalPrice);
  const bnSavings = toBengaliDigits(savings);

  const item1 = items[0] || '';
  const item2 = items[1] || '';

  const rightWidth = 800 - cutX;
  const centerX = cutX + (rightWidth / 2);

  return `
  <svg width="800" height="800" viewBox="0 0 800 800" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="lioraGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#ff3b6b" />
        <stop offset="100%" stop-color="#be123c" />
      </linearGradient>
      <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000000" flood-opacity="0.15" />
      </filter>
    </defs>

    <!-- 1. TOP-LEFT: Cover Ogerio Logo with Clean White & Liora Brand Logo -->
    <rect x="0" y="0" width="300" height="130" fill="#ffffff" />
    <g transform="translate(35, 35)">
      <text x="0" y="26" font-family="'Playfair Display', Georgia, serif" font-size="32" font-weight="900" fill="#ff3b6b" letter-spacing="3">LIORA</text>
      <text x="1" y="48" font-family="system-ui, sans-serif" font-size="11" font-weight="800" fill="#64748b" letter-spacing="4">BEAUTY &amp; WEAR</text>
      <line x1="0" y1="56" x2="160" y2="56" stroke="#fecdd3" stroke-width="2" />
    </g>

    <!-- 2. RIGHT SIDE: Clean White Area Covering Old Ogerio Text, Super Combo, and Green Prices -->
    <rect x="${cutX}" y="40" width="${rightWidth}" height="660" fill="#ffffff" />

    <!-- 3. LIORA COMBO BADGE (Luxury Rose Pink Theme) -->
    <g transform="translate(${centerX}, 135)">
      <rect x="-140" y="-45" width="280" height="82" rx="16" fill="url(#lioraGrad)" filter="url(#shadow)" />
      <text x="0" y="-12" text-anchor="middle" font-family="system-ui, sans-serif" font-size="13" font-weight="900" fill="#ffffff" letter-spacing="2.5">✨ SPECIAL OFFER</text>
      <text x="0" y="20" text-anchor="middle" font-family="'Playfair Display', Georgia, serif" font-size="28" font-weight="900" fill="#ffffff" letter-spacing="1">Super Combo</text>
    </g>

    <!-- 4. UPDATED OFFER PRICE (Matching Liora Website) -->
    <g transform="translate(${centerX}, 255)">
      <text x="0" y="0" text-anchor="middle" font-family="system-ui, sans-serif" font-size="18" font-weight="700" fill="#475569">অফার প্রাইস</text>
      <text x="0" y="52" text-anchor="middle" font-family="system-ui, sans-serif" font-size="58" font-weight="900" fill="#e11d48">৳ ${bnOffer}</text>
    </g>

    <!-- 5. SAVINGS PILL -->
    <g transform="translate(${centerX}, 345)">
      <rect x="-115" y="-19" width="230" height="38" rx="19" fill="url(#lioraGrad)" />
      <text x="0" y="7" text-anchor="middle" font-family="system-ui, sans-serif" font-size="16.5" font-weight="800" fill="#ffffff">বাঁচল ${bnSavings} টাকা</text>
    </g>

    <!-- 6. REGULAR STRIKETHROUGH PRICE -->
    <g transform="translate(${centerX}, 410)">
      <text x="0" y="0" text-anchor="middle" font-family="system-ui, sans-serif" font-size="22" font-weight="600" fill="#94a3b8">রেগুলার ৳ ${bnOriginal}</text>
      <line x1="-75" y1="-7" x2="75" y2="-7" stroke="#dc2626" stroke-width="2.5" />
    </g>

    <!-- 7. PRODUCT NAMES / INCLUDED ITEMS LIST -->
    <g transform="translate(${centerX}, 470)">
      <text x="0" y="0" text-anchor="middle" font-family="system-ui, sans-serif" font-size="14" font-weight="800" fill="#0f172a">${item1}</text>
      ${item2 ? `<text x="0" y="22" text-anchor="middle" font-family="system-ui, sans-serif" font-size="14" font-weight="800" fill="#f43f5e">+</text>
      <text x="0" y="44" text-anchor="middle" font-family="system-ui, sans-serif" font-size="14" font-weight="800" fill="#0f172a">${item2}</text>` : ''}
      <text x="0" y="${item2 ? 68 : 30}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="12.5" font-weight="700" fill="#64748b">100% Authentic Guaranteed</text>
    </g>

    <!-- 8. BOTTOM BANNER: Replace Ogerio Green Wave & Phone Number with LIORA Pink Wave & Branding -->
    <path d="M 0 640 C 140 640, 280 670, 480 670 C 620 670, 720 650, 800 640 L 800 800 L 0 800 Z" fill="url(#lioraGrad)" />
    
    <!-- Wave text & branding -->
    <g transform="translate(35, 740)">
      <text x="0" y="0" font-family="system-ui, sans-serif" font-size="18" font-weight="900" fill="#ffffff" letter-spacing="1">🛍️ LIORA BEAUTY &amp; WEAR</text>
      <text x="0" y="24" font-family="system-ui, sans-serif" font-size="13" font-weight="600" fill="rgba(255,255,255,0.9)">100% Authentic Cosmetics &amp; Fashion</text>
    </g>

    <!-- Right button on wave -->
    <g transform="translate(705, 745)">
      <rect x="-75" y="-20" width="150" height="40" rx="20" fill="#ffffff" filter="url(#shadow)" />
      <text x="0" y="6" text-anchor="middle" font-family="system-ui, sans-serif" font-size="14" font-weight="900" fill="#e11d48">SHOP NOW ➔</text>
    </g>
  </svg>
  `;
}

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const outDir = path.join(__dirname, '../client/public/combos');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  for (const combo of COMBOS) {
    console.log(`Processing ${combo.slug}...`);
    try {
      const product = await mongoose.connection.db.collection('products').findOne({ _id: new mongoose.Types.ObjectId(combo.id) });
      if (!product) {
        console.warn(`Product not found: ${combo.id}`);
        continue;
      }

      const offerPrice = product.offerPrice || 0;
      const originalPrice = product.originalPrice || offerPrice;

      const imgBuf = await fetchBuffer(combo.url);
      const svg = generateSvgOverlay(offerPrice, originalPrice, combo.items, combo.cutX || 375);

      const outBuffer = await sharp(imgBuf)
        .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
        .png({ quality: 90 })
        .toBuffer();

      const fileName = `${combo.slug}.png`;
      const filePath = path.join(outDir, fileName);
      fs.writeFileSync(filePath, outBuffer);

      const publicUrl = `/combos/${fileName}`;
      await mongoose.connection.db.collection('products').updateOne(
        { _id: product._id },
        {
          $set: {
            image: publicUrl,
            images: [publicUrl, ...(Array.isArray(product.images) ? product.images.filter(img => !img.includes('Combo')) : [])]
          }
        }
      );

      console.log(`✓ Updated ${product.name} with price ৳${offerPrice} -> ${publicUrl}`);
    } catch (err) {
      console.error(`Error processing ${combo.slug}:`, err.message);
    }
  }

  console.log('All combos processed successfully!');
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
