import mongoose from "mongoose";
import fs from "fs";
import path from "path";

const URI =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  "mongodb://jisan_trends:liora889@ac-2e905xv-shard-00-00.6nzddbx.mongodb.net:27017,ac-2e905xv-shard-00-01.6nzddbx.mongodb.net:27017,ac-2e905xv-shard-00-02.6nzddbx.mongodb.net:27017/jisantrends?ssl=true&replicaSet=atlas-12gikm-shard-0&authSource=admin&retryWrites=true&w=majority";

function cleanStr(str) {
  return (str || "")
    .toLowerCase()
    .replace(/skin\s+o\b/g, "skino")
    .replace(/[^a-z0-9]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join(" ");
}

function cleanTokens(str) {
  return (str || "")
    .toLowerCase()
    .replace(/skin\s+o\b/g, "skino")
    .replace(/[^a-z0-9]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function normalizeTitle(str) {
  return (str || "")
    .toLowerCase()
    .replace(/skin\s+o\b/g, "skino")
    .replace(/[\s\-_–—]+/g, " ")
    .trim();
}

async function main() {
  console.log("==========================================================");
  console.log("🚀 LIORA: APPLY FREE DELIVERY (৳1999) & OGERIO STOCK SYNC");
  console.log("==========================================================\n");

  await mongoose.connect(URI);
  console.log("✅ Connected to MongoDB.");

  const db = mongoose.connection;
  const ProductCol = db.collection("products");
  const BatchCol = db.collection("purchasebatches");
  const SettingsCol = db.collection("sitesettings");

  // 1. Update Free Delivery Threshold to 1999
  console.log("\n📦 [1/3] Updating Free Delivery Threshold in SiteSettings...");
  const settingsResult = await SettingsCol.updateOne(
    {},
    { $set: { freeDeliveryThreshold: 1999 } },
    { upsert: true }
  );
  console.log("✅ SiteSettings updated. freeDeliveryThreshold is now 1999 Tk.");

  // 2. Load Ogerio Data
  console.log("\n📦 [2/3] Loading Ogerio Catalogs...");
  const scrapedPath = path.resolve("scripts/scraped_live_ogerio.json");
  const scrapedOgerio = JSON.parse(fs.readFileSync(scrapedPath, "utf8"));

  const livePricesPath = path.resolve("scripts/ogerio_complete_live_prices.json");
  const livePrices = JSON.parse(fs.readFileSync(livePricesPath, "utf8"));

  const ogerioMap = new Map();
  for (const [title, item] of Object.entries(scrapedOgerio)) {
    const isOut = Boolean(item.isOutOfStock);
    ogerioMap.set(title, { title, isOutOfStock: isOut, inStock: !isOut });
  }
  for (const item of livePrices) {
    if (!item.title) continue;
    const isOut = Boolean(item.isOutOfStock || item.stockStatus === "outofstock");
    ogerioMap.set(item.title, { title: item.title, isOutOfStock: isOut, inStock: !isOut });
  }
  console.log(`Loaded ${ogerioMap.size} unique Ogerio titles.`);

  const exactMap = new Map();
  const normMap = new Map();
  const cleanMap = new Map();
  const tokenList = [];

  for (const [title, item] of ogerioMap.entries()) {
    exactMap.set(title, item);
    normMap.set(normalizeTitle(title), item);
    cleanMap.set(cleanStr(title), item);
    const tokens = cleanTokens(title);
    tokenList.push({ title, item, tokenSet: new Set(tokens), tokenArr: tokens });
  }

  // 3. Process DB Products
  console.log("\n📦 [3/3] Matching and Synchronizing Products & Batches...");
  const products = await ProductCol.find({}).toArray();
  console.log(`Found ${products.length} products in database.`);

  // Load existing batches grouped by product ID
  const allBatches = await BatchCol.find({}).toArray();
  const batchesByProduct = new Map();
  for (const b of allBatches) {
    const pid = b.product?.toString();
    if (!pid) continue;
    if (!batchesByProduct.has(pid)) batchesByProduct.set(pid, []);
    batchesByProduct.get(pid).push(b);
  }

  const now = new Date();
  const productBulkOps = [];
  const batchBulkOps = [];
  const newBatchesToInsert = [];

  let matchedInStockCount = 0;
  let matchedOutOfStockCount = 0;
  let unmatchedCount = 0;

  let changedToInStockCount = 0;
  let changedToOutOfStockCount = 0;
  let alreadyExactInStockCount = 0;
  let alreadyExactOutOfStockCount = 0;

  for (const p of products) {
    const name = p.name || "";
    let match =
      exactMap.get(name) ||
      normMap.get(normalizeTitle(name)) ||
      cleanMap.get(cleanStr(name));

    if (!match) {
      const pTokens = cleanTokens(name);
      if (pTokens.length >= 3) {
        const found = tokenList.find((t) => pTokens.every((tok) => t.tokenSet.has(tok)));
        if (found) match = found.item;
      }
    }

    if (!match) {
      const pSet = new Set(cleanTokens(name));
      const found = tokenList.find(
        (t) => t.tokenArr.length >= 3 && t.tokenArr.every((tok) => pSet.has(tok))
      );
      if (found) match = found.item;
    }

    if (!match) {
      unmatchedCount++;
      continue;
    }

    const currentInStock = p.inStock === true;
    const currentQty = p.stockQuantity ?? 0;
    const currentStatus = p.stockStatus || "";
    const pidStr = p._id.toString();
    const prodBatches = batchesByProduct.get(pidStr) || [];

    if (match.inStock) {
      matchedInStockCount++;
      const isAlready100InStock =
        currentInStock && currentQty === 100 && currentStatus === "In Stock";

      if (!isAlready100InStock) {
        changedToInStockCount++;
        productBulkOps.push({
          updateOne: {
            filter: { _id: p._id },
            update: {
              $set: {
                inStock: true,
                stockQuantity: 100,
                stockStatus: "In Stock",
                updatedAt: now,
              },
            },
          },
        });
      } else {
        alreadyExactInStockCount++;
      }

      // Sync Batches: Ensure batch remaining equals 100
      if (prodBatches.length > 0) {
        // Set first batch to remaining 100 (and qty at least 100)
        const first = prodBatches[0];
        batchBulkOps.push({
          updateOne: {
            filter: { _id: first._id },
            update: {
              $set: {
                remaining: 100,
                qty: Math.max(first.qty || 0, 100),
                updatedAt: now,
              },
            },
          },
        });
        // Zero out any secondary batches for the same product to prevent double counting
        for (let i = 1; i < prodBatches.length; i++) {
          batchBulkOps.push({
            updateOne: {
              filter: { _id: prodBatches[i]._id },
              update: {
                $set: {
                  remaining: 0,
                  updatedAt: now,
                },
              },
            },
          });
        }
      } else {
        // Create new opening batch
        newBatchesToInsert.push({
          product: p._id,
          productName: p.name || "Product",
          qty: 100,
          remaining: 100,
          unitCost: Number(p.purchasePrice || p.buyingPrice || 0),
          purchaseDate: now,
          ownerName: "Owner",
          locationName: "Owner",
          supplier: "Ogerio Stock Sync",
          note: "Set to 100 (Ogerio In Stock)",
          createdAt: now,
          updatedAt: now,
        });
      }
    } else {
      matchedOutOfStockCount++;
      const isAlready0OutOfStock =
        !currentInStock && currentQty === 0 && currentStatus === "Out of Stock";

      if (!isAlready0OutOfStock) {
        changedToOutOfStockCount++;
        productBulkOps.push({
          updateOne: {
            filter: { _id: p._id },
            update: {
              $set: {
                inStock: false,
                stockQuantity: 0,
                stockStatus: "Out of Stock",
                updatedAt: now,
              },
            },
          },
        });
      } else {
        alreadyExactOutOfStockCount++;
      }

      // Zero out all batches for out-of-stock product
      if (prodBatches.length > 0) {
        for (const b of prodBatches) {
          if (b.remaining > 0) {
            batchBulkOps.push({
              updateOne: {
                filter: { _id: b._id },
                update: {
                  $set: {
                    remaining: 0,
                    updatedAt: now,
                  },
                },
              },
            });
          }
        }
      }
    }
  }

  console.log(`Writing ${productBulkOps.length} product updates to database...`);
  if (productBulkOps.length > 0) {
    const pResult = await ProductCol.bulkWrite(productBulkOps);
    console.log(`✅ Products updated: ${pResult.modifiedCount}`);
  }

  console.log(`Writing ${batchBulkOps.length} batch updates to database...`);
  if (batchBulkOps.length > 0) {
    const bResult = await BatchCol.bulkWrite(batchBulkOps);
    console.log(`✅ Batches updated: ${bResult.modifiedCount}`);
  }

  if (newBatchesToInsert.length > 0) {
    console.log(`Inserting ${newBatchesToInsert.length} new purchase batches...`);
    const insertResult = await BatchCol.insertMany(newBatchesToInsert);
    console.log(`✅ Inserted ${insertResult.insertedCount} new batches.`);
  }

  // Verification step
  console.log("\n📦 Verifying database state...");
  const updatedSettings = await SettingsCol.findOne({});
  const totalInStockDb = await ProductCol.countDocuments({
    inStock: true,
    stockQuantity: 100,
  });
  const totalOutOfStockDb = await ProductCol.countDocuments({
    inStock: false,
    stockQuantity: 0,
  });

  const totalChanged = changedToInStockCount + changedToOutOfStockCount;

  console.log("\n==========================================================");
  console.log("🎉 FINAL SYNCHRONIZATION REPORT");
  console.log("==========================================================");
  console.log("1. Free Delivery Threshold:     ৳" + updatedSettings.freeDeliveryThreshold);
  console.log("2. Total Products in DB:        " + products.length);
  console.log("3. Total Matched with Ogerio:   " + (matchedInStockCount + matchedOutOfStockCount));
  console.log("   - Ogerio IN STOCK:           " + matchedInStockCount);
  console.log("   - Ogerio OUT OF STOCK:       " + matchedOutOfStockCount);
  console.log("4. Unmatched (Kept As-Is):      " + unmatchedCount);
  console.log("----------------------------------------------------------");
  console.log("🔄 TOTAL PRODUCTS CHANGED:       " + totalChanged);
  console.log("   - Switched to IN STOCK (100): " + changedToInStockCount);
  console.log("   - Switched to OUT OF STOCK (0):" + changedToOutOfStockCount);
  console.log("----------------------------------------------------------");
  console.log("✅ Already in Correct Status:   " + (alreadyExactInStockCount + alreadyExactOutOfStockCount));
  console.log("   - Already In Stock (100):    " + alreadyExactInStockCount);
  console.log("   - Already Out of Stock (0):  " + alreadyExactOutOfStockCount);
  console.log("----------------------------------------------------------");
  console.log("📊 DB Current Stats:");
  console.log("   - Total Products In Stock (qty=100): " + totalInStockDb);
  console.log("   - Total Products Out of Stock (qty=0): " + totalOutOfStockDb);
  console.log("==========================================================\n");

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("FATAL ERROR:", err);
  process.exit(1);
});
