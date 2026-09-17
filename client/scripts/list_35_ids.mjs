import { connectToDatabase } from '../lib/db.js';
import { Product } from '../lib/models.js';

async function main() {
  await connectToDatabase();
  const prods = await Product.find({
    inStock: true,
    stockStatus: { $ne: 'Out of Stock' },
    stockQuantity: { $gt: 0 },
    image: { $exists: true, $ne: '' }
  }).sort({ isFeatured: -1, isTrending: -1, stockQuantity: -1 }).limit(35).select('_id name originalPrice offerPrice image stockQuantity brand category');
  
  console.log(`Found ${prods.length} products:`);
  for (let i = 0; i < prods.length; i++) {
    const p = prods[i];
    console.log(`${i+1}. [${p._id}] ${p.name} - Price: ৳${p.offerPrice || p.originalPrice}`);
  }
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
