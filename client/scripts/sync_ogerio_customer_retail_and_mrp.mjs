import puppeteer from "puppeteer-core";
import mongoose from "mongoose";
import fs from "fs";
import { syncPendingOrdersWithProductPrices } from "./sync_pending_orders_prices.mjs";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const MONGO_URI = "mongodb://jisan_trends:liora889@ac-2e905xv-shard-00-00.6nzddbx.mongodb.net:27017,ac-2e905xv-shard-00-01.6nzddbx.mongodb.net:27017,ac-2e905xv-shard-00-02.6nzddbx.mongodb.net:27017/jisantrends?ssl=true&replicaSet=atlas-12gikm-shard-0&authSource=admin&retryWrites=true&w=majority";

function getRetailMarkup(p) {
  const price = Number(p) || 0;
  if (price <= 100) return 5;
  if (price <= 200) return 10;
  if (price <= 500) return 20;
  if (price <= 1000) return 30;
  if (price <= 1500) return 50;
  if (price <= 2000) return 100;
  return 200; // 2000+
}

function normalizeTitle(t) {
  return (t || "")
    .toLowerCase()
    .replace(/skin\s+o\b/g, "skino")
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function main() {
  console.log("==================================================================");
  console.log("🚀 LIVE SYNC: OGERIO CUSTOMER RETAIL SELLING PRICES & EXACT MRP");
  console.log("==================================================================\n");

  const startTime = Date.now();

  // 1. Read wholesale scraped catalog for all product IDs
  const wholesaleData = JSON.parse(fs.readFileSync("scripts/scraped_live_ogerio_wholesale.json", "utf8"));
  console.log(`Loaded ${wholesaleData.length} items from scraped Ogerio catalog.`);

  const allIds = wholesaleData.map(x => x.id).filter(Boolean);

  // 2. Launch Guest Puppeteer (Normal Customer / No Cookies)
  console.log("Launching Chrome as Normal Customer (Guest View, No Cookies)...");
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-blink-features=AutomationControlled"]
  });

  const page = await browser.newPage();
  await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/158.0.0.0 Safari/537.36");

  // Block images/fonts/css to make it blazing fast
  await page.setRequestInterception(true);
  page.on("request", req => {
    const type = req.resourceType();
    if (["image", "font", "media", "stylesheet"].includes(type)) {
      req.abort();
    } else {
      req.continue();
    }
  });

  console.log("Warming up guest session on ogerio.com/shop/...");
  await page.goto("https://www.ogerio.com/shop/", { waitUntil: "domcontentloaded", timeout: 35000 });

  const ogerioCustomerRetailMap = new Map(); // id -> { retailSellingPrice, regularMRP, stockStatus, maxQty }
  const CHUNK_SIZE = 24; // Ogerio maximum batch limit is 24

  console.log(`Fetching customer retail prices and MRPs for ${allIds.length} products in batches of ${CHUNK_SIZE}...`);

  for (let i = 0; i < allIds.length; i += CHUNK_SIZE) {
    const chunkIds = allIds.slice(i, i + CHUNK_SIZE);
    try {
      const res = await page.evaluate(async (ids) => {
        const r = await fetch("/api/store/", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            operation: "catalog/prices",
            payload: { ids }
          })
        });
        if (!r.ok) return null;
        return await r.json();
      }, chunkIds);

      if (res && Array.isArray(res.items)) {
        for (const it of res.items) {
          const rawPrice = it.price !== undefined && it.price !== "" ? it.price : it.regular_price;
          const rawReg = it.regular_price !== undefined && it.regular_price !== "" ? it.regular_price : it.price;
          const numPrice = Number(rawPrice);
          const numReg = Number(rawReg);

          ogerioCustomerRetailMap.set(it.id, {
            retailSellingPrice: Number.isFinite(numPrice) && numPrice > 0 ? Math.round(numPrice) : (Number.isFinite(numReg) ? Math.round(numReg) : 0),
            regularMRP: Number.isFinite(numReg) && numReg > 0 ? Math.round(numReg) : (Number.isFinite(numPrice) ? Math.round(numPrice) : 0),
            stockStatus: it.stock_status || "outofstock",
            maxQty: it.max_quantity !== undefined ? it.max_quantity : -1
          });
        }
      }

      if (i % 200 === 0 || i + CHUNK_SIZE >= allIds.length) {
        const pct = Math.round(((i + chunkIds.length) / allIds.length) * 100);
        console.log(`[Progress] ${ogerioCustomerRetailMap.size} / ${allIds.length} customer retail prices fetched (${pct}%)...`);
      }

      await new Promise(r => setTimeout(r, 200));
    } catch (e) {
      console.error(`Error at chunk ${i}:`, e.message);
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  await browser.close();
  console.log(`\n✅ Finished fetching ${ogerioCustomerRetailMap.size} customer retail prices!\n`);

  // 3. Connect to MongoDB Atlas
  console.log("Connecting to MongoDB Atlas...");
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 25000 });
  const db = mongoose.connection.db;
  console.log("Connected to MongoDB.\n");

  const dbProducts = await db.collection("products").find({}).toArray();
  console.log(`Loaded ${dbProducts.length} LIORA products.`);

  // Build lookup maps
  const exactMap = new Map();
  const lowerMap = new Map();
  const normMap = new Map();

  for (const p of dbProducts) {
    if (!p.name) continue;
    exactMap.set(p.name.trim(), p);
    lowerMap.set(p.name.toLowerCase().trim(), p);
    normMap.set(normalizeTitle(p.name), p);
  }

  const updates = [];
  let matchedCount = 0;

  for (const item of wholesaleData) {
    const ogerioTitle = item.name;
    const wsBuyingPrice = item.wholesalePrice; // Our buying cost

    const customerRetail = ogerioCustomerRetailMap.get(item.id);
    if (!customerRetail) continue;

    const ogerioSelling = customerRetail.retailSellingPrice; // What Ogerio sells at
    const ogerioMRP = customerRetail.regularMRP;             // Ogerio crossed out MRP

    if (!ogerioSelling || ogerioSelling <= 0) continue;

    // Match strategy
    let p = exactMap.get(ogerioTitle.trim());
    if (!p) p = lowerMap.get(ogerioTitle.toLowerCase().trim());
    if (!p) p = normMap.get(normalizeTitle(ogerioTitle));

    if (!p) {
      const norm = normalizeTitle(ogerioTitle);
      const first4 = norm.split(" ").slice(0, 4).join(" ");
      if (first4.length > 8) {
        for (const [dbNorm, dbP] of normMap.entries()) {
          if (dbNorm.startsWith(first4) || dbNorm.includes(first4)) {
            p = dbP;
            break;
          }
        }
      }
    }

    if (!p) continue;
    matchedCount++;

    // 1. RETAIL OFFER PRICE: Ogerio customer selling price + slab
    const retailMarkup = getRetailMarkup(ogerioSelling);
    const lioraOfferPrice = ogerioSelling + retailMarkup;

    // 2. ORIGINAL PRICE / MRP: Exactly equal to Ogerio's MRP!
    let lioraOriginalPrice = ogerioMRP > 0 ? ogerioMRP : Math.max(lioraOfferPrice, Math.round(lioraOfferPrice * 1.15));
    if (lioraOriginalPrice < lioraOfferPrice) {
      lioraOriginalPrice = Math.max(lioraOfferPrice, ogerioMRP);
    }

    const discountBadge = lioraOriginalPrice > lioraOfferPrice
      ? String(Math.round(((lioraOriginalPrice - lioraOfferPrice) / lioraOriginalPrice) * 100))
      : "";

    // 3. WHOLESALE SELLING PRICE:
    // Profit 8% to 20% on buying cost
    // Hard ceiling: Minimum 10% lower than Ogerio customer selling price
    const cost = wsBuyingPrice > 0 ? wsBuyingPrice : Math.round(ogerioSelling * 0.72);
    const ogerioGapPct = ogerioSelling > cost ? ((ogerioSelling - cost) / cost) * 100 : 0;
    let targetWsProfitPct = 12;

    if (ogerioGapPct >= 50) {
      targetWsProfitPct = 18;
    } else if (ogerioGapPct >= 35) {
      targetWsProfitPct = 14;
    } else if (ogerioGapPct >= 20) {
      targetWsProfitPct = 10;
    } else {
      targetWsProfitPct = 8;
    }

    let lioraWholesalePrice = Math.round(cost * (1 + targetWsProfitPct / 100));
    const maxAllowedWs = Math.round(ogerioSelling * 0.90); // 10% lower than Ogerio selling price

    if (ogerioGapPct > 12) {
      if (lioraWholesalePrice > maxAllowedWs) {
        lioraWholesalePrice = maxAllowedWs;
      }
      if (lioraWholesalePrice < Math.round(cost * 1.03)) {
        lioraWholesalePrice = Math.round(cost * 1.03);
      }
    } else {
      lioraWholesalePrice = Math.min(Math.round(cost * 1.03), Math.max(cost, ogerioSelling - 5));
    }

    // 4. RESELLER PRICE: between wholesale and retail offer
    const lioraResellerPrice = Math.min(
      lioraOfferPrice - 10,
      Math.max(lioraWholesalePrice + 5, Math.round(lioraWholesalePrice + (lioraOfferPrice - lioraWholesalePrice) * 0.22))
    );

    updates.push({
      updateOne: {
        filter: { _id: p._id },
        update: {
          $set: {
            purchasePrice: cost,
            offerPrice: lioraOfferPrice,
            originalPrice: lioraOriginalPrice,
            discountBadge: discountBadge,
            wholesalePrice: lioraWholesalePrice,
            resellerPrice: lioraResellerPrice,
            ogerioPrice: ogerioSelling,          // OGERIO SELLING PRICE
            ogerioRegularPrice: ogerioMRP,       // OGERIO EXACT MRP
            ogerioWholesalePrice: cost,
            priceEstimated: false,
            updatedAt: new Date()
          }
        }
      }
    });
  }

  console.log(`Matched and prepared updates for ${updates.length} products.`);
  console.log("Writing bulk updates in batches of 500...");

  let modifiedCount = 0;
  for (let i = 0; i < updates.length; i += 500) {
    const chunk = updates.slice(i, i + 500);
    const res = await db.collection("products").bulkWrite(chunk);
    modifiedCount += res.modifiedCount;
  }

  console.log(`✅ Bulk write finished! Total ${modifiedCount} products updated with customer retail & exact MRP.\n`);

  // Refresh Pending orders
  console.log("Refreshing Pending orders with updated prices...");
  const orderRes = await syncPendingOrdersWithProductPrices(db);
  console.log(`✅ Pending orders refreshed: ${orderRes.updatedOrders} orders.\n`);

  // Sample check of verified products
  const checkSample = await db.collection("products").find({
    name: {
      $in: [
        "Caplino Niacinamide Serum 10% + Zinc PCA 30ml",
        "Beauty Glazed Glow Lip Oil – COCOA 110",
        "Simple Refreshing Face Wash 150ml (India)",
        "Dove Deep Repair Treatment Hair Mask 10 in 1 300 Ml",
        "Kodomo Baby Lotion Powder Extra Mild – 180ml",
        "The Ordinary Niacinamide Serum 10%+Zinc1% – 30ml",
        "Vaseline Cocoa Radiant Body Oil – 200ML"
      ]
    }
  }).toArray();

  console.log("SAMPLE VERIFIED PRODUCTS AFTER EXACT OGERIO CUSTOMER SYNC:\n");
  for (const p of checkSample) {
    console.log(`Product: ${p.name}`);
    console.log(`  ওজেরিও বিক্রয়মূল্য (Ogerio Selling): ৳${p.ogerioPrice}`);
    console.log(`  ওজেরিও MRP (Ogerio Regular MRP): ৳${p.ogerioRegularPrice}`);
    console.log(`  আমাদের কেনা দাম (Cost): ৳${p.purchasePrice}`);
    console.log(`  LIORA খুচরা অফার প্রাইস: ৳${p.offerPrice} (ওজেরিও থেকে +৳${p.offerPrice - p.ogerioPrice})`);
    console.log(`  LIORA মূল কাটা দাম (MRP): ৳${p.originalPrice} (${p.discountBadge}% OFF)`);
    console.log(`  LIORA হোলসেল বিক্রয়: ৳${p.wholesalePrice} (লাভ: +৳${p.wholesalePrice - p.purchasePrice}, ওজেরিও রিটেইল থেকে ${Math.round(((p.ogerioPrice - p.wholesalePrice)/p.ogerioPrice)*100)}% কম)`);
    console.log(`  LIORA রিসেলার বিক্রয়: ৳${p.resellerPrice} (লাভ: +৳${p.resellerPrice - p.purchasePrice})`);
    console.log("--------------------------------------------------------------------------------");
  }

  const totalTime = Math.round((Date.now() - startTime) / 1000);
  console.log(`✨ FULL PROCESS FINISHED IN ${totalTime} SECONDS!`);
  await mongoose.disconnect();
}

main().catch(console.error);
