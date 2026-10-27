import mongoose from "mongoose";

const ProductSchema = new mongoose.Schema({
  name: String,
  offerPrice: Number,
  originalPrice: Number,
  purchasePrice: Number,
  wholesalePrice: Number,
  campusDiscountPct: Number,
  inStock: Boolean,
}, { strict: false });

const Product = mongoose.models.Product || mongoose.model("Product", ProductSchema, "products");

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB.");

  const products = await Product.find({}).lean();
  console.log(`Total products in database: ${products.length}`);

  const bulkOps = [];
  const distribution = { 15: 0, 10: 0, 7: 0, 5: 0 };

  for (const p of products) {
    const offerPrice = Number(p.offerPrice || p.originalPrice || 0);
    // Cost: purchasePrice > wholesalePrice > 72% of offerPrice
    const cost = Number(p.purchasePrice || p.wholesalePrice || Math.round(offerPrice * 0.72));
    
    let discountPct = 5;
    if (offerPrice > 0) {
      const margin = (offerPrice - cost) / offerPrice;
      if (margin >= 0.33) {
        discountPct = 15;
      } else if (margin >= 0.25) {
        discountPct = 10;
      } else if (margin >= 0.18) {
        discountPct = 7;
      } else {
        discountPct = 5;
      }
    }

    distribution[discountPct] = (distribution[discountPct] || 0) + 1;

    bulkOps.push({
      updateOne: {
        filter: { _id: p._id },
        update: { $set: { campusDiscountPct: discountPct } }
      }
    });

    if (bulkOps.length >= 500) {
      await Product.bulkWrite(bulkOps);
      bulkOps.length = 0;
      process.stdout.write(".");
    }
  }

  if (bulkOps.length > 0) {
    await Product.bulkWrite(bulkOps);
    process.stdout.write(".");
  }

  console.log("\nUpdate complete!");
  console.log("New Distribution:", distribution);

  // Check sample top featured products
  const featured = await Product.find({ isFeatured: true }).limit(5).lean();
  console.log("Featured items sample:", featured.map(p => ({
    name: p.name,
    offerPrice: p.offerPrice,
    cost: p.purchasePrice || p.wholesalePrice,
    campusDiscountPct: p.campusDiscountPct,
    campusPrice: Math.round(p.offerPrice * (1 - p.campusDiscountPct / 100)),
    saving: Math.round(p.offerPrice * (p.campusDiscountPct / 100))
  })));

  await mongoose.disconnect();
}

main().catch(console.error);
