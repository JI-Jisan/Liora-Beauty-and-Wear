import fs from 'fs';
import path from 'path';
import { connectToDatabase } from '../lib/db.js';
import { Product } from '../lib/models.js';

async function mapBanners() {
  await connectToDatabase();
  const dir = './client/scratch/banners';
  const files = fs.readdirSync(dir);
  console.log('Files in scratch/banners:', files.length);

  const prods = await Product.find({
    inStock: true,
    stockStatus: { $ne: 'Out of Stock' },
    stockQuantity: { $gt: 0 },
    image: { $exists: true, $ne: '' }
  }).sort({ isFeatured: -1, isTrending: -1, stockQuantity: -1 }).limit(35);

  console.log('Top 35 in-stock products found:', prods.length);
  for (let i = 0; i < prods.length; i++) {
    const p = prods[i];
    // Find matching banner file
    const matched = files.filter(f => {
      if (f.includes(p._id.toString())) return true;
      const lower = f.toLowerCase();
      const pWords = p.name.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      const matchCount = pWords.filter(w => lower.includes(w)).length;
      return matchCount >= 2;
    });
    console.log(`${i+1}. [${p._id}] ${p.name.slice(0, 45)} -> Banner: ${matched[0] || 'NONE'}`);
  }
}

mapBanners().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
