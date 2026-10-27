const mongoose = require('mongoose');
require('dotenv').config({ path: 'client/.env.local' });
const uri = process.env.MONGODB_URI;

function calculateIntelligentWholesalePrice(cost, retail) {
  cost = Number(cost) || 0;
  retail = Number(retail) || 0;

  if (cost <= 0 && retail <= 0) return 0;
  if (cost <= 0) return Math.round(retail * 0.78);
  if (retail <= cost) {
    return Math.round(cost * 1.05);
  }

  const gapPct = ((retail - cost) / cost) * 100;
  let markupPct;

  if (gapPct >= 150) {
    markupPct = 25;
  } else if (gapPct >= 80) {
    markupPct = 20;
  } else if (gapPct >= 40) {
    markupPct = 12;
  } else if (gapPct >= 20) {
    markupPct = 7;
  } else {
    markupPct = 4;
  }

  let ws = Math.round(cost * (1 + markupPct / 100));

  ws = Math.max(Math.ceil(cost * 1.03), ws);
  if (ws >= retail) {
    ws = Math.max(Math.ceil(cost * 1.02), Math.round(retail * 0.95));
  }

  return ws;
}

async function run() {
  console.log('Connecting to database...');
  await mongoose.connect(uri);
  const Product = mongoose.connection.collection('products');

  const products = await Product.find({}).toArray();
  console.log(`Found ${products.length} products. Calculating intelligent wholesale prices...`);

  const bulkOps = [];
  let updatedCount = 0;

  for (const p of products) {
    const cost = Number(p.purchasePrice || p.costPrice || 0);
    const retail = Number(p.offerPrice || p.originalPrice || 0);

    const calculatedWs = calculateIntelligentWholesalePrice(cost, retail);

    if (calculatedWs > 0) {
      bulkOps.push({
        updateOne: {
          filter: { _id: p._id },
          update: { $set: { wholesalePrice: calculatedWs } }
        }
      });
      updatedCount++;
    }

    if (bulkOps.length >= 500) {
      await Product.bulkWrite(bulkOps);
      bulkOps.length = 0;
      console.log(`Updated ${updatedCount} products so far...`);
    }
  }

  if (bulkOps.length > 0) {
    await Product.bulkWrite(bulkOps);
  }

  console.log(`Successfully updated ${updatedCount} products with intelligent wholesale prices!`);

  // Verification check:
  const stillEqual = await Product.countDocuments({
    $expr: { $eq: ["$wholesalePrice", "$purchasePrice"] },
    purchasePrice: { $gt: 0 }
  });
  console.log(`Products where wholesalePrice == purchasePrice: ${stillEqual} (should be 0)`);

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
