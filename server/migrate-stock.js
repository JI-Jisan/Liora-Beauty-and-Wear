const mongoose = require("mongoose");

async function migrate() {
  const uri = "mongodb://jisan_trends:Jisan889886@ac-2e905xv-shard-00-00.6nzddbx.mongodb.net:27017,ac-2e905xv-shard-00-01.6nzddbx.mongodb.net:27017,ac-2e905xv-shard-00-02.6nzddbx.mongodb.net:27017/jisantrends?ssl=true&replicaSet=atlas-12gikm-shard-0&authSource=admin&retryWrites=true&w=majority";

  try {
    await mongoose.connect(uri);
    console.log("Connected correctly to server");
    const db = mongoose.connection.db;
    
    const result = await db.collection("products").updateMany(
      { $or: [ { stockQuantity: { $exists: false } }, { stockQuantity: 0 }, { stockQuantity: null } ] },
      { $set: { stockQuantity: 100 } }
    );
    
    console.log(`${result.matchedCount} document(s) matched the filter, updated ${result.modifiedCount} document(s)`);
  } catch (err) {
    console.log(err.stack);
  } finally {
    await mongoose.disconnect();
  }
}

migrate();
