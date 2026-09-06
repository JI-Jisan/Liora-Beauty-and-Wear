import puppeteer from 'puppeteer-core';
import m from 'mongoose';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

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
      const v = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[k]) process.env[k] = v;
    }
  }
}

const MONGO_URI =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  "mongodb://jisan_trends:liora889@ac-2e905xv-shard-00-00.6nzddbx.mongodb.net:27017,ac-2e905xv-shard-00-01.6nzddbx.mongodb.net:27017,ac-2e905xv-shard-00-02.6nzddbx.mongodb.net:27017/jisantrends?ssl=true&replicaSet=atlas-12gikm-shard-0&authSource=admin&retryWrites=true&w=majority";

const rawCookieString = process.env.OGERIO_COOKIE || `_gcl_au=1.1.1916874540.1788358494; _ga=GA1.1.2067872575.1788358494; _fbp=fb.1.1788358495210.128381418579568748; cfz_zaraz-analytics=%7B%22_cfa_clientId%22%3A%7B%22v%22%3A%2210465947386125474%22%2C%22e%22%3A1819894495463%7D%2C%22_cfa_sId%22%3A%7B%22v%22%3A%2255278755305913830%22%2C%22e%22%3A1788609984785%7D%7D; wordpress_test_cookie=WP%20Cookie%20check; wordpress_logged_in_65affc8df1b074206d0540bb7c0f54de=liorabeautyandwear%40gmail.com%7C1788882320%7CwASYPZuk7rMhx0mpmYyfNK0qw9oUb5iFgJgrfodkDzl%7C0737d9f24563eb8e04a774aff17038e6003e51af675ecbd4ce8b638b40bf59cf; wfwaf-authcookie-1c7ab08f031298fbc2c588336c15d99f=104283%7Cother%7Cread%7Cde049eb9db6b74f506ccc0bc664b2fa6dfd023f55e7d3595402192f5633dacc7; woocommerce_items_in_cart=1; wp_woocommerce_session_65affc8df1b074206d0540bb7c0f54de=104283%7C1789314321%7C1788795921%7C568609153d2d468fc6da53de12b451c9; _ga_4KG7WNH0Z4=GS2.1.s1788709278$o3$g1$t1788709519$j52$l0$h0; woocommerce_cart_hash=2f08db6f4cbf150bff9ef95a585ba4f8; g_state={"i_l":0,"i_ll":1788710205528,"i_e":{"enable_itp_optimization":24},"i_et":1788710205528,"i_b":"qIW2FSs2UIJtIVuxNCNsNpg01gfdfBdz7/nuizp/gj4"}; cf_clearance=wGs8YsDKmmYyJiQUm1dNaFoMnmmcIhaZScrMzo.Gw_g-1788710208-1.2.1.1-SL5vKIvwAwZ83FyLhIcPJMb2sELBh.qHIgF8p5vD3.EwDwGguUQWyb4opQICeszSoF4O5zPZ0OgUFkNftdScLnwGZKDIYgsGjQJVgKoMxpWHE77irAJFzealY_vhyc0EXXNFJv_In_3fTi.b62GmSKV1UiF6F9RkdbbiGYBwKI4JkWWc51wnNjdqcwJg1pZGUOBuSvLWYbnaL7SHWHgOM7q6CS1cM8GgHx014QUbDRfaJpNEOMHv_s8r.4hBXqoPz.bONwYqCtHSp9gV5rxuW_3bxbVFAyrARcBpX0KTBCpaVOMjMVePVZxgIwNLmnGHzpMPpQrck5Ss6qWmGOHYK0BTjRiD1unJ3bf1CV1z69A`;

const TOTAL_PAGES = 150;
const CONCURRENCY = 3;

function parseCookies(str, domain = '.ogerio.com') {
  return str.split(';').map(part => {
    const trimmed = part.trim();
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) return null;
    const name = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    return { name, value, domain, path: '/' };
  }).filter(Boolean);
}

function normalizeTitle(t) {
  return (t || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function setupPage(page, cookies) {
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36');
  await page.setCookie(...cookies);
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    if (['image', 'font', 'media', 'stylesheet'].includes(req.resourceType())) {
      req.abort();
    } else {
      req.continue();
    }
  });
}

async function main() {
  console.log('====================================================');
  console.log('💰 Syncing Real Wholesale Buying Prices from Ogerio');
  console.log('====================================================');

  console.log('Connecting to MongoDB...');
  await m.connect(MONGO_URI);
  console.log('MongoDB connected!\n');

  const db = m.connection;
  const ProductCol = db.collection('products');
  const BatchCol = db.collection('purchasebatches');

  const cookies = parseCookies(rawCookieString);

  console.log(`Launching Chrome with ${CONCURRENCY} worker tabs...`);
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled'
    ]
  });

  const pages = [];
  for (let i = 0; i < CONCURRENCY; i++) {
    const p = await browser.newPage();
    await setupPage(p, cookies);
    pages.push(p);
  }

  // Queue pages 1 to TOTAL_PAGES
  const queue = [];
  for (let i = 1; i <= TOTAL_PAGES; i++) queue.push(i);

  const wholesaleDataMap = new Map(); // title -> wholesalePrice
  let completedPages = 0;
  const startTime = Date.now();

  async function worker(tabIndex) {
    const p = pages[tabIndex];
    while (queue.length > 0) {
      const pageNum = queue.shift();
      const pageUrl = `https://www.ogerio.com/shopbd/page/${pageNum}/`;

      let retries = 2;
      let success = false;

      while (retries >= 0 && !success) {
        try {
          const res = await p.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 35000 });
          if (res && res.status() === 404) {
            success = true;
            break;
          }

          const extracted = await p.evaluate(() => {
            const cards = document.querySelectorAll('.product-grid-item, div.product');
            return Array.from(cards).map(card => {
              const a = card.querySelector('.wd-entities-title a, .product-title a');
              const text = card.innerText || '';
              const m = text.match(/Wholesale\s*Price:\s*([\d,]+)/i);
              const wholesalePrice = m ? parseInt(m[1].replace(/,/g, ''), 10) : null;
              return {
                title: a ? a.innerText.trim() : '',
                wholesalePrice
              };
            });
          });

          let pageWholesaleCount = 0;
          for (const item of extracted) {
            if (item.title && Number.isFinite(item.wholesalePrice) && item.wholesalePrice > 0) {
              pageWholesaleCount++;
              if (!wholesaleDataMap.has(item.title)) {
                wholesaleDataMap.set(item.title, item.wholesalePrice);
              }
            }
          }

          completedPages++;
          if (completedPages % 10 === 0 || completedPages === TOTAL_PAGES) {
            console.log(`[Worker ${tabIndex + 1}] Page ${pageNum}/${TOTAL_PAGES} | Scraped: ${pageWholesaleCount} prices | Total Wholesale Collected: ${wholesaleDataMap.size}`);
          }

          success = true;
        } catch (err) {
          retries--;
          if (retries < 0) {
            console.error(`[Worker ${tabIndex + 1}] Error on Page ${pageNum}:`, err.message);
          } else {
            await new Promise(r => setTimeout(r, 1000));
          }
        }
      }
    }
  }

  console.log(`Starting crawl of pages 1 to ${TOTAL_PAGES}...`);
  await Promise.all(pages.map((_, i) => worker(i)));
  await browser.close();

  console.log('\n====================================================');
  console.log(`Scraping completed in ${Math.round((Date.now() - startTime) / 1000)}s!`);
  console.log(`Total unique wholesale prices collected: ${wholesaleDataMap.size}`);
  console.log('====================================================\n');

  console.log('Applying wholesale buying prices to LIORA Database...');

  let updatedProducts = 0;
  let updatedBatches = 0;
  let notFoundInDB = 0;

  for (const [title, wholesalePrice] of wholesaleDataMap.entries()) {
    // 1. Exact match
    let prod = await ProductCol.findOne({ name: title });

    // 2. Case-insensitive exact regex
    if (!prod) {
      const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      prod = await ProductCol.findOne({ name: { $regex: new RegExp(`^${escaped}$`, 'i') } });
    }

    // 3. Normalized word matching
    if (!prod) {
      const norm = normalizeTitle(title);
      const words = norm.split(' ').slice(0, 4).filter(Boolean).join('.*');
      if (words && words.length > 5) {
        prod = await ProductCol.findOne({ name: { $regex: new RegExp(words, 'i') } });
      }
    }

    if (!prod) {
      notFoundInDB++;
      continue;
    }

    // Update Product purchasePrice
    await ProductCol.updateOne(
      { _id: prod._id },
      {
        $set: {
          purchasePrice: wholesalePrice,
          updatedAt: new Date()
        }
      }
    );
    updatedProducts++;

    // Update purchase batches unitCost for this product
    const batchRes = await BatchCol.updateMany(
      { product: prod._id },
      {
        $set: {
          unitCost: wholesalePrice,
          updatedAt: new Date()
        }
      }
    );
    updatedBatches += batchRes.modifiedCount;

    if (updatedProducts % 100 === 0) {
      console.log(`Updated ${updatedProducts} products with wholesale purchasePrice...`);
    }
  }

  const totalTime = Math.round((Date.now() - startTime) / 1000);
  console.log('\n====================================================');
  console.log('✅ WHOLESALE BUYING PRICES SYNC FINISHED!');
  console.log('====================================================');
  console.log(`⏱️ Total Time: ${totalTime}s`);
  console.log(`🔍 Wholesale Prices Found on Ogerio: ${wholesaleDataMap.size}`);
  console.log(`📦 Products Updated in LIORA DB: ${updatedProducts}`);
  console.log(`📊 Purchase Batches Updated: ${updatedBatches}`);
  console.log(`⚠️ Not matched in DB: ${notFoundInDB}`);
  console.log('====================================================\n');

  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error in wholesale sync:', err);
  process.exit(1);
});
