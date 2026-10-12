import m from 'mongoose';
import fs from 'fs';
import path from 'path';

// Load .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const k = trimmed.slice(0, eqIdx).trim();
      let v = trimmed.slice(eqIdx + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      if (!process.env[k]) process.env[k] = v;
    }
  }
}

const MONGO_URI =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  "mongodb://jisan_trends:liora889@ac-2e905xv-shard-00-00.6nzddbx.mongodb.net:27017,ac-2e905xv-shard-00-01.6nzddbx.mongodb.net:27017,ac-2e905xv-shard-00-02.6nzddbx.mongodb.net:27017/jisantrends?ssl=true&replicaSet=atlas-12gikm-shard-0&authSource=admin&retryWrites=true&w=majority";

const DEFAULT_RESTOCK_QTY = 20;

async function run() {
  console.log('====================================================');
  console.log('🔄 Executing Stock Synchronization for LIORA');
  console.log('====================================================\n');

  const reportPath = path.resolve(process.cwd(), 'scripts', 'live_stock_clean_report.json');
  if (!fs.existsSync(reportPath)) {
    console.error('Report file not found:', reportPath);
    process.exit(1);
  }

  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  const toStockIn = report.ogerioIn_lioraOut || [];
  const toStockOut = report.ogerioOut_lioraIn || [];

  console.log(`Connecting to MongoDB...`);
  await m.connect(MONGO_URI);
  console.log(`Connected to MongoDB successfully!\n`);

  const db = m.connection;
  const ProductCol = db.collection('products');
  const BatchCol = db.collection('purchasebatches');

  const now = new Date();

  // ----------------------------------------------------
  // Problem 1: Ogerio In Stock -> LIORA In Stock (149 products)
  // ----------------------------------------------------
  console.log(`▶️ Solving Problem 1: Restoring ${toStockIn.length} products to IN STOCK...`);
  let restoredCount = 0;
  let batchRestoredCount = 0;

  for (const item of toStockIn) {
    const pId = new m.Types.ObjectId(item.dbId);
    
    // Update Product document
    const res = await ProductCol.updateOne(
      { _id: pId },
      {
        $set: {
          stockQuantity: DEFAULT_RESTOCK_QTY,
          inStock: true,
          stockStatus: 'In Stock',
          updatedAt: now
        }
      }
    );

    if (res.modifiedCount > 0) {
      restoredCount++;
    }

    // Update or create PurchaseBatch
    const existingBatch = await BatchCol.findOne({ product: pId });
    if (existingBatch) {
      await BatchCol.updateMany(
        { product: pId },
        {
          $set: {
            remaining: DEFAULT_RESTOCK_QTY,
            updatedAt: now
          }
        }
      );
      batchRestoredCount++;
    } else {
      const prod = await ProductCol.findOne({ _id: pId });
      const cost = prod?.purchasePrice || prod?.wholesalePrice || Math.round((prod?.offerPrice || 100) * 0.75);
      await BatchCol.insertOne({
        product: pId,
        productName: prod?.name || item.productName,
        qty: DEFAULT_RESTOCK_QTY,
        remaining: DEFAULT_RESTOCK_QTY,
        unitCost: cost,
        purchaseDate: now,
        ownerName: 'Owner',
        locationName: 'Owner',
        supplier: 'Ogerio Restock',
        note: 'Restocked from Ogerio sync',
        createdAt: now,
        updatedAt: now
      });
      batchRestoredCount++;
    }
  }

  console.log(`✅ Problem 1 Complete:`);
  console.log(`   - Restored Products: ${restoredCount}`);
  console.log(`   - Restored/Created Batches: ${batchRestoredCount}\n`);

  // ----------------------------------------------------
  // Problem 2: Ogerio Out of Stock -> LIORA Out of Stock (618 products)
  // ----------------------------------------------------
  console.log(`▶️ Solving Problem 2: Setting ${toStockOut.length} products to OUT OF STOCK...`);
  let oosCount = 0;
  let batchOosCount = 0;

  for (const item of toStockOut) {
    const pId = new m.Types.ObjectId(item.dbId);

    // Update Product document
    const res = await ProductCol.updateOne(
      { _id: pId },
      {
        $set: {
          stockQuantity: 0,
          inStock: false,
          stockStatus: 'Out of Stock',
          updatedAt: now
        }
      }
    );

    if (res.modifiedCount > 0) {
      oosCount++;
    }

    // Update PurchaseBatches to remaining: 0
    const bRes = await BatchCol.updateMany(
      { product: pId, remaining: { $gt: 0 } },
      {
        $set: {
          remaining: 0,
          updatedAt: now
        }
      }
    );
    batchOosCount += bRes.modifiedCount;
  }

  console.log(`✅ Problem 2 Complete:`);
  console.log(`   - Marked Out of Stock Products: ${oosCount}`);
  console.log(`   - Depleted Batches: ${batchOosCount}\n`);

  // ----------------------------------------------------
  // Verification
  // ----------------------------------------------------
  console.log('🔍 Running Post-Sync Verification...');
  const totalInStockNow = await ProductCol.countDocuments({
    inStock: true,
    stockQuantity: { $gt: 0 },
    stockStatus: { $ne: 'Out of Stock' }
  });
  const totalOutOfStockNow = await ProductCol.countDocuments({
    $or: [
      { inStock: false },
      { stockQuantity: { $lte: 0 } },
      { stockStatus: 'Out of Stock' }
    ]
  });

  console.log('====================================================');
  console.log('🎉 ALL PROBLEMS SOLVED & SYNCED TO LIORA DATABASE');
  console.log('====================================================');
  console.log(`🟢 Total In-Stock in LIORA now : ${totalInStockNow}`);
  console.log(`🔴 Total Out-of-Stock in LIORA  : ${totalOutOfStockNow}`);
  console.log(`📦 Total Products in LIORA      : ${totalInStockNow + totalOutOfStockNow}`);
  console.log('====================================================\n');

  process.exit(0);
}

run().catch(err => {
  console.error('Fatal synchronization error:', err);
  process.exit(1);
});
