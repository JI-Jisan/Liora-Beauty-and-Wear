import puppeteer from '../node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
import m from '../node_modules/mongoose/index.js';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36';

const MONGO_URI =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  "mongodb://jisan_trends:liora889@ac-2e905xv-shard-00-00.6nzddbx.mongodb.net:27017,ac-2e905xv-shard-00-01.6nzddbx.mongodb.net:27017,ac-2e905xv-shard-00-02.6nzddbx.mongodb.net:27017/jisantrends?ssl=true&replicaSet=atlas-12gikm-shard-0&authSource=admin&retryWrites=true&w=majority";

const rawCookieString = `_ga=GA1.1.843681729.1790566594; wordpress_logged_in_65affc8df1b074206d0540bb7c0f54de=liorabeautyandwear%40gmail.com%7C1793531834%7ClEM6ydgjeSK4f8ORTKL4Pp1LJcJhpZ32mYzanEj0Dko%7C53b8546ae46a6dcefcd3230e1af45935d2f4f58019492dbcdb0d8483889cc445; _gcl_au=1.1.124190221.1790566594.1672687054.1792322322.1792322322.2040090187.1792322322.1792322322; woodmart_recently_viewed_products=255295|34407|74387|334755|261253|158272; cf_clearance=xE9oQphIGix2NCBEKK2kqJaRoCsy_pQoT_SO9.8IiOU-1793029807-1.2.1.1-pP2O56_LSGaAlpTa70SoLlKCAtpJgqqw3YUUiLcQeFuCqVbIx_7.5erS30qZj4hHGYZp4jXEklXiQSNVcn5C4BupJuNcKChuSZ5iS92lRck3FN60RBKHe_iMvvEYsbkwgCk0rV2d05LpmNbpXl_eFk7qXCHNpOB2wQRXkSQsudrvFHfBcT6VfJaWbeA9psx5OCgVEs5vGaBUamzNBOzRN202fTPi0vOIG2k3gQWyKW8XgNiTMsEnZyi4jBFYHImL.5ELScyKRvUsKJMNSMjr_ZLAFm8iolJBSuxAOz7vzVqW7h5r8YiHJgAnQb6IXYdmKzWKRIUPKuvF2DfaJEiNNIFvn70tq0XlOL6.JOj0hKQ; __Host-ogn_device=967dbea1e741c257878453a6776e114bff980e5438f814b04e74568b16cd5031; g_state={"i_l":0,"i_ll":1793025568696,"i_e":{"enable_itp_optimization":24},"i_et":1793025568696}; __Host-ogn_session=11030611ad16000eccef7fef70393864a6e273da2b75840b1833da2e35a6abe5; _ga_4KG7WNH0Z4=GS2.1.s1793025457$o8$g1$t1793025621$j36$l0$h0`;

function parseCookies(str) {
  return str.split(';').map(part => {
    const trimmed = part.trim();
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) return null;
    const name = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (name.startsWith('__Host-')) {
      return { name, value, url: 'https://www.ogerio.com/', secure: true };
    }
    return { name, value, domain: '.ogerio.com', path: '/' };
  }).filter(Boolean);
}

function normalizeTitle(t) {
  return (t || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractVolumeTag(title) {
  const m = (title || '').match(/(\d+(?:\.\d+)?)\s*(ml|gm|g|kg|l|oz|pcs?|tablets?)\b/i);
  return m ? `${m[1]}${m[2].toLowerCase()}` : '';
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
  return 150;
}

async function main() {
  console.log('====================================================');
  console.log('🚀 LIORA: Ogerio Live Wholesale Prices, Stock & Missing Products Sync');
  console.log('   Account: liorabeautyandwear@gmail.com');
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
  const defaultCategory =
    allCategories.find(c => c.name.toLowerCase().includes('cosmetics') || c.level === 0) || allCategories[0];

  function detectBrand(title) {
    const t = (title || '').toLowerCase();
    for (const b of allBrands) {
      if (t.includes(b.name.toLowerCase()) || (b.slug && t.includes(b.slug.replace(/-/g, ' ')))) {
        return b._id;
      }
    }
    return null;
  }

  console.log('Launching Chrome with puppeteer...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
  });

  const page = await browser.newPage();
  await page.setUserAgent(USER_AGENT);
  const cookies = parseCookies(rawCookieString);
  await page.setCookie(...cookies);

  // Block images, fonts, styles to speed up page navigation
  await page.setRequestInterception(true);
  page.on('request', req => {
    const type = req.resourceType();
    if (['font', 'media'].includes(type)) {
      req.abort();
    } else {
      req.continue();
    }
  });

  console.log('Navigating to Ogerio Shop...');
  await page.goto('https://www.ogerio.com/shop/', { waitUntil: 'domcontentloaded', timeout: 35000 });
  await new Promise(r => setTimeout(r, 2000));

  console.log('Loading full shop catalog by clicking "Load more products"...');
  let clickCount = 0;
  let totalCards = 0;
  let noProgressCount = 0;
  const MAX_CLICKS = 300; // up to 3600+ products

  while (clickCount < MAX_CLICKS) {
    const prevCount = totalCards;
    const clickSuccess = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b =>
        b.innerText.toLowerCase().includes('load more')
      );
      if (btn && !btn.disabled) {
        btn.click();
        return true;
      }
      return false;
    });

    if (!clickSuccess) {
      console.log(`\nReached end of products or "Load more" button no longer present (Clicks: ${clickCount})`);
      break;
    }

    clickCount++;
    // Human-like dynamic delay
    await new Promise(r => setTimeout(r, 1400 + Math.random() * 400));

    totalCards = await page.evaluate(() => document.querySelectorAll('.product-card').length);

    if (totalCards === prevCount) {
      noProgressCount++;
      if (noProgressCount >= 4) {
        console.log(`\nCards count stayed at ${totalCards} for 4 checks. Catalog completely loaded.`);
        break;
      }
    } else {
      noProgressCount = 0;
    }

    if (clickCount % 10 === 0 || clickCount === 1) {
      process.stdout.write(`\r[Catalog Crawl] Clicks: ${clickCount} | Loaded Products: ${totalCards}...`);
    }
  }

  console.log(`\n\n✅ Finished crawling DOM! Total product cards loaded: ${totalCards}\n`);

  // Extract all product cards basic metadata
  console.log('Extracting card metadata (title, id, image, url)...');
  const cardItems = await page.evaluate(() => {
    const cards = document.querySelectorAll('.product-card');
    return Array.from(cards).map(card => {
      const text = card.innerText || '';
      const link = card.querySelector('a[href]');
      const img = card.querySelector('img');
      const href = link ? link.getAttribute('href') : '';
      const rawTitle = link ? (link.getAttribute('aria-label') || link.innerText || '').trim() : '';
      const idStr = card.getAttribute('data-product-id');
      const id = idStr ? parseInt(idStr, 10) : null;
      const imgSrc = img ? (img.getAttribute('src') || '') : '';

      return {
        id,
        title: rawTitle,
        href,
        imgSrc
      };
    }).filter(c => c.id && c.title);
  });

  console.log(`Extracted metadata for ${cardItems.length} products.\n`);

  // Fetch prices in chunks of 50 via in-page /api/store/
  console.log('Fetching live wholesale prices, regular prices, and stock status from /api/store/...');
  const productPriceMap = new Map(); // id -> price object
  const CHUNK_SIZE = 50;

  for (let i = 0; i < cardItems.length; i += CHUNK_SIZE) {
    const chunk = cardItems.slice(i, i + CHUNK_SIZE);
    const ids = chunk.map(c => c.id);

    try {
      const priceData = await page.evaluate(async (idsPayload) => {
        const res = await fetch('/api/store/', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            operation: 'catalog/prices',
            payload: { ids: idsPayload }
          })
        });
        return await res.json();
      }, ids);

      if (priceData && Array.isArray(priceData.items)) {
        for (const it of priceData.items) {
          productPriceMap.set(it.id, it);
        }
      }

      const progressPct = Math.round(((i + chunk.length) / cardItems.length) * 100);
      process.stdout.write(`\r[Price API] Fetched ${productPriceMap.size} / ${cardItems.length} (${progressPct}%)...`);
    } catch (err) {
      console.error(`\nError fetching price chunk at index ${i}:`, err.message);
    }
  }

  await browser.close();
  console.log(`\n\n✅ Successfully fetched live wholesale pricing for ${productPriceMap.size} products!\n`);

  // Save backup dump
  const dumpPath = path.resolve(process.cwd(), 'scripts', 'ogerio_live_sync_dump.json');
  const fullScrapedList = cardItems.map(c => {
    const pInfo = productPriceMap.get(c.id) || {};
    return {
      id: c.id,
      title: c.title,
      imgSrc: c.imgSrc,
      wholesalePrice: pInfo.price ? parseInt(pInfo.price, 10) : null,
      regularPrice: pInfo.regular_price ? parseInt(pInfo.regular_price, 10) : null,
      stockStatus: pInfo.stock_status || 'instock',
      isOutOfStock: pInfo.stock_status === 'outofstock' || pInfo.purchasable === false,
      maxQuantity: pInfo.max_quantity || 10
    };
  });
  fs.writeFileSync(dumpPath, JSON.stringify(fullScrapedList, null, 2), 'utf8');
  console.log(`💾 Saved catalog backup dump to: scripts/ogerio_live_sync_dump.json\n`);

  // ==========================================
  // SYNC TO MONGODB DATABASE
  // ==========================================
  console.log('Loading all existing LIORA database products...');
  const allDbProducts = await ProductCol.find({}).toArray();
  console.log(`Found ${allDbProducts.length} products currently in LIORA database.\n`);

  // Build high-precision matching maps
  const exactMap = new Map();
  const lowerMap = new Map();
  const normMap = new Map();

  for (const p of allDbProducts) {
    if (!p.name) continue;
    exactMap.set(p.name, p);
    lowerMap.set(p.name.toLowerCase().trim(), p);
    normMap.set(normalizeTitle(p.name), p);
  }

  let updatedWholesalePriceCount = 0;
  let oosMarkedCount = 0;
  let inStockRestoredCount = 0;
  let newProductsAddedCount = 0;
  const matchedOgerioIds = new Set();

  const productBulkUpdates = [];
  const batchBulkUpdates = [];

  console.log('Aligning Ogerio catalog with LIORA database...');

  for (const ogerioItem of fullScrapedList) {
    const title = ogerioItem.title;
    const vol = extractVolumeTag(title);

    let prod = exactMap.get(title);
    if (!prod) prod = lowerMap.get(title.toLowerCase().trim());
    if (!prod) prod = normMap.get(normalizeTitle(title));

    // Word prefix matching with volume guard
    if (!prod) {
      const norm = normalizeTitle(title);
      const words = norm.split(' ').filter(w => w.length > 2);
      if (words.length >= 3) {
        const prefix = words.slice(0, 3).join(' ');
        for (const [dbNorm, dbP] of normMap.entries()) {
          if (dbNorm.includes(prefix)) {
            // Guard: volume/size must match if present (e.g. 100ml must not match 200ml)
            const dbVol = extractVolumeTag(dbP.name);
            if (!vol || !dbVol || vol === dbVol) {
              prod = dbP;
              break;
            }
          }
        }
      }
    }

    if (prod) {
      matchedOgerioIds.add(ogerioItem.id);
      const updateFields = { updatedAt: new Date() };

      // 1. Update Wholesale Price / Buying Price
      if (ogerioItem.wholesalePrice && ogerioItem.wholesalePrice > 0) {
        updateFields.purchasePrice = ogerioItem.wholesalePrice;
        updateFields.wholesalePrice = ogerioItem.wholesalePrice;
        updatedWholesalePriceCount++;

        batchBulkUpdates.push({
          updateMany: {
            filter: { product: prod._id },
            update: { $set: { unitCost: ogerioItem.wholesalePrice, updatedAt: new Date() } }
          }
        });
      }

      // 2. Sync Stock Status
      if (ogerioItem.isOutOfStock) {
        updateFields.inStock = false;
        updateFields.stockQuantity = 0;
        updateFields.stockStatus = 'Out of Stock';
        oosMarkedCount++;

        batchBulkUpdates.push({
          updateMany: {
            filter: { product: prod._id },
            update: { $set: { remaining: 0, updatedAt: new Date() } }
          }
        });
      } else {
        // In stock on Ogerio
        if (!prod.inStock || prod.stockQuantity <= 0 || prod.stockStatus === 'Out of Stock') {
          const restoreQty = Math.min(25, ogerioItem.maxQuantity || 10);
          updateFields.inStock = true;
          updateFields.stockQuantity = restoreQty;
          updateFields.stockStatus = 'In Stock';
          inStockRestoredCount++;

          batchBulkUpdates.push({
            updateMany: {
              filter: { product: prod._id },
              update: { $set: { remaining: restoreQty, updatedAt: new Date() } }
            }
          });
        }
      }

      productBulkUpdates.push({
        updateOne: {
          filter: { _id: prod._id },
          update: { $set: updateFields }
        }
      });
    } else {
      // 3. New Product in Ogerio, NOT in LIORA -> ADD TO DATABASE!
      const wsPrice = ogerioItem.wholesalePrice || 100;
      const regPrice = ogerioItem.regularPrice || Math.round(wsPrice * 1.35);
      const markup = calculateMarkup(regPrice);
      const offerPrice = regPrice + markup;
      const originalPrice = Math.max(regPrice, offerPrice);
      const discountBadge =
        originalPrice > offerPrice ? String(Math.round(((originalPrice - offerPrice) / originalPrice) * 100)) : '';

      const brandId = detectBrand(title);
      const categoryId = defaultCategory ? defaultCategory._id : null;
      const initialStock = ogerioItem.isOutOfStock ? 0 : Math.min(20, ogerioItem.maxQuantity || 10);
      const inStock = initialStock > 0;
      const stockStatus = inStock ? 'In Stock' : 'Out of Stock';

      const newProdDoc = {
        name: title,
        category: categoryId,
        brand: brandId,
        purchasePrice: wsPrice,
        wholesalePrice: wsPrice,
        wholesaleMinQty: 6,
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
      newProductsAddedCount++;

      // Create opening batch
      await BatchCol.insertOne({
        product: insRes.insertedId,
        productName: title,
        supplier: 'Ogerio Wholesale',
        ownerName: 'Jisan',
        locationName: 'Main Store',
        purchaseDate: new Date(),
        qty: initialStock,
        remaining: initialStock,
        unitCost: wsPrice,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
  }

  // Execute bulk updates
  console.log(`\nWriting ${productBulkUpdates.length} product updates to database...`);
  let executedProducts = 0;
  for (let i = 0; i < productBulkUpdates.length; i += 500) {
    const chunk = productBulkUpdates.slice(i, i + 500);
    const res = await ProductCol.bulkWrite(chunk);
    executedProducts += res.modifiedCount;
  }

  console.log(`Writing ${batchBulkUpdates.length} batch updates to database...`);
  let executedBatches = 0;
  for (let i = 0; i < batchBulkUpdates.length; i += 500) {
    const chunk = batchBulkUpdates.slice(i, i + 500);
    const res = await BatchCol.bulkWrite(chunk);
    executedBatches += res.modifiedCount;
  }

  await m.disconnect();

  console.log('\n====================================================');
  console.log('🎉 SYNC COMPLETED SUCCESSFULLY!');
  console.log(`   💰 Wholesale Purchase Prices Updated: ${updatedWholesalePriceCount}`);
  console.log(`   🔴 Out-of-Stock Products Marked:      ${oosMarkedCount}`);
  console.log(`   🟢 In-Stock Products Restored:        ${inStockRestoredCount}`);
  console.log(`   ✨ New Products Added to LIORA:       ${newProductsAddedCount}`);
  console.log('====================================================\n');
}

main().catch(e => {
  console.error('\nFatal sync error:', e);
  process.exit(1);
});
