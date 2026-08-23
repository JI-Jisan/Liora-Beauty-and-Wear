const mongoose = require('mongoose');

const MONGO_URI = "mongodb://jisan_trends:Jisan889886@ac-2e905xv-shard-00-00.6nzddbx.mongodb.net:27017,ac-2e905xv-shard-00-01.6nzddbx.mongodb.net:27017,ac-2e905xv-shard-00-02.6nzddbx.mongodb.net:27017/jisantrends?ssl=true&replicaSet=atlas-12gikm-shard-0&authSource=admin&retryWrites=true&w=majority";

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    const db = mongoose.connection.db;
    const products = await db.collection("products").find({}).toArray();
    
    let count = 0;
    for (const p of products) {
      const d = (p.originalPrice && p.originalPrice > p.offerPrice)
        ? String(Math.round(((p.originalPrice - p.offerPrice) / p.originalPrice) * 100)) 
        : "";
      await db.collection("products").updateOne({ _id: p._id }, { $set: { discountBadge: d } });
      count++;
    }
    
    console.log(`Successfully migrated ${count} products.`);
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

run();
