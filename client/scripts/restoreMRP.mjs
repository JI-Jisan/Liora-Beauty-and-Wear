import mongoose from 'mongoose';

const URI = 'mongodb://jisan_trends:liora889@ac-2e905xv-shard-00-00.6nzddbx.mongodb.net:27017,ac-2e905xv-shard-00-01.6nzddbx.mongodb.net:27017,ac-2e905xv-shard-00-02.6nzddbx.mongodb.net:27017/jisantrends?ssl=true&replicaSet=atlas-12gikm-shard-0&authSource=admin&retryWrites=true&w=majority';

function getAddedMarkup(currentOffer) {
  const o = Number(currentOffer) || 0;
  if (o <= 105) return 5;
  if (o <= 210) return 10;
  if (o <= 520) return 20;
  if (o <= 1030) return 30;
  if (o <= 1540) return 40;
  if (o <= 2050) return 50;
  return 70;
}

async function run() {
  console.log('Connecting to MongoDB Atlas...');
  await mongoose.connect(URI);
  const db = mongoose.connection;
  const ProductCol = db.collection('products');

  console.log('Fetching all products...');
  const products = await ProductCol.find({}).toArray();
  console.log(`Processing ${products.length} products to restore original MRP...`);

  const bulkOps = [];
  let updatedCount = 0;

  for (const p of products) {
    const currentOffer = Number(p.offerPrice) || 0;
    const currentOriginal = Number(p.originalPrice) || currentOffer;
    const markup = getAddedMarkup(currentOffer);

    // Revert MRP by subtracting the markup that was erroneously added to it
    // Ensure MRP is never lower than the current selling offer price
    const restoredMRP = Math.max(currentOriginal - markup, currentOffer);

    const discountBadge = restoredMRP > currentOffer
      ? String(Math.round(((restoredMRP - currentOffer) / restoredMRP) * 100))
      : '';

    bulkOps.push({
      updateOne: {
        filter: { _id: p._id },
        update: {
          $set: {
            originalPrice: restoredMRP,
            discountBadge,
            updatedAt: new Date(),
          },
        },
      },
    });

    if (bulkOps.length >= 500) {
      await ProductCol.bulkWrite(bulkOps);
      updatedCount += bulkOps.length;
      console.log(`Updated ${updatedCount}/${products.length} products...`);
      bulkOps.length = 0;
    }
  }

  if (bulkOps.length > 0) {
    await ProductCol.bulkWrite(bulkOps);
    updatedCount += bulkOps.length;
  }

  console.log(`\n🎉 SUCCESS! Restored MRP for ${updatedCount} products.`);

  // Audit sample results
  const samples = await ProductCol.find({}).limit(5).toArray();
  console.log('\nSample restored products:');
  samples.forEach((s) => {
    console.log(`• ${s.name.slice(0, 35)} => Selling: ৳${s.offerPrice} | MRP: ৳${s.originalPrice} | Discount: ${s.discountBadge ? s.discountBadge + '%' : '0%'}`);
  });

  await mongoose.disconnect();
}

run().catch(console.error);
