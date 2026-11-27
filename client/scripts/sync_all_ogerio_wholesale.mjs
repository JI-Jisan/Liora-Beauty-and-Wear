import puppeteer from "puppeteer-core";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { syncPendingOrdersWithProductPrices } from "./sync_pending_orders_prices.mjs";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const MONGO_URI = "mongodb://jisan_trends:liora889@ac-2e905xv-shard-00-00.6nzddbx.mongodb.net:27017,ac-2e905xv-shard-00-01.6nzddbx.mongodb.net:27017,ac-2e905xv-shard-00-02.6nzddbx.mongodb.net:27017/jisantrends?ssl=true&replicaSet=atlas-12gikm-shard-0&authSource=admin&retryWrites=true&w=majority";

const cookieStr = `_ga=GA1.1.843681729.1790566594; _gcl_au=1.1.124190221.1790566594.1672687054.1792322322.1792322322.2040090187.1792322322.1792322322; cf_zaraz_client=; __Host-ogn_device=e9781590da1777f83b4572191f4f1c14b7c116ee5fe0615338728ca9e3becb72; g_state={"i_l":0,"i_ll":1795777843155,"i_e":{"enable_itp_optimization":24},"i_et":1795777843155}; __Host-ogn_session=d5dea05c1cd58b3903a038b29fa82869df41afe3892f18bbee2b598a6fc83ab9; cfz_zaraz-analytics=%7B%22_cfa_clientId%22%3A%7B%22v%22%3A%2299776853369191800%22%2C%22e%22%3A1825902497664%7D%2C%22_cfa_sId%22%3A%7B%22v%22%3A%2295553100063671170%22%2C%22e%22%3A1795790564057%7D%7D; cf_clearance=Ci4YdtFjy4r9zEv-YgGP-5OiQHYL0sQOXdgKfRupovv5vcJoZAXilf9jDefheBmGCgT4ruennjWZBkvjn16AvpJCwKGjaFNQjF9SXV3gNEfW1tyLL9fOBRYMHqBK8mfU0hBy2T77Q43PA4-xkuBxHZXO8zSK_49mgWzxuEUwG8f0IJbQ_JkijN22hucFdrVJQC2Hy1MsxjbCtEqp08PLSA3Sx9ngx9cOgKraalMUKS9_Z-0fjT3aDVnTLItjAPV0jLHNxI72HuBNU_s3Bidy8o0qKBLztol_QECYdRpqv0k6otMvElc8Ow; _ga_4KG7WNH0Z4=GS2.1.s1795788753$o20$g1$t1795788754$j59$l0$h0`;

function parseCookies(str) {
  return str.split(";").map(part => {
    const trimmed = part.trim();
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) return null;
    const name = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (name.startsWith("__Host-")) {
      return { name, value, url: "https://www.ogerio.com", secure: true, path: "/" };
    }
    return { name, value, domain: ".ogerio.com", path: "/" };
  }).filter(Boolean);
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
  console.log("🚀 LIVE SYNC: ALL OGERIO WHOLESALE BUYING PRICES & REAL-TIME STOCK");
  console.log("==================================================================\n");

  const startTime = Date.now();

  console.log("Connecting to MongoDB Atlas...");
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 25000 });
  const db = mongoose.connection.db;
  console.log("✅ MongoDB Connected!\n");

  console.log("Launching Chrome with Puppeteer...");
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-blink-features=AutomationControlled"]
  });

  const page = await browser.newPage();
  await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/158.0.0.0 Safari/537.36");
  const cookies = parseCookies(cookieStr);
  await page.setCookie(...cookies);

  console.log("Warming up Ogerio session...");
  await page.goto("https://www.ogerio.com/baby-bright-aha-gluta-whitening-facial-foam-120g/", { waitUntil: "domcontentloaded", timeout: 35000 });

  // Verify auth session
  const authSession = await page.evaluate(async () => {
    try {
      const res = await fetch("/api/store/", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ operation: "auth/session", payload: {} })
      });
      return await res.json();
    } catch (e) {
      return null;
    }
  });

  console.log("Auth session verification:", authSession?.customer ? `Logged in as ${authSession.customer.name} (${authSession.customer.audience})` : "Session active");

  const allScrapedItems = new Map(); // id -> item
  let pageNum = 1;
  let hasMore = true;

  console.log("\nStarting fast paginated archive & price sync...");

  while (hasMore) {
    try {
      const pageResult = await page.evaluate(async (pNum) => {
        const archiveRes = await fetch(`/api/catalog/archive/?page=${pNum}&per_page=24`);
        if (!archiveRes.ok) return { error: `HTTP ${archiveRes.status}` };
        const archiveJson = await archiveRes.json();
        const items = archiveJson.items || [];
        if (items.length === 0) return { items: [], has_more: false };

        const ids = items.map(it => it.id);
        const priceRes = await fetch("/api/store/", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            operation: "catalog/prices",
            payload: { ids }
          })
        });

        const priceJson = await priceRes.json();
        const prices = priceJson.items || [];
        const priceMap = new Map(prices.map(p => [p.id, p]));

        const combined = items.map(it => {
          const p = priceMap.get(it.id);
          const rawPrice = p?.price !== undefined && p?.price !== "" ? p.price : it.price;
          const numPrice = Number(rawPrice);
          const rawReg = p?.regular_price !== undefined && p?.regular_price !== "" ? p.regular_price : it.regular_price;
          const numReg = Number(rawReg);

          return {
            id: it.id,
            name: it.name,
            permalink: it.permalink,
            brand: it.brand,
            wholesalePrice: Number.isFinite(numPrice) && numPrice > 0 ? numPrice : (Number.isFinite(numReg) ? numReg : 0),
            regularPrice: Number.isFinite(numReg) && numReg > 0 ? numReg : (Number.isFinite(numPrice) ? numPrice : 0),
            stockStatus: p?.stock_status || it.stock_status || "outofstock",
            maxQty: p?.max_quantity !== undefined ? p.max_quantity : -1
          };
        });

        return {
          items: combined,
          has_more: Boolean(archiveJson.has_more),
          next_page: archiveJson.next_page
        };
      }, pageNum);

      if (pageResult.error) {
        console.error(`Page ${pageNum} error:`, pageResult.error);
        break;
      }

      if (pageResult.items && pageResult.items.length > 0) {
        for (const it of pageResult.items) {
          allScrapedItems.set(it.id, it);
        }
      }

      if (pageNum % 5 === 0 || !pageResult.has_more) {
        console.log(`[Crawl Progress] Page ${pageNum} done | Total products collected: ${allScrapedItems.size}`);
      }

      hasMore = pageResult.has_more;
      pageNum++;

      // Small throttle to be courteous
      await new Promise(r => setTimeout(r, 200));

      // Safety limit (e.g. 200 pages = 4,800 items)
      if (pageNum > 200) break;
    } catch (err) {
      console.error(`Error on page ${pageNum}:`, err.message);
      break;
    }
  }

  await browser.close();

  console.log(`\n==================================================================`);
  console.log(`🎉 SCRAPING COMPLETE: Collected ${allScrapedItems.size} live products from Ogerio in ${Math.round((Date.now() - startTime) / 1000)}s!`);
  console.log(`==================================================================\n`);

  // Save backup to disk
  const backupFile = path.resolve("scripts", "scraped_live_ogerio_wholesale.json");
  const allItemsArr = Array.from(allScrapedItems.values());
  fs.writeFileSync(backupFile, JSON.stringify(allItemsArr, null, 2), "utf8");
  console.log(`💾 Saved backup of fresh Ogerio catalog to: ${backupFile}\n`);

  // Now Match and Update MongoDB Atlas Database
  console.log("Loading all LIORA products from database into memory...");
  const dbProducts = await db.collection("products").find({}).toArray();
  console.log(`Loaded ${dbProducts.length} LIORA products.\n`);

  // Build high-speed lookup maps
  const exactMap = new Map();
  const lowerMap = new Map();
  const normMap = new Map();

  for (const p of dbProducts) {
    if (!p.name) continue;
    exactMap.set(p.name.trim(), p);
    lowerMap.set(p.name.toLowerCase().trim(), p);
    normMap.set(normalizeTitle(p.name), p);
  }

  console.log("Matching live Ogerio wholesale prices with LIORA database...");

  const updates = [];
  const outOfStockAlerts = [];
  let matchedCount = 0;

  for (const item of allItemsArr) {
    const ogerioTitle = item.name;
    const wsPrice = item.wholesalePrice;
    const regPrice = item.regularPrice;
    const isInstock = item.stockStatus === "instock";
    const availableQty = item.maxQty;

    // Match strategy
    let p = exactMap.get(ogerioTitle.trim());
    if (!p) p = lowerMap.get(ogerioTitle.toLowerCase().trim());
    if (!p) p = normMap.get(normalizeTitle(ogerioTitle));

    // Word prefix matching
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

    // Calculate smart wholesale selling price for LIORA:
    // If buying at wsPrice from Ogerio, selling wholesale at wsPrice + 6% or reasonable margin
    // But never higher than offerPrice
    const currentOffer = Number(p.offerPrice || p.originalPrice || regPrice);
    let lioraWholesaleSellingPrice = Math.round(wsPrice * 1.06);
    if (lioraWholesaleSellingPrice >= currentOffer) {
      lioraWholesaleSellingPrice = Math.max(wsPrice, Math.round(currentOffer * 0.92));
    }

    const updateFields = {
      purchasePrice: wsPrice, // REAL OGERIO BUYING PRICE!
      wholesalePrice: lioraWholesaleSellingPrice, // LIORA WHOLESALE SELLING PRICE
      inStock: isInstock,
      stockQuantity: isInstock ? (availableQty > 0 ? availableQty : 10) : 0,
      stockStatus: isInstock ? "In Stock" : "Out of Stock",
      ogerioWholesalePrice: wsPrice,
      ogerioRegularPrice: regPrice,
      ogerioStockStatus: item.stockStatus,
      ogerioMaxQty: availableQty,
      priceEstimated: false,
      lastSyncedAt: new Date(),
      updatedAt: new Date()
    };

    updates.push({
      updateOne: {
        filter: { _id: p._id },
        update: { $set: updateFields }
      }
    });

    if (!isInstock) {
      outOfStockAlerts.push({
        id: p._id,
        name: p.name,
        wholesalePrice: wsPrice,
        regularPrice: regPrice
      });
    }
  }

  console.log(`✅ Matched ${matchedCount} products out of ${dbProducts.length} LIORA products!`);
  console.log(`⚠️ Out-of-stock products detected from Ogerio: ${outOfStockAlerts.length}`);

  console.log(`\nWriting bulk updates to MongoDB...`);
  let modifiedCount = 0;
  for (let i = 0; i < updates.length; i += 500) {
    const chunk = updates.slice(i, i + 500);
    const res = await db.collection("products").bulkWrite(chunk);
    modifiedCount += res.modifiedCount;
  }

  console.log(`✅ Bulk write finished: ${modifiedCount} products updated with REAL Ogerio wholesale prices & live stock!`);

  // Save Out of Stock / Restock Watchlist to DB
  await db.collection("ogerio_sync_logs").insertOne({
    syncDate: new Date(),
    totalScraped: allItemsArr.length,
    matchedProducts: matchedCount,
    modifiedProducts: modifiedCount,
    outOfStockCount: outOfStockAlerts.length,
    outOfStockItems: outOfStockAlerts.map(it => ({ id: it.id, name: it.name, wholesalePrice: it.wholesalePrice }))
  });

  console.log(`💾 Saved sync log and out-of-stock alert list to 'ogerio_sync_logs' collection in MongoDB.`);

  // Sample check of updated products
  const checkSample = await db.collection("products").find({
    name: { $in: [
      "Simple Refreshing Face Wash 150ml (India)",
      "Vaseline Lotion Deep Restore 400ml With Gluta-Hya Dewy Radiance Serum 70ml Free",
      "Kodomo Baby Lotion Powder Extra Mild – 180ml",
      "SADOER Bamboo Charcoal Black Mask 60g"
    ]}
  }).toArray();

  console.log("\nSample Verified Products After Live Sync:");
  for (const p of checkSample) {
    console.log(`- ${p.name}:`);
    console.log(`  কেনা দাম (purchasePrice): ৳${p.purchasePrice}`);
    console.log(`  হোলসেল বিক্রয় দাম (wholesalePrice): ৳${p.wholesalePrice}`);
    console.log(`  রেগুলার খুচরা (offerPrice): ৳${p.offerPrice}`);
    console.log(`  স্টক স্ট্যাটাস: ${p.inStock ? "In Stock" : "Out of Stock"}`);
  }

  // Automatically refresh pending orders
  console.log("\nRefreshing pending orders with updated wholesale prices...");
  await syncPendingOrdersWithProductPrices(db);

  const totalTime = Math.round((Date.now() - startTime) / 1000);
  console.log(`\n==================================================================`);
  console.log(`✨ FULL SYNC FINISHED SUCCESSFULLY IN ${totalTime} SECONDS!`);
  console.log(`==================================================================\n`);

  await mongoose.disconnect();
}

main().catch(console.error);
