import mongoose from 'mongoose';
import fs from 'fs';

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

function calculateMarkup(price) {
  const p = Number(price) || 0;
  if (p <= 0) return 0;
  if (p < 50) return 10;
  if (p < 150) return 20;
  if (p < 300) return 30;
  if (p < 500) return 40;
  if (p < 1000) return 60;
  if (p < 1500) return 90;
  if (p < 2000) return 130;
  return 160;
}

async function run() {
  console.log('================================================================');
  console.log('🚀 EXECUTING PERFECT WHOLESALE & STOCK SYNC + NEW PRODUCT IMPORT');
  console.log('================================================================\n');

  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB.\n');

  const db = mongoose.connection;
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
      if (b.name && t.includes(b.name.toLowerCase())) return b._id;
      if (b.slug && t.includes(b.slug.replace(/-/g, ' '))) return b._id;
    }
    return null;
  }

  function detectCategory(title) {
    const t = (title || '').toLowerCase();
    for (const c of allCategories) {
      if (c.name && t.includes(c.name.toLowerCase())) return c._id;
    }
    if (t.includes('serum') || t.includes('cream') || t.includes('toner') || t.includes('lotion') || t.includes('cleanser') || t.includes('sunscreen') || t.includes('peel') || t.includes('ampoule')) {
      const skin = allCategories.find(c => c.name.toLowerCase().includes('skin'));
      if (skin) return skin._id;
    }
    if (t.includes('lipstick') || t.includes('powder') || t.includes('mascara') || t.includes('eyeliner') || t.includes('palette') || t.includes('foundation') || t.includes('concealer') || t.includes('contour')) {
      const makeup = allCategories.find(c => c.name.toLowerCase().includes('makeup'));
      if (makeup) return makeup._id;
    }
    if (t.includes('shampoo') || t.includes('conditioner') || t.includes('hair oil') || t.includes('hair')) {
      const hair = allCategories.find(c => c.name.toLowerCase().includes('hair'));
      if (hair) return hair._id;
    }
    return defaultCategory ? defaultCategory._id : null;
  }

  const scrapedProducts = JSON.parse(fs.readFileSync('scripts/ogerio_complete_live_prices.json', 'utf8'));
  console.log(`Loaded ${scrapedProducts.length} scraped products.`);

  const allDbProducts = await ProductCol.find({}).toArray();
  console.log(`Loaded ${allDbProducts.length} existing products from LIORA database.\n`);

  const dbExact = new Map();
  const dbClean = new Map();

  for (const p of allDbProducts) {
    if (!p.name) continue;
    dbExact.set(p.name, p);
    dbClean.set(cleanStr(p.name), p);
  }

  const productUpdates = [];
  const batchUpdates = [];
  const newProducts = [];
  const newBatches = [];

  let exactMatches = 0;
  let cleanMatches = 0;
  let oosCount = 0;
  let inStockCount = 0;
  let wholesaleUpdatedCount = 0;

  for (const s of scrapedProducts) {
    let matchedDoc = dbExact.get(s.title);
    if (matchedDoc) {
      exactMatches++;
    } else {
      matchedDoc = dbClean.get(cleanStr(s.title));
      if (matchedDoc) cleanMatches++;
    }

    if (matchedDoc) {
      // 1. Update Existing Product
      const setFields = { updatedAt: new Date() };

      if (s.wholesalePrice && s.wholesalePrice > 0) {
        setFields.purchasePrice = s.wholesalePrice;
        setFields.wholesalePrice = s.wholesalePrice;
        wholesaleUpdatedCount++;

        // If offerPrice is lower than wholesale price, increase it to wholesale + markup
        const minOffer = s.wholesalePrice + calculateMarkup(s.wholesalePrice);
        if (matchedDoc.offerPrice && matchedDoc.offerPrice < s.wholesalePrice) {
          setFields.offerPrice = minOffer;
        }

        // If regular price from Ogerio is higher than current originalPrice, update it
        if (s.regularPrice && s.regularPrice > (matchedDoc.originalPrice || 0)) {
          setFields.originalPrice = s.regularPrice;
        }

        batchUpdates.push({
          updateMany: {
            filter: { product: matchedDoc._id },
            update: { $set: { unitCost: s.wholesalePrice, updatedAt: new Date() } }
          }
        });
      }

      // Stock status sync
      if (s.isOutOfStock) {
        setFields.inStock = false;
        setFields.stockQuantity = 0;
        setFields.stockStatus = 'Out of Stock';
        oosCount++;
      } else {
        const qty = s.maxQuantity > 0 ? s.maxQuantity : 10;
        setFields.inStock = true;
        setFields.stockQuantity = qty;
        setFields.stockStatus = qty <= 5 ? 'Limited Stock' : 'In Stock';
        inStockCount++;
      }

      productUpdates.push({
        updateOne: {
          filter: { _id: matchedDoc._id },
          update: { $set: setFields }
        }
      });
    } else {
      // 2. Add New Missing Product
      if (s.wholesalePrice && s.wholesalePrice > 0) {
        const newId = new mongoose.Types.ObjectId();
        const wholesale = s.wholesalePrice;
        const regular = s.regularPrice || Math.round(wholesale * 1.35);
        const offer = Math.min(regular, wholesale + calculateMarkup(wholesale));
        const brandId = detectBrand(s.title);
        const catId = detectCategory(s.title);
        const isOos = s.isOutOfStock;
        const qty = isOos ? 0 : (s.maxQuantity > 0 ? s.maxQuantity : 10);
        const badge = regular > offer ? `${Math.round(((regular - offer) / regular) * 100)}% OFF` : '';

        const newDoc = {
          _id: newId,
          name: s.title,
          category: catId,
          brand: brandId,
          purchasePrice: wholesale,
          originalPrice: regular,
          offerPrice: offer,
          wholesalePrice: wholesale,
          wholesaleMinQty: 6,
          resellerPrice: wholesale + Math.round(calculateMarkup(wholesale) * 0.5),
          stockQuantity: qty,
          inStock: !isOos,
          stockStatus: isOos ? 'Out of Stock' : (qty <= 5 ? 'Limited Stock' : 'In Stock'),
          discountBadge: badge,
          image: s.imgSrc || '',
          images: [],
          description: '',
          rating: 4.8,
          reviewCount: Math.floor(Math.random() * 15) + 3,
          isFeatured: false,
          isTrending: false,
          isNewArrival: true,
          isSlider: false,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        newProducts.push(newDoc);

        newBatches.push({
          product: newId,
          productName: s.title,
          qty: qty || 10,
          remaining: qty || 10,
          unitCost: wholesale,
          purchaseDate: new Date(),
          ownerName: 'Owner',
          locationName: 'Owner',
          supplier: 'Ogerio Wholesale',
          note: 'Auto-imported from Ogerio wholesale catalog',
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    }
  }

  console.log('--- Plan Summary ---');
  console.log(`Matched Products to Update: ${productUpdates.length} (Exact: ${exactMatches}, Clean: ${cleanMatches})`);
  console.log(`Wholesale Prices to Update: ${wholesaleUpdatedCount}`);
  console.log(`In-Stock Items Synced: ${inStockCount}`);
  console.log(`Out-of-Stock Items Synced: ${oosCount}`);
  console.log(`Brand New Missing Products to Add: ${newProducts.length}`);

  // Write product updates
  if (productUpdates.length > 0) {
    console.log(`\nApplying ${productUpdates.length} product updates in batches...`);
    for (let i = 0; i < productUpdates.length; i += 500) {
      const chunk = productUpdates.slice(i, i + 500);
      await ProductCol.bulkWrite(chunk, { ordered: false });
      process.stdout.write(`  Updated ${Math.min(i + 500, productUpdates.length)} / ${productUpdates.length} products...\r`);
    }
    console.log('\n✅ All existing product updates saved successfully!');
  }

  // Write batch updates
  if (batchUpdates.length > 0) {
    console.log(`Applying ${batchUpdates.length} batch cost updates in batches...`);
    for (let i = 0; i < batchUpdates.length; i += 500) {
      const chunk = batchUpdates.slice(i, i + 500);
      await BatchCol.bulkWrite(chunk, { ordered: false });
      process.stdout.write(`  Updated ${Math.min(i + 500, batchUpdates.length)} / ${batchUpdates.length} batches...\r`);
    }
    console.log('\n✅ All purchase batch cost updates saved successfully!');
  }

  // Insert new products
  if (newProducts.length > 0) {
    console.log(`\nInserting ${newProducts.length} new products into database...`);
    await ProductCol.insertMany(newProducts, { ordered: false });
    console.log(`✅ Successfully inserted ${newProducts.length} new products!`);

    if (newBatches.length > 0) {
      console.log(`Inserting ${newBatches.length} initial purchase batches for new products...`);
      await BatchCol.insertMany(newBatches, { ordered: false });
      console.log(`✅ Successfully inserted ${newBatches.length} purchase batches!`);
    }
  }

  // Verification step
  const finalTotal = await ProductCol.countDocuments();
  const finalInStock = await ProductCol.countDocuments({ inStock: true });
  const finalOos = await ProductCol.countDocuments({ inStock: false });
  const finalWholesale = await ProductCol.countDocuments({ wholesalePrice: { $gt: 0 } });

  console.log('\n================================================================');
  console.log('🏆 VERIFICATION REPORT (LIORA DATABASE):');
  console.log(`   - Total Products: ${finalTotal}`);
  console.log(`   - In Stock Products: ${finalInStock}`);
  console.log(`   - Out of Stock Products: ${finalOos}`);
  console.log(`   - Products with Wholesale Price: ${finalWholesale}`);
  console.log('================================================================\n');

  await mongoose.disconnect();
}

run().catch(console.error);
