import mongoose from "mongoose";
import { syncPendingOrdersWithProductPrices } from "./sync_pending_orders_prices.mjs";

const MONGO_URI = "mongodb://jisan_trends:liora889@ac-2e905xv-shard-00-00.6nzddbx.mongodb.net:27017,ac-2e905xv-shard-00-01.6nzddbx.mongodb.net:27017,ac-2e905xv-shard-00-02.6nzddbx.mongodb.net:27017/jisantrends?ssl=true&replicaSet=atlas-12gikm-shard-0&authSource=admin&retryWrites=true&w=majority";

function calculateDynamicWholesalePrice(cost, ogerioSelling, ogerioMRP) {
  cost = Number(cost) || 0;
  ogerioSelling = Number(ogerioSelling) || cost;
  ogerioMRP = Number(ogerioMRP) || Math.max(ogerioSelling, Math.round(cost * 1.3));

  if (cost <= 0) return 0;

  // Measure the available gap
  const gapAgainstMRP = ogerioMRP > cost ? ((ogerioMRP - cost) / cost) * 100 : 0;
  const gapAgainstSelling = ogerioSelling > cost ? ((ogerioSelling - cost) / cost) * 100 : 0;

  let wholesalePrice = cost;

  // 1. Super tight margin (gap <= 15% against MRP or gap <= 10% against Selling)
  // E.g. Kodomo (cost 565, MRP 627)
  if (gapAgainstMRP <= 15 || gapAgainstSelling <= 10) {
    // Take 5% to 6% survival profit (minimum 25-35 Tk)
    const profit = Math.max(25, Math.round(cost * 0.053));
    wholesalePrice = Math.min(cost + profit, Math.max(cost, ogerioMRP - 25));
  }
  // 2. Medium margin (gap 15% to 35% against MRP)
  // E.g. Simple Face Wash (cost 570, Selling 680, MRP 750)
  else if (gapAgainstMRP <= 35) {
    // 11% to 12% profit
    let target = Math.round(cost * 1.114);
    // Ensure it is cheaper than Ogerio selling price if possible
    if (ogerioSelling > cost) {
      const capBelowOgerio = Math.max(Math.round(cost * 1.06), ogerioSelling - 30);
      target = Math.min(target, capBelowOgerio);
    }
    wholesalePrice = target;
  }
  // 3. Good margin (gap 35% to 70% against MRP)
  // E.g. Vaseline Cocoa Oil (cost 1060, Selling 1250, MRP 1550)
  // E.g. Dove Hair Mask (cost 785, Selling 850, MRP 1000)
  else if (gapAgainstMRP <= 70) {
    // 12% to 15% profit
    let target = Math.round(cost * 1.123);
    // Cap below Ogerio selling price if available
    if (ogerioSelling > cost) {
      const capBelowOgerio = Math.max(Math.round(cost * 1.05), ogerioSelling - 20);
      target = Math.min(target, capBelowOgerio);
    }
    wholesalePrice = target;
  }
  // 4. Super High margin (gap > 70% against MRP)
  // E.g. SADOER Black Mask (cost 130, MRP 350)
  // E.g. Beauty Glazed Lip Oil (cost 110, Selling 150, MRP 450)
  else {
    // 25% to 30% profit
    let target = Math.round(cost * 1.28);
    // Ensure it stays below Ogerio selling price by at least 10% if Ogerio is discounting heavily
    if (ogerioSelling > cost) {
      const capBelowOgerio = Math.max(Math.round(cost * 1.15), Math.round(ogerioSelling * 0.90));
      target = Math.min(target, capBelowOgerio);
    }
    wholesalePrice = target;
  }

  // Safety boundaries:
  // Never below cost
  if (wholesalePrice < cost) wholesalePrice = cost;
  // Round to nearest 5 for clean currency (or nice integer)
  if (wholesalePrice > 100) {
    wholesalePrice = Math.round(wholesalePrice / 5) * 5;
  }

  return wholesalePrice;
}

async function main() {
  console.log("==================================================================");
  console.log("🚀 APPLYING DYNAMIC PROFIT SHARING WHOLESALE MARGINS TO CATALOG");
  console.log("==================================================================\n");

  const startTime = Date.now();
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 25000 });
  const db = mongoose.connection.db;
  console.log("✅ Connected to MongoDB Atlas!\n");

  const products = await db.collection("products").find({}).toArray();
  console.log(`Loaded ${products.length} products.`);

  const bulkOps = [];
  let updatedCount = 0;

  for (const p of products) {
    const cost = Number(p.purchasePrice || p.ogerioWholesalePrice || 0);
    const ogerioSelling = Number(p.ogerioPrice || p.offerPrice || cost);
    const ogerioMRP = Number(p.ogerioRegularPrice || p.originalPrice || Math.round(cost * 1.3));
    const offerPrice = Number(p.offerPrice || ogerioSelling);

    if (cost <= 0) continue;

    const newWholesalePrice = calculateDynamicWholesalePrice(cost, ogerioSelling, ogerioMRP);

    // Reseller Price: midway between wholesale and retail offer
    const newResellerPrice = Math.min(
      offerPrice - 10,
      Math.max(newWholesalePrice + 5, Math.round(newWholesalePrice + (offerPrice - newWholesalePrice) * 0.22))
    );

    bulkOps.push({
      updateOne: {
        filter: { _id: p._id },
        update: {
          $set: {
            wholesalePrice: newWholesalePrice,
            resellerPrice: newResellerPrice,
            updatedAt: new Date()
          }
        }
      }
    });
    updatedCount++;
  }

  console.log(`Executing bulk updates for ${bulkOps.length} products...`);
  let modifiedCount = 0;
  for (let i = 0; i < bulkOps.length; i += 500) {
    const chunk = bulkOps.slice(i, i + 500);
    const res = await db.collection("products").bulkWrite(chunk);
    modifiedCount += res.modifiedCount;
  }
  console.log(`✅ Bulk write finished! Total ${modifiedCount} products updated with dynamic wholesale margins.\n`);

  // Refresh Pending orders
  console.log("Refreshing Pending orders with updated wholesale prices...");
  const orderRes = await syncPendingOrdersWithProductPrices(db);
  console.log(`✅ Pending orders refreshed: ${orderRes.updatedOrders} orders.\n`);

  // Sample check
  const checkSample = await db.collection("products").find({
    name: {
      $in: [
        "Simple Refreshing Face Wash 150ml (India)",
        "Dove Deep Repair Treatment Hair Mask 10 in 1 300 Ml",
        "Vaseline Lotion Deep Restore 400ml With Gluta-Hya Dewy Radiance Serum 70ml Free",
        "Vaseline Cocoa Radiant Body Oil – 200ML",
        "Kodomo Baby Lotion Powder Extra Mild – 180ml",
        "SADOER Bamboo Charcoal Black Mask 60g",
        "Caplino Niacinamide Serum 10% + Zinc PCA 30ml",
        "Beauty Glazed Glow Lip Oil – COCOA 110"
      ]
    }
  }).toArray();

  console.log("SAMPLE VERIFIED PRODUCTS AFTER DYNAMIC MARGIN SYNC:\n");
  for (const p of checkSample) {
    const cost = p.purchasePrice;
    const ws = p.wholesalePrice;
    const mrp = p.originalPrice;
    const profit = ws - cost;
    const dokandarProfit = mrp - ws;
    console.log(`Product: ${p.name}`);
    console.log(`  কেনা দাম: ৳${cost} | MRP: ৳${mrp} | ওজেরিও বিক্রয়: ৳${p.ogerioPrice}`);
    console.log(`  LIORA হোলসেল বিক্রয়: ৳${ws} (আপনার লাভ: +৳${profit}, দোকানদারের লাভ: +৳${dokandarProfit})`);
    console.log(`  LIORA খুচরা অফার: ৳${p.offerPrice}`);
    console.log("--------------------------------------------------------------------------------");
  }

  const totalTime = Math.round((Date.now() - startTime) / 1000);
  console.log(`✨ COMPLETED IN ${totalTime}s!`);
  await mongoose.disconnect();
}

main().catch(console.error);
