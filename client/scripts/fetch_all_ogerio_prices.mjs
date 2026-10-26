import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36';

const rawCookieString = `_ga=GA1.1.843681729.1790566594; wordpress_logged_in_65affc8df1b074206d0540bb7c0f54de=liorabeautyandwear%40gmail.com%7C1793531834%7ClEM6ydgjeSK4f8ORTKL4Pp1LJcJhpZ32mYzanEj0Dko%7C53b8546ae46a6dcefcd3230e1af45935d2f4f58019492dbcdb0d8483889cc445; _gcl_au=1.1.124190221.1790566594.1672687054.1792322322.1792322322.2040090187.1792322322.1792322322; woodmart_recently_viewed_products=255295|34407|74387|334755|261253|158272; cf_clearance=xE9oQphIGix2NCBEKK2kqJaRoCsy_pQoT_SO9.8IiOU-1793029807-1.2.1.1-pP2O56_LSGaAlpTa70SoLlKCAtpJgqqw3YUUiLcQeFuCqVbIx_7.5erS30qZj4hHGYZp4jXEklXiQSNVcn5C4BupJuNcKChuSZ5iS92lRck3FN60RBKHe_iMvvEYsbkwgCk0rV2d05LpmNbpXl_eFk7qXCHNpOB2wQRXkSQsudrvFHfBcT6VfJaWbeA9psx5OCgVEs5vGaBUamzNBOzRN202fTPi0vOIG2k3gQWyKW8XgNiTMsEnZyi4jBFYHImL.5ELScyKRvUsKJMNSMjr_ZLAFm8iolJBSuxAOz7vzVqW7h5r8YiHJgAnQb6IXYdmKzWKRIUPKuvF2DfaJEiNNIFvn70tq0XlOL6.JOj0hKQ; __Host-ogn_device=967dbea1e741c257878453a6776e114bff980e5438f814b04e74568b16cd5031; g_state={"i_l":0,"i_ll":1793025568696,"i_e":{"enable_itp_optimization":24},"i_et":1793025568696}; __Host-ogn_session=11030611ad16000eccef7fef70393864a6e273da2b75840b1833da2e35a6abe5; _ga_4KG7WNH0Z4=GS2.1.s1793025457$o8$g1$t1793025621$j36$l0$h0`;

function parseCookies(str) {
  return str.split(';').map(part => {
    const trimmed = part.trim();
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) return null;
    const name = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (name.startsWith('__Host-')) {
      return { name, value, url: 'https://www.ogerio.com/', secure: true };
    }
    return { name, value, domain: '.ogerio.com', path: '/' };
  }).filter(Boolean);
}

async function fetchAllPrices() {
  console.log('================================================================');
  console.log('⚡ Fetching Live Wholesale Prices & Stock for 2,205 Ogerio Products');
  console.log('   Account: liorabeautyandwear@gmail.com');
  console.log('================================================================\n');

  const dumpPath = fs.existsSync('scripts/ogerio_live_sync_dump.json')
    ? 'scripts/ogerio_live_sync_dump.json'
    : 'client/scripts/ogerio_live_sync_dump.json';
  const dump = JSON.parse(fs.readFileSync(dumpPath, 'utf8'));
  console.log(`Loaded ${dump.length} products from dump file.`);

  console.log('Launching headless Chrome...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
  });

  const page = await browser.newPage();
  await page.setUserAgent(USER_AGENT);
  const cookies = parseCookies(rawCookieString);
  await page.setCookie(...cookies);

  // Block images, fonts, styles to save bandwidth
  await page.setRequestInterception(true);
  page.on('request', req => {
    const type = req.resourceType();
    if (['image', 'font', 'media', 'stylesheet'].includes(type)) {
      req.abort();
    } else {
      req.continue();
    }
  });

  console.log('Navigating to Ogerio...');
  await page.goto('https://www.ogerio.com/shop/', { waitUntil: 'domcontentloaded', timeout: 35000 });
  await new Promise(r => setTimeout(r, 2000));

  // Chunk size 20 (Ogerio max limit is 24)
  const CHUNK_SIZE = 20;
  const priceMap = new Map();
  const allIds = dump.map(d => d.id).filter(Boolean);

  let successChunks = 0;
  let errorChunks = 0;

  for (let i = 0; i < allIds.length; i += CHUNK_SIZE) {
    const chunkIds = allIds.slice(i, i + CHUNK_SIZE);
    try {
      const resData = await page.evaluate(async (ids) => {
        const res = await fetch('/api/store/', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            operation: 'catalog/prices',
            payload: { ids }
          })
        });
        if (!res.ok) return { error: `HTTP ${res.status}` };
        return await res.json();
      }, chunkIds);

      if (resData && Array.isArray(resData.items)) {
        for (const item of resData.items) {
          priceMap.set(item.id, item);
        }
        successChunks++;
      } else {
        errorChunks++;
        console.log(`\nWarning at chunk ${i}-${i + chunkIds.length}:`, resData);
      }

      const pct = Math.round(((i + chunkIds.length) / allIds.length) * 100);
      process.stdout.write(`\rProgress: ${priceMap.size} / ${allIds.length} prices fetched (${pct}%)...`);
      
      // Gentle throttle
      await new Promise(r => setTimeout(r, 450));
    } catch (e) {
      errorChunks++;
      console.error(`\nError fetching chunk ${i}:`, e.message);
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  await browser.close();
  console.log(`\n\n✅ Price fetch complete! Total prices gathered: ${priceMap.size} / ${allIds.length}`);
  console.log(`   Successful chunks: ${successChunks}, Failed chunks: ${errorChunks}`);

  // Merge price data with product dump
  const completeList = dump.map(prod => {
    const pInfo = priceMap.get(prod.id);
    const wholesaleVal = pInfo && pInfo.price ? parseInt(pInfo.price, 10) : null;
    const regularVal = pInfo && pInfo.regular_price ? parseInt(pInfo.regular_price, 10) : null;
    const stockStatus = pInfo ? (pInfo.stock_status || 'instock') : 'instock';
    const isOos = !pInfo || stockStatus === 'outofstock' || pInfo.purchasable === false || pInfo.max_quantity === 0;

    return {
      id: prod.id,
      title: prod.title,
      imgSrc: prod.imgSrc,
      wholesalePrice: wholesaleVal,
      regularPrice: regularVal || (wholesaleVal ? Math.round(wholesaleVal * 1.35) : null),
      stockStatus: isOos ? 'outofstock' : 'instock',
      isOutOfStock: isOos,
      maxQuantity: pInfo ? (pInfo.max_quantity || 0) : 0,
      pricingKind: pInfo ? pInfo.pricing_kind : 'unknown'
    };
  });

  const outPath = fs.existsSync('scripts')
    ? 'scripts/ogerio_complete_live_prices.json'
    : 'client/scripts/ogerio_complete_live_prices.json';
  fs.writeFileSync(outPath, JSON.stringify(completeList, null, 2), 'utf8');
  console.log(`💾 Saved complete enriched catalog to ${outPath}\n`);

  const inStockCount = completeList.filter(p => !p.isOutOfStock).length;
  const oosCount = completeList.filter(p => p.isOutOfStock).length;
  const withWholesale = completeList.filter(p => p.wholesalePrice && p.wholesalePrice > 0).length;

  console.log('--- Summary ---');
  console.log(`Total Products: ${completeList.length}`);
  console.log(`With Live Wholesale Price: ${withWholesale}`);
  console.log(`In Stock: ${inStockCount}`);
  console.log(`Out of Stock: ${oosCount}`);
}

fetchAllPrices().catch(console.error);
