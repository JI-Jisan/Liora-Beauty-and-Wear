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

  // 1. Reset ALL isFeatured and isTrending to false
  await Product.updateMany({}, { $set: { isFeatured: false, isTrending: false, isNewArrival: false } });
  console.log("Reset all flags across entire database.");

  // 2. Curate K-Beauty Viral Skincare for "isFeatured" (Featured Collection)
  const koreanDocs = await Product.find({
    inStock: true,
    name: /ordinary.*serum|cosrx.*toner|cosrx.*snail|joseon|axis-y.*dark spot|skin1004.*centella|rice toner|some by mi.*barrier|anua.*heartleaf|laneige/i,
    offerPrice: { $gt: 200 }
  }).lean();
  console.log(`Found ${koreanDocs.length} viral Korean skincare products.`);
  await Product.updateMany({ _id: { $in: koreanDocs.map(p => p._id) } }, { $set: { isFeatured: true } });

  // 3. Curate Luxury Makeup & Velvet Lipsticks for "isTrending" (Trending & Hot Deals)
  const makeupDocs = await Product.find({
    inStock: true,
    name: /swiss beauty.*lipstick|mars.*lip tint|beauty glazed.*lipliner|swiss beauty.*blush|mars.*palette|sheglam|liquid matte|focallure.*lip|maybelline.*matte|tinted/i,
    offerPrice: { $gt: 100 }
  }).lean();
  console.log(`Found ${makeupDocs.length} viral Makeup & Lipsticks products.`);
  await Product.updateMany({ _id: { $in: makeupDocs.map(p => p._id) } }, { $set: { isTrending: true } });

  // 4. Curate Winter Deep Hydration & Body Care for "isNewArrival" (Winter Collection)
  const winterDocs = await Product.find({
    inStock: true,
    name: /vaseline.*lotion|gluta hya|aveeno.*cream|ceramide.*lip balm|centella.*firming cream|propolis.*barrier|cerave|cetaphil.*lotion|cocoa butter|deep moisture/i,
    offerPrice: { $gt: 150 }
  }).lean();
  console.log(`Found ${winterDocs.length} Winter Hydration products.`);
  await Product.updateMany({ _id: { $in: winterDocs.map(p => p._id) } }, { $set: { isNewArrival: true } });

  // 5. Inspect the newly curated collections
  const featured = await Product.find({ isFeatured: true }).select('name offerPrice originalPrice campusDiscountPct').lean();
  console.log("\n================ NEW FEATURED: K-BEAUTY VIRAL SKINCARE ================");
  featured.slice(0, 10).forEach(p => console.log(`• ${p.name} (Offer: ${p.offerPrice} Tk, MRP: ${p.originalPrice} Tk)`));

  const trending = await Product.find({ isTrending: true }).select('name offerPrice originalPrice campusDiscountPct').lean();
  console.log("\n================ NEW TRENDING: MAKEUP & VELVET LIPSTICKS ================");
  trending.slice(0, 10).forEach(p => console.log(`• ${p.name} (Offer: ${p.offerPrice} Tk, MRP: ${p.originalPrice} Tk)`));

  const winter = await Product.find({ isNewArrival: true }).select('name offerPrice originalPrice campusDiscountPct').lean();
  console.log("\n================ NEW WINTER ESSENTIALS: HYDRATION & BODY CARE ================");
  winter.slice(0, 10).forEach(p => console.log(`• ${p.name} (Offer: ${p.offerPrice} Tk, MRP: ${p.originalPrice} Tk)`));

  await mongoose.disconnect();
}

main().catch(console.error);
