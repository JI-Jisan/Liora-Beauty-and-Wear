import puppeteer from 'puppeteer-core';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TOTAL_PAGES = 322;
const CONCURRENCY = 6;

const URI =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  "mongodb://jisan_trends:liora889@ac-2e905xv-shard-00-00.6nzddbx.mongodb.net:27017,ac-2e905xv-shard-00-01.6nzddbx.mongodb.net:27017,ac-2e905xv-shard-00-02.6nzddbx.mongodb.net:27017/jisantrends?ssl=true&replicaSet=atlas-12gikm-shard-0&authSource=admin&retryWrites=true&w=majority";

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

function cleanTokens(str) {
  return (str || '')
    .toLowerCase()
    .replace(/skin\s+o\b/g, 'skino')
    .replace(/[^a-z0-9]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function normalizeTitle(str) {
  return (str || '')
    .toLowerCase()
    .replace(/skin\s+o\b/g, 'skino')
    .replace(/[\s\-_–—]+/g, ' ')
    .trim();
}

async function main() {
  console.log('================================================================');
  console.log('⚡ 100% LIVE OGERIO CRAWL & DATABASE STOCK SYNCHRONIZATION');
  console.log(`📡 Scanning pages 1 to ${TOTAL_PAGES} with ${CONCURRENCY} parallel Chrome workers...`);
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

  const pages = await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      const p = await browser.newPage();
      await p.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
      );
      await p.setRequestInterception(true);
      p.on('request', (req) => {
        if (['image', 'font', 'media', 'stylesheet'].includes(req.resourceType())) {
          req.abort();
        } else {
          req.continue();
        }
      });
      return p;
    })
  );

  const queue = [];
  for (let i = 1; i <= TOTAL_PAGES; i++) queue.push(i);

  const liveOgerioMap = new Map(); // title -> { title, url, price, isOutOfStock }
  let completedPages = 0;

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
          const res = await p.goto(pageUrl, {
            waitUntil: 'domcontentloaded',
            timeout: 25000
          });

          if (res && res.status() === 404) {
            ok = true;
            break;
          }

          const items = await p.evaluate(() => {
            const cards = document.querySelectorAll('.product-card');
            return Array.from(cards).map((c) => {
              const a = c.querySelector('.product-name');
              const title = a ? a.innerText.trim() : '';
              const url = a ? a.href : '';
              const stockEl = c.querySelector('.product-stock');
              const isOutOfStock = stockEl
                ? stockEl.className.includes('outofstock') ||
                  stockEl.innerText.toLowerCase().includes('out')
                : false;
              const priceEl = c.querySelector('.product-price');
              const priceText = priceEl ? priceEl.innerText.replace(/[^\d]/g, '') : '';
              return {
                title,
                url,
                price: priceText ? parseInt(priceText, 10) : null,
                isOutOfStock
              };
            });
          });

          for (const item of items) {
            if (item.title) {
              liveOgerioMap.set(item.title, item);
            }
          }

          completedPages++;
          if (completedPages % 30 === 0 || completedPages === TOTAL_PAGES) {
            console.log(
              `[Crawl Progress] Completed ${completedPages}/${TOTAL_PAGES} pages | Found ${liveOgerioMap.size} live items`
            );
          }
          ok = true;
        } catch (e) {
          retries--;
          if (retries < 0) {
            console.error(`[Worker ${tabIndex + 1}] Error on page ${pageNum}: ${e.message}`);
          } else {
            await new Promise((r) => setTimeout(r, 1000));
          }
        }
      }
    }
  }

  await Promise.all(pages.map((_, i) => worker(i)));
  await browser.close();

  const crawlTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n✅ Finished crawling Ogerio in ${crawlTime}s!`);
  console.log(`📦 Total unique products crawled live: ${liveOgerioMap.size}\n`);

  // Update backup file so local cache stays 100% fresh
  const backupPath = path.resolve('scripts/scraped_live_ogerio.json');
  fs.writeFileSync(
    backupPath,
    JSON.stringify(Object.fromEntries(liveOgerioMap), null, 2),
    'utf8'
  );
  console.log(`💾 Saved fresh live crawl to ${backupPath}`);

  // Now Connect to MongoDB and Synchronize
  console.log('\nConnecting to LIORA MongoDB...');
  await mongoose.connect(URI);
  console.log('✅ Connected to MongoDB.');

  const db = mongoose.connection;
  const ProductCol = db.collection('products');
  const BatchCol = db.collection('purchasebatches');

  // Build lookup maps for live crawled Ogerio
  const exactMap = new Map();
  const normMap = new Map();
  const cleanMap = new Map();
  const tokenList = [];

  for (const [title, item] of liveOgerioMap.entries()) {
    exactMap.set(title, item);
    normMap.set(normalizeTitle(title), item);
    cleanMap.set(cleanStr(title), item);
    const tokens = cleanTokens(title);
    tokenList.push({ title, item, tokenSet: new Set(tokens), tokenArr: tokens });
  }

  const products = await ProductCol.find({}).toArray();
  console.log(`Loaded ${products.length} products from database.`);

  const allBatches = await BatchCol.find({}).toArray();
  const batchesByProduct = new Map();
  for (const b of allBatches) {
    const pid = b.product?.toString();
    if (!pid) continue;
    if (!batchesByProduct.has(pid)) batchesByProduct.set(pid, []);
    batchesByProduct.get(pid).push(b);
  }

  const now = new Date();
  const productBulkOps = [];
  const batchBulkOps = [];
  const newBatchesToInsert = [];

  let matchedInStockCount = 0;
  let matchedOutOfStockCount = 0;
  let unmatchedCount = 0;

  let changedToInStockCount = 0;
  let changedToOutOfStockCount = 0;
  let alreadyExactInStockCount = 0;
  let alreadyExactOutOfStockCount = 0;

  for (const p of products) {
    const name = p.name || '';
    let match =
      exactMap.get(name) ||
      normMap.get(normalizeTitle(name)) ||
      cleanMap.get(cleanStr(name));

    if (!match) {
      const pTokens = cleanTokens(name);
      if (pTokens.length >= 3) {
        const found = tokenList.find((t) => pTokens.every((tok) => t.tokenSet.has(tok)));
        if (found) match = found.item;
      }
    }

    if (!match) {
      const pSet = new Set(cleanTokens(name));
      const found = tokenList.find(
        (t) => t.tokenArr.length >= 3 && t.tokenArr.every((tok) => pSet.has(tok))
      );
      if (found) match = found.item;
    }

    if (!match) {
      unmatchedCount++;
      continue;
    }

    const ogerioInStock = !match.isOutOfStock;
    const currentInStock = p.inStock === true;
    const currentQty = p.stockQuantity ?? 0;
    const currentStatus = p.stockStatus || '';
    const pidStr = p._id.toString();
    const prodBatches = batchesByProduct.get(pidStr) || [];

    if (ogerioInStock) {
      matchedInStockCount++;
      const isAlready100 =
        currentInStock && currentQty === 100 && currentStatus === 'In Stock';

      if (!isAlready100) {
        changedToInStockCount++;
        productBulkOps.push({
          updateOne: {
            filter: { _id: p._id },
            update: {
              $set: {
                inStock: true,
                stockQuantity: 100,
                stockStatus: 'In Stock',
                updatedAt: now
              }
            }
          }
        });
      } else {
        alreadyExactInStockCount++;
      }

      // Sync Batches
      if (prodBatches.length > 0) {
        const first = prodBatches[0];
        batchBulkOps.push({
          updateOne: {
            filter: { _id: first._id },
            update: {
              $set: {
                remaining: 100,
                qty: Math.max(first.qty || 0, 100),
                updatedAt: now
              }
            }
          }
        });
        for (let i = 1; i < prodBatches.length; i++) {
          batchBulkOps.push({
            updateOne: {
              filter: { _id: prodBatches[i]._id },
              update: {
                $set: {
                  remaining: 0,
                  updatedAt: now
                }
              }
            }
          });
        }
      } else {
        newBatchesToInsert.push({
          product: p._id,
          productName: p.name || 'Product',
          qty: 100,
          remaining: 100,
          unitCost: Number(p.purchasePrice || p.buyingPrice || 0),
          purchaseDate: now,
          ownerName: 'Owner',
          locationName: 'Owner',
          supplier: 'Ogerio Live Sync',
          note: 'Set to 100 (Ogerio Live In Stock)',
          createdAt: now,
          updatedAt: now
        });
      }
    } else {
      matchedOutOfStockCount++;
      const isAlready0 =
        !currentInStock && currentQty === 0 && currentStatus === 'Out of Stock';

      if (!isAlready0) {
        changedToOutOfStockCount++;
        productBulkOps.push({
          updateOne: {
            filter: { _id: p._id },
            update: {
              $set: {
                inStock: false,
                stockQuantity: 0,
                stockStatus: 'Out of Stock',
                updatedAt: now
              }
            }
          }
        });
      } else {
        alreadyExactOutOfStockCount++;
      }

      if (prodBatches.length > 0) {
        for (const b of prodBatches) {
          if (b.remaining > 0) {
            batchBulkOps.push({
              updateOne: {
                filter: { _id: b._id },
                update: {
                  $set: {
                    remaining: 0,
                    updatedAt: now
                  }
                }
              }
            });
          }
        }
      }
    }
  }

  console.log(`Writing ${productBulkOps.length} product updates to database...`);
  if (productBulkOps.length > 0) {
    const pResult = await ProductCol.bulkWrite(productBulkOps);
    console.log(`✅ Products updated: ${pResult.modifiedCount}`);
  }

  console.log(`Writing ${batchBulkOps.length} batch updates to database...`);
  if (batchBulkOps.length > 0) {
    const bResult = await BatchCol.bulkWrite(batchBulkOps);
    console.log(`✅ Batches updated: ${bResult.modifiedCount}`);
  }

  if (newBatchesToInsert.length > 0) {
    console.log(`Inserting ${newBatchesToInsert.length} new purchase batches...`);
    const insertResult = await BatchCol.insertMany(newBatchesToInsert);
    console.log(`✅ Inserted ${insertResult.insertedCount} new batches.`);
  }

  // Check specific product: Dr. Althea 345 Relief Cream 15ml
  const drAlthea = await ProductCol.findOne({
    name: { $regex: /Dr\.\s*Althea\s*345\s*Relief\s*Cream\s*15ml/i }
  });
  console.log('\n🔎 Verification for Dr. Althea 345 Relief Cream 15ml in DB:');
  console.log({
    name: drAlthea?.name,
    inStock: drAlthea?.inStock,
    stockQuantity: drAlthea?.stockQuantity,
    stockStatus: drAlthea?.stockStatus
  });

  const totalInStockDb = await ProductCol.countDocuments({
    inStock: true,
    stockQuantity: 100
  });
  const totalOutOfStockDb = await ProductCol.countDocuments({
    inStock: false,
    stockQuantity: 0
  });

  console.log('\n==========================================================');
  console.log('🎉 100% LIVE OGERIO SYNC COMPLETE');
  console.log('==========================================================');
  console.log(`📦 Total Live Crawled from Ogerio:   ${liveOgerioMap.size}`);
  console.log(`🎯 Total DB Products Matched:        ${matchedInStockCount + matchedOutOfStockCount}`);
  console.log(`   🟢 Live Ogerio IN STOCK:          ${matchedInStockCount}`);
  console.log(`   🔴 Live Ogerio OUT OF STOCK:      ${matchedOutOfStockCount}`);
  console.log(`⚪ Non-Ogerio Products (Untouched):   ${unmatchedCount}`);
  console.log('----------------------------------------------------------');
  console.log(`🔄 Newly Switched to IN STOCK (100): ${changedToInStockCount}`);
  console.log(`🔄 Newly Switched to OUT OF STOCK (0): ${changedToOutOfStockCount}`);
  console.log(`✅ Total Products Changed:           ${changedToInStockCount + changedToOutOfStockCount}`);
  console.log('----------------------------------------------------------');
  console.log(`📊 DB Stats Now:`);
  console.log(`   - In Stock (qty=100):             ${totalInStockDb}`);
  console.log(`   - Out of Stock (qty=0):           ${totalOutOfStockDb}`);
  console.log('==========================================================\n');

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('FATAL ERROR:', err);
  process.exit(1);
});
