import mongoose from 'mongoose';

const URI = 'mongodb://jisan_trends:liora889@ac-2e905xv-shard-00-00.6nzddbx.mongodb.net:27017,ac-2e905xv-shard-00-01.6nzddbx.mongodb.net:27017,ac-2e905xv-shard-00-02.6nzddbx.mongodb.net:27017/jisantrends?ssl=true&replicaSet=atlas-12gikm-shard-0&authSource=admin&retryWrites=true&w=majority';

// Curated high-res transparent/vector brand logos
const BRAND_LOGOS = {
  'the-ordinary': 'https://images.seeklogo.com/logo-png/43/1/the-ordinary-logo-png_seeklogo-437554.png',
  'maybelline': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/Maybelline-Logo.png/800px-Maybelline-Logo.png',
  'loreal': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9d/L%27Or%C3%A9al_logo.svg/800px-L%27Or%C3%A9al_logo.svg.png',
  'l-oreal': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9d/L%27Or%C3%A9al_logo.svg/800px-L%27Or%C3%A9al_logo.svg.png',
  'simple': 'https://images.seeklogo.com/logo-png/36/1/simple-skincare-logo-png_seeklogo-362243.png',
  'wet-n-wild': 'https://images.seeklogo.com/logo-png/38/2/wet-n-wild-logo-png_seeklogo-384351.png',
  'garnier': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/Garnier_Logo.svg/800px-Garnier_Logo.svg.png',
  'neutrogena': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Neutrogena_logo.svg/800px-Neutrogena_logo.svg.png',
  'cosrx': 'https://images.seeklogo.com/logo-png/42/1/cosrx-logo-png_seeklogo-427770.png',
  'cerave': 'https://images.seeklogo.com/logo-png/39/1/cerave-logo-png_seeklogo-397223.png',
  'cetaphil': 'https://images.seeklogo.com/logo-png/38/2/cetaphil-logo-png_seeklogo-387081.png',
  'innisfree': 'https://images.seeklogo.com/logo-png/42/1/innisfree-logo-png_seeklogo-427773.png',
  'nivea': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/29/Nivea_logo.svg/800px-Nivea_logo.svg.png',
  'sunsilk': 'https://upload.wikimedia.org/wikipedia/en/thumb/5/52/Sunsilk_Logo.svg/800px-Sunsilk_Logo.svg.png',
  'sebamed': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Sebapharma_Sebamed_logo.svg/800px-Sebapharma_Sebamed_logo.svg.png',
  'ponds': 'https://upload.wikimedia.org/wikipedia/en/thumb/f/f6/Pond%27s_Logo.svg/800px-Pond%27s_Logo.svg.png',
  'missha': 'https://images.seeklogo.com/logo-png/42/1/missha-logo-png_seeklogo-427774.png',
  'beauty-glazed': 'https://res.cloudinary.com/dlgubaefs/image/upload/v1788471291/o0eqyf0j4gwnnti0amf0.jpg', // fallback beauty icon
  'mars': 'https://images.seeklogo.com/logo-png/42/1/mars-cosmetics-logo-png_seeklogo-427771.png',
  'w7': 'https://images.seeklogo.com/logo-png/39/2/w7-makeup-logo-png_seeklogo-394467.png',
  'swiss-beauty': 'https://images.seeklogo.com/logo-png/42/1/swiss-beauty-logo-png_seeklogo-427772.png',
  'technic': 'https://images.seeklogo.com/logo-png/39/2/technic-cosmetics-logo-png_seeklogo-394468.png',
  'dot-key': 'https://images.seeklogo.com/logo-png/44/1/dot-key-logo-png_seeklogo-446702.png',
  'focallure': 'https://images.seeklogo.com/logo-png/42/1/focallure-logo-png_seeklogo-427775.png',
};

async function run() {
  await mongoose.connect(URI);
  const db = mongoose.connection;
  const BrandCol = db.collection('brands');

  const brands = await BrandCol.find({}).toArray();
  console.log(`Checking ${brands.length} brands...`);

  let updated = 0;
  for (const b of brands) {
    if (b.logo && b.logo.trim()) {
      console.log(`✓ Brand "${b.name}" already has logo: ${b.logo.slice(0, 50)}...`);
      continue;
    }

    const customLogo = BRAND_LOGOS[b.slug];
    if (customLogo) {
      await BrandCol.updateOne({ _id: b._id }, { $set: { logo: customLogo, updatedAt: new Date() } });
      console.log(`+ Updated logo for "${b.name}"`);
      updated++;
    } else {
      // Create a clean brand monogram avatar URL using ui-avatars with elegant typography
      const fallbackLogo = `https://ui-avatars.com/api/?name=${encodeURIComponent(b.name)}&background=0f172a&color=ffffff&bold=true&font-size=0.45&rounded=true&size=200`;
      await BrandCol.updateOne({ _id: b._id }, { $set: { logo: fallbackLogo, updatedAt: new Date() } });
      console.log(`* Assigned monogram badge logo for "${b.name}"`);
      updated++;
    }
  }

  console.log(`\nDONE! Updated ${updated} brands with logos.`);
  await mongoose.disconnect();
}

run().catch(console.error);
