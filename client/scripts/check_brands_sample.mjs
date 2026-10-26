import { connectToDatabase } from '../lib/db.js';
import { Product, Brand } from '../lib/models.js';

async function checkBrands() {
  await connectToDatabase();
  const brands = await Brand.find({}).lean();
  console.log(`Total brands: ${brands.length}`);
  console.log('Sample brands:', brands.slice(0, 10).map(b => ({ name: b.name, slug: b.slug })));

  const prodsWithBrand = await Product.countDocuments({ brand: { $exists: true, $ne: null } });
  const prodsTotal = await Product.countDocuments({});
  console.log(`Products with brand field: ${prodsWithBrand} / ${prodsTotal}`);

  const allBrands = await Brand.find({}).lean();
  console.log('All brand names:', allBrands.map(b => b.name).sort());

  // Check top first-words of products with brand: null
  const nullProds = await Product.find({ brand: null }).select('name').lean();
  console.log('Total products with null brand:', nullProds.length);
  const firstWordCounts = {};
  for (const p of nullProds) {
    const firstWord = (p.name || '').trim().split(/\s+/)[0];
    if (firstWord && firstWord.length > 1) {
      firstWordCounts[firstWord] = (firstWordCounts[firstWord] || 0) + 1;
    }
  }
  const sortedFirstWords = Object.entries(firstWordCounts).sort((a,b) => b[1] - a[1]);
  console.log('Top unlinked first words in products:', sortedFirstWords.slice(0, 30));

}

checkBrands().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
