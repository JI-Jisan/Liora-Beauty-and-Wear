import mongoose from "mongoose";
import fs from "fs";

function cleanStr(s) {
  return (s || "")
    .toLowerCase()
    .replace(/[–—−-]/g, " ")
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const MONGO_URI =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  "mongodb://jisan_trends:liora889@ac-2e905xv-shard-00-00.6nzddbx.mongodb.net:27017,ac-2e905xv-shard-00-01.6nzddbx.mongodb.net:27017,ac-2e905xv-shard-00-02.6nzddbx.mongodb.net:27017/jisantrends?ssl=true&replicaSet=atlas-12gikm-shard-0&authSource=admin&retryWrites=true&w=majority";

async function main() {
  const isApply = process.argv.includes("--apply");
  console.log("==================================================================");
  console.log(`🛡️  LIORA vs OGERIO.COM PRICE SYNC & DIU 15% FLOOR ADJUSTMENT`);
  console.log(`Mode: ${isApply ? "🚀 APPLY CHANGES TO MONGODB" : "🔍 DRY RUN (Audit Only)"}`);
  console.log("==================================================================\n");

  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB.\n");

  const db = mongoose.connection;
  const ProductCol = db.collection("products");

  // 1. Load Ogerio Catalogs
  const fullCatalogPath = fs.existsSync("scripts/scraped_full_catalog.json")
    ? "scripts/scraped_full_catalog.json"
    : "client/scripts/scraped_full_catalog.json";
  const fullCatalog = JSON.parse(fs.readFileSync(fullCatalogPath, "utf8"));

  // Build Ogerio price map (strict sanity: sellPrice between 10 and 10000 Tk)
  const ogerioMap = new Map();
  for (const [title, item] of Object.entries(fullCatalog)) {
    if (item.sellPrice && item.sellPrice > 10 && item.sellPrice < 10000) {
      ogerioMap.set(title.trim(), item.sellPrice);
      ogerioMap.set(cleanStr(title), item.sellPrice);
    }
  }

  // Also check ogerio_complete_live_prices.json for any retail prices
  const livePricesPath = fs.existsSync("scripts/ogerio_complete_live_prices.json")
    ? "scripts/ogerio_complete_live_prices.json"
    : "client/scripts/ogerio_complete_live_prices.json";
  if (fs.existsSync(livePricesPath)) {
    const livePrices = JSON.parse(fs.readFileSync(livePricesPath, "utf8"));
    for (const item of livePrices) {
      if (item.title && item.pricingKind === "retail" && item.regularPrice && item.regularPrice < 10000) {
        if (!ogerioMap.has(item.title.trim())) {
          ogerioMap.set(item.title.trim(), item.regularPrice);
          ogerioMap.set(cleanStr(item.title), item.regularPrice);
        }
      }
    }
  }

  console.log(`Loaded Ogerio price data. Total unique price keys: ${ogerioMap.size}\n`);

  // 2. Fetch all products from MongoDB
  const allProducts = await ProductCol.find({}).toArray();
  console.log(`Total products in LIORA database: ${allProducts.length}`);

  let matchedCount = 0;
  let untouchedHigherOrEqual = 0;
  let adjustedToOgerioPrice = 0;
  let offerBelowOgerioUpdated = 0;

  const bulkOps = [];
  const sampleAdjustments = [];

  for (const p of allProducts) {
    const ogerioSell = ogerioMap.get(p.name?.trim()) || ogerioMap.get(cleanStr(p.name));
    if (!ogerioSell) continue;
    matchedCount++;

    const currentOffer = Number(p.offerPrice || p.originalPrice || 0);
    const currentDiscountPct = Number(p.campusDiscountPct || 0);

    let newOffer = currentOffer;
    let offerChanged = false;

    // Check if offerPrice is already strictly below Ogerio
    if (currentOffer < ogerioSell) {
      newOffer = ogerioSell;
      offerChanged = true;
      offerBelowOgerioUpdated++;
    }

    // Standard DIU 15% discount calculation
    const rawDiuPrice = Math.round(newOffer * 0.85);

    let newDiscountPct = currentDiscountPct;
    let finalDiuPrice = Math.round(newOffer * (1 - currentDiscountPct / 100));
    let discountChanged = false;

    // If giving 15% off (or current discount) makes price drop BELOW Ogerio selling price:
    if (rawDiuPrice < ogerioSell) {
      // Rule: Set DIU price EQUAL to Ogerio's price!
      // Calculate exact campusDiscountPct so that newOffer * (1 - pct/100) == ogerioSell
      if (newOffer > ogerioSell) {
        let targetPct = Math.round(((newOffer - ogerioSell) / newOffer) * 100);
        // Ensure rounding never puts price even 1 Tk below Ogerio
        if (Math.round(newOffer * (1 - targetPct / 100)) < ogerioSell) {
          targetPct = Math.max(0, targetPct - 1);
        }
        newDiscountPct = Math.min(15, Math.max(0, targetPct));
      } else {
        newDiscountPct = 0; // Equal to Ogerio, no further discount below Ogerio
      }

      finalDiuPrice = Math.round(newOffer * (1 - newDiscountPct / 100));
      discountChanged = true;
      adjustedToOgerioPrice++;

      if (sampleAdjustments.length < 15) {
        sampleAdjustments.push({
          product: p.name.slice(0, 42),
          ogerioSell: `৳${ogerioSell}`,
          oldOffer: `৳${currentOffer}`,
          newOffer: `৳${newOffer}`,
          diu15PriceBefore: `৳${rawDiuPrice}`,
          newDiuPct: `${newDiscountPct}%`,
          finalDiuPrice: `৳${finalDiuPrice}`,
          equalOrAbove: finalDiuPrice >= ogerioSell ? "✅ Equal" : "❌ Below"
        });
      }
    } else {
      // Price is already higher or equal to Ogerio!
      // User rule: "jodi beshi baa soman tthaake tahole cchange korar ddorkar neei"
      untouchedHigherOrEqual++;
    }

    // Always update ogerioPrice field on document for system-level safety
    const updateSet = {
      ogerioPrice: ogerioSell,
      updatedAt: new Date()
    };

    if (offerChanged) {
      updateSet.offerPrice = newOffer;
      if (p.originalPrice && p.originalPrice < newOffer) {
        updateSet.originalPrice = Math.round(newOffer * 1.25);
      }
      updateSet.discountBadge = `${Math.round(((updateSet.originalPrice || p.originalPrice - newOffer) / (updateSet.originalPrice || p.originalPrice)) * 100)}% OFF`;
    }

    if (discountChanged) {
      updateSet.campusDiscountPct = newDiscountPct;
    }

    bulkOps.push({
      updateOne: {
        filter: { _id: p._id },
        update: { $set: updateSet }
      }
    });
  }

  console.log("\n==================================================================");
  console.log("📊 AUDIT & SYNC SUMMARY:");
  console.log("==================================================================");
  console.log(`• Total Products Matched with Ogerio.com:   ${matchedCount}`);
  console.log(`• Products Already Higher/Equal to Ogerio:   ${untouchedHigherOrEqual} (Unchanged as requested)`);
  console.log(`• Products Adjusted Equal to Ogerio Price:   ${adjustedToOgerioPrice}`);
  console.log(`• Baseline Offer Price Lower Than Ogerio:    ${offerBelowOgerioUpdated} (Set equal to Ogerio)`);
  console.log(`• Total Database Updates Prepared:           ${bulkOps.length}`);
  console.log("==================================================================\n");

  console.log("📋 Sample Adjusted Products (DIU Price == Ogerio Price):");
  console.table(sampleAdjustments);

  if (isApply) {
    console.log("\nWriting updates to MongoDB in batches of 500...");
    for (let i = 0; i < bulkOps.length; i += 500) {
      const chunk = bulkOps.slice(i, i + 500);
      await ProductCol.bulkWrite(chunk, { ordered: false });
      process.stdout.write(`  Applied ${Math.min(i + 500, bulkOps.length)} / ${bulkOps.length} updates...\r`);
    }
    console.log("\n✅ All product updates successfully applied to MongoDB!");
  } else {
    console.log("\nℹ️  Run with '--apply' flag to commit these changes to MongoDB.");
  }

  await mongoose.disconnect();
}

main().catch(console.error);
