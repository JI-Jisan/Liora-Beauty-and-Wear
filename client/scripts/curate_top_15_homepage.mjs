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

  // Fetch all in-stock 15% items excluding grocery soaps
  const items15 = await Product.find({
    campusDiscountPct: 15,
    inStock: true
  }).lean();

  const clean15 = items15.filter(p => {
    const n = (p.name || "").toLowerCase();
    return !n.includes("skino") && !n.includes("lifebuoy") && !n.includes("shower gel") && !n.includes("bath soap") && !n.includes("cleansing brush");
  });

  console.log(`Total premium in-stock 15% discount products: ${clean15.length}`);

  // Categorize 15% items into:
  // 1. Skincare / Serums / Glass skin (featured)
  // 2. Makeup / Lipsticks / Lip oils / Palettes (trending)
  // 3. Winter Hydration / Lotions / Creams / Lip balms (new arrivals)

  const isSkincare = (name) => /serum|toner|essence|cleanser|face wash|sunscreen|aha|bha|snail|rice|centella|niacinamide|salicylic|hyaluronic/i.test(name);
  const isMakeup = (name) => /lip|lipstick|tint|gloss|powder|blush|palette|eyeliner|eyebrow|sponge|brush|foundation|concealer|makeup|mascara/i.test(name);
  const isWinter = (name) => /lotion|cream|moisturiz|butter|balm|body care|hydrat|barrier|gluta/i.test(name);

  const featuredIds = [];
  const trendingIds = [];
  const newArrivalIds = [];

  clean15.forEach(p => {
    const n = p.name;
    if (isSkincare(n) && featuredIds.length < 24) {
      featuredIds.push(p._id);
    } else if (isMakeup(n) && trendingIds.length < 24) {
      trendingIds.push(p._id);
    } else if (isWinter(n) && newArrivalIds.length < 24) {
      newArrivalIds.push(p._id);
    } else {
      // distribute remaining
      if (featuredIds.length < 30) featuredIds.push(p._id);
      else if (trendingIds.length < 30) trendingIds.push(p._id);
      else if (newArrivalIds.length < 30) newArrivalIds.push(p._id);
    }
  });

  console.log(`Selected for Featured (Skincare 15%): ${featuredIds.length}`);
  console.log(`Selected for Trending (Makeup 15%): ${trendingIds.length}`);
  console.log(`Selected for New Arrivals (Winter 15%): ${newArrivalIds.length}`);

  // Update in DB
  const res1 = await Product.updateMany({ _id: { $in: featuredIds } }, { $set: { isFeatured: true } });
  const res2 = await Product.updateMany({ _id: { $in: trendingIds } }, { $set: { isTrending: true } });
  const res3 = await Product.updateMany({ _id: { $in: newArrivalIds } }, { $set: { isNewArrival: true } });

  console.log("Updated DB:", { featured: res1.modifiedCount, trending: res2.modifiedCount, newArrival: res3.modifiedCount });

  // Verification
  const f15 = await Product.countDocuments({ isFeatured: true, campusDiscountPct: 15, inStock: true });
  const t15 = await Product.countDocuments({ isTrending: true, campusDiscountPct: 15, inStock: true });
  const n15 = await Product.countDocuments({ isNewArrival: true, campusDiscountPct: 15, inStock: true });

  console.log(`VERIFIED IN DB:`);
  console.log(`Featured in-stock 15% items: ${f15}`);
  console.log(`Trending in-stock 15% items: ${t15}`);
  console.log(`New Arrival in-stock 15% items: ${n15}`);

  await mongoose.disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
