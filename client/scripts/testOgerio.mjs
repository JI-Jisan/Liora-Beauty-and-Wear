import * as cheerio from 'cheerio';
import fs from 'fs';

const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

async function test() {
  console.log('Fetching page 1...');
  const res = await fetch('https://www.ogerio.com/shopbd/', { headers });
  console.log('Status code:', res.status);
  const html = await res.text();
  console.log('HTML length:', html.length);
  
  if (html.includes('Just a moment...') || html.includes('cf-browser-verification') || res.status === 403) {
    console.log('Cloudflare challenge detected in fetch!');
    return;
  }

  const $ = cheerio.load(html);
  console.log('Title:', $('title').text());

  // Search for any product cards
  const cards = $('div.product, li.product, .type-product, [class*="product-grid"]');
  console.log('Detected product card elements count:', cards.length);

  // If found, print first card html
  if (cards.length > 0) {
    console.log('Sample card classes:', $(cards[0]).attr('class'));
    console.log('Sample card text:', $(cards[0]).text().slice(0, 150));
  }
}

test().catch(console.error);
