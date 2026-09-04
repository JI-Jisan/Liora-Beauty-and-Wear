import mongoose from 'puppeteer-core';
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

// Parse CLI args: e.g. --limit 10 or --pages 1
const args = process.argv.slice(2);
let limit = 10;
const limitIdx = args.indexOf('--limit');
if (limitIdx !== -1 && args[limitIdx + 1]) {
  limit = parseInt(args[limitIdx + 1], 10) || 10;
}

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

async function run() {
  console.log('Connecting to MongoDB...');
  await m.connect(MONGO_URI);
  console.log('MongoDB connected successfully!');

  const db = m.connection;
  const ProductCol = db.collection('products');
  const CategoryCol = db.collection('categories');
  const BrandCol = db.collection('brands');
  const BatchCol = db.collection('purchasebatches');

  console.log(`Launching Chrome (target limit: ${limit} products)...`);
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

  try {
    let currentPage = 1;
    let importedCount = 0;

    while (importedCount < limit) {
      const pageUrl = `https://www.ogerio.com/shopbd/page/${currentPage}/`;
      console.log(`\nVisiting listing page ${currentPage}: ${pageUrl}`);
      
      await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await new Promise(r => setTimeout(r, 2000));

      const links = await page.evaluate(() => {
        const titleLinks = document.querySelectorAll('.wd-entities-title a, .product-title a');
        return Array.from(titleLinks).map(a => a.href).filter(Boolean);
      });

      console.log(`Found ${links.length} product links on page ${currentPage}`);
      if (links.length === 0) {
        console.log('No more products found.');
        break;
      }

      for (const link of links) {
        if (importedCount >= limit) break;

        try {
          console.log(`[${importedCount + 1}/${limit}] Fetching: ${link}`);
          await page.goto(link, { waitUntil: 'domcontentloaded', timeout: 35000 });
          await new Promise(r => setTimeout(r, 1500));

          const pData = await page.evaluate(() => {
            const titleEl = document.querySelector('h1.product_title');
            const title = titleEl ? titleEl.textContent.trim() : '';

            // prices
            const delEl = document.querySelector('p.price del span.woocommerce-Price-amount bdi');
            const insEl = document.querySelector('p.price ins span.woocommerce-Price-amount bdi');
            const regularAmountEl = document.querySelector('p.price span.woocommerce-Price-amount bdi');

            const delPrice = delEl ? delEl.textContent : '';
            const offerPrice = insEl ? insEl.textContent : (regularAmountEl ? regularAmountEl.textContent : '');

            // images: full res hrefs
            const galleryLinks = document.querySelectorAll('.woocommerce-product-gallery__image a');
            const images = Array.from(galleryLinks)
              .map(a => a.href)
              .filter(u => u && !u.startsWith('data:') && (u.endsWith('.jpg') || u.endsWith('.jpeg') || u.endsWith('.png') || u.endsWith('.webp')));

            // categories
            const catEls = document.querySelectorAll('.posted_in a');
            const categories = Array.from(catEls)
              .map(a => a.textContent.trim())
              .filter(c => c && !c.toLowerCase().includes('flash sale'));

            // brand
            const brandImg = document.querySelector('.wd-product-brand img');
            const brandLink = document.querySelector('.wd-product-brand a');
            let brand = '';
            if (brandImg && brandImg.alt) brand = brandImg.alt.trim();
            else if (brandLink) brand = brandLink.textContent.trim();

            // description
            const descEl = document.querySelector('#tab-description, .woocommerce-Tabs-panel--description, .woocommerce-product-details__short-description');
            const description = descEl ? descEl.innerText.trim() : '';

            return { title, delPrice, offerPrice, images, categories, brand, description };
          });

          if (!pData.title) {
            console.log('   Skipped: No title');
            continue;
          }

          // Check if already in MongoDB
          const existing = await ProductCol.findOne({ name: pData.title });
          if (existing) {
            console.log(`   Already exists in DB: ${pData.title}`);
            importedCount++;
            continue;
          }

          const offerPrice = cleanPrice(pData.offerPrice);
          let originalPrice = cleanPrice(pData.delPrice);
          if (originalPrice <= 0 || originalPrice < offerPrice) {
            originalPrice = offerPrice;
          }
          if (offerPrice <= 0) {
            console.log('   Skipped: Invalid price');
            continue;
          }

          // Purchase price (assume 75% for initial margin calculation)
          const purchasePrice = Math.round(offerPrice * 0.75);

          // categories from breadcrumbs: Home / Makeup / Lip Makeup / Lip Liner
          const breadcrumbCats = await page.evaluate(() => {
            const bcLinks = document.querySelectorAll('nav.woocommerce-breadcrumb a, .wd-breadcrumbs a');
            return Array.from(bcLinks)
              .map(a => a.textContent.trim())
              .filter(t => t && t.toLowerCase() !== 'home');
          });

          // Fallback if breadcrumb is empty
          const catChain = breadcrumbCats.length > 0 ? breadcrumbCats : (pData.categories.length > 0 ? pData.categories : ['Cosmetics']);

          // Build/resolve Category hierarchy in DB (Main -> Sub -> Child)
          let currentParentId = null;
          let currentAncestors = [];
          let targetCategoryId = null;

          for (let level = 0; level < catChain.length; level++) {
            const cName = catChain[level];
            let cDoc = await CategoryCol.findOne({
              name: cName,
              parent: currentParentId
            });

            if (!cDoc) {
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
              targetCategoryId = ins.insertedId;
              console.log(`   Created Category (Level ${level}): ${cName}`);
            } else {
              targetCategoryId = cDoc._id;
            }

            currentParentId = targetCategoryId;
            currentAncestors.push(targetCategoryId);
          }

          const categoryId = targetCategoryId;

          // Resolve Brand
          let brandId = null;
          if (pData.brand) {
            const brandSlug = slugify(pData.brand);
            let brandDoc = await BrandCol.findOne({ slug: brandSlug });
            if (!brandDoc) {
              const bRes = await BrandCol.insertOne({
                name: pData.brand,
                slug: brandSlug,
                logo: '',
                isActive: true,
                order: 0,
                createdAt: new Date(),
                updatedAt: new Date()
              });
              brandId = bRes.insertedId;
              console.log(`   Created new Brand: ${pData.brand}`);
            } else {
              brandId = brandDoc._id;
            }
          }

          // Images
          const mainImage = pData.images[0] || '';
          const extraImages = pData.images.slice(1, 4);

          // Discount badge
          const discountBadge = originalPrice > offerPrice
            ? String(Math.round(((originalPrice - offerPrice) / originalPrice) * 100))
            : '';

          const stockQuantity = 20;

          // Insert product
          const newProd = {
            name: pData.title,
            category: categoryId,
            brand: brandId,
            purchasePrice,
            originalPrice,
            offerPrice,
            stockQuantity,
            discountBadge,
            stockStatus: 'In Stock',
            image: mainImage,
            images: extraImages,
            description: pData.description.slice(0, 5000),
            rating: 5,
            reviewCount: Math.floor(Math.random() * 15) + 3,
            isFeatured: importedCount < 4,   // First few as featured
            isTrending: importedCount < 6,
            isNewArrival: true,
            isSlider: importedCount < 2,
            createdAt: new Date(),
            updatedAt: new Date()
          };

          const insertRes = await ProductCol.insertOne(newProd);

          // Insert opening batch
          await BatchCol.insertOne({
            product: insertRes.insertedId,
            productName: pData.title,
            qty: stockQuantity,
            remaining: stockQuantity,
            unitCost: purchasePrice,
            purchaseDate: new Date(),
            ownerName: 'Opening Stock',
            locationName: 'Warehouse',
            supplier: 'Ogerio Import',
            note: 'Initial import batch',
            createdAt: new Date(),
            updatedAt: new Date()
          });

          importedCount++;
          console.log(`   SUCCESS: ${pData.title} | ${offerPrice} Tk | ${pData.images.length} images`);
        } catch (err) {
          console.error(`   Error importing ${link}:`, err.message);
        }
      }

      currentPage++;
    }

    console.log(`\nFinished! Successfully imported ${importedCount} products.`);
  } finally {
    await browser.close();
    await m.disconnect();
    console.log('Database disconnected.');
  }
}

run().catch(console.error);
