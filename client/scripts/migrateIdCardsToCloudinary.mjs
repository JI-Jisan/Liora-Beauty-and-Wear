import fs from 'fs';
import path from 'path';

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

async function uploadFileToCloudinary(filePath, folder = 'liora_store/id_cards') {
  const form = new FormData();
  const fileBuffer = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase().slice(1) || 'jpg';
  const mime = ext === 'png' ? 'image/png' : ext === 'svg' ? 'image/svg+xml' : ext === 'html' ? 'text/html' : 'image/jpeg';
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

async function run() {
  console.log('🚀 Uploading id_cards to Cloudinary...');
  const idCardsDir = 'public/id_cards';
  const scratchIdCards = 'scratch/id_cards';
  if (!fs.existsSync(scratchIdCards)) fs.mkdirSync(scratchIdCards, { recursive: true });

  const mapping = {};

  if (fs.existsSync(idCardsDir)) {
    const files = fs.readdirSync(idCardsDir);
    for (const f of files) {
      const src = path.join(idCardsDir, f);
      const dest = path.join(scratchIdCards, f);
      // Backup to scratch first
      if (!fs.existsSync(dest)) fs.copyFileSync(src, dest);

      // Only upload images to Cloudinary (skip .html)
      if (f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg')) {
        console.log(`Uploading ${f}...`);
        try {
          const url = await uploadFileToCloudinary(src);
          mapping[`/id_cards/${f}`] = url;
          console.log(`  ✓ Uploaded: ${url}`);
        } catch (err) {
          console.error(`  ✗ Error:`, err.message);
        }
      }
    }
  }

  fs.writeFileSync('scripts/uploaded_id_cards.json', JSON.stringify(mapping, null, 2));
  console.log('Done! Saved mapping to scripts/uploaded_id_cards.json');
}

run().catch(console.error);
