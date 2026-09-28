import puppeteer from 'puppeteer-core';
import m from 'mongoose';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const rawCookieString = `_gcl_au=1.1.124190221.1790566594; _ga=GA1.1.843681729.1790566594; wordpress_test_cookie=WP%20Cookie%20check; wordpress_logged_in_65affc8df1b074206d0540bb7c0f54de=liorabeautyandwear%40gmail.com%7C1790739419%7CMGQCfhE7eHVqz5SgEAS3PL6lhS6dxrQ7riBUNO1dZLJ%7C48ad693648f7f263cda3b2b25915e7b601b5c4e5da69ebf3121a23f13da53d03; wfwaf-authcookie-1c7ab08f031298fbc2c588336c15d99f=104283%7Cother%7Cread%7C26dfb1365261d9837e23d33f12b82cd5e93ddc0ff295d7eb5d3fafc1a022e57f; _ga_4KG7WNH0Z4=GS2.1.s1790566594$o1$g1$t1790566734$j60$l0$h0; g_state={"i_l":0,"i_ll":1790570321866,"i_e":{"enable_itp_optimization":24},"i_et":1790570321866,"i_b":"dU7aoCo+F8h6G+e2cNlysfOCsLFtHSz6Rg4z4Vbbfi4"}; cf_clearance=POY5MaUXQHEBuH8nvEtj9OTpBieGC_fRodpK5YovQZ0-1790570322-1.2.1.1-WGlQzmr5Vu5rk9ZjTU9wTJ9Z3iY0Rn4E9fnG9F7A4QPG6nlmp7Ks1TZY94ItNW_sOkka2IfPjIV8391cpmcjFahJmsphuqARHJSCu5oNFLtndm4SlmOnvuAkStw6_vWiAcsJFfQOWIs1ngS57OesPv9gSsceyTpkg0Jk2iIzsmlrVqP43GXYi3BvzJBzY9xi0UP0OKdBcVmu0QDAFXt1aSw0Y0XRWChxa_pYfUbybwXwd.TY4ehvCmyGo9fu6vx27qpueo4T4o8JSv7Jtg0lsqlUZrfwe.RbPeLKdgZzkl2zquHvMBKAtf6MoDo7cB3ryBsIpDRtWiMvY.7kDYjuUwynMhAC3PE0Ra.JXMw.AKU`;

// Save to .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  let envContent = fs.readFileSync(envPath, 'utf8');
  if (envContent.includes('OGERIO_COOKIE=')) {
    envContent = envContent.replace(/OGERIO_COOKIE=.*(\r?\n|$)/, `OGERIO_COOKIE="${rawCookieString}"\n`);
  } else {
    envContent += `\nOGERIO_COOKIE="${rawCookieString}"\n`;
  }
  fs.writeFileSync(envPath, envContent, 'utf8');
}

const MONGO_URI =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  "mongodb://jisan_trends:liora889@ac-2e905xv-shard-00-00.6nzddbx.mongodb.net:27017,ac-2e905xv-shard-00-01.6nzddbx.mongodb.net:27017,ac-2e905xv-shard-00-02.6nzddbx.mongodb.net:27017/jisantrends?ssl=true&replicaSet=atlas-12gikm-shard-0&authSource=admin&retryWrites=true&w=majority";

const TOTAL_PAGES = 115;
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

function calculateMarkup(price) {
  const p = Number(price) || 0;
  if (p <= 0) return 0;
  if (p < 100) return 5;
  if (p < 300) return 10;
  if (p < 500) return 20;
  if (p < 1000) return 30;
  if (p < 1500) return 50;
  if (p < 2000) return 100;
  return 150; // 2000+
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
  console.log('🚀 LIORA: Full Ogerio Prices, Stock & New Products Sync');
  console.log('   Fresh Cloudflare Session Activated');
  console.log('====================================================\n');

  console.log('Connecting to MongoDB...');
  await m.connect(MONGO_URI);
  console.log('MongoDB connected successfully!\n');

  const db = m.connection;
  const ProductCol = db.collection('products');
  const BatchCol = db.collection('purchasebatches');
  const BrandCol = db.collection('brands');
  const CategoryCol = db.collection('categories');

  const allBrands = await BrandCol.find({}).toArray();
  const allCategories = await CategoryCol.find({}).toArray();
  const defaultCategory = allCategories.find(c => c.name.toLowerCase().includes('cosmetics') || c.level === 0) || allCategories[0];

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

  const queue = [];
  for (let i = 1; i <= TOTAL_PAGES; i++) queue.push(i);

  const scrapedCatalogMap = new Map(); // title -> item object
  let completedPages = 0;
  let reachedEnd = false;
  const startTime = Date.now();

  async function worker(tabIndex) {
    const p = pages[tabIndex];
    // Stagger worker start
    await new Promise(r => setTimeout(r, tabIndex * 1000));

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
            console.log(`[Worker ${tabIndex + 1}] Reached end of catalog at Page ${pageNum} (404).`);
            reachedEnd = true;
            queue.length = 0;
            success = true;
            break;
          }

          const extracted = await p.evaluate(() => {
            const cards = document.querySelectorAll('.product-grid-item, div.product');
            return Array.from(cards).map(card => {
              const a = card.querySelector('.wd-entities-title a, .product-title a');
              const img = card.querySelector('.product-image-link img, .wd-entities-media img, img');
              const text = card.innerText || '';

              // Wholesale Price
              const mWs = text.match(/Wholesale\s*Price:\s*([\d,]+)/i);
              const wholesalePrice = mWs ? parseInt(mWs[1].replace(/,/g, ''), 10) : null;

              // Regular Price (MRP)
              const mOrig = text.match(/Original price was:\s*([\d,]+)/i);
              const delEl = card.querySelector('.price del .woocommerce-Price-amount, .price del');
              let regularPrice = mOrig ? parseInt(mOrig[1].replace(/,/g, ''), 10) : (delEl ? parseInt(delEl.innerText.replace(/[^\d]/g, ''), 10) : null);

              // Current Sell Price (Ogerio Customer Selling Price)
              const mCurr = text.match(/Current price is:\s*([\d,]+)/i);
              const insEl = card.querySelector('.price ins .woocommerce-Price-amount, .price ins, .price > .woocommerce-Price-amount');
              let sellPrice = mCurr ? parseInt(mCurr[1].replace(/,/g, ''), 10) : (insEl ? parseInt(insEl.innerText.replace(/[^\d]/g, ''), 10) : null);

              if (!regularPrice && sellPrice) regularPrice = sellPrice;
              if (!sellPrice && regularPrice) sellPrice = regularPrice;

              // Out of Stock check
              const isOutOfStock = card.classList.contains('outofstock') ||
                card.querySelector('.out-of-stock, .badge-out-of-stock, .wd-out-of-stock') !== null ||
                /out of stock|স্টক আউট|sold out/i.test(text);

              // Image
              let imgSrc = '';
              if (img) {
                imgSrc = img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || img.getAttribute('src') || '';
                const srcset = img.getAttribute('data-srcset') || img.getAttribute('srcset') || '';
                if (srcset) {
                  const parts = srcset.split(',').map(s => s.trim().split(' '));
                  if (parts.length > 0 && parts[parts.length - 1][0]) {
                    imgSrc = parts[parts.length - 1][0];
                  }
                }
              }

              return {
                title: a ? a.innerText.trim() : '',
                url: a ? a.href : '',
                imgSrc,
                regularPrice,
                sellPrice,
                wholesalePrice,
                isOutOfStock
              };
            });
          });

          for (const item of extracted) {
            if (item.title && (item.sellPrice > 0 || item.wholesalePrice > 0)) {
              if (!scrapedCatalogMap.has(item.title)) {
                scrapedCatalogMap.set(item.title, item);
              }
            }
          }

          completedPages++;
          console.log(`[Worker ${tabIndex + 1}] Page ${pageNum} done | Items: ${extracted.length} | Scraped: ${scrapedCatalogMap.size} | Progress: ${completedPages}/${TOTAL_PAGES}`);

          success = true;
        } catch (err) {
          retries--;
          if (retries < 0) {
            console.error(`[Worker ${tabIndex + 1}] Requeueing Page ${pageNum}: ${err.message}`);
            queue.push(pageNum);
          } else {
            await new Promise(r => setTimeout(r, 1500));
          }
        }
      }
    }
  }

  console.log(`Starting crawl of Ogerio pages (1 to ${TOTAL_PAGES})...`);
  await Promise.all(pages.map((_, i) => worker(i)));
  await browser.close();

  console.log('\n====================================================');
  console.log(`Scraping completed in ${Math.round((Date.now() - startTime) / 1000)}s!`);
  console.log(`Total unique items collected: ${scrapedCatalogMap.size}`);
  console.log('====================================================\n');

  // Save backup
  const dumpPath = path.resolve(process.cwd(), 'scripts', 'scraped_full_catalog.json');
  fs.writeFileSync(dumpPath, JSON.stringify(Object.fromEntries(scrapedCatalogMap), null, 2), 'utf8');
  console.log(`💾 Saved catalog backup to: scripts/scraped_full_catalog.json\n`);

  console.log('Loading all LIORA products from database into memory...');
  const allDbProducts = await ProductCol.find({}).toArray();
  console.log(`Loaded ${allDbProducts.length} products from database.\n`);

  // Build fast lookup maps
  const exactMap = new Map();
  const lowerMap = new Map();
  const normMap = new Map();

  for (const p of allDbProducts) {
    if (!p.name) continue;
    exactMap.set(p.name, p);
    lowerMap.set(p.name.toLowerCase(), p);
    normMap.set(normalizeTitle(p.name), p);
  }

  function detectBrand(title) {
    const t = (title || '').toLowerCase();
    for (const b of allBrands) {
      if (t.includes(b.name.toLowerCase()) || t.includes(b.slug.replace(/-/g, ' '))) {
        return b._id;
      }
    }
    return null;
  }

  let updatedPriceCount = 0;
  let cosrxSkippedCount = 0;
  let oosSetCount = 0;
  let inStockRestoredCount = 0;
  let newlyAddedProductsCount = 0;

  const productBulkUpdates = [];
  const batchBulkUpdates = [];
  const matchedOgerioTitles = new Set();

  console.log('Processing updates and price calculations according to rules...');

  for (const [title, ogerioItem] of scrapedCatalogMap.entries()) {
    // 1. Exact match
    let prod = exactMap.get(title);

    // 2. Case-insensitive
    if (!prod) prod = lowerMap.get(title.toLowerCase());

    // 3. Normalized title
    if (!prod) prod = normMap.get(normalizeTitle(title));

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

    if (prod) {
      matchedOgerioTitles.add(title);

      const updateFields = {
        updatedAt: new Date()
      };

      // Wholesale Price Update
      if (ogerioItem.wholesalePrice && ogerioItem.wholesalePrice > 0) {
        updateFields.purchasePrice = ogerioItem.wholesalePrice;
        updateFields.wholesalePrice = ogerioItem.wholesalePrice;

        batchBulkUpdates.push({
          updateMany: {
            filter: { product: prod._id },
            update: { $set: { unitCost: ogerioItem.wholesalePrice, updatedAt: new Date() } }
          }
        });
      }

      // Stock Status Sync
      if (ogerioItem.isOutOfStock) {
        updateFields.stockQuantity = 0;
        updateFields.inStock = false;
        updateFields.stockStatus = 'Out of Stock';
        oosSetCount++;

        batchBulkUpdates.push({
          updateMany: {
            filter: { product: prod._id },
            update: { $set: { remaining: 0, updatedAt: new Date() } }
          }
        });
      } else {
        // In stock on Ogerio
        if (!prod.inStock || prod.stockQuantity <= 0 || prod.stockStatus === 'Out of Stock') {
          updateFields.stockQuantity = 10;
          updateFields.inStock = true;
          updateFields.stockStatus = 'In Stock';
          inStockRestoredCount++;

          batchBulkUpdates.push({
            updateMany: {
              filter: { product: prod._id },
              update: { $set: { remaining: 10, updatedAt: new Date() } }
            }
          });
        }
      }

      // Selling Price (Offer Price) Calculation
      const isCosrx = /cosrx/i.test(prod.name) || /cosrx/i.test(title);
      if (isCosrx) {
        cosrxSkippedCount++;
      } else if (ogerioItem.sellPrice && ogerioItem.sellPrice > 0) {
        const markup = calculateMarkup(ogerioItem.sellPrice);
        const newOffer = ogerioItem.sellPrice + markup;
        const newOriginal = Math.max(ogerioItem.regularPrice || 0, newOffer);
        const newDiscountBadge = newOriginal > newOffer
          ? String(Math.round(((newOriginal - newOffer) / newOriginal) * 100))
          : '';

        updateFields.offerPrice = newOffer;
        updateFields.originalPrice = newOriginal;
        updateFields.discountBadge = newDiscountBadge;
        updatedPriceCount++;
      }

      productBulkUpdates.push({
        updateOne: {
          filter: { _id: prod._id },
          update: { $set: updateFields }
        }
      });

    } else {
      // Missing Product in LIORA -> ADD TO DATABASE!
      const sellPrice = ogerioItem.sellPrice || ogerioItem.wholesalePrice || 100;
      const markup = calculateMarkup(sellPrice);
      const offerPrice = sellPrice + markup;
      const originalPrice = Math.max(ogerioItem.regularPrice || 0, offerPrice);
      const wholesalePrice = ogerioItem.wholesalePrice || Math.round(sellPrice * 0.75);
      const purchasePrice = wholesalePrice;
      const discountBadge = originalPrice > offerPrice
        ? String(Math.round(((originalPrice - offerPrice) / originalPrice) * 100))
        : '';

      const brandId = detectBrand(title);
      const categoryId = defaultCategory ? defaultCategory._id : null;

      const initialStock = ogerioItem.isOutOfStock ? 0 : 10;
      const inStock = initialStock > 0;
      const stockStatus = inStock ? 'In Stock' : 'Out of Stock';

      const newProdDoc = {
        name: title,
        category: categoryId,
        brand: brandId,
        purchasePrice,
        wholesalePrice,
        originalPrice,
        offerPrice,
        stockQuantity: initialStock,
        inStock,
        stockStatus,
        discountBadge,
        image: ogerioItem.imgSrc || '',
        images: [],
        description: '',
        rating: 5,
        reviewCount: 1,
        isFeatured: false,
        isTrending: false,
        isNewArrival: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const insRes = await ProductCol.insertOne(newProdDoc);
      newlyAddedProductsCount++;

      // Create opening batch for new product
      await BatchCol.insertOne({
        product: insRes.insertedId,
        productName: title,
        supplier: 'Ogerio Wholesale',
        ownerName: 'Owner',
        locationName: 'Main Store',
        purchaseDate: new Date(),
        qty: initialStock,
        remaining: initialStock,
        unitCost: purchasePrice,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
  }

  console.log(`\nExecuting ${productBulkUpdates.length} product updates in batches...`);
  let executedProductUpdates = 0;
  for (let i = 0; i < productBulkUpdates.length; i += 500) {
    const chunk = productBulkUpdates.slice(i, i + 500);
    const res = await ProductCol.bulkWrite(chunk);
    executedProductUpdates += res.modifiedCount;
  }

  console.log(`Executing ${batchBulkUpdates.length} batch updates...`);
  let executedBatchUpdates = 0;
  for (let i = 0; i < batchBulkUpdates.length; i += 500) {
    const chunk = batchBulkUpdates.slice(i, i + 500);
    const res = await BatchCol.bulkWrite(chunk);
    executedBatchUpdates += res.modifiedCount;
  }

  const totalDuration = Math.round((Date.now() - startTime) / 1000);
  console.log('\n====================================================');
  console.log('🎉 FULL CATALOG & PRICING SYNCHRONIZATION COMPLETED!');
  console.log('====================================================');
  console.log(`⏱️ Execution Time: ${totalDuration}s`);
  console.log(`🔍 Total Products Scraped from Ogerio: ${scrapedCatalogMap.size}`);
  console.log(`🏷️ Products with Updated Sell/Offer Price: ${updatedPriceCount}`);
  console.log(`🛡️ COSRX Products Untouched: ${cosrxSkippedCount}`);
  console.log(`🚫 Products Marked Stock Out (Ogerio OOS): ${oosSetCount}`);
  console.log(`✅ Products Restored In-Stock (Ogerio In-Stock): ${inStockRestoredCount}`);
  console.log(`➕ Brand New Products Added to LIORA: ${newlyAddedProductsCount}`);
  console.log(`💾 Total Modified in Database: ${executedProductUpdates}`);
  console.log('====================================================\n');

  await m.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error in catalog sync:', err);
  process.exit(1);
});
