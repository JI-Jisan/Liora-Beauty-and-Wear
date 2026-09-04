import mongoose from 'mongoose';

const URI = 'mongodb://jisan_trends:liora889@ac-2e905xv-shard-00-00.6nzddbx.mongodb.net:27017,ac-2e905xv-shard-00-01.6nzddbx.mongodb.net:27017,ac-2e905xv-shard-00-02.6nzddbx.mongodb.net:27017/jisantrends?ssl=true&replicaSet=atlas-12gikm-shard-0&authSource=admin&retryWrites=true&w=majority';

async function clean() {
  await mongoose.connect(URI);
  const db = mongoose.connection;
  
  // Delete flat root categories that were created before breadcrumb parsing
  await db.collection('categories').deleteMany({
    name: { $in: ['Lip Liner', 'Niacinamide Serum', 'Facial Scrub'] },
    parent: null
  });

  // Delete the 5 test products so they re-import with proper nested categories
  const testNames = [
    'Beauty Glazed Waterproof & Long Lasting Lipliner Pencil – B114 Chocolate',
    'I’M From Rice Toner 30ml',
    'The Ordinary Niacinamide Serum 10%+Zinc1% – 30ml',
    'Laikou Octopus Silicone Face Cleansing Brush – Pink',
    'AXIS-Y Dark Spot Correcting Glow Serum – 50ml'
  ];
  await db.collection('products').deleteMany({ name: { $in: testNames } });

  console.log('Cleaned initial test data. Now ready for 100% hierarchical import.');
  await mongoose.disconnect();
}

clean().catch(console.error);
