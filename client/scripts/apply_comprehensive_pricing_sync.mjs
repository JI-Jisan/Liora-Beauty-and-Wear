import mongoose from "mongoose";

const MONGO_URI = "mongodb://jisan_trends:liora889@ac-2e905xv-shard-00-00.6nzddbx.mongodb.net:27017,ac-2e905xv-shard-00-01.6nzddbx.mongodb.net:27017,ac-2e905xv-shard-00-02.6nzddbx.mongodb.net:27017/jisantrends?ssl=true&replicaSet=atlas-12gikm-shard-0&authSource=admin&retryWrites=true&w=majority";

// User's exact updated retail markup tiers
function getRetailMarkup(p) {
  const price = Number(p) || 0;
  if (price <= 100) return 5;
  if (price <= 200) return 10;
  if (price <= 500) return 20;
  if (price <= 1000) return 30;
  if (price <= 1500) return 50;  // Updated: +50
  if (price <= 2000) return 100; // Updated: +100
  return 200;                    // Updated: +200 for 2000+
}

function calculateProductPricing(p) {
  const cost = Number(p.purchasePrice || p.ogerioWholesalePrice || 0);
  const ogerioReg = Number(p.ogerioRegularPrice || 0);

  if (cost <= 0) return null;

  // 1. Retail Pricing
  const baseReg = ogerioReg > 0 ? ogerioReg : Math.max(Number(p.originalPrice || 0), Math.round(cost * 1.3));
  const retailMarkup = getRetailMarkup(baseReg);
  const offerPrice = baseReg + retailMarkup;
  const originalPrice = Math.max(Math.round(offerPrice * 1.12), baseReg + retailMarkup + 20);
  const discountBadge = originalPrice > offerPrice
    ? String(Math.round(((originalPrice - offerPrice) / originalPrice) * 100))
    : "";

  // 2. Wholesale Pricing
  // User Rule: 8% to 20% margin on cost
  // Must NOT exceed Ogerio retail, and must be at least 10% lower than Ogerio retail
  // Exception: If Ogerio gap <= 12%, give 3-5% margin without exceeding baseReg
  const ogerioGapPct = baseReg > cost ? ((baseReg - cost) / cost) * 100 : 0;
  let targetProfitPct = 12;

  if (ogerioGapPct >= 50) {
    targetProfitPct = 18;
  } else if (ogerioGapPct >= 35) {
    targetProfitPct = 14;
  } else if (ogerioGapPct >= 20) {
    targetProfitPct = 10;
  } else {
    targetProfitPct = 8;
  }

  let wholesalePrice = Math.round(cost * (1 + targetProfitPct / 100));

  // Hard ceiling: minimum 10% lower than Ogerio retail
  const maxAllowedWs = Math.round(baseReg * 0.90);

  if (ogerioGapPct > 12) {
    if (wholesalePrice > maxAllowedWs) {
      wholesalePrice = maxAllowedWs;
    }
    // Floor: at least 3% profit
    if (wholesalePrice < Math.round(cost * 1.03)) {
      wholesalePrice = Math.round(cost * 1.03);
    }
  } else {
    // Tight margin products: 3-5% profit, never exceeding baseReg
    wholesalePrice = Math.min(Math.round(cost * 1.03), Math.max(cost, baseReg - 5));
  }

  // 3. Reseller Pricing
  // Slightly higher than wholesale, between wholesale and retail
  const resellerPrice = Math.min(
    offerPrice - 10,
    Math.max(wholesalePrice + 5, Math.round(wholesalePrice + (offerPrice - wholesalePrice) * 0.22))
  );

  return {
    cost,
    baseReg,
    offerPrice,
    originalPrice,
    discountBadge,
    wholesalePrice,
    resellerPrice
  };
}

async function main() {
  console.log("==================================================================");
  console.log("🚀 APPLYING FULL SYSTEM PRICING (RETAIL, WHOLESALE, RESELLER, COST)");
  console.log("==================================================================\n");

  const startTime = Date.now();
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 25000 });
  const db = mongoose.connection.db;
  console.log("✅ Connected to MongoDB Atlas!\n");

  console.log("Loading all products...");
  const products = await db.collection("products").find({}).toArray();
  console.log(`Loaded ${products.length} products.\n`);

  const bulkOps = [];
  let updatedCount = 0;
  let skippedCount = 0;

  for (const p of products) {
    const calc = calculateProductPricing(p);
    if (!calc) {
      skippedCount++;
      continue;
    }

    bulkOps.push({
      updateOne: {
        filter: { _id: p._id },
        update: {
          $set: {
            purchasePrice: calc.cost,
            offerPrice: calc.offerPrice,
            originalPrice: calc.originalPrice,
            discountBadge: calc.discountBadge,
            wholesalePrice: calc.wholesalePrice,
            resellerPrice: calc.resellerPrice,
            priceEstimated: false,
            updatedAt: new Date()
          }
        }
      }
    });
    updatedCount++;
  }

  console.log(`Executing bulk updates for ${bulkOps.length} products in batches of 500...`);
  let modifiedCount = 0;
  for (let i = 0; i < bulkOps.length; i += 500) {
    const chunk = bulkOps.slice(i, i + 500);
    const res = await db.collection("products").bulkWrite(chunk);
    modifiedCount += res.modifiedCount;
  }

  console.log(`\n✅ Bulk write completed! Total modified: ${modifiedCount} products.\n`);

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
        "The Ordinary Niacinamide Serum 10%+Zinc1% – 30ml",
        "SKIN1004 Madagascar Centella Tone Brightening Capsule Ampoule – 100ml"
      ]
    }
  }).toArray();

  console.log("Sample Verified Products After Full Pricing Sync:");
  for (const p of checkSample) {
    console.log(`- ${p.name}:`);
    console.log(`  কেনা দাম (Cost): ৳${p.purchasePrice}`);
    console.log(`  হোলসেল বিক্রয় (Wholesale): ৳${p.wholesalePrice} (লাভ: +৳${p.wholesalePrice - p.purchasePrice})`);
    console.log(`  রিসেলার বিক্রয় (Reseller): ৳${p.resellerPrice} (লাভ: +৳${p.resellerPrice - p.purchasePrice})`);
    console.log(`  খুচরা অফার (Retail Offer): ৳${p.offerPrice} (লাভ: +৳${p.offerPrice - p.purchasePrice})`);
    console.log(`  মূল দাম (Original MRP): ৳${p.originalPrice} (${p.discountBadge}% OFF)`);
    console.log("--------------------------------------------------------------------------------");
  }

  // Audit: check if ANY product has offerPrice < purchasePrice
  const upsideDown = await db.collection("products").countDocuments({
    $expr: { $lt: ["$offerPrice", "$purchasePrice"] }
  });
  console.log(`\n🚨 AUDIT CHECK: Products where offerPrice < purchasePrice = ${upsideDown} (Must be 0!)`);

  const totalTime = Math.round((Date.now() - startTime) / 1000);
  console.log(`✨ COMPLETED IN ${totalTime}s!`);
  await mongoose.disconnect();
}

main().catch(console.error);
