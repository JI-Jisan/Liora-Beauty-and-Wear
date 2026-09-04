import mongoose from 'mongoose';

const URI = 'mongodb://jisan_trends:liora889@ac-2e905xv-shard-00-00.6nzddbx.mongodb.net:27017,ac-2e905xv-shard-00-01.6nzddbx.mongodb.net:27017,ac-2e905xv-shard-00-02.6nzddbx.mongodb.net:27017/jisantrends?ssl=true&replicaSet=atlas-12gikm-shard-0&authSource=admin&retryWrites=true&w=majority';

async function analyze() {
  await mongoose.connect(URI);
  const db = mongoose.connection;
  const total = await db.collection('products').countDocuments();
  const linked = await db.collection('products').countDocuments({ brand: { $ne: null } });
  const unlinked = await db.collection('products').find({ brand: null }).project({ name: 1 }).toArray();

  console.log(`Total Products: ${total}`);
  console.log(`Products already with Brand: ${linked} (${Math.round((linked/total)*100)}%)`);
  console.log(`Unlinked Products: ${unlinked.length}`);

  // Extract first 1 or 2 words
  const counts = {};
  for (const p of unlinked) {
    const words = p.name.trim().split(/\s+/);
    if (words.length >= 1) {
      const w1 = words[0].replace(/[^\w-]/g, '');
      if (w1.length > 2) counts[w1] = (counts[w1] || 0) + 1;
    }
    if (words.length >= 2) {
      const w2 = `${words[0]} ${words[1]}`.replace(/[^\w\s-]/g, '');
      counts[w2] = (counts[w2] || 0) + 1;
    }
  }

  const sorted = Object.entries(counts)
    .filter(([_, count]) => count >= 5)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 40);

  console.log('\nTop Brand candidates found in unlinked products:');
  sorted.forEach(([name, count]) => {
    console.log(`• ${name}: ${count} products`);
  });

  await mongoose.disconnect();
}

analyze().catch(console.error);
