import mongoose from 'mongoose';

const URI = 'mongodb://jisan_trends:liora889@ac-2e905xv-shard-00-00.6nzddbx.mongodb.net:27017,ac-2e905xv-shard-00-01.6nzddbx.mongodb.net:27017,ac-2e905xv-shard-00-02.6nzddbx.mongodb.net:27017/jisantrends?ssl=true&replicaSet=atlas-12gikm-shard-0&authSource=admin&retryWrites=true&w=majority';

async function audit() {
  await mongoose.connect(URI);
  const db = mongoose.connection;
  
  const total = await db.collection('products').countDocuments();
  const withBrand = await db.collection('products').countDocuments({ brand: { $ne: null } });
  console.log(`Total products: ${total}, Products with brand assigned: ${withBrand}`);

  const brands = await db.collection('brands').find({}).toArray();
  for (const b of brands) {
    const titleCount = await db.collection('products').countDocuments({ name: { $regex: b.name, $options: 'i' } });
    const brandFieldCount = await db.collection('products').countDocuments({ brand: b._id });
    console.log(`Brand: "${b.name}" (slug: ${b.slug}) -> Matching titles in DB: ${titleCount}, Assigned in brand field: ${brandFieldCount}`);
  }

  await mongoose.disconnect();
}

audit().catch(console.error);
