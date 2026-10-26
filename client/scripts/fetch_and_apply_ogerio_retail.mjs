import puppeteer from 'puppeteer-core';
import mongoose from 'mongoose';
import fs from 'fs';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36';

const MONGO_URI =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  "mongodb://jisan_trends:liora889@ac-2e905xv-shard-00-00.6nzddbx.mongodb.net:27017,ac-2e905xv-shard-00-01.6nzddbx.mongodb.net:27017,ac-2e905xv-shard-00-02.6nzddbx.mongodb.net:27017/jisantrends?ssl=true&replicaSet=atlas-12gikm-shard-0&authSource=admin&retryWrites=true&w=majority";

function cleanStr(s) {
  return (s || '')
    .toLowerCase()
    .replace(/[–—−-]/g, ' ')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// User's exact tiered markup logic based on Ogerio Retail selling price
export function calculateLioraRetailMarkup(ogerioRetailPrice) {
  const p = Number(ogerioRetailPrice) || 0;
  if (p <= 0) return 0;
  if (p < 100) return 5;
  if (p <= 200) return 20;
  if (p <= 300) return 25;
  if (p <= 400) return 30;
  if (p <= 500) return 30;
  if (p <= 700) return 40;
  if (p < 1000) return 50;   // 701 to 999
  if (p <= 1200) return 60;  // 1000 to 1200
  if (p < 1300) return 70;   // bridge for 1201-1299
  if (p <= 1500) return 80;  // 1300 to 1500
  if (p <= 2000) return 100; // 1500 to 2000
  if (p <= 2500) return 150; // 2000 to 2500
  if (p <= 3000) return 200; // 2500 to 3000
  if (p <= 4000) return 300; // 3000 to 4000
  return 300;                // 4000+
}

async function run() {
  console.log('================================================================');
  console.log('🛍️ SYNCING OGERIO RETAIL PRICES & APPLYING USER TIERED MARKUP');
  console.log('================================================================\n');

  const catalogPath = fs.existsSync('scripts/ogerio_complete_live_prices.json')
    ? 'scripts/ogerio_complete_live_prices.json'
    : 'client/scripts/ogerio_complete_live_prices.json';

  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  console.log(`Loaded ${catalog.length} items from existing catalog.`);

  console.log('Launching Guest Browser (Normal Retail Customer View)...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
  });

  const page = await browser.newPage();
  await page.setUserAgent(USER_AGENT);
  // NO COOKIES: strictly normal customer retail view!

  // Block images, fonts, styles to save bandwidth
  await page.setRequestInterception(true);
  page.on('request', req => {
    const type = req.resourceType();
    if (['image', 'font', 'media', 'stylesheet'].includes(type)) {
      req.abort();
    } else {
      req.continue();
    }
  });

  console.log('Navigating to Ogerio as Guest...');
  await page.goto('https://www.ogerio.com/shop/', { waitUntil: 'domcontentloaded', timeout: 35000 });
  await new Promise(r => setTimeout(r, 2000));

  const allIds = catalog.map(c => c.id).filter(Boolean);
  const CHUNK_SIZE = 20;
  const ogerioRetailMap = new Map(); // id -> { retailPrice, regularPrice }

  console.log(`Fetching live retail selling prices for ${allIds.length} products...`);
  for (let i = 0; i < allIds.length; i += CHUNK_SIZE) {
    const chunkIds = allIds.slice(i, i + CHUNK_SIZE);
    try {
      const res = await page.evaluate(async (ids) => {
        const r = await fetch('/api/store/', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            operation: 'catalog/prices',
            payload: { ids }
          })
        });
        if (!r.ok) return null;
        return await r.json();
      }, chunkIds);

      if (res && Array.isArray(res.items)) {
        for (const it of res.items) {
          const retP = it.price ? Math.round(parseFloat(it.price)) : null;
          const regP = it.regular_price ? Math.round(parseFloat(it.regular_price)) : null;
          ogerioRetailMap.set(it.id, {
            retailPrice: retP,
            regularPrice: regP
          });
        }
      }

      const pct = Math.round(((i + chunkIds.length) / allIds.length) * 100);
      process.stdout.write(`\rProgress: ${ogerioRetailMap.size} / ${allIds.length} retail prices fetched (${pct}%)...`);
      await new Promise(r => setTimeout(r, 450));
    } catch (e) {
      console.error(`\nError at chunk ${i}:`, e.message);
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  await browser.close();
  console.log(`\n\n✅ Done! Fetched live retail prices for ${ogerioRetailMap.size} products.`);

  // Connect to MongoDB
  console.log('\nConnecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB.\n');

  const db = mongoose.connection;
  const ProductCol = db.collection('products');
  const allDbProducts = await ProductCol.find({}).toArray();
  console.log(`Found ${allDbProducts.length} products in LIORA database.`);

  const dbExact = new Map();
  const dbClean = new Map();

  for (const p of allDbProducts) {
    if (!p.name) continue;
    dbExact.set(p.name, p);
    dbClean.set(cleanStr(p.name), p);
  }

  const updates = [];
  let updatedCount = 0;
  const sampleReports = [];

  for (const item of catalog) {
    const ogerioRetailData = ogerioRetailMap.get(item.id);
    if (!ogerioRetailData || !ogerioRetailData.retailPrice) continue;

    const ogerioRetail = ogerioRetailData.retailPrice;
    const markup = calculateLioraRetailMarkup(ogerioRetail);
    const lioraOfferPrice = ogerioRetail + markup;

    // Original MRP price (always higher than offerPrice for nice discount badge)
    let originalPrice = ogerioRetailData.regularPrice || Math.round(lioraOfferPrice * 1.3);
    if (originalPrice <= lioraOfferPrice) {
      originalPrice = Math.round(lioraOfferPrice * 1.25);
    }

    const discountPct = Math.round(((originalPrice - lioraOfferPrice) / originalPrice) * 100);
    const discountBadge = `${discountPct}% OFF`;

    let matchedDoc = dbExact.get(item.title);
    if (!matchedDoc) matchedDoc = dbClean.get(cleanStr(item.title));

    if (matchedDoc) {
      // Ensure offerPrice is never below purchasePrice (safety guard)
      const safeOfferPrice = Math.max(lioraOfferPrice, (matchedDoc.purchasePrice || 0) + markup);

      updates.push({
        updateOne: {
          filter: { _id: matchedDoc._id },
          update: {
            $set: {
              offerPrice: safeOfferPrice,
              originalPrice: originalPrice,
              discountBadge: discountBadge,
              updatedAt: new Date()
            }
          }
        }
      });
      updatedCount++;

      if (sampleReports.length < 8) {
        sampleReports.push({
          product: matchedDoc.name.slice(0, 45),
          purchasePrice: `৳${matchedDoc.purchasePrice}`,
          ogerioRetail: `৳${ogerioRetail}`,
          markup: `+৳${markup}`,
          lioraOfferPrice: `৳${safeOfferPrice}`,
          profit: `৳${safeOfferPrice - (matchedDoc.purchasePrice || 0)}`,
          originalPrice: `৳${originalPrice}`,
          badge: discountBadge
        });
      }
    }
  }

  console.log(`\nPrepared ${updates.length} retail price updates.`);

  if (updates.length > 0) {
    console.log('Writing retail price updates in chunks to MongoDB...');
    for (let i = 0; i < updates.length; i += 500) {
      const chunk = updates.slice(i, i + 500);
      await ProductCol.bulkWrite(chunk, { ordered: false });
      process.stdout.write(`  Applied ${Math.min(i + 500, updates.length)} / ${updates.length} updates...\r`);
    }
    console.log('\n✅ All retail price updates successfully written to MongoDB!');
  }

  console.log('\n================================================================');
  console.log('📋 SAMPLE UPDATED PRODUCTS WITH NEW RETAIL PRICES:');
  console.table(sampleReports);
  console.log('================================================================\n');

  await mongoose.disconnect();
}

run().catch(console.error);
