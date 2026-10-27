import mongoose from "mongoose";

const ProductSchema = new mongoose.Schema({
  name: String,
  offerPrice: Number,
  originalPrice: Number,
  purchasePrice: Number,
  wholesalePrice: Number,
  campusDiscountPct: Number,
  isFeatured: Boolean,
  isTrending: Boolean,
  isNewArrival: Boolean,
  inStock: Boolean,
}, { strict: false });

const Product = mongoose.models.Product || mongoose.model("Product", ProductSchema, "products");

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB.");

  // Get in-stock products
  const inStockDocs = await Product.find({ inStock: true }).lean();
  console.log(`Total in-stock products: ${inStockDocs.length}`);

  // Calculate profit margin
  const scoredInStock = inStockDocs.map(p => {
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
  }).filter(p => p.offer >= 80);

  // Sort highest margin first, then highest profit amount
  scoredInStock.sort((a, b) => {
    if (Math.abs(b.margin - a.margin) > 0.01) {
      return b.margin - a.margin;
    }
    return b.profit - a.profit;
  });

  // Top 300 IN-STOCK items with highest profit margin get 15%
  const top300InStockIds = new Set(scoredInStock.slice(0, 300).map(p => String(p.id)));
  console.log(`Cutoff margin for 300th in-stock item: ${scoredInStock[299].margin.toFixed(1)}% (${scoredInStock[299].name})`);

  // Now update all products across database
  const allProducts = await Product.find({}).lean();
  const bulkOps = [];
  const counts = { 15: 0, 8: 0, 5: 0 };

  for (const p of allProducts) {
    const isTop300 = top300InStockIds.has(String(p._id));
    const offer = Number(p.offerPrice || p.originalPrice || 0);
    const cost = Number(p.purchasePrice || p.wholesalePrice || Math.round(offer * 0.75));
    const profit = Math.max(0, offer - cost);
    const margin = offer > 0 ? (profit / offer) * 100 : 0;

    let discountPct = 5;
    if (isTop300) {
      discountPct = 15;
    } else if (margin >= 25) {
      discountPct = 8;
    } else {
      discountPct = 5;
    }

    counts[discountPct] = (counts[discountPct] || 0) + 1;

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

  console.log("\nApplied campus discounts successfully!");
  console.log("Discount Distribution across ALL products:", counts);

  const inStock15Count = await Product.countDocuments({ inStock: true, campusDiscountPct: 15 });
  console.log(`Active IN-STOCK products with 15% OFF: ${inStock15Count}`);

  // Sample of in-stock 15% products
  const sample15 = await Product.find({ inStock: true, campusDiscountPct: 15 }).select('name offerPrice originalPrice campusDiscountPct').limit(10).lean();
  console.log("\nSample 15% IN-STOCK Products (ready to show on Top):");
  sample15.forEach(p => console.log(`• [15% OFF] ${p.name.slice(0, 40)} | Offer: ${p.offerPrice} Tk | MRP: ${p.originalPrice} Tk`));

  await mongoose.disconnect();
}

main().catch(console.error);
