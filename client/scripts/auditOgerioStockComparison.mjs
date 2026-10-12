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
      let v = trimmed.slice(eqIdx + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      if (!process.env[k]) process.env[k] = v;
    }
  }
}

const MONGO_URI =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  "mongodb://jisan_trends:liora889@ac-2e905xv-shard-00-00.6nzddbx.mongodb.net:27017,ac-2e905xv-shard-00-01.6nzddbx.mongodb.net:27017,ac-2e905xv-shard-00-02.6nzddbx.mongodb.net:27017/jisantrends?ssl=true&replicaSet=atlas-12gikm-shard-0&authSource=admin&retryWrites=true&w=majority";

const TOTAL_PAGES = 159;
const CONCURRENCY = 6;

function cleanStr(str) {
  return (str || '')
    .toLowerCase()
    .replace(/skin\s+o\b/g, 'skino')
    .replace(/[^a-z0-9]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join(' ');
}

function normalizeTitle(str) {
  return (str || '')
    .toLowerCase()
    .replace(/skin\s+o\b/g, 'skino')
    .replace(/[\s\-_–—]+/g, ' ')
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
  console.log('================================================================');
  console.log('🔍 LIORA vs OGERIO Live Stock Audit & Comparison');
  console.log(`📡 Scanning pages 1 to ${TOTAL_PAGES} with ${CONCURRENCY} parallel workers...`);
  console.log('================================================================\n');

  const startTime = Date.now();

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

  const queue = [];
  for (let i = 1; i <= TOTAL_PAGES; i++) queue.push(i);

  const ogerioCatalog = new Map(); // cleanStr or title -> item
  let completed = 0;

  async function worker(tabIndex) {
    const p = pages[tabIndex];
    while (queue.length > 0) {
      const pageNum = queue.shift();
      if (!pageNum) break;

      const pageUrl = `https://www.ogerio.com/shopbd/page/${pageNum}/`;
      let retries = 2;
      let ok = false;

      while (retries >= 0 && !ok) {
        try {
          const res = await p.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
          if (res && res.status() === 404) {
            ok = true;
            break;
          }

          const extracted = await p.evaluate(() => {
            const cards = document.querySelectorAll('.product-grid-item, div.product');
            return Array.from(cards).map(card => {
              const a = card.querySelector('.wd-entities-title a, .product-title a');
              const text = card.innerText || '';
              const classes = card.className || '';

              const isOutOfStock =
                classes.includes('outofstock') ||
                card.querySelector('.out-of-stock, .badge-out-of-stock, .wd-out-of-stock') !== null ||
                /out of stock|স্টক আউট|sold out/i.test(text);

              const priceEl = card.querySelector('.price ins .woocommerce-Price-amount, .price > .woocommerce-Price-amount, .price');
              const priceText = priceEl ? priceEl.innerText.replace(/[^\d]/g, '') : '';

              return {
                title: a ? a.innerText.trim() : '',
                url: a ? a.href : '',
                price: priceText ? parseInt(priceText, 10) : null,
                isOutOfStock
              };
            });
          });

          for (const item of extracted) {
            if (item.title) {
              // Store by title
              if (!ogerioCatalog.has(item.title)) {
                ogerioCatalog.set(item.title, item);
              }
            }
          }

          completed++;
          if (completed % 10 === 0 || completed === TOTAL_PAGES) {
            console.log(`[Worker ${tabIndex + 1}] Completed ${completed}/${TOTAL_PAGES} pages | Total items found: ${ogerioCatalog.size}`);
          }
          ok = true;
        } catch (e) {
          retries--;
          if (retries < 0) {
            console.error(`[Worker ${tabIndex + 1}] Failed page ${pageNum}: ${e.message}`);
          } else {
            await new Promise(r => setTimeout(r, 1000));
          }
        }
      }
    }
  }

  await Promise.all(pages.map((_, i) => worker(i)));
  await browser.close();

  const scanDuration = Math.round((Date.now() - startTime) / 1000);
  console.log(`\n✅ Ogerio Live Crawl Finished in ${scanDuration}s!`);
  console.log(`📦 Total Unique Ogerio Products: ${ogerioCatalog.size}\n`);

  // Update backup file
  const backupPath = path.resolve(process.cwd(), 'scripts', 'scraped_live_ogerio.json');
  fs.writeFileSync(backupPath, JSON.stringify(Object.fromEntries(ogerioCatalog), null, 2), 'utf8');

  // Connect to MongoDB
  console.log('Connecting to LIORA MongoDB...');
  await m.connect(MONGO_URI);
  const ProductCol = m.connection.collection('products');
  const allDbProducts = await ProductCol.find({}).toArray();
  console.log(`Loaded ${allDbProducts.length} LIORA products from database.\n`);

  // Build high-precision matching maps for DB
  const exactDbMap = new Map();
  const normDbMap = new Map();
  const cleanDbMap = new Map();

  for (const p of allDbProducts) {
    if (!p.name) continue;
    exactDbMap.set(p.name, p);
    normDbMap.set(normalizeTitle(p.name), p);
    cleanDbMap.set(cleanStr(p.name), p);
  }

  function isLioraInStock(p) {
    return p.inStock === true && (p.stockQuantity || 0) > 0 && p.stockStatus !== 'Out of Stock';
  }

  function findDbMatch(title) {
    if (exactDbMap.has(title)) return exactDbMap.get(title);
    const norm = normalizeTitle(title);
    if (normDbMap.has(norm)) return normDbMap.get(norm);
    const cln = cleanStr(title);
    if (cleanDbMap.has(cln)) return cleanDbMap.get(cln);
    return null;
  }

  // Categories
  const ogerioIn_lioraOut = [];
  const ogerioOut_lioraIn = [];
  const bothInStock = [];
  const bothOutOfStock = [];
  const ogerioOnly = [];
  const matchedDbIds = new Set();

  for (const [title, ogerioItem] of ogerioCatalog.entries()) {
    const p = findDbMatch(title);
    const ogerioIn = !ogerioItem.isOutOfStock;

    if (!p) {
      ogerioOnly.push({ title, ...ogerioItem });
      continue;
    }

    matchedDbIds.add(p._id.toString());
    const lioraIn = isLioraInStock(p);

    const record = {
      productName: p.name,
      dbId: p._id.toString(),
      ogerioTitle: ogerioItem.title,
      ogerioUrl: ogerioItem.url,
      ogerioPrice: ogerioItem.price,
      ogerioStatus: ogerioIn ? 'In Stock' : 'Out of Stock',
      lioraPrice: p.offerPrice || p.originalPrice || p.price,
      lioraStockQuantity: p.stockQuantity ?? 0,
      lioraStockStatus: p.stockStatus || (lioraIn ? 'In Stock' : 'Out of Stock'),
      lioraInStockFlag: p.inStock
    };

    if (ogerioIn && !lioraIn) {
      ogerioIn_lioraOut.push(record);
    } else if (!ogerioIn && lioraIn) {
      ogerioOut_lioraIn.push(record);
    } else if (ogerioIn && lioraIn) {
      bothInStock.push(record);
    } else {
      bothOutOfStock.push(record);
    }
  }

  console.log('======================= FINAL AUDIT RESULTS =======================');
  console.log(`1. 🟢 Ogerio IN STOCK  &  🔴 Liora OUT OF STOCK : ${ogerioIn_lioraOut.length} products`);
  console.log(`2. 🔴 Ogerio OUT OF STOCK  &  🟢 Liora IN STOCK : ${ogerioOut_lioraIn.length} products`);
  console.log(`3. 🟢 Both IN STOCK                             : ${bothInStock.length} products`);
  console.log(`4. 🔴 Both OUT OF STOCK                         : ${bothOutOfStock.length} products`);
  console.log(`5. Ogerio products not in Liora DB              : ${ogerioOnly.length} products`);
  console.log(`6. Total Liora DB products                      : ${allDbProducts.length} products`);
  console.log('===================================================================\n');

  console.log('--- 1. OGERIO IN STOCK & LIORA OUT OF STOCK ---');
  console.dir(ogerioIn_lioraOut, { depth: null });

  console.log('\n--- 2. OGERIO OUT OF STOCK & LIORA IN STOCK ---');
  console.dir(ogerioOut_lioraIn, { depth: null });

  // Save audit report
  const auditReport = {
    auditedAt: new Date().toISOString(),
    summary: {
      totalOgerioItemsLive: ogerioCatalog.size,
      totalLioraDbProducts: allDbProducts.length,
      ogerioIn_lioraOut_count: ogerioIn_lioraOut.length,
      ogerioOut_lioraIn_count: ogerioOut_lioraIn.length,
      bothInStock_count: bothInStock.length,
      bothOutOfStock_count: bothOutOfStock.length,
      ogerioOnly_count: ogerioOnly.length
    },
    ogerioIn_lioraOut,
    ogerioOut_lioraIn
  };

  const finalReportPath = path.resolve(process.cwd(), 'scripts', 'live_stock_audit_report.json');
  fs.writeFileSync(finalReportPath, JSON.stringify(auditReport, null, 2), 'utf8');
  console.log(`\n📁 Audit saved to: ${finalReportPath}`);

  process.exit(0);
}

main().catch(e => {
  console.error('Fatal audit error:', e);
  process.exit(1);
});
