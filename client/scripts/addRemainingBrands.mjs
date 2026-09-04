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

const NEW_BRANDS = [
  {
    name: 'Imagic',
    aliases: ['imagic', 'i magic'],
    logo: 'https://images.seeklogo.com/logo-png/42/1/imagic-cosmetics-logo-png_seeklogo-427776.png'
  },
  {
    name: 'SKIN1004',
    aliases: ['skin1004', 'skin 1004'],
    logo: 'https://images.seeklogo.com/logo-png/43/1/skin1004-logo-png_seeklogo-437555.png'
  },
  {
    name: 'Sheglam',
    aliases: ['sheglam', 'she glam'],
    logo: 'https://images.seeklogo.com/logo-png/42/1/sheglam-logo-png_seeklogo-427777.png'
  },
  {
    name: 'Menow',
    aliases: ['menow', 'me now'],
    logo: 'https://ui-avatars.com/api/?name=Menow&background=be185d&color=ffffff&bold=true&rounded=true&size=200'
  },
  {
    name: 'Nirvana Color',
    aliases: ['nirvana color', 'nirvana'],
    logo: 'https://ui-avatars.com/api/?name=Nirvana+Color&background=4f46e5&color=ffffff&bold=true&rounded=true&size=200'
  },
  {
    name: 'Handaiyan',
    aliases: ['handaiyan'],
    logo: 'https://ui-avatars.com/api/?name=Handaiyan&background=db2777&color=ffffff&bold=true&rounded=true&size=200'
  },
  {
    name: 'Earth Beauty',
    aliases: ['earth beauty'],
    logo: 'https://ui-avatars.com/api/?name=Earth+Beauty&background=059669&color=ffffff&bold=true&rounded=true&size=200'
  },
  {
    name: 'Melao',
    aliases: ['melao'],
    logo: 'https://ui-avatars.com/api/?name=Melao&background=d97706&color=ffffff&bold=true&rounded=true&size=200'
  },
  {
    name: 'Colormax',
    aliases: ['colormax', 'color max'],
    logo: 'https://ui-avatars.com/api/?name=Colormax&background=e11d48&color=ffffff&bold=true&rounded=true&size=200'
  },
  {
    name: 'Organikaon',
    aliases: ['organikaon'],
    logo: 'https://ui-avatars.com/api/?name=Organikaon&background=15803d&color=ffffff&bold=true&rounded=true&size=200'
  },
  {
    name: 'Maange',
    aliases: ['maange'],
    logo: 'https://ui-avatars.com/api/?name=Maange&background=9333ea&color=ffffff&bold=true&rounded=true&size=200'
  },
  {
    name: 'Vaseline',
    aliases: ['vaseline'],
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/Vaseline_logo.svg/800px-Vaseline_logo.svg.png'
  },
  {
    name: '3W Clinic',
    aliases: ['3w clinic', '3w-clinic'],
    logo: 'https://ui-avatars.com/api/?name=3W+Clinic&background=2563eb&color=ffffff&bold=true&rounded=true&size=200'
  },
  {
    name: 'Streax',
    aliases: ['streax', 'streax professional'],
    logo: 'https://ui-avatars.com/api/?name=Streax&background=b91c1c&color=ffffff&bold=true&rounded=true&size=200'
  },
  {
    name: 'Mamaearth',
    aliases: ['mamaearth', 'mama earth'],
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/Mamaearth_logo.svg/800px-Mamaearth_logo.svg.png'
  },
  {
    name: 'Tresemme',
    aliases: ['tresemme', 'tresemmé'],
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/TRESemm%C3%A9_Logo.svg/800px-TRESemm%C3%A9_Logo.svg.png'
  },
  {
    name: 'L.A. Girl',
    aliases: ['l.a. girl', 'la girl', 'l.a girl', 'la. girl'],
    logo: 'https://images.seeklogo.com/logo-png/36/1/la-girl-logo-png_seeklogo-362244.png'
  },
  {
    name: 'Cos De BAHA',
    aliases: ['cos de baha', 'cos de', 'cosdebaha'],
    logo: 'https://ui-avatars.com/api/?name=Cos+De+BAHA&background=0284c7&color=ffffff&bold=true&rounded=true&size=200'
  },
  {
    name: 'Medicube',
    aliases: ['medicube'],
    logo: 'https://ui-avatars.com/api/?name=Medicube&background=0f172a&color=ffffff&bold=true&rounded=true&size=200'
  },
  {
    name: 'Quiyum',
    aliases: ['quiyum'],
    logo: 'https://ui-avatars.com/api/?name=Quiyum&background=ec4899&color=ffffff&bold=true&rounded=true&size=200'
  },
  {
    name: 'Makeup Revolution',
    aliases: ['revolution', 'makeup revolution'],
    logo: 'https://images.seeklogo.com/logo-png/37/1/makeup-revolution-logo-png_seeklogo-372551.png'
  },
  {
    name: 'Dove',
    aliases: ['dove'],
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/Dove_logo.svg/800px-Dove_logo.svg.png'
  },
  {
    name: 'Boots',
    aliases: ['boots'],
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Boots_logo.svg/800px-Boots_logo.svg.png'
  },
  {
    name: 'Zafran',
    aliases: ['zafran'],
    logo: 'https://ui-avatars.com/api/?name=Zafran&background=ea580c&color=ffffff&bold=true&rounded=true&size=200'
  },
  {
    name: 'Pax Moly',
    aliases: ['pax moly', 'paxmoly'],
    logo: 'https://ui-avatars.com/api/?name=Pax+Moly&background=0891b2&color=ffffff&bold=true&rounded=true&size=200'
  },
  {
    name: 'Bio Glow',
    aliases: ['bio glow', 'bioglow'],
    logo: 'https://ui-avatars.com/api/?name=Bio+Glow&background=16a34a&color=ffffff&bold=true&rounded=true&size=200'
  }
];

async function run() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(URI);
  const db = mongoose.connection;
  const ProductCol = db.collection('products');
  const BrandCol = db.collection('brands');

  console.log('Syncing brand collection with new brands...');
  const brandList = [];

  for (const item of NEW_BRANDS) {
    const slug = slugify(item.name);
    let doc = await BrandCol.findOne({ slug });
    if (!doc) {
      const ins = await BrandCol.insertOne({
        name: item.name,
        slug,
        logo: item.logo,
        isActive: true,
        order: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      doc = { _id: ins.insertedId, name: item.name, slug, logo: item.logo };
      console.log(`+ Created brand: ${item.name}`);
    } else if (!doc.logo) {
      await BrandCol.updateOne({ _id: doc._id }, { $set: { logo: item.logo, updatedAt: new Date() } });
      console.log(`* Updated logo for: ${item.name}`);
    }
    brandList.push({ ...item, id: doc._id });
  }

  // Load all DB brands to ensure comprehensive matching
  const allDbBrands = await BrandCol.find({}).toArray();

  console.log('Finding unlinked products and matching brands...');
  const unlinked = await ProductCol.find({ brand: null }).toArray();
  console.log(`Checking ${unlinked.length} unlinked products...`);

  let linkedCount = 0;
  const bulkOps = [];

  for (const p of unlinked) {
    const nameLower = p.name.toLowerCase();
    let foundBrandId = null;

    // 1. Check in NEW_BRANDS first (with aliases)
    for (const b of brandList) {
      const matched = b.aliases.some(alias => {
        // match as whole word or phrase
        const regex = new RegExp(`(^|[^a-zA-Z0-9])${alias}([^a-zA-Z0-9]|$)`, 'i');
        return regex.test(nameLower);
      });
      if (matched) {
        foundBrandId = b.id;
        break;
      }
    }

    // 2. If not found, check against any existing DB brands
    if (!foundBrandId) {
      for (const b of allDbBrands) {
        const regex = new RegExp(`(^|[^a-zA-Z0-9])${b.name.toLowerCase()}([^a-zA-Z0-9]|$)`, 'i');
        if (regex.test(nameLower)) {
          foundBrandId = b._id;
          break;
        }
      }
    }

    if (foundBrandId) {
      bulkOps.push({
        updateOne: {
          filter: { _id: p._id },
          update: { $set: { brand: foundBrandId, updatedAt: new Date() } }
        }
      });
      linkedCount++;
    }

    if (bulkOps.length >= 500) {
      await ProductCol.bulkWrite(bulkOps);
      console.log(`Linked ${linkedCount} products so far...`);
      bulkOps.length = 0;
    }
  }

  if (bulkOps.length > 0) {
    await ProductCol.bulkWrite(bulkOps);
  }

  console.log(`\nSUCCESS! Newly linked ${linkedCount} products to their respective brands!`);

  const finalTotal = await ProductCol.countDocuments();
  const finalLinked = await ProductCol.countDocuments({ brand: { $ne: null } });
  const finalBrandsCount = await BrandCol.countDocuments();

  console.log(`Total Products in DB: ${finalTotal}`);
  console.log(`Total Branded Products: ${finalLinked} (${Math.round((finalLinked / finalTotal) * 100)}%)`);
  console.log(`Total Active Brands: ${finalBrandsCount}`);

  await mongoose.disconnect();
}

run().catch(console.error);
