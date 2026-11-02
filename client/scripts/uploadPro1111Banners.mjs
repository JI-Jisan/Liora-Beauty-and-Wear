import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';

const brainDir = 'C:/Users/atiku/.gemini/antigravity-ide/brain/91e248ab-72d7-46b9-8684-326ea8b3ad3a';
const scratchDir = path.join(brainDir, 'scratch');
const uri = 'mongodb://jisan_trends:liora889@ac-2e905xv-shard-00-00.6nzddbx.mongodb.net:27017,ac-2e905xv-shard-00-01.6nzddbx.mongodb.net:27017,ac-2e905xv-shard-00-02.6nzddbx.mongodb.net:27017/jisantrends?ssl=true&replicaSet=atlas-12gikm-shard-0&authSource=admin&retryWrites=true&w=majority';

async function uploadToCloudinary(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const base64 = fileBuffer.toString('base64');
  const dataUri = 'data:image/webp;base64,' + base64;

  const form = new URLSearchParams();
  form.append('file', dataUri);
  form.append('upload_preset', 'liora_store');
  form.append('folder', 'liora_store/banners');

  const res = await fetch('https://api.cloudinary.com/v1_1/dlgubaefs/image/upload', {
    method: 'POST',
    body: form,
  });
  const data = await res.json();
  return data.secure_url;
}

async function run() {
  const swissSource = path.join(brainDir, 'swiss_1111_pro_banner_1793645257639.jpg');
  const bgSource = path.join(brainDir, 'beauty_glazed_1111_1793645293087.jpg');

  const swissWebp = path.join(scratchDir, 'swiss-pro-1111.webp');
  const bgWebp = path.join(scratchDir, 'beautyglazed-pro-1111.webp');

  await sharp(swissSource).webp({ quality: 92 }).toFile(swissWebp);
  await sharp(bgSource).webp({ quality: 92 }).toFile(bgWebp);

  console.log('Uploading Swiss Pro Banner...');
  const swissUrl = await uploadToCloudinary(swissWebp);
  console.log('Swiss Url:', swissUrl);

  console.log('Uploading Beauty Glazed Pro Banner...');
  const bgUrl = await uploadToCloudinary(bgWebp);
  console.log('Beauty Glazed Url:', bgUrl);

  const beautySagaUrl = 'https://res.cloudinary.com/dlgubaefs/image/upload/v1793647404/liora_store/banners/rhyy1m9sbuhbmhdywstn.webp';
  const kbeautyUrl = 'https://res.cloudinary.com/dlgubaefs/image/upload/v1793647405/liora_store/banners/embskiwgane2zn7wjwaz.webp';

  const pro1111Slides = [
    {
      id: 'banner-1111-swiss-beauty-official',
      title: 'Swiss Beauty 11.11 Mega Sale - Up to 70% OFF',
      image: 'https://res.cloudinary.com/dlgubaefs/image/upload/v1793650036/liora_store/banners/qii0c7gsgixdcqx5gj7g.webp',
      buttonLink: '/brands/swiss-beauty',
      buttonText: 'Shop Swiss Beauty',
    },
    {
      id: 'banner-1111-beauty-glazed-color',
      title: 'Beauty Glazed 11.11 Mega Sale - Up to 65% OFF',
      image: 'https://res.cloudinary.com/dlgubaefs/image/upload/v1793650037/liora_store/banners/p1fonohzgobksm55r101.webp',
      buttonLink: '/brands/beauty-glazed',
      buttonText: 'Shop Beauty Glazed',
    },
    {
      id: 'banner-1111-k-beauty-glass-skin',
      title: 'K-Beauty 11.11 Festival - Glass Skin Routine Up to 50% OFF',
      image: kbeautyUrl,
      buttonLink: '/products?category=K-Beauty',
      buttonText: 'Explore K-Beauty',
    },
    {
      id: 'banner-1111-beauty-saga-unilever',
      title: '11.11 Beauty Saga - Tresemme & Hair Care Up to 45% OFF',
      image: beautySagaUrl,
      buttonLink: '/products?category=Hair+Care',
      buttonText: 'Shop Hair Care',
    },
  ];

  await mongoose.connect(uri);
  const SiteSettings = mongoose.models.SiteSettings || mongoose.model('SiteSettings', new mongoose.Schema({}, { strict: false }));
  await SiteSettings.updateMany({}, { $set: { promoSlides: pro1111Slides, heroImage: '' } });
  console.log('✅ Updated MongoDB SiteSettings with all 4 Studio Pro 11.11 Banners!');
  process.exit(0);
}

run().catch(console.error);
