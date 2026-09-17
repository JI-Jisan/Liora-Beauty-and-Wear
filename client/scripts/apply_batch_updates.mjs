import fs from 'fs';

const batchData = JSON.parse(fs.readFileSync('client/scripts/last_batch.json', 'utf8'));
const { items, total } = batchData;
const batchNum = Math.round(total / 30); // e.g. 10 for 300 / 30 is 10, wait: 240 was 12, 270 was 13, 300 is 14!

console.log(`Applying Batch updates for total = ${total} (items count = ${items.length})`);

// 1. Update client/app/api/marketing/[...slug]/route.js
let routeContent = fs.readFileSync('client/app/api/marketing/[...slug]/route.js', 'utf8');
const routeSnippet = [
  `  // Batch ${batchNum} (${items.length} items)`,
  ...items.map(it => `  "${it.id}", // ${it.name} (৳${it.price})`)
].join('\n');

routeContent = routeContent.replace(/(\n\];\s*\n\s*function getStoredBannerBuffer)/, `,\n${routeSnippet}$1`);
fs.writeFileSync('client/app/api/marketing/[...slug]/route.js', routeContent, 'utf8');
console.log('✓ Updated route.js');

// 2. Update client/lib/fbPromotionService.js
let fbContent = fs.readFileSync('client/lib/fbPromotionService.js', 'utf8');
const rawIdLines = [];
for (let i = 0; i < items.length; i += 5) {
  const chunk = items.slice(i, i + 5).map(it => `"${it.id}"`).join(', ');
  rawIdLines.push('      ' + chunk);
}
const fbSnippet = [
  `      // Batch ${batchNum} (${items.length} items)`,
  rawIdLines.join(',\n')
].join('\n');

// Replace targetXXXIds definition and array closing
fbContent = fbContent.replace(/const target\d+Ids = \[/, `const target${total}Ids = [`);
fbContent = fbContent.replace(/(\n\s*\];\s*\n\s*const raw = await Product\.find\(\{\s*_id:\s*\{\s*\$in:\s*target)\d+(Ids)/g, `,\n${fbSnippet}$1${total}$2`);
fbContent = fbContent.replace(/products = target\d+Ids\.map/g, `products = target${total}Ids.map`);
fs.writeFileSync('client/lib/fbPromotionService.js', fbContent, 'utf8');
console.log('✓ Updated fbPromotionService.js');

// 3. Update server/routes/marketingRoutes.js
let serverContent = fs.readFileSync('server/routes/marketingRoutes.js', 'utf8');
const serverIdLines = [];
for (let i = 0; i < items.length; i += 5) {
  const chunk = items.slice(i, i + 5).map(it => `"${it.id}"`).join(', ');
  serverIdLines.push('  ' + chunk);
}
const serverSnippet = [
  `  // Batch ${batchNum} (${items.length} items)`,
  serverIdLines.join(',\n')
].join('\n');

serverContent = serverContent.replace(/const TARGET_\d+_IDS = \[/, `const TARGET_${total}_IDS = [`);
serverContent = serverContent.replace(/(\n\];\s*\n\s*\/\/\s*1\.\s*Get all brands)/, `,\n${serverSnippet}$1`);
serverContent = serverContent.replace(/TARGET_\d+_IDS/g, `TARGET_${total}_IDS`);
fs.writeFileSync('server/routes/marketingRoutes.js', serverContent, 'utf8');
console.log('✓ Updated marketingRoutes.js');

console.log(`All files updated to Batch ${batchNum} (${total} total ready banners)!`);
