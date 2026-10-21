import xlsx from 'xlsx';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';

const URI = 'mongodb://jisan_trends:liora889@ac-2e905xv-shard-00-00.6nzddbx.mongodb.net:27017,ac-2e905xv-shard-00-01.6nzddbx.mongodb.net:27017,ac-2e905xv-shard-00-02.6nzddbx.mongodb.net:27017/jisantrends?ssl=true&replicaSet=atlas-12gikm-shard-0&authSource=admin&retryWrites=true&w=majority';
const CLOUD_NAME = 'dlgubaefs';
const UPLOAD_PRESET = 'liora_store';

const CACHE_FILE = 'client/scripts/unilever_images_cache.json';

// Category IDs
const CATEGORIES = {
  SHAMPOO_CONDITIONER: new mongoose.Types.ObjectId('6a9ab99cc63dd531aa8db184'), // Bath & Body > Shampoo & Conditioner
  HAIR_TREATMENT:      new mongoose.Types.ObjectId('6a9ab70c79e75ff1fa1f8a49'), // Hair Care > Hair Treatment
  FACE_WASH:           new mongoose.Types.ObjectId('6a9ab77434ccee884a4b5cad'), // Bath & Body > Face Wash
  FACE_CREAM:          new mongoose.Types.ObjectId('6a9ab75b661657cb254c1bdc'), // Skin Care > Face Care > Face Cream
  SERUM:               new mongoose.Types.ObjectId('6a9ab77134ccee884a4b5caa'), // Skin Care > Face Care > Serum
  SUNSCREEN:           new mongoose.Types.ObjectId('6a9ab982c63dd531aa8db116'), // Skin Care > Face Care > Sunscreen
  LOTION:              new mongoose.Types.ObjectId('6a9ab9bbc63dd531aa8db20d'), // Bath & Body > Lotion
  BODY_WASH:           new mongoose.Types.ObjectId('6a8ae0d5dbc554e2928be212'), // Bath & Body > Body Wash
  SOAP:                new mongoose.Types.ObjectId('6a9aba2dc63dd531aa8db3b1'), // Bath & Body > Soap
  HAND_WASH:           new mongoose.Types.ObjectId('6a9abaf0c63dd531aa8db611'), // Skin Care > Hand Care
  TEETH_CARE:          new mongoose.Types.ObjectId('6a9abc8ec63dd531aa8dbb3a'), // Skin Care > Teeth Care
  TALC_POWDER:         new mongoose.Types.ObjectId('6a9abed2c63dd531aa8dc2b6'), // Bath & Body > Talc Powder
};

function assignCategory(name, sheetCat) {
  const lower = name.toLowerCase();

  if (lower.includes('toothpaste') || lower.includes('brush') || sheetCat === 'ORAL CARE') {
    return CATEGORIES.TEETH_CARE;
  }
  if (lower.includes('handwash') || lower.includes('hand wash')) {
    return CATEGORIES.HAND_WASH;
  }
  if (lower.includes('soap bar') || lower.includes('skin cleansing soap') || (lower.includes('soap') && !lower.includes('handwash'))) {
    return CATEGORIES.SOAP;
  }
  if (lower.includes('body wash') || lower.includes('bodywash') || lower.includes('shower gel')) {
    return CATEGORIES.BODY_WASH;
  }
  if (lower.includes('talc') || lower.includes('talcum')) {
    return CATEGORIES.TALC_POWDER;
  }
  if (lower.includes('hair treatment') || lower.includes('repair treatment') || lower.includes('hair mask')) {
    return CATEGORIES.HAIR_TREATMENT;
  }
  if (lower.includes('shampoo') || lower.includes('conditioner')) {
    return CATEGORIES.SHAMPOO_CONDITIONER;
  }
  if (lower.includes('face wash') || lower.includes('facewash') || lower.includes('cleanser')) {
    return CATEGORIES.FACE_WASH;
  }
  if (lower.includes('sunscreen') || lower.includes('sun protect') || lower.includes('spf')) {
    return CATEGORIES.SUNSCREEN;
  }
  if (lower.includes('serum') && !lower.includes('serum in lotion') && !lower.includes('serum in gel')) {
    return CATEGORIES.SERUM;
  }
  if (lower.includes('lotion') || lower.includes('petroleum jelly') || lower.includes('jelly') || lower.includes('serum in lotion') || lower.includes('serum in gel')) {
    return CATEGORIES.LOTION;
  }
  if (lower.includes('cream') || lower.includes('cold cream') || lower.includes('day cream') || lower.includes('night cream') || lower.includes('moisturiser') || lower.includes('moisturizer')) {
    return CATEGORIES.FACE_CREAM;
  }

  if (sheetCat === 'HAIR CARE') return CATEGORIES.SHAMPOO_CONDITIONER;
  if (sheetCat === 'SKIN CLEANSING') return CATEGORIES.SOAP;
  return CATEGORIES.FACE_CREAM;
}

// Load Ogerio for fallback images
const ogerioCatalog = JSON.parse(fs.readFileSync('client/scripts/scraped_full_catalog.json', 'utf8'));
const ogerioItems = Object.values(ogerioCatalog);

function findOgerioFallback(name) {
  const clean = name.toLowerCase().replace(/[^a-z0-9]/g, ' ');
  const words = clean.split(/\s+/).filter(w => w.length > 2);
  let best = null;
  let maxScore = 0;
  for (const item of ogerioItems) {
    const iClean = item.title.toLowerCase().replace(/[^a-z0-9]/g, ' ');
    const iWords = new Set(iClean.split(/\s+/));
    const common = words.filter(w => iWords.has(w));
    const score = common.length / Math.max(words.length, 1);
    if (score > maxScore) {
      maxScore = score;
      best = item;
    }
  }
  return maxScore >= 0.65 ? best : null;
}

// Drive image extractor
async function getDriveImage(folderUrl) {
  if (!folderUrl || !folderUrl.includes('drive.google.com')) return null;
  const folderId = folderUrl.split('/folders/')[1]?.split('?')[0];
  if (!folderId) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(folderUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      signal: controller.signal
    });
    clearTimeout(timeout);
    const html = await res.text();

    const matches = [...html.matchAll(/"([a-zA-Z0-9_-]{28,35})"/g)].map(m => m[1]);
    const uniqueIds = [...new Set(matches)].filter(id => id !== folderId);

    for (const id of uniqueIds) {
      try {
        const headRes = await fetch(`https://lh3.googleusercontent.com/d/${id}`, { method: 'HEAD' });
        const ct = headRes.headers.get('content-type') || '';
        if (headRes.status === 200 && ct.startsWith('image/')) {
          return `https://lh3.googleusercontent.com/d/${id}`;
        }
      } catch (err) {}
    }
  } catch (e) {
    return null;
  }
  return null;
}

// Cloudinary upload
async function uploadToCloudinary(remoteUrl) {
  const form = new FormData();
  form.append('file', remoteUrl);
  form.append('upload_preset', UPLOAD_PRESET);
  form.append('folder', 'liora_products');

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: 'POST',
    body: form,
  });

  const data = await res.json();
  if (data.secure_url) {
    return data.secure_url;
  }
  throw new Error(data?.error?.message || 'Upload failed');
}

async function main() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(URI);
  console.log('MongoDB connected.');

  // 1. Ensure Brands
  const BRAND_DEFINITIONS = [
    { name: 'Vaseline', slug: 'vaseline', aliases: ['vaseline'] },
    { name: 'Dove', slug: 'dove', aliases: ['dove'] },
    { name: 'Ponds', slug: 'ponds', aliases: ["pond's", 'ponds', "pond's men", 'ponds men'] },
    { name: 'Sunsilk', slug: 'sunsilk', aliases: ['sunsilk'] },
    { name: 'Tresemme', slug: 'tresemme', aliases: ['tresemme', 'tresemmé'] },
    { name: 'Clear', slug: 'clear', aliases: ['clear', 'clear men', 'clear male'], logo: 'https://ui-avatars.com/api/?name=Clear&background=002b49&color=ffffff&bold=true&rounded=true&size=200' },
    { name: 'Pepsodent', slug: 'pepsodent', aliases: ['pepsodent'], logo: 'https://ui-avatars.com/api/?name=Pepsodent&background=e31837&color=ffffff&bold=true&rounded=true&size=200' },
    { name: 'Clinic Plus', slug: 'clinic-plus', aliases: ['clinic plus', 'clinicplus'], logo: 'https://ui-avatars.com/api/?name=Clinic+Plus&background=0088cc&color=ffffff&bold=true&rounded=true&size=200' },
    { name: 'Closeup', slug: 'closeup', aliases: ['closeup', 'close up'], logo: 'https://ui-avatars.com/api/?name=Closeup&background=e60000&color=ffffff&bold=true&rounded=true&size=200' },
    { name: 'Lifebuoy', slug: 'lifebuoy', aliases: ['lifebuoy'], logo: 'https://ui-avatars.com/api/?name=Lifebuoy&background=c41230&color=ffffff&bold=true&rounded=true&size=200' },
    { name: 'Glow & Lovely', slug: 'glow-lovely', aliases: ['glow & lovely', 'glow and lovely', 'fair & lovely', 'fair and lovely'], logo: 'https://ui-avatars.com/api/?name=Glow+Lovely&background=d63384&color=ffffff&bold=true&rounded=true&size=200' },
    { name: 'Lux', slug: 'lux', aliases: ['lux'], logo: 'https://ui-avatars.com/api/?name=Lux&background=b8860b&color=ffffff&bold=true&rounded=true&size=200' },
    { name: 'Glow & Handsome', slug: 'glow-handsome', aliases: ['glow & handsome', 'glow and handsome', 'fair & handsome', 'fair and handsome'], logo: 'https://ui-avatars.com/api/?name=Glow+Handsome&background=1e293b&color=ffffff&bold=true&rounded=true&size=200' },
  ];

  const brandsColl = mongoose.connection.collection('brands');
  const dbBrands = await brandsColl.find({}).toArray();
  const brandMap = new Map();

  for (const bDef of BRAND_DEFINITIONS) {
    let existing = dbBrands.find(b => b.name.toLowerCase() === bDef.name.toLowerCase() || b.slug === bDef.slug);
    if (!existing) {
      const res = await brandsColl.insertOne({
        name: bDef.name,
        slug: bDef.slug,
        logo: bDef.logo || '',
        isActive: true,
        order: dbBrands.length + 1,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      existing = { _id: res.insertedId, name: bDef.name, slug: bDef.slug };
      console.log(`Created new brand: ${bDef.name} (${res.insertedId})`);
    }
    for (const alias of bDef.aliases) {
      brandMap.set(alias.toLowerCase(), existing._id);
    }
  }

  // Helper to match brand from sheet name
  function getBrandId(sheetBrandName) {
    const raw = (sheetBrandName || '').toLowerCase().trim();
    if (brandMap.has(raw)) return brandMap.get(raw);
    for (const [alias, id] of brandMap.entries()) {
      if (raw.includes(alias) || alias.includes(raw)) return id;
    }
    return null;
  }

  // Load Excel
  const wb = xlsx.readFile('C:/Users/atiku/Downloads/E-Com CPP Month of October (Ogerio.com).xlsx');
  const ws = wb.Sheets['All sku CPP sku'];
  const sheetRows = xlsx.utils.sheet_to_json(ws);
  console.log(`Loaded ${sheetRows.length} rows from Excel sheet.`);

  // Load existing cache if any
  let imageCache = {};
  if (fs.existsSync(CACHE_FILE)) {
    try {
      imageCache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
      console.log(`Loaded ${Object.keys(imageCache).length} cached image records.`);
    } catch (e) {}
  }

  // 2. Fetch images and upload to Cloudinary (with cache & concurrency 6)
  console.log('Resolving images for all products in parallel (concurrency 6)...');
  const CONCURRENCY = 6;
  const queue = sheetRows.map((r, idx) => ({ r, idx }));
  let processedCount = 0;

  async function processItem(item) {
    const { r, idx } = item;
    const name = (r['Sku Updated Perfect Name'] || '').trim();
    if (!name) return;

    if (imageCache[name] && (imageCache[name].startsWith('https://res.cloudinary.com') || imageCache[name].startsWith('https://lh3.googleusercontent.com') || imageCache[name].startsWith('http'))) {
      processedCount++;
      return;
    }

    const driveFolder = r['Updated Hero Image'];
    let finalImageUrl = '';

    try {
      // 1. Try Drive image
      const driveImg = await getDriveImage(driveFolder);
      if (driveImg) {
        try {
          const cUrl = await uploadToCloudinary(driveImg);
          finalImageUrl = cUrl;
          console.log(`[${idx+1}/${sheetRows.length}] Cloudinary uploaded (Drive): ${name}`);
        } catch (cErr) {
          console.warn(`Cloudinary upload failed for ${name}, using direct URL:`, cErr.message);
          finalImageUrl = driveImg;
        }
      }

      // 2. If Drive failed, try Ogerio fallback
      if (!finalImageUrl) {
        const og = findOgerioFallback(name);
        if (og && og.imgSrc) {
          try {
            const cUrl = await uploadToCloudinary(og.imgSrc);
            finalImageUrl = cUrl;
            console.log(`[${idx+1}/${sheetRows.length}] Cloudinary uploaded (Ogerio fallback): ${name}`);
          } catch (cErr) {
            finalImageUrl = og.imgSrc;
          }
        }
      }

      if (finalImageUrl) {
        imageCache[name] = finalImageUrl;
        // Save periodically
        if (processedCount % 5 === 0) {
          fs.writeFileSync(CACHE_FILE, JSON.stringify(imageCache, null, 2));
        }
      } else {
        console.warn(`[${idx+1}/${sheetRows.length}] NO IMAGE FOUND FOR: ${name}`);
      }
    } catch (err) {
      console.error(`Error processing image for ${name}:`, err.message);
    } finally {
      processedCount++;
    }
  }

  // Run pool
  const workers = Array(CONCURRENCY).fill(null).map(async () => {
    while (queue.length > 0) {
      const item = queue.shift();
      if (item) await processItem(item);
    }
  });

  await Promise.all(workers);
  fs.writeFileSync(CACHE_FILE, JSON.stringify(imageCache, null, 2));
  console.log(`Finished image processing. Total cached: ${Object.keys(imageCache).length}`);


  // 3. Database Sync / Insertion
  console.log('\n--- Syncing products to MongoDB ---');
  const prodsColl = mongoose.connection.collection('products');
  let inserted = 0;
  let updated = 0;

  for (let i = 0; i < sheetRows.length; i++) {
    const r = sheetRows[i];
    const name = (r['Sku Updated Perfect Name'] || '').trim();
    if (!name) continue;

    const brandId = getBrandId(r['Brand(PH)(m.d.)']);
    const categoryId = assignCategory(name, r['Category']);
    const mrp = Number(r.MRP);
    const tp = Math.round(Number(r.TP) * 100) / 100;
    const description = (r.Description || '').trim();
    const image = imageCache[name] || '';

    // Check if product exists in DB
    const existing = await prodsColl.findOne({ name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } });

    if (existing) {
      // Update regular price (MRP), purchase price (TP), ensure category, brand, image
      const updateFields = {
        originalPrice: mrp,
        purchasePrice: tp,
        updatedAt: new Date()
      };
      // User said: "reggular price research kore bosao ami offer price pore bosabo"
      // If offerPrice was not set or equal to old originalPrice, sync offerPrice to mrp
      if (!existing.offerPrice || existing.offerPrice === existing.originalPrice) {
        updateFields.offerPrice = mrp;
      }
      if (!existing.category && categoryId) updateFields.category = categoryId;
      if (!existing.brand && brandId) updateFields.brand = brandId;
      if ((!existing.image || existing.image.includes('placeholder')) && image) {
        updateFields.image = image;
      }
      if (!existing.description && description) {
        updateFields.description = description;
      }
      await prodsColl.updateOne({ _id: existing._id }, { $set: updateFields });
      updated++;
    } else {
      // Insert new product
      const newDoc = {
        name: name,
        category: categoryId,
        brand: brandId,
        originalPrice: mrp,
        offerPrice: mrp, // User requested: "ami offer price pore bosabo"
        purchasePrice: tp,
        stockQuantity: 50,
        inStock: true,
        discountBadge: '',
        stockStatus: 'In Stock',
        image: image,
        images: [],
        rating: 5,
        reviewCount: 0,
        description: description,
        isFeatured: false,
        isTrending: false,
        isNewArrival: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      await prodsColl.insertOne(newDoc);
      inserted++;
    }
  }

  console.log(`\n========================================`);
  console.log(`Unilever Product Import Complete!`);
  console.log(`Total sheet rows: ${sheetRows.length}`);
  console.log(`Products Inserted: ${inserted}`);
  console.log(`Products Updated: ${updated}`);
  console.log(`========================================\n`);

  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
