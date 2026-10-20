import fs from 'fs';
import mongoose from 'mongoose';

if (fs.existsSync('.env.local')) {
  const envContent = fs.readFileSync('.env.local', 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

async function updateCombos() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  await mongoose.connect(uri);
  const mapping = JSON.parse(fs.readFileSync('scripts/uploaded_cloudinary_assets.json', 'utf8'));
  const db = mongoose.connection;
  const prods = await db.collection('products').find({}).toArray();
  let count = 0;
  for (const p of prods) {
    if (Array.isArray(p.images) && p.images.some(img => img && img.startsWith('/combos/'))) {
      const newImages = p.images.map(img => {
        if (img && img.startsWith('/combos/')) {
          const filename = img.replace('/combos/', '');
          const key1 = 'public/combos/' + filename;
          const key2 = 'public\\combos\\' + filename;
          return mapping[key1] || mapping[key2] || img;
        }
        return img;
      });
      await db.collection('products').updateOne({ _id: p._id }, { $set: { images: newImages } });
      count++;
      console.log('✓ Updated images array for:', p.name);
    }
  }
  console.log(`Updated ${count} products.`);
  await mongoose.disconnect();
}

updateCombos().catch(console.error);
