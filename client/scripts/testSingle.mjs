import puppeteer from 'puppeteer-core';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function testSingle() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.goto('https://www.ogerio.com/beauty-glazed-waterproof-long-lasting-lip-liner-pencil-b114-chocolate/', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 2000));
  
  const data = await page.evaluate(() => {
    // gallery images
    const imgEls = document.querySelectorAll('.woocommerce-product-gallery__image a, .woocommerce-product-gallery img');
    const images = Array.from(imgEls).map(el => el.href || el.getAttribute('data-src') || el.src).filter(Boolean);

    // category
    const catEls = document.querySelectorAll('.posted_in a');
    const categories = Array.from(catEls).map(a => a.textContent.trim());

    // brand
    const brandEl = document.querySelector('.wd-product-brand img');
    const brand = brandEl ? brandEl.alt : '';

    // description
    const descEl = document.querySelector('#tab-description, .woocommerce-Tabs-panel--description, .woocommerce-product-details__short-description');
    const description = descEl ? descEl.innerText.trim() : '';

    return { categories, brand, images: Array.from(new Set(images)), description: description.slice(0, 300) };
  });

  console.log('Single product data:');
  console.dir(data, { depth: null });
  await browser.close();
}

testSingle().catch(console.error);
