import mongoose from 'mongoose';

const MONGODB_URI = "mongodb://jisan_trends:Jisan889886@ac-2e905xv-shard-00-00.6nzddbx.mongodb.net:27017,ac-2e905xv-shard-00-01.6nzddbx.mongodb.net:27017,ac-2e905xv-shard-00-02.6nzddbx.mongodb.net:27017/jisantrends?ssl=true&replicaSet=atlas-12gikm-shard-0&authSource=admin&retryWrites=true&w=majority";

async function run() {
  const uri = MONGODB_URI;

  try {
    await mongoose.connect(uri);
    console.log("Connected to MongoDB.");

    const db = mongoose.connection.db;
    const categoriesCollection = db.collection('categories');

    // 1. Drop index
    try {
      await categoriesCollection.dropIndex('name_1');
      console.log("Successfully dropped 'name_1' index.");
    } catch (e) {
      if (e.code === 27) {
        console.log("Index 'name_1' does not exist or already dropped.");
      } else {
        console.error("Error dropping index:", e.message);
      }
    }

    // 2. Backfill existing categories
    const result = await categoriesCollection.updateMany(
      { ancestors: { $exists: false } },
      { $set: { parent: null, ancestors: [], level: 0 } }
    );
    console.log(`Backfilled categories: Matched ${result.matchedCount}, Modified ${result.modifiedCount}`);

    console.log("Migration complete.");
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

run();
