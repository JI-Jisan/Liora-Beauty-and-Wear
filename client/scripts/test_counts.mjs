import { connectToDatabase } from "../lib/db.js";
import { Brand, Product } from "../lib/models.js";

async function test() {
  await connectToDatabase();
  const brands = await Brand.find().sort({ name: 1 }).lean();
  console.log("Total Brand docs:", brands.length);

  const counts = await Product.aggregate([
    { $match: { brand: { $ne: null } } },
    { $group: { _id: "$brand", count: { $sum: 1 } } }
  ]);
  console.log("Counts aggregation results:", counts.slice(0, 5));

  const countMap = {};
  counts.forEach((c) => {
    if (c._id) {
      countMap[c._id.toString()] = c.count;
    }
  });

  const enriched = brands
    .map((b) => ({
      _id: b._id,
      name: b.name,
      slug: b.slug,
      productCount: countMap[b._id.toString()] || 0,
    }));

  console.log("Total enriched brands:", enriched.length);
  const withProducts = enriched.filter((b) => b.productCount > 0);
  console.log("Brands with productCount > 0:", withProducts.length);
  if (withProducts.length > 0) {
    console.log("First 3 brands with products:", withProducts.slice(0, 3));
  } else {
    console.log("Sample enriched without filter:", enriched.slice(0, 5));
  }
  process.exit(0);
}

test().catch(e => { console.error(e); process.exit(1); });
