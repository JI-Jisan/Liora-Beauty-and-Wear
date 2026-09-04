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

const CONCURRENCY = 4;
const TOTAL_PAGES = 150;

function cleanPrice(text) {
  if (!text) return 0;
  const num = parseFloat(text.replace(/[^\d.]/g, ''));
  return Number.isFinite(num) ? num : 0;
}

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function setupPage(page) {
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
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
  console.log('Connecting to MongoDB...');
  await m.connect(MONGO_URI);
  console.log('Connected to MongoDB!');

  const db = m.connection;
  const ProductCol = db.collection('products');
  const CategoryCol = db.collection('categories');
  const BrandCol = db.collection('brands');
  const BatchCol = db.collection('purchasebatches');

  // In-memory cache for fast category/brand resolution
  const categoryCache = new Map(); // key: `${parent || 'root'}_${name}` -> ObjectId
  const brandCache = new Map();    // key: slug -> ObjectId

  // Prime category cache from DB
  const existingCats = await CategoryCol.find({}).toArray();
  for (const c of existingCats) {
    categoryCache.set(`${c.parent ? c.parent.toString() : 'root'}_${c.name}`, c._id);
  }
  const existingBrands = await BrandCol.find({}).toArray();
  for (const b of existingBrands) {
    brandCache.set(b.slug, b._id);
  }

  console.log(`Launching Chrome with ${CONCURRENCY} parallel workers...`);
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-blink-features=AutomationControlled'
    ]
  });

  const mainPage = await browser.newPage();
  await setupPage(mainPage);

  // Pool of worker pages
  const workerPages = [];
  for (let i = 0; i < CONCURRENCY; i++) {
    const p = await browser.newPage();
    await setupPage(p);
    workerPages.push(p);
  }

  let totalSaved = 0;
  let totalSkipped = 0;
  const startTime = Date.now();

  async function processProduct(workerPage, url) {
    try {
      await workerPage.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });

      const data = await workerPage.evaluate(() => {
        const titleEl = document.querySelector('h1.product_title');
        const title = titleEl ? titleEl.textContent.trim() : '';

        const delEl = document.querySelector('p.price del span.woocommerce-Price-amount bdi');
        const insEl = document.querySelector('p.price ins span.woocommerce-Price-amount bdi');
        const regularEl = document.querySelector('p.price span.woocommerce-Price-amount bdi');

        const delPrice = delEl ? delEl.textContent : '';
        const offerPrice = insEl ? insEl.textContent : (regularEl ? regularEl.textContent : '');

        // Breadcrumb categories: Home / Makeup / Lip Makeup / Lip Liner
        const bcLinks = document.querySelectorAll('nav.woocommerce-breadcrumb a, .wd-breadcrumbs a');
        const categories = Array.from(bcLinks)
          .map(a => a.textContent.trim())
          .filter(t => t && t.toLowerCase() !== 'home');

        // Brand
        const brandImg = document.querySelector('.wd-product-brand img');
        const brandLink = document.querySelector('.wd-product-brand a');
        let brand = '';
        if (brandImg && brandImg.alt) brand = brandImg.alt.trim();
        else if (brandLink) brand = brandLink.textContent.trim();

        // High-res gallery links
        const galleryLinks = document.querySelectorAll('.woocommerce-product-gallery__image a');
        const images = Array.from(galleryLinks)
          .map(a => a.href)
          .filter(u => u && !u.startsWith('data:') && (u.endsWith('.jpg') || u.endsWith('.jpeg') || u.endsWith('.png') || u.endsWith('.webp')));

        // Description
        const descEl = document.querySelector('#tab-description, .woocommerce-Tabs-panel--description, .woocommerce-product-details__short-description');
        const description = descEl ? descEl.innerText.trim() : '';

        return { title, delPrice, offerPrice, categories, brand, images, description };
      });

      if (!data.title) return null;

      // Check if already in DB
      const exists = await ProductCol.findOne({ name: data.title }, { projection: { _id: 1 } });
      if (exists) {
        totalSkipped++;
        return { status: 'skipped', title: data.title };
      }

      const offerPrice = cleanPrice(data.offerPrice);
      let originalPrice = cleanPrice(data.delPrice);
      if (originalPrice <= 0 || originalPrice < offerPrice) originalPrice = offerPrice;
      if (offerPrice <= 0) return null;

      const purchasePrice = Math.round(offerPrice * 0.75);

      // Hierarchical Category Resolution
      const catChain = data.categories.length > 0 ? data.categories : ['Cosmetics'];
      let currentParentId = null;
      let currentAncestors = [];
      let targetCategoryId = null;

      for (let level = 0; level < catChain.length; level++) {
        const cName = catChain[level];
        const cacheKey = `${currentParentId ? currentParentId.toString() : 'root'}_${cName}`;
        
        let cId = categoryCache.get(cacheKey);
        if (!cId) {
          const newCat = {
            name: cName,
            parent: currentParentId,
            ancestors: [...currentAncestors],
            level: level,
            type: level === 0 ? 'main' : 'more',
            order: 0,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
          };
          const ins = await CategoryCol.insertOne(newCat);
          cId = ins.insertedId;
          categoryCache.set(cacheKey, cId);
        }

        targetCategoryId = cId;
        currentParentId = cId;
        currentAncestors.push(cId);
      }

      // Brand Resolution
      let brandId = null;
      if (data.brand) {
        const bSlug = slugify(data.brand);
        brandId = brandCache.get(bSlug);
        if (!brandId) {
          const bDoc = await BrandCol.findOne({ slug: bSlug }, { projection: { _id: 1 } });
          if (bDoc) {
            brandId = bDoc._id;
          } else {
            const insB = await BrandCol.insertOne({
              name: data.brand,
              slug: bSlug,
              logo: '',
              isActive: true,
              order: 0,
              createdAt: new Date(),
              updatedAt: new Date()
            });
            brandId = insB.insertedId;
          }
          brandCache.set(bSlug, brandId);
        }
      }

      const mainImage = data.images[0] || '';
      const extraImages = data.images.slice(1, 4);
      const discountBadge = originalPrice > offerPrice
        ? String(Math.round(((originalPrice - offerPrice) / originalPrice) * 100))
        : '';

      const stockQuantity = 25;

      const newProd = {
        name: data.title,
        category: targetCategoryId,
        brand: brandId,
        purchasePrice,
        originalPrice,
        offerPrice,
        stockQuantity,
        discountBadge,
        stockStatus: 'In Stock',
        image: mainImage,
        images: extraImages,
        description: data.description.slice(0, 5000),
        rating: 5,
        reviewCount: Math.floor(Math.random() * 12) + 4,
        isFeatured: false,
        isTrending: false,
        isNewArrival: true,
        isSlider: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const insP = await ProductCol.insertOne(newProd);

      await BatchCol.insertOne({
        product: insP.insertedId,
        productName: data.title,
        qty: stockQuantity,
        remaining: stockQuantity,
        unitCost: purchasePrice,
        purchaseDate: new Date(),
        ownerName: 'Opening Stock',
        locationName: 'Warehouse',
        supplier: 'Ogerio Import',
        note: 'Auto imported catalog batch',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      totalSaved++;
      return { status: 'saved', title: data.title, price: offerPrice };
    } catch (err) {
      return { status: 'error', error: err.message };
    }
  }

  try {
    for (let pageNum = 1; pageNum <= TOTAL_PAGES; pageNum++) {
      const pageUrl = `https://www.ogerio.com/shopbd/page/${pageNum}/`;
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      console.log(`\n======================================================`);
      console.log(`[Page ${pageNum}/${TOTAL_PAGES}] | Saved: ${totalSaved} | Skipped: ${totalSkipped} | Elapsed: ${elapsed}s`);
      console.log(`Navigating: ${pageUrl}`);
      console.log(`======================================================`);

      let links = [];
      try {
        await mainPage.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        links = await mainPage.evaluate(() => {
          const els = document.querySelectorAll('.wd-entities-title a, .product-title a');
          return Array.from(els).map(a => a.href).filter(Boolean);
        });
      } catch (e) {
        console.error(`Error loading page ${pageNum}:`, e.message);
        continue;
      }

      if (links.length === 0) {
        console.log('No links found on this page, continuing...');
        continue;
      }

      // Process links in concurrent batches of CONCURRENCY
      for (let i = 0; i < links.length; i += CONCURRENCY) {
        const chunk = links.slice(i, i + CONCURRENCY);
        const promises = chunk.map((url, idx) => processProduct(workerPages[idx], url));
        const results = await Promise.all(promises);

        for (const res of results) {
          if (!res) continue;
          if (res.status === 'saved') {
            console.log(`  + [SAVED] ${res.title} (Tk ${res.price})`);
          } else if (res.status === 'skipped') {
            // quiet skip
          } else if (res.status === 'error') {
            console.log(`  ! [ERR] ${res.error}`);
          }
        }
      }
    }

    const totalTime = Math.round((Date.now() - startTime) / 1000);
    console.log(`\nALL DONE! Successfully saved ${totalSaved} products (skipped ${totalSkipped}) in ${totalTime} seconds.`);
  } finally {
    await browser.close();
    await m.disconnect();
    console.log('Finished and cleaned up.');
  }
}

main().catch(console.error);
