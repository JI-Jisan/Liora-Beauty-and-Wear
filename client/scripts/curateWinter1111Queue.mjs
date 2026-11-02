import mongoose from 'mongoose';
import { Product, Brand, Category } from '../lib/models.js';

const uri = 'mongodb://jisan_trends:liora889@ac-2e905xv-shard-00-00.6nzddbx.mongodb.net:27017,ac-2e905xv-shard-00-01.6nzddbx.mongodb.net:27017,ac-2e905xv-shard-00-02.6nzddbx.mongodb.net:27017/jisantrends?ssl=true&replicaSet=atlas-12gikm-shard-0&authSource=admin&retryWrites=true&w=majority';

async function main() {
  await mongoose.connect(uri);

  // Curate 25 Top Winter Skincare + 25 Top Winter Cosmetics
  const skincareIds = [
    // 1. Deep Moisturizers & Creams
    "6a9ab97fc63dd531aa8db100", // Simple Replenishing Rich Moisturiser – 125ml (৳730)
    "6a9ab990c63dd531aa8db156", // Ponds Super Light Gel Moisturiser 50ml (৳180)
    "6a9ab9e1c63dd531aa8db298", // Boots Vitamin C Brightening Moisturising Cream (৳800)
    "6a9ab9efc63dd531aa8db2cc", // Laikou Snail Essence Cream 25g (৳245)
    "6a9ab986c63dd531aa8db126", // skinO Hydration Boost Gel Moisturizer (৳370)
    "6a9ab9a1c63dd531aa8db1a6", // Laikou Hyaluronic Acid Cream 25g (৳245)
    "6a9ab9ecc63dd531aa8db2c6", // Rajkonna Light Moisturizer 50gm (৳290)
    "6a9ab992c63dd531aa8db15e", // Dot & Key Vitamin C + E Moisturizer (৳910)
    
    // 2. Hydrating Cleansers & Milk Washes (Zero stripping)
    "6a8e6eafe9601eacddbf7dbb", // Skin O Vitamin E Milk Brightening Face Wash (৳175)
    "6a9ab97dc63dd531aa8db0f6", // Dot & Key Barrier Repair Gentle Face Wash (৳470)
    "6aa2ffd70d2b8add7c6efbd0", // Cosrx Salicylic Acid Daily Gentle Cleanser (৳949)
    "6a9ab99dc63dd531aa8db18a", // Cosrx Low Ph Good Morning Gel Cleanser (৳520)
    "6a9ab988c63dd531aa8db133", // Fenyi Vitamin C Cleanser (৳190)
    
    // 3. Winter Hydrating Toners & Serums (Anti-dullness & glow)
    "6a9ab74b661657cb254c1bd5", // I’M From Rice Toner 30ml (৳550)
    "6a9ab9aec63dd531aa8db1d9", // Anua Pdrn Hyaluronic ACID Capsule Serum (৳830)
    "6a9ab9c8c63dd531aa8db243", // Bioaqua Hyaluronic Acid Serum 30ml (৳305)
    "6a9ab77134ccee884a4b5cab", // The Ordinary Niacinamide 10% + Zinc 1% (৳1100)
    "6a9ab98ac63dd531aa8db143", // Purito Seoul Azelaic Acid 10 Serum (৳1600)
    "6a9ab98ec63dd531aa8db14d", // I’m From Mugwort Essence (৳720)
    "6a9ab97bc63dd531aa8db0f4", // Caplino 1% Retinol Serum (৳790)

    // 4. Winter Sun Protection & Lip Care
    "6a9ab982c63dd531aa8db118", // Missha Aqua Sunscreen SPF50+ (৳880)
    "6a9ab9d8c63dd531aa8db279", // Innsaei Hyaluronic Sunscreen SPF 50+ (৳660)
    "6a9ab998c63dd531aa8db178", // Organikaon Lip Balm Orange & Shea (৳190)
    "6a9ab9c2c63dd531aa8db228", // Laikou Rice Skin Care Set 5pcs Glowing Set (৳1110)
    "6a9ab9fec63dd531aa8db2fe", // Bioaqua Olive Dandruff & Hair Fall Moisturizing Shampoo (৳690)
  ];

  const cosmeticIds = [
    // 1. Smudgeproof Kajal & Eyeliners (Winter & Wedding Season)
    "6a9ab70979e75ff1fa1f8a47", // Bob Long Lasting Waterproof Kajal (৳165)
    "6a9ab996c63dd531aa8db166", // Swiss Beauty Eye Define Auto Kajal Black (৳305)
    "6a9ab97ec63dd531aa8db0f9", // w7 Dip Liquid Eyeliner POT (৳245)
    "6a9ab992c63dd531aa8db15d", // Beauty Glazed Dark Brown Kajal Gel Liner (৳130)
    "6a9ab9a3c63dd531aa8db1ab", // Wet N Wild Color Icon Kohl Liner Pencil (৳275)

    // 2. Long-Lasting Matte & Velvet Lipsticks (Deep Winter Shades)
    "6a9ab997c63dd531aa8db173", // CAPLINO Liquid Matte Lipstick Red Velvet 08 (৳390)
    "6a9ab998c63dd531aa8db175", // CAPLINO Liquid Matte Lipstick GORGEOUS ME 03 (৳390)
    "6a9ab980c63dd531aa8db10c", // CAPLINO Liquid Matte Lipstick 10 (৳380)
    "6a9ab997c63dd531aa8db171", // Swiss Beauty Pure Matte Lipstick Bare (৳310)
    "6a9ab988c63dd531aa8db138", // Beauty Glazed Matte Liquid Lipstick Mini (৳85)
    "6a9ab984c63dd531aa8db11e", // Beauty Glazed Lip Crayon Espresso B106 (৳170)
    "6a9ab98ec63dd531aa8db150", // Beauty Glazed Lip Crayon Dusty B110 (৳170)
    "6a9ab98fc63dd531aa8db153", // Beauty Glazed Lip Crayon Dark Brown B102 (৳170)
    "6a9ab987c63dd531aa8db130", // Fafamoon Peptide Lip Tint Espresso 04 (৳170)

    // 3. Hydrating Plumping Lip Glosses (Prevents dry cracked lips)
    "6a9ab980c63dd531aa8db10d", // Beauty Glazed Volume Plumping Lip Gloss 102 TOAST (৳190)
    "6a9ab989c63dd531aa8db13b", // Beauty Glazed Volume Plumping Lip Gloss 104 RIBBON (৳190)
    "6a9ab996c63dd531aa8db16d", // Beauty Glazed Glow Lip Oil Meet 101 (৳150)
    "6a9ab9a8c63dd531aa8db1c4", // Swiss Beauty Moist Heist Tinted Lip Gloss Berry (৳315)

    // 4. Glow Palettes, Blush & Highlighters (Wedding Glow)
    "6a9ab98ac63dd531aa8db148", // Swiss Beauty Cover Play 6 in 1 Concealer Palette (৳390)
    "6a9ab97fc63dd531aa8db107", // Technic Mega Glow Highlighter (৳380)
    "6a9ab9a1c63dd531aa8db1a2", // Wet n Wild Color Icon Blush Mellow Wine (৳529)
    "6a9ab9a4c63dd531aa8db1b3", // Technic Mega Matte Blush 4 Color (৳370)
    "6a9ab9a3c63dd531aa8db1b0", // Beauty Glazed 4 In 1 Color Board Palette 60 Color (৳1240)

    // 5. Essential Makeup Applicators
    "6a9ab97ec63dd531aa8db0fd", // Caplino Makeup Sponge Magenta (৳170)
    "6a9ab97fc63dd531aa8db104", // Caplino Makeup Sponge Deep Magenta (৳170)
  ];

  const allIds = [...skincareIds, ...cosmeticIds];
  const products = await Product.find({ _id: { $in: allIds } })
    .populate('brand', 'name')
    .populate('category', 'name')
    .lean();

  const pMap = new Map(products.map(p => [p._id.toString(), p]));

  console.log(`Verified found products: ${pMap.size} of ${allIds.length}`);

  // Create 5 Days Schedule (10 items per day: 5 Skincare + 5 Cosmetics each day)
  const schedule = [];
  for (let day = 0; day < 5; day++) {
    const daySkincare = skincareIds.slice(day * 5, (day + 1) * 5).map(id => pMap.get(id)).filter(Boolean);
    const dayCosmetics = cosmeticIds.slice(day * 5, (day + 1) * 5).map(id => pMap.get(id)).filter(Boolean);

    // Alternate: Skincare, Cosmetic, Skincare, Cosmetic...
    const dayItems = [];
    for (let i = 0; i < 5; i++) {
      if (daySkincare[i]) dayItems.push({ type: 'Skincare', product: daySkincare[i] });
      if (dayCosmetics[i]) dayItems.push({ type: 'Cosmetics', product: dayCosmetics[i] });
    }
    schedule.push(dayItems);
  }

  console.log('--- 5 DAYS MIXED SCHEDULE (10 POSTS PER DAY) ---');
  schedule.forEach((dayItems, dIdx) => {
    console.log(`\n📅 DAY ${dIdx + 1} (${dayItems.length} Products):`);
    dayItems.forEach((item, pIdx) => {
      const p = item.product;
      const orig = p.originalPrice || p.price || 0;
      const offer = p.offerPrice || p.salePrice || orig;
      console.log(`  ${pIdx + 1}. [${item.type}] ${p.name} | MRP: ৳${orig} -> 11.11 Offer: ৳${offer} | Img: ${p.image || p.images?.[0]}`);
    });
  });

  process.exit(0);
}

main().catch(console.error);
