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
  console.log(`Total products: ${products.length}`);

  // Rank products by profit margin & cash profit
  const scored = products.map(p => {
    const offer = Number(p.offerPrice || p.originalPrice || 0);
    const cost = Number(p.purchasePrice || p.wholesalePrice || Math.round(offer * 0.75));
    const profit = Math.max(0, offer - cost);
    const margin = offer > 0 ? (profit / offer) * 100 : 0;
    return {
      id: p._id,
      name: p.name,
      offer,
      cost,
      profit,
      margin
    };
  });

  // Sort: highest margin first, then highest profit amount
  scored.sort((a, b) => {
    if (b.margin !== a.margin) {
      return b.margin - a.margin;
    }
    return b.profit - a.profit;
  });

  // Top 300 products with highest profit margin get 15%
  const top300Ids = new Set(scored.slice(0, 300).map(p => String(p.id)));

  const bulkOps = [];
  const counts = { 15: 0, 8: 0, 5: 0 };

  for (const p of scored) {
    let discountPct = 5;
    if (top300Ids.has(String(p.id))) {
      discountPct = 15;
    } else if (p.margin >= 25) {
      discountPct = 8;
    } else {
      discountPct = 5;
    }

    counts[discountPct] = (counts[discountPct] || 0) + 1;

    bulkOps.push({
      updateOne: {
        filter: { _id: p.id },
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

  console.log("\nApplied campus discounts successfully!");
  console.log("Discount Distribution:", counts);

  // Check top 300 items sample
  const sample15 = scored.slice(0, 5);
  console.log("Top 15% items sample:", sample15.map(p => ({
    name: p.name.slice(0, 30),
    offer: p.offer,
    margin: p.margin.toFixed(1) + "%",
    discount: "15%"
  })));

  // Check 300th item
  console.log("300th item (cutoff):", {
    name: scored[299].name.slice(0, 30),
    offer: scored[299].offer,
    margin: scored[299].margin.toFixed(1) + "%"
  });

  // Check 301st item
  console.log("301st item (outside top 300):", {
    name: scored[300].name.slice(0, 30),
    offer: scored[300].offer,
    margin: scored[300].margin.toFixed(1) + "%"
  });

  await mongoose.disconnect();
}

main().catch(console.error);
