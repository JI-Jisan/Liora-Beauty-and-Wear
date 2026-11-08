import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, "../.env.local");
const envContent = fs.readFileSync(envPath, "utf-8");

let uri = "";
for (const line of envContent.split(/\r?\n/)) {
  if (line.startsWith("MONGODB_URI=") || line.startsWith("MONGO_URI=")) {
    let val = line.substring(line.indexOf("=") + 1).trim();
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.slice(1, -1);
    }
    uri = val;
    break;
  }
}

const mongoose = (await import("mongoose")).default;

export function compute1111Price(baseOfferPrice, cost, discountPct) {
  if (!baseOfferPrice || baseOfferPrice <= 0) return baseOfferPrice;

  // If cost was higher than offerPrice originally (data issue), do not reduce further
  if (cost > 0 && baseOfferPrice <= cost) {
    return baseOfferPrice;
  }

  // Target price after applying margin-safe campus discount
  const pct = Math.max(0, Math.min(15, Number(discountPct) || 0));
  let target = Math.round(baseOfferPrice * (1 - pct / 100));
  if (target > baseOfferPrice) target = baseOfferPrice;

  // 1. Candidate ending in 1 (drop between 0 and 9 Tk)
  let rem1 = target % 10;
  let cand1;
  if (rem1 === 1) {
    cand1 = target;
  } else if (rem1 === 0) {
    cand1 = target - 9;
  } else {
    cand1 = target - (rem1 - 1);
  }

  // 2. Candidate ending in 11
  let rem100 = target % 100;
  let cand11 = null;
  let drop11 = 999;
  if (rem100 >= 11) {
    cand11 = target - (rem100 - 11);
    drop11 = target - cand11;
  } else if (target >= 111) {
    let altDrop = rem100 + 89;
    if (altDrop <= 20) {
      cand11 = target - altDrop;
      drop11 = altDrop;
    }
  }

  let chosen = cand1;
  // If cand11 is close (drop <= 16 Tk) and leaves a healthy profit margin (>= 15 Tk)
  if (cand11 !== null && drop11 <= 16 && (cost <= 0 || cand11 >= cost + 15)) {
    chosen = cand11;
  } else {
    chosen = cand1;
  }

  // Safety floor: Zero loss guarantee!
  if (cost > 0 && chosen < cost) {
    let d = cost % 10;
    let safe1 = d <= 1 ? cost + (1 - d) : cost + (11 - d);
    if (safe1 <= baseOfferPrice) {
      chosen = safe1;
    } else {
      chosen = baseOfferPrice;
    }
  }

  // Price must never increase
  if (chosen > baseOfferPrice) {
    chosen = baseOfferPrice;
  }

  return chosen;
}

async function run() {
  console.log("Connecting to MongoDB Atlas...");
  await mongoose.connect(uri);
  const col = mongoose.connection.db.collection("products");

  const products = await col.find({}).toArray();
  console.log(`Found ${products.length} products to evaluate for 11.11 pricing.`);

  const bulkOps = [];
  let updatedCount = 0;
  let endingIn11 = 0;
  let endingIn1 = 0;
  let skipped = 0;

  for (const p of products) {
    // If already has pre1111OfferPrice, use that as the stable base to prevent double discounting
    const baseOffer = Number(p.pre1111OfferPrice || p.offerPrice || p.originalPrice || 0);
    const cost = Number(p.purchasePrice || p.wholesalePrice || Math.round(baseOffer * 0.72));
    const discountPct = Number(p.campusDiscountPct || 0);

    const newOffer = compute1111Price(baseOffer, cost, discountPct);

    // If new price is the same as current offerPrice and pre1111OfferPrice is already set, skip
    if (newOffer === p.offerPrice && p.pre1111OfferPrice) {
      skipped++;
      continue;
    }

    if (newOffer % 100 === 11) endingIn11++;
    else if (newOffer % 10 === 1) endingIn1++;

    // Determine originalPrice to show attractive strikethrough MRP
    let originalPrice = Number(p.pre1111OriginalPrice || p.originalPrice || 0);
    if (!originalPrice || originalPrice <= newOffer) {
      originalPrice = baseOffer;
    }

    bulkOps.push({
      updateOne: {
        filter: { _id: p._id },
        update: {
          $set: {
            offerPrice: newOffer,
            originalPrice: originalPrice,
            pre1111OfferPrice: baseOffer,
            pre1111OriginalPrice: p.originalPrice || baseOffer,
            is1111Applied: true,
            applied1111At: new Date()
          }
        }
      }
    });

    updatedCount++;
  }

  console.log(`Prepared ${bulkOps.length} updates. Executing bulk write in batches...`);

  // Batch bulk operations in chunks of 500
  const BATCH_SIZE = 500;
  for (let i = 0; i < bulkOps.length; i += BATCH_SIZE) {
    const chunk = bulkOps.slice(i, i + BATCH_SIZE);
    const res = await col.bulkWrite(chunk, { ordered: false });
    console.log(`Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(bulkOps.length / BATCH_SIZE)}: matched ${res.matchedCount}, modified ${res.modifiedCount}`);
  }

  console.log("\n=== 11.11 PRICING APPLICATION COMPLETED SUCCESSFULLY ===");
  console.log(`Total Products in DB: ${products.length}`);
  console.log(`Total Products Updated: ${updatedCount}`);
  console.log(`Products ending in '11': ${endingIn11}`);
  console.log(`Products ending in '1': ${endingIn1}`);
  console.log(`Skipped / Unchanged: ${skipped}`);

  // Fetch some sample updated products to verify
  const sampleVerification = await col.find(
    { is1111Applied: true },
    { projection: { name: 1, originalPrice: 1, offerPrice: 1, purchasePrice: 1, pre1111OfferPrice: 1 } }
  ).limit(15).toArray();

  console.log("\nVerification Sample:");
  console.table(
    sampleVerification.map((s) => ({
      name: s.name.substring(0, 35),
      cost: s.purchasePrice,
      oldOffer: s.pre1111OfferPrice,
      newOffer: s.offerPrice,
      mrp: s.originalPrice,
      profit: s.offerPrice - s.purchasePrice,
      endsIn: s.offerPrice % 100 === 11 ? "11" : s.offerPrice % 10 === 1 ? "1" : "other"
    }))
  );

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
