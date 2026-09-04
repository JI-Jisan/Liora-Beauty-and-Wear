import puppeteer from 'puppeteer-core';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function run() {
  console.log('Launching local Chrome with puppeteer-core...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--window-size=1280,800'
    ]
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

    console.log('Navigating to Ogerio...');
    await page.goto('https://www.ogerio.com/shopbd/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    // Wait a bit for dynamic content
    await new Promise(r => setTimeout(r, 3000));

    console.log('Page title:', await page.title());

    // Extract products
    const products = await page.evaluate(() => {
      const cards = document.querySelectorAll('.product-grid-item');
      const results = [];

      cards.forEach((card, idx) => {
        if (idx >= 10) return; // test first 10
        const titleEl = card.querySelector('.wd-entities-title a, .product-title a');
        const catEl = card.querySelector('.wd-product-cats a');
        const imgEl = card.querySelector('.product-image-link img');
        const delEl = card.querySelector('.price del .amount bdi');
        const currentEl = card.querySelector('.price ins .amount bdi') || card.querySelector('.price .amount bdi');

        const title = titleEl ? titleEl.textContent.trim() : '';
        const link = titleEl ? titleEl.href : '';
        const category = catEl ? catEl.textContent.trim() : 'General';
        
        let img = '';
        if (imgEl) {
          img = imgEl.getAttribute('data-src') || imgEl.getAttribute('data-lazy-src') || imgEl.src || '';
        }

        const offerPrice = currentEl ? parseFloat(currentEl.textContent.replace(/[^\d.]/g, '')) || 0 : 0;
        const originalPrice = delEl ? parseFloat(delEl.textContent.replace(/[^\d.]/g, '')) || offerPrice : offerPrice;

        if (title && offerPrice > 0) {
          results.push({ title, link, category, img, offerPrice, originalPrice });
        }
      });

      return results;
    });

    console.log('Extracted', products.length, 'products successfully:');
    console.dir(products.slice(0, 3), { depth: null });
  } finally {
    await browser.close();
  }
}

run().catch(console.error);
