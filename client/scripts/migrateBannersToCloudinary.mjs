import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';

if (fs.existsSync('.env.local')) {
  const envContent = fs.readFileSync('.env.local', 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dlgubaefs';
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'liora_store';

async function uploadFileToCloudinary(filePath, folder = 'liora_banners') {
  const form = new FormData();
  const fileBuffer = fs.readFileSync(filePath);
  const ext = path.extname(filePath).slice(1) || 'jpg';
  const mime = ext === 'png' ? 'image/png' : ext === 'svg' ? 'image/svg+xml' : 'image/jpeg';
  const blob = new Blob([fileBuffer], { type: mime });
  
  const filename = path.basename(filePath);
  form.append('file', blob, filename);
  form.append('upload_preset', UPLOAD_PRESET);
  form.append('folder', folder);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: 'POST',
    body: form,
  });

  const data = await res.json();
  if (!res.ok || !data.secure_url) {
    throw new Error(`Upload failed for ${filePath}: ${data?.error?.message || res.statusText}`);
  }
  return data.secure_url;
}

async function main() {
  console.log('🚀 Starting Cloudinary Upload for Core Store Assets...');
  const uploadedUrls = {};

  // 1. Core Hero & Mini Banners
  const coreBanners = [
    'public/banners/hero_korean_skincare.jpg',
    'public/banners/hero_sunscreen_glow.jpg',
    'public/banners/hero_makeup_glam.jpg',
    'public/banners/mini_korean_skin.jpg',
    'public/banners/mini_makeup_glam.jpg',
    'public/hero-banner-main.jpg',
  ];

  for (const b of coreBanners) {
    if (fs.existsSync(b)) {
      console.log(`Uploading ${b}...`);
      try {
        const url = await uploadFileToCloudinary(b, 'liora_store/banners');
        uploadedUrls[b] = url;
        console.log(`  ✓ Uploaded: ${url}`);
      } catch (err) {
        console.error(`  ✗ Error uploading ${b}:`, err.message);
      }
    }
  }

  // 2. Combos in public/combos
  const comboDir = 'public/combos';
  const comboMap = {};
  if (fs.existsSync(comboDir)) {
    const files = fs.readdirSync(comboDir);
    for (const file of files) {
      const fullPath = path.join(comboDir, file);
      if (fs.statSync(fullPath).isFile()) {
        console.log(`Uploading combo: ${file}...`);
        try {
          const url = await uploadFileToCloudinary(fullPath, 'liora_store/combos');
          uploadedUrls[fullPath] = url;
          comboMap[`/combos/${file}`] = url;
          console.log(`  ✓ Uploaded combo: ${url}`);
        } catch (err) {
          console.error(`  ✗ Error uploading combo ${file}:`, err.message);
        }
      }
    }
  }

  fs.writeFileSync('scripts/uploaded_cloudinary_assets.json', JSON.stringify(uploadedUrls, null, 2));
  console.log('Saved mapping to scripts/uploaded_cloudinary_assets.json');

  // 3. Update MongoDB combo products
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (mongoUri && Object.keys(comboMap).length > 0) {
    console.log('Connecting to MongoDB to update combo product image URLs...');
    await mongoose.connect(mongoUri);
    const db = mongoose.connection;
    for (const [localPath, cloudUrl] of Object.entries(comboMap)) {
      const res = await db.collection('products').updateMany(
        { image: localPath },
        { $set: { image: cloudUrl } }
      );
      console.log(`Updated ${res.modifiedCount} products with image: ${localPath} -> ${cloudUrl}`);
    }
    await mongoose.disconnect();
  }

  console.log('🎉 Done uploading core assets and updating combos!');
}

main().catch(console.error);
