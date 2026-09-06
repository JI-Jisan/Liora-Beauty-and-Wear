import puppeteer from 'puppeteer-core';
import m from 'mongoose';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

// Load .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const k = trimmed.slice(0, eqIdx).trim();
      const v = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[k]) process.env[k] = v;
    }
  }
}

const MONGO_URI =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  "mongodb://jisan_trends:liora889@ac-2e905xv-shard-00-00.6nzddbx.mongodb.net:27017,ac-2e905xv-shard-00-01.6nzddbx.mongodb.net:27017,ac-2e905xv-shard-00-02.6nzddbx.mongodb.net:27017/jisantrends?ssl=true&replicaSet=atlas-12gikm-shard-0&authSource=admin&retryWrites=true&w=majority";

const TOTAL_PAGES = 150;
const CONCURRENCY = 3;

function normalizeTitle(t) {
  return (t || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function setupPage(page) {
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  );
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const rType = req.resourceType();
    if (['image', 'stylesheet', 'font', 'media'].includes(rType)) {
      req.abort();
    } else {
      req.continue();
    }
  });
}

async function main() {
  console.log('====================================================');
  console.log('📦 Starting Ogerio Stock Out Synchronization for LIORA');
  console.log('====================================================');

  console.log('Connecting to MongoDB...');
  await m.connect(MONGO_URI);
  console.log('Connected to MongoDB successfully!\n');

  const db = m.connection;
  const ProductCol = db.collection('products');
  const BatchCol = db.collection('purchasebatches');

  console.log(`Launching Chrome with ${CONCURRENCY} worker tabs...`);
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled'
    ]
  });

  const pages = [];
  for (let i = 0; i < CONCURRENCY; i++) {
    const p = await browser.newPage();
    await setupPage(p);
    pages.push(p);
  }

  const allOutOfStockItems = new Map(); // url or title -> item
  let totalItemsInspected = 0;
  const startTime = Date.now();

  // Create queue of pages 1 to TOTAL_PAGES
  const pageQueue = [];
  for (let i = 1; i <= TOTAL_PAGES; i++) {
    pageQueue.push(i);
  }

  let completedPages = 0;

  async function worker(tabIndex) {
    const p = pages[tabIndex];
    while (pageQueue.length > 0) {
      const pageNum = pageQueue.shift();
      const pageUrl = `https://www.ogerio.com/shopbd/page/${pageNum}/`;

      let retries = 2;
      let success = false;
      while (retries >= 0 && !success) {
        try {
          const res = await p.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 35000 });
          if (res && res.status() === 404) {
            // Reached end of pagination
            success = true;
            break;
          }

          const extracted = await p.evaluate(() => {
            const cards = document.querySelectorAll('.product-grid-item, div.product');
            return Array.from(cards).map((card) => {
              const a = card.querySelector('.wd-entities-title a, .product-title a');
              const text = card.innerText || '';
              const classes = card.className || '';
              const hasOutOfStockClass = classes.includes('outofstock');
              const hasBadge = !!card.querySelector(
                '.out-of-stock, .badge-out-of-stock, .wd-out-of-stock'
              );
              const textStockOut = /out of stock|স্টক আউট|sold out/i.test(text);
              return {
                title: a ? a.innerText.trim() : '',
                href: a ? a.href : '',
                isOutOfStock: hasOutOfStockClass || hasBadge || textStockOut
              };
            });
          });

          let pageOutOfStockCount = 0;
          for (const item of extracted) {
            if (!item.title) continue;
            totalItemsInspected++;
            if (item.isOutOfStock) {
              pageOutOfStockCount++;
              if (!allOutOfStockItems.has(item.title)) {
                allOutOfStockItems.set(item.title, item);
              }
            }
          }

          completedPages++;
          if (completedPages % 5 === 0 || pageOutOfStockCount > 0 || completedPages === TOTAL_PAGES) {
            console.log(
              `[Worker ${tabIndex + 1}] Page ${pageNum}/${TOTAL_PAGES} | Items: ${extracted.length} | Out of Stock on page: ${pageOutOfStockCount} | Total OOS Found: ${allOutOfStockItems.size}`
            );
          }

          success = true;
        } catch (err) {
          retries--;
          if (retries < 0) {
            console.error(`[Worker ${tabIndex + 1}] Error on Page ${pageNum}:`, err.message);
          } else {
            await new Promise((r) => setTimeout(r, 1000));
          }
        }
      }
    }
  }

  console.log(`Scanning pages 1 to ${TOTAL_PAGES} for Out of Stock products...`);
  await Promise.all(pages.map((_, idx) => worker(idx)));
  await browser.close();

  const scanDuration = Math.round((Date.now() - startTime) / 1000);
  console.log('\n====================================================');
  console.log(`Scan completed in ${scanDuration}s!`);
  console.log(`Total items inspected: ${totalItemsInspected}`);
  console.log(`Unique Out of Stock products on Ogerio: ${allOutOfStockItems.size}`);
  console.log('====================================================\n');

  console.log('Syncing Out of Stock products to LIORA Database...');

  let newlyUpdated = 0;
  let alreadyOutOfStock = 0;
  let notFoundInDB = 0;
  const notFoundList = [];

  for (const [title, item] of allOutOfStockItems.entries()) {
    // 1. Exact match
    let prod = await ProductCol.findOne({ name: title });

    // 2. Case-insensitive exact regex
    if (!prod) {
      const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      prod = await ProductCol.findOne({ name: { $regex: new RegExp(`^${escaped}$`, 'i') } });
    }

    // 3. Normalized prefix matching (first 4 words)
    if (!prod) {
      const norm = normalizeTitle(title);
      const words = norm.split(' ').slice(0, 4).filter(Boolean).join('.*');
      if (words && words.length > 5) {
        prod = await ProductCol.findOne({ name: { $regex: new RegExp(words, 'i') } });
      }
    }

    if (!prod) {
      notFoundInDB++;
      notFoundList.push(title);
      continue;
    }

    // If product is already out of stock and 0 qty
    if (prod.stockStatus === 'Out of Stock' && prod.stockQuantity === 0) {
      alreadyOutOfStock++;
      // Still ensure batches are also remaining: 0
      await BatchCol.updateMany(
        { product: prod._id, remaining: { $gt: 0 } },
        { $set: { remaining: 0, updatedAt: new Date() } }
      );
      continue;
    }

    // Update product to Out of Stock
    await ProductCol.updateOne(
      { _id: prod._id },
      {
        $set: {
          stockQuantity: 0,
          stockStatus: 'Out of Stock',
          updatedAt: new Date()
        }
      }
    );

    // Update all purchase batches for this product to remaining: 0
    await BatchCol.updateMany(
      { product: prod._id },
      {
        $set: {
          remaining: 0,
          updatedAt: new Date()
        }
      }
    );

    newlyUpdated++;
    if (newlyUpdated % 50 === 0) {
      console.log(`Updated ${newlyUpdated} products to Out of Stock...`);
    }
  }

  const totalTime = Math.round((Date.now() - startTime) / 1000);
  console.log('\n====================================================');
  console.log('✅ SYNC FINISHED SUCCESSFULLY');
  console.log('====================================================');
  console.log(`⏱️ Total Time: ${totalTime}s`);
  console.log(`🔍 Total Out of Stock Products from Ogerio: ${allOutOfStockItems.size}`);
  console.log(`🔄 Newly Marked as "Out of Stock" in LIORA: ${newlyUpdated}`);
  console.log(`⚪ Already "Out of Stock": ${alreadyOutOfStock}`);
  console.log(`⚠️ Not Found in LIORA Database: ${notFoundInDB}`);
  if (notFoundList.length > 0) {
    console.log(`Sample Not Found in DB (first 5):`, notFoundList.slice(0, 5));
  }
  console.log('====================================================\n');

  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error during sync:', err);
  process.exit(1);
});
