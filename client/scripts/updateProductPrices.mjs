import mongoose from 'mongoose';

const URI = 'mongodb://jisan_trends:liora889@ac-2e905xv-shard-00-00.6nzddbx.mongodb.net:27017,ac-2e905xv-shard-00-01.6nzddbx.mongodb.net:27017,ac-2e905xv-shard-00-02.6nzddbx.mongodb.net:27017/jisantrends?ssl=true&replicaSet=atlas-12gikm-shard-0&authSource=admin&retryWrites=true&w=majority';

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getMarkup(price) {
  const p = Number(price) || 0;
  if (p <= 100) return 5;
  if (p <= 200) return 10;
  if (p <= 500) return 20;
  if (p <= 1000) return 30;
  if (p <= 1500) return 40;
  if (p <= 2000) return 50;
  return 70; // above 2000
}

// Popular cosmetics brands to auto-detect and populate in brands collection
const POPULAR_BRANDS = [
  'Beauty Glazed',
  'The Ordinary',
  'Maybelline',
  "L'Oreal",
  'Loreal',
  'Simple',
  'Bioaqua',
  'Wet n Wild',
  'MARS',
  'W7',
  'Swiss Beauty',
  'Ponds',
  'Garnier',
  'Neutrogena',
  'Cosrx',
  'Technic',
  'Sebamed',
  'Dot & Key',
  'Focallure',
  'Plix',
  'CeraVe',
  'Cetaphil',
  'Innisfree',
  'Nivea',
  'Paxmoly',
  'Skin Cafe',
  'Ribana',
  'Rajkonna',
  'Missha',
  'Laikou',
  'Fenyi',
  'Breylee',
  'Lanbena',
  'Sunsilk',
  'Axe Brand',
  'Enchanteur',
  'Caplino',
  'Skino',
  'Axis-y',
  'innsaei'
];

async function run() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(URI);
  const db = mongoose.connection;
  const ProductCol = db.collection('products');
  const BrandCol = db.collection('brands');

  // 1. Ensure popular brands exist in `brands` collection
  console.log('Syncing brand collection...');
  const brandMap = new Map(); // slug -> _id
  for (const bName of POPULAR_BRANDS) {
    const slug = slugify(bName);
    let bDoc = await BrandCol.findOne({ slug });
    if (!bDoc) {
      const ins = await BrandCol.insertOne({
        name: bName,
        slug,
        logo: '',
        isActive: true,
        order: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      brandMap.set(slug, ins.insertedId);
      console.log(`Created new brand: ${bName}`);
    } else {
      brandMap.set(slug, bDoc._id);
    }
  }

  // Also load all brands currently in DB into brandMap
  const allBrands = await BrandCol.find({}).toArray();
  for (const b of allBrands) {
    brandMap.set(b.slug, b._id);
  }

  // 2. Fetch all products and update prices & brand linkage
  console.log('Fetching all products for price update & brand linking...');
  const products = await ProductCol.find({}).toArray();
  console.log(`Processing ${products.length} products...`);

  let updatedCount = 0;
  let brandsLinkedCount = 0;

  const bulkOps = [];

  for (const p of products) {
    const oldOffer = Number(p.offerPrice) || 0;
    const oldOriginal = Number(p.originalPrice) || oldOffer;
    const markup = getMarkup(oldOffer);

    const newOffer = oldOffer + markup;
    const newOriginal = Math.max(oldOriginal, newOffer);
    const newPurchase = Math.round(newOffer * 0.75);
    const newDiscountBadge = newOriginal > newOffer
      ? String(Math.round(((newOriginal - newOffer) / newOriginal) * 100))
      : '';

    // Check brand linkage: match against all known brands
    let matchedBrandId = p.brand;
    if (!matchedBrandId) {
      const titleLower = p.name.toLowerCase();
      for (const b of allBrands) {
        if (titleLower.includes(b.name.toLowerCase()) || titleLower.includes(b.slug.replace(/-/g, ' '))) {
          matchedBrandId = b._id;
          brandsLinkedCount++;
          break;
        }
      }
    }

    bulkOps.push({
      updateOne: {
        filter: { _id: p._id },
        update: {
          $set: {
            offerPrice: newOffer,
            originalPrice: newOriginal,
            purchasePrice: newPurchase,
            discountBadge: newDiscountBadge,
            brand: matchedBrandId || null,
            updatedAt: new Date()
          }
        }
      }
    });

    if (bulkOps.length >= 500) {
      await ProductCol.bulkWrite(bulkOps);
      updatedCount += bulkOps.length;
      console.log(`Updated ${updatedCount}/${products.length} products...`);
      bulkOps.length = 0;
    }
  }

  if (bulkOps.length > 0) {
    await ProductCol.bulkWrite(bulkOps);
    updatedCount += bulkOps.length;
  }

  console.log(`\nSUCCESS! Updated prices for ${updatedCount} products.`);
  console.log(`Linked brands for ${brandsLinkedCount} products.`);

  // Audit sample price changes
  const samples = await ProductCol.find({}).limit(5).toArray();
  console.log('\nSample updated products:');
  samples.forEach(s => {
    console.log(`• ${s.name} -> Offer: ${s.offerPrice} Tk | Regular: ${s.originalPrice} Tk | Brand: ${s.brand ? 'Yes' : 'No'}`);
  });

  await mongoose.disconnect();
}

run().catch(console.error);
