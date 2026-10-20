import fs from 'fs';
import path from 'path';

function cleanDir(dirPath, keepExtensions = ['.gitkeep']) {
  if (!fs.existsSync(dirPath)) return;
  const files = fs.readdirSync(dirPath);
  for (const f of files) {
    const full = path.join(dirPath, f);
    if (keepExtensions.includes(path.extname(f)) || f === '.gitkeep') continue;
    if (fs.statSync(full).isFile()) {
      fs.unlinkSync(full);
    }
  }
}

// 1. Clean public/banners
cleanDir('public/banners');
console.log('✓ Cleaned public/banners (retained in scratch/banners)');

// 2. Clean public/combos
cleanDir('public/combos');
console.log('✓ Cleaned public/combos (migrated to Cloudinary)');

// 3. Clean public/id_cards
if (!fs.existsSync('public/id_cards/.gitkeep')) {
  fs.writeFileSync('public/id_cards/.gitkeep', '# Placeholder\n');
}
cleanDir('public/id_cards');
console.log('✓ Cleaned public/id_cards (migrated to Cloudinary and scratch/id_cards)');

// 4. Remove hero-banner-main.jpg if present
if (fs.existsSync('public/hero-banner-main.jpg')) {
  fs.unlinkSync('public/hero-banner-main.jpg');
  console.log('✓ Removed public/hero-banner-main.jpg (migrated to Cloudinary)');
}

console.log('🎉 Public folder cleanup completed!');
