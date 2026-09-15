require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

const connectDB = require('./config/db');
const { batchGenerateBrandPromotions } = require('./services/fbPromotionService');
const Brand = require('./models/Brand');
const Product = require('./models/Product');

async function main() {
  await connectDB();

  const brandArg = process.argv[2];

  if (!brandArg) {
    console.log('\n======================================================');
    console.log('⚡ LIORA AUTOMATED FACEBOOK PROMOTIONS GENERATOR');
    console.log('======================================================');
    console.log('Usage: node auto_brand_promoter.js "<Brand Name or ID>" [limit]');
    console.log('\nAvailable Brands in your store:');

    const brands = await Brand.find().sort({ name: 1 }).lean();
    for (const b of brands) {
      const count = await Product.countDocuments({
        $or: [
          { brand: b._id },
          { name: new RegExp(b.name, 'i') }
        ]
      });
      if (count > 0) {
        console.log(`- "${b.name}" (${count} products)`);
      }
    }

    console.log('\nExample to run:');
    console.log('  node auto_brand_promoter.js "Skin O"');
    console.log('======================================================\n');
    process.exit(0);
  }

  const limit = process.argv[3] ? parseInt(process.argv[3]) : 100;
  console.log(`\n🚀 Starting automated batch promotion generation for brand: "${brandArg}" (Limit: ${limit})...\n`);

  const result = await batchGenerateBrandPromotions({
    brandQuery: brandArg,
    limit,
    onProgress: (current, total, name) => {
      console.log(`[${current}/${total}] Generated banner + caption: ${name}`);
    }
  });

  console.log('\n======================================================');
  console.log(`✅ COMPLETED SUCCESSFULLY!`);
  console.log(`Brand: ${result.brand}`);
  console.log(`Total Products: ${result.totalProducts}`);
  console.log(`Successful: ${result.successful}`);
  console.log(`ZIP Bundle Location: ${path.join(__dirname, result.zipDownloadUrl)}`);
  console.log(`Captions Text Location: ${path.join(__dirname, result.summaryTxtUrl)}`);
  console.log('======================================================\n');

  process.exit(0);
}

main().catch(err => {
  console.error('Batch generation failed:', err);
  process.exit(1);
});
