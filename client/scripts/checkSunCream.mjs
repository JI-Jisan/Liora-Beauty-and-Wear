import mongoose from 'mongoose';

const URI = 'mongodb://jisan_trends:liora889@ac-2e905xv-shard-00-00.6nzddbx.mongodb.net:27017,ac-2e905xv-shard-00-01.6nzddbx.mongodb.net:27017,ac-2e905xv-shard-00-02.6nzddbx.mongodb.net:27017/jisantrends?ssl=true&replicaSet=atlas-12gikm-shard-0&authSource=admin&retryWrites=true&w=majority';

async function check() {
  await mongoose.connect(URI);
  const db = mongoose.connection;
  
  const query = {
    $and: [
      { name: { $regex: 'sun', $options: 'i' } },
      { name: { $regex: 'cream', $options: 'i' } }
    ]
  };

  const results = await db.collection('products').find(query).project({ name: 1, offerPrice: 1 }).toArray();
  console.log(`Matching "sun" + "cream": ${results.length} products found!`);
  results.forEach((p, i) => console.log(`${i+1}. ${p.name} (Tk ${p.offerPrice})`));

  await mongoose.disconnect();
}

check().catch(console.error);
