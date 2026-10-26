import { connectToDatabase } from '../lib/db.js';
import { Product, Brand } from '../lib/models.js';

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

const COMMON_BRANDS_TO_ENSURE = [
  'Bob',
  'Sadoer',
  'Guerniss',
  'Lavino',
  'WishCare',
  'Aveeno',
  'The Face Shop',
  'fafamoon',
  'Some By Mi',
  'Rimmel',
  'Groome',
  'Chemist at Play',
  'APLB',
  'Kota',
  'Essence',
  'Dabo',
  'YC',
  'Trendy',
  'Natura Republic',
  'LMLTOP',
  'MAYA',
  'Kodomo'
];

async function run() {
  await connectToDatabase();
  console.log('Connected to DB');

  // 1. Ensure common brands exist
  for (const name of COMMON_BRANDS_TO_ENSURE) {
    const slug = slugify(name);
    let brand = await Brand.findOne({ $or: [{ name: new RegExp(`^${name}$`, 'i') }, { slug }] });
    if (!brand) {
      brand = await Brand.create({
        name,
        slug,
        description: `Authentic ${name} cosmetics and skincare products.`,
        isActive: true,
      });
      console.log(`Created brand: ${name} (${slug})`);
    }
  }

  // 2. Fetch all brands
  const allBrands = await Brand.find({}).lean();
  console.log(`Loaded ${allBrands.length} brands`);

  // Sort brands by length descending so longer brand names match first (e.g. 'The Face Shop' before 'The')
  allBrands.sort((a, b) => b.name.length - a.name.length);

  // 3. Link products with brand: null
  const nullProds = await Product.find({ brand: null }).select('_id name').lean();
  console.log(`Found ${nullProds.length} products with brand: null`);

  let linkedCount = 0;
  for (const p of nullProds) {
    const pName = (p.name || '').trim();
    if (!pName) continue;

    // Check if starts with or contains any brand
    const matchedBrand = allBrands.find(b => {
      const regex = new RegExp(`^${b.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      return regex.test(pName);
    });

    if (matchedBrand) {
      await Product.updateOne({ _id: p._id }, { brand: matchedBrand._id });
      linkedCount++;
    }
  }

  console.log(`Successfully linked ${linkedCount} products to their respective brands!`);

  // Check Swiss Beauty count
  const swiss = await Brand.findOne({ name: /swiss beauty/i }).lean();
  if (swiss) {
    const swissCount = await Product.countDocuments({
      $or: [{ brand: swiss._id }, { name: { $regex: /swiss beauty/i } }]
    });
    console.log(`Swiss Beauty products in DB: ${swissCount}`);
  }

  // Check Bob count
  const bob = await Brand.findOne({ name: /^bob$/i }).lean();
  if (bob) {
    const bobCount = await Product.countDocuments({
      $or: [{ brand: bob._id }, { name: { $regex: /^bob\b/i } }]
    });
    console.log(`Bob products in DB: ${bobCount}`);
  }
}

run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
