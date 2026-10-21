import xlsx from 'xlsx';
import mongoose from 'mongoose';

const URI = 'mongodb://jisan_trends:liora889@ac-2e905xv-shard-00-00.6nzddbx.mongodb.net:27017,ac-2e905xv-shard-00-01.6nzddbx.mongodb.net:27017,ac-2e905xv-shard-00-02.6nzddbx.mongodb.net:27017/jisantrends?ssl=true&replicaSet=atlas-12gikm-shard-0&authSource=admin&retryWrites=true&w=majority';

async function audit() {
  await mongoose.connect(URI);
  const wb = xlsx.readFile('C:/Users/atiku/Downloads/E-Com CPP Month of October (Ogerio.com).xlsx');
  const sheetRows = xlsx.utils.sheet_to_json(wb.Sheets['All sku CPP sku']);

  const prodsColl = mongoose.connection.collection('products');
  const brandsColl = mongoose.connection.collection('brands');
  const catsColl = mongoose.connection.collection('categories');

  const allBrands = await brandsColl.find({}).toArray();
  const allCats = await catsColl.find({}).toArray();

  const brandMap = new Map(allBrands.map(b => [b._id.toString(), b.name]));
  const catMap = new Map(allCats.map(c => [c._id.toString(), c.name]));

  let found = 0;
  let missing = 0;
  let missingImage = 0;
  let missingCategory = 0;
  let missingBrand = 0;
  let priceMismatch = 0;

  for (const r of sheetRows) {
    const name = (r['Sku Updated Perfect Name'] || '').trim();
    const mrp = Number(r.MRP);
    const p = await prodsColl.findOne({ name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } });

    if (!p) {
      missing++;
      console.log('MISSING:', name);
    } else {
      found++;
      if (!p.image || p.image.length < 5) missingImage++;
      if (!p.category) missingCategory++;
      if (!p.brand) missingBrand++;
      if (p.originalPrice !== mrp) {
        priceMismatch++;
        console.log(`Price mismatch for ${name}: DB ${p.originalPrice} vs MRP ${mrp}`);
      }
    }
  }

  console.log({
    totalChecked: sheetRows.length,
    found,
    missing,
    missingImage,
    missingCategory,
    missingBrand,
    priceMismatch
  });

  // Print sample 5 live products
  console.log('\n--- Sample 5 Live Products ---');
  const sampleNames = [
    'Vaseline Gluta Hya Flawless Glow Serum in Gel 200ml',
    'Clear Men Shampoo Cool Sport Menthol Anti Dandruff 330ml',
    'Lux Body Wash Black Orchid Scent & Juniper Oil 245ml',
    'Dove Conditioner Hairfall Rescue 170ml',
    'Pepsodent Toothpaste Sensitive Expert Professional 140g'
  ];
  for (const sn of sampleNames) {
    const doc = await prodsColl.findOne({ name: sn });
    if (doc) {
      console.log({
        name: doc.name,
        brand: brandMap.get(doc.brand?.toString()) || 'Unknown',
        category: catMap.get(doc.category?.toString()) || 'Unknown',
        originalPrice: doc.originalPrice,
        offerPrice: doc.offerPrice,
        purchasePrice: doc.purchasePrice,
        inStock: doc.inStock,
        image: doc.image
      });
    }
  }

  process.exit(0);
}

audit();
