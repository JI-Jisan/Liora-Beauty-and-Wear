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
      const v = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
      if (!process.env[k]) process.env[k] = v;
    }
  }
}

const MONGO_URI =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  "mongodb://jisan_trends:liora889@ac-2e905xv-shard-00-00.6nzddbx.mongodb.net:27017,ac-2e905xv-shard-00-01.6nzddbx.mongodb.net:27017,ac-2e905xv-shard-00-02.6nzddbx.mongodb.net:27017/jisantrends?ssl=true&replicaSet=atlas-12gikm-shard-0&authSource=admin&retryWrites=true&w=majority";

const rawCookieString =
  process.env.OGERIO_COOKIE ||
  `_gcl_au=1.1.124190221.1790566594; _ga=GA1.1.843681729.1790566594; cf_clearance=.CkAbXOzmS0MiII1IxKJUV_1tTHQ0VkRASIoDbsUW0M-1790566595-1.2.1.1-PNqJGYzbyJsL.EmwSbFkQN6oU2n3RCPctVbmmM0qZPIDMJy58c.49C8hKOUDq7hgEBO24vj1PgIJ2iHWw8IOuj.p8pVpJyj0Y7.H0_cx7tXYzU0P7Uk5NhiL22P_AxkRYueHYK1NkW9jPGehHJ21kaQo7Pc8IzfyH.b5AdsXK9bH7v0lz3aUDJYBu5QISaVve6OH9HnU82cPeBxT1OwPK2LLCa0XDGE19zZvnmGfOu8tVPB1Mme.ZumjbHm8JMxseTLx8T1FdP2jTceoTQqro3.PgTHpZX3OYNcfpKO8c8DaxaadgqB2579IMJc9jqtmPRqg3jOLNwKX3UFkHnpTwnV0HQkrGB0GmdfTjgrYVAI; wordpress_test_cookie=WP%20Cookie%20check; wordpress_logged_in_65affc8df1b074206d0540bb7c0f54de=liorabeautyandwear%40gmail.com%7C1790739419%7CMGQCfhE7eHVqz5SgEAS3PL6lhS6dxrQ7riBUNO1dZLJ%7C48ad693648f7f263cda3b2b25915e7b601b5c4e5da69ebf3121a23f13da53d03; wfwaf-authcookie-1c7ab08f031298fbc2c588336c15d99f=104283%7Cother%7Cread%7C26dfb1365261d9837e23d33f12b82cd5e93ddc0ff295d7eb5d3fafc1a022e57f; _ga_4KG7WNH0Z4=GS2.1.s1790566594$o1$g1$t1790566734$j60$l0$h0; g_state={"i_l":0,"i_ll":1790567211196,"i_e":{"enable_itp_optimization":24},"i_et":1790567211196,"i_b":"CHlmsTL303yTuw7F4OwFnC8iC2ICNa8odcLd+LDxebo"}`;

const TOTAL_PAGES = 120;
const CONCURRENCY = 4;
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36';

function parseCookies(str, domain = '.ogerio.com') {
  return str.split(';').map(part => {
    const trimmed = part.trim();
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) return null;
    const name = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    return { name, value, domain, path: '/' };
  }).filter(Boolean);
}

function normalizeTitle(t) {
  return (t || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function setupPage(page, cookies) {
  await page.setUserAgent(USER_AGENT);
  await page.setCookie(...cookies);
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    if (['image', 'font', 'media', 'stylesheet'].includes(req.resourceType())) {
      req.abort();
    } else {
      req.continue();
    }
  });
}

async function main() {
  console.log('====================================================');
  console.log('💰 Syncing Real Wholesale Buying Prices from Ogerio');
  console.log('   Account: liorabeautyandwear@gmail.com');
  console.log('====================================================\n');

  console.log('Connecting to MongoDB...');
  await m.connect(MONGO_URI);
  console.log('MongoDB connected!\n');

  const db = m.connection;
  const ProductCol = db.collection('products');
  const BatchCol = db.collection('purchasebatches');

  const cookies = parseCookies(rawCookieString);

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
    await setupPage(p, cookies);
    pages.push(p);
  }

  // Queue pages 1 to TOTAL_PAGES
  const queue = [];
  for (let i = 1; i <= TOTAL_PAGES; i++) queue.push(i);

  const wholesaleDataMap = new Map(); // title -> wholesalePrice
  let completedPages = 0;
  let reachedEnd = false;
  const startTime = Date.now();

  async function worker(tabIndex) {
    const p = pages[tabIndex];
    while (queue.length > 0 && !reachedEnd) {
      const pageNum = queue.shift();
      if (!pageNum) break;

      const pageUrl = `https://www.ogerio.com/shopbd/page/${pageNum}/`;
      let retries = 2;
      let success = false;

      while (retries >= 0 && !success && !reachedEnd) {
        try {
          const res = await p.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 35000 });
          if (res && res.status() === 404) {
            console.log(`[Worker ${tabIndex + 1}] Reached end of shop at Page ${pageNum} (404). Stopping queue.`);
            reachedEnd = true;
            queue.length = 0;
            success = true;
            break;
          }

          const extracted = await p.evaluate(() => {
            const cards = document.querySelectorAll('.product-grid-item, div.product');
            return Array.from(cards).map(card => {
              const a = card.querySelector('.wd-entities-title a, .product-title a');
              const text = card.innerText || '';
              const m = text.match(/Wholesale\s*Price:\s*([\d,]+)/i);
              const wholesalePrice = m ? parseInt(m[1].replace(/,/g, ''), 10) : null;
              return {
                title: a ? a.innerText.trim() : '',
                wholesalePrice
              };
            });
          });

          let pageWholesaleCount = 0;
          for (const item of extracted) {
            if (item.title && Number.isFinite(item.wholesalePrice) && item.wholesalePrice > 0) {
              pageWholesaleCount++;
              if (!wholesaleDataMap.has(item.title)) {
                wholesaleDataMap.set(item.title, item.wholesalePrice);
              }
            }
          }

          completedPages++;
          if (completedPages % 5 === 0 || queue.length === 0) {
            console.log(`[Worker ${tabIndex + 1}] Page ${pageNum} done | Scraped: ${pageWholesaleCount} prices | Total Wholesale Collected: ${wholesaleDataMap.size}`);
          }

          success = true;
        } catch (err) {
          retries--;
          if (retries < 0) {
            console.error(`[Worker ${tabIndex + 1}] Error on Page ${pageNum}:`, err.message);
          } else {
            await new Promise(r => setTimeout(r, 1000));
          }
        }
      }
    }
  }

  console.log(`Starting crawl of shopbd pages (up to ${TOTAL_PAGES})...`);
  await Promise.all(pages.map((_, i) => worker(i)));
  await browser.close();

  console.log('\n====================================================');
  console.log(`Scraping completed in ${Math.round((Date.now() - startTime) / 1000)}s!`);
  console.log(`Total unique wholesale prices collected: ${wholesaleDataMap.size}`);
  console.log('====================================================\n');

  // Save backup of scraped wholesale data
  const dumpPath = path.resolve(process.cwd(), 'scripts', 'scraped_wholesale_prices.json');
  const dumpObj = Object.fromEntries(wholesaleDataMap);
  fs.writeFileSync(dumpPath, JSON.stringify(dumpObj, null, 2), 'utf8');
  console.log(`💾 Saved local backup of wholesale prices to: scripts/scraped_wholesale_prices.json\n`);

  console.log('Loading all products from LIORA database into memory for lightning-fast matching...');
  const allDbProducts = await ProductCol.find({}, { projection: { _id: 1, name: 1, purchasePrice: 1, wholesalePrice: 1 } }).toArray();
  console.log(`Loaded ${allDbProducts.length} products from database.\n`);

  // Build high-speed lookup maps
  const exactMap = new Map();
  const lowerMap = new Map();
  const normMap = new Map();

  for (const p of allDbProducts) {
    if (!p.name) continue;
    exactMap.set(p.name, p);
    lowerMap.set(p.name.toLowerCase(), p);
    normMap.set(normalizeTitle(p.name), p);
  }

  console.log('Matching scraped wholesale prices with LIORA database products...');

  const productUpdates = [];
  const matchedProductIds = new Map(); // prodId -> wholesalePrice
  let notFoundInDB = 0;

  for (const [title, wholesalePrice] of wholesaleDataMap.entries()) {
    // 1. Exact match
    let prod = exactMap.get(title);

    // 2. Case-insensitive
    if (!prod) {
      prod = lowerMap.get(title.toLowerCase());
    }

    // 3. Normalized title
    if (!prod) {
      prod = normMap.get(normalizeTitle(title));
    }

    // 4. Word-prefix matching
    if (!prod) {
      const norm = normalizeTitle(title);
      const first4 = norm.split(' ').slice(0, 4).filter(Boolean).join(' ');
      if (first4.length > 8) {
        for (const [dbNorm, dbP] of normMap.entries()) {
          if (dbNorm.startsWith(first4) || dbNorm.includes(first4)) {
            prod = dbP;
            break;
          }
        }
      }
    }

    if (!prod) {
      notFoundInDB++;
      continue;
    }

    matchedProductIds.set(prod._id.toString(), wholesalePrice);

    productUpdates.push({
      updateOne: {
        filter: { _id: prod._id },
        update: {
          $set: {
            purchasePrice: wholesalePrice,
            wholesalePrice: wholesalePrice,
            updatedAt: new Date()
          }
        }
      }
    });
  }

  console.log(`Matched ${productUpdates.length} products! (Unmatched Ogerio items: ${notFoundInDB})`);
  console.log('Writing wholesale price updates to MongoDB in bulk...');

  let updatedProducts = 0;
  for (let i = 0; i < productUpdates.length; i += 500) {
    const chunk = productUpdates.slice(i, i + 500);
    const res = await ProductCol.bulkWrite(chunk);
    updatedProducts += res.modifiedCount;
  }

  console.log(`✅ Updated ${updatedProducts} products in 'products' collection.`);

  // Update Purchase Batches
  console.log('\nUpdating Purchase Batches unitCost...');
  const batchUpdates = [];
  for (const [prodIdStr, wholesalePrice] of matchedProductIds.entries()) {
    batchUpdates.push({
      updateMany: {
        filter: { product: new m.Types.ObjectId(prodIdStr) },
        update: {
          $set: {
            unitCost: wholesalePrice,
            updatedAt: new Date()
          }
        }
      }
    });
  }

  let updatedBatches = 0;
  for (let i = 0; i < batchUpdates.length; i += 500) {
    const chunk = batchUpdates.slice(i, i + 500);
    const res = await BatchCol.bulkWrite(chunk);
    updatedBatches += res.modifiedCount;
  }

  console.log(`✅ Updated ${updatedBatches} purchase batches.`);

  const totalTime = Math.round((Date.now() - startTime) / 1000);
  console.log('\n====================================================');
  console.log('🎉 WHOLESALE BUYING PRICES SYNC FINISHED SUCCESSFULLY!');
  console.log('====================================================');
  console.log(`⏱️ Total Time: ${totalTime}s`);
  console.log(`🔍 Wholesale Prices Scraped from Ogerio: ${wholesaleDataMap.size}`);
  console.log(`📦 Matched Products: ${productUpdates.length}`);
  console.log(`💾 Products Modified in LIORA DB: ${updatedProducts}`);
  console.log(`📊 Purchase Batches Modified: ${updatedBatches}`);
  console.log('====================================================\n');

  await m.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error in wholesale sync:', err);
  process.exit(1);
});
