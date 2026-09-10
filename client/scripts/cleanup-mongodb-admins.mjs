import mongoose from "mongoose";

const MONGO_URI =
  process.env.MONGO_URI ||
  "mongodb://jisan_trends:liora889@ac-2e905xv-shard-00-00.6nzddbx.mongodb.net:27017,ac-2e905xv-shard-00-01.6nzddbx.mongodb.net:27017,ac-2e905xv-shard-00-02.6nzddbx.mongodb.net:27017/jisantrends?ssl=true&replicaSet=atlas-12gikm-shard-0&authSource=admin&retryWrites=true&w=majority";

async function run() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;

  // 1. Check existing MongoDB admins
  const admins = await db.collection("admins").find({}).toArray();
  console.log(`Found ${admins.length} records in MongoDB 'admins' collection:`);
  admins.forEach(a => console.log(` - ${a.email} (${a.name})`));

  if (admins.length > 0) {
    const deleteResult = await db.collection("admins").deleteMany({});
    console.log(`✅ Deleted ${deleteResult.deletedCount} admin records from MongoDB 'admins' collection.`);
  }

  // 2. Check and reset customers with role === "admin"
  const adminCustomers = await db.collection("customers").find({ role: "admin" }).toArray();
  console.log(`Found ${adminCustomers.length} customers with role 'admin':`);
  adminCustomers.forEach(c => console.log(` - ${c.email} (${c.name})`));

  if (adminCustomers.length > 0) {
    const updateResult = await db.collection("customers").updateMany(
      { role: "admin" },
      { $set: { role: "user" } }
    );
    console.log(`✅ Updated ${updateResult.modifiedCount} customer records to role 'user'.`);
  }

  console.log("\n🎉 MongoDB admin cleanup completed! Admin access is now 100% managed via Firebase.");
  await mongoose.disconnect();
}

run().catch(err => {
  console.error("Cleanup error:", err);
  process.exit(1);
});
