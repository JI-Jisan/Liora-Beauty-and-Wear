import mongoose from "mongoose";

const URI =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  "mongodb://jisan_trends:liora889@ac-2e905xv-shard-00-00.6nzddbx.mongodb.net:27017,ac-2e905xv-shard-00-01.6nzddbx.mongodb.net:27017,ac-2e905xv-shard-00-02.6nzddbx.mongodb.net:27017/jisantrends?ssl=true&replicaSet=atlas-12gikm-shard-0&authSource=admin&retryWrites=true&w=majority";

async function main() {
  await mongoose.connect(URI);
  console.log("Connected to DB for migration...");

  const Product = mongoose.connection.collection("products");
  const Batches = mongoose.connection.collection("purchasebatches");

  const products = await Product.find({}).toArray();
  let n = 0;

  for (const p of products) {
    const exists = await Batches.findOne({ product: p._id });
    if (exists) {
      console.log("skip (already has batch):", p.name);
      continue;
    }

    const qty = Number(p.stockQuantity) || 0;
    const cost = Number(p.purchasePrice) || 0;
    if (qty <= 0) {
      console.log("skip (no stock):", p.name);
      continue;
    }

    await Batches.insertOne({
      product: p._id,
      productName: p.name,
      qty,
      remaining: qty,
      unitCost: cost,
      purchaseDate: p.createdAt || new Date(),
      ownerName: "Owner",
      locationName: "Owner",
      supplier: "",
      note: "Opening stock (migration)",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    n++;
    console.log("✅ Created batch for:", p.name, qty, "pcs @", cost, "Tk");
  }

  console.log(`\nDone. ${n} opening batch তৈরি হয়েছে।`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
