const mongoose = require('mongoose');

const MONGO_URI = "mongodb://jisan_trends:Jisan889886@ac-2e905xv-shard-00-00.6nzddbx.mongodb.net:27017,ac-2e905xv-shard-00-01.6nzddbx.mongodb.net:27017,ac-2e905xv-shard-00-02.6nzddbx.mongodb.net:27017/jisantrends?ssl=true&replicaSet=atlas-12gikm-shard-0&authSource=admin&retryWrites=true&w=majority";

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    const db = mongoose.connection.db;
    const categories = await db.collection("categories").find({ parent: { $ne: null } }).toArray();
    
    let count = 0;
    for (const c of categories) {
      const chain = [];
      let cur = c;
      while (cur && cur.parent) {
        cur = await db.collection("categories").findOne({ _id: cur.parent });
        if (cur) chain.unshift(cur._id);
      }
      await db.collection("categories").updateOne({ _id: c._id }, { $set: { ancestors: chain, level: chain.length } });
      count++;
    }
    
    console.log(`Successfully migrated ${count} categories.`);
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

run();
