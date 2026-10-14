import mongoose from 'mongoose';
import fs from 'fs';

const MONGO_URI = "mongodb://jisan_trends:liora889@ac-2e905xv-shard-00-00.6nzddbx.mongodb.net:27017,ac-2e905xv-shard-00-01.6nzddbx.mongodb.net:27017,ac-2e905xv-shard-00-02.6nzddbx.mongodb.net:27017/jisantrends?ssl=true&replicaSet=atlas-12gikm-shard-0&authSource=admin&retryWrites=true&w=majority";

async function run() {
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;

  const categories = await db.collection("categories").find({}).toArray();
  const catMap = {};
  categories.forEach(c => { catMap[c._id.toString()] = c.name; });

  const brands = await db.collection("brands").find({}).toArray();
  const brandMap = {};
  brands.forEach(b => { brandMap[b._id.toString()] = b.name; });

  const products = await db.collection("products").find({
    inStock: true,
    stockQuantity: { $gt: 0 }
  }).sort({ rating: -1, isFeatured: -1, isTrending: -1, stockQuantity: -1 }).toArray();

  const enriched = products.map(p => ({
    id: p._id.toString(),
    name: p.name.trim(),
    catName: catMap[p.category?.toString()] || '',
    brandName: brandMap[p.brand?.toString()] || '',
    price: p.offerPrice || p.originalPrice || 0,
    mrp: p.mrp || p.originalPrice || 0,
    stock: p.stockQuantity
  }));

  const used = new Set();
  const usedNormalized = new Set();

  function normalize(name) {
    return name.toLowerCase()
      .replace(/(\d+\s*(ml|gm|g|pcs|pc|pack|set|tab|tablets))/g, '')
      .replace(/[^a-z0-9]/g, ' ')
      .trim()
      .split(/\s+/)
      .slice(0, 4)
      .join(' ');
  }

  function pick(filterFn, count, fallbackFn) {
    const list = [];
    for (const p of enriched) {
      if (used.has(p.id)) continue;
      const norm = normalize(p.name);
      if (usedNormalized.has(norm)) continue;

      if (filterFn(p)) {
        used.add(p.id);
        usedNormalized.add(norm);
        list.push(p);
        if (list.length === count) return list;
      }
    }
    if (fallbackFn && list.length < count) {
      for (const p of enriched) {
        if (used.has(p.id)) continue;
        const norm = normalize(p.name);
        if (usedNormalized.has(norm)) continue;

        if (fallbackFn(p)) {
          used.add(p.id);
          usedNormalized.add(norm);
          list.push(p);
          if (list.length === count) return list;
        }
      }
    }
    return list;
  }

  const themes = [
    {
      day: 1,
      theme: "Sunscreens & UV Protection (রোদ থেকে ত্বকের সুরক্ষা - সানস্ক্রিন)",
      filter: p => (/sunscreen|sun block|sun cream|sun gel/i.test(p.name) || p.catName.toLowerCase().includes('sunscreen')) && !/lip balm|compact|powder|lotion|set|wash/i.test(p.name)
    },
    {
      day: 2,
      theme: "Brightening & Glow Serums (উজ্জ্বলতা ও গ্লো বাড়ানোর সিরাম)",
      filter: p => (/serum|ampoule/i.test(p.name) || p.catName.toLowerCase().includes('serum')) && /vitamin c|niacinamide|bright|glow|whitening|arbutin/i.test(p.name) && !/lotion|patch|mask|wash|cream|tablet/i.test(p.name),
      fallback: p => (/serum|ampoule/i.test(p.name) || p.catName.toLowerCase().includes('serum')) && /vitamin c|niacinamide|bright|glow/i.test(p.name)
    },
    {
      day: 3,
      theme: "Hydration & Barrier Repair Serums (হাইড্রেটিং ও রিপেয়ার সিরাম)",
      filter: p => (/serum|ampoule/i.test(p.name) || p.catName.toLowerCase().includes('serum')) && /hyaluronic|snail|soothing|repair|cica|collagen|salicylic|retinol|b5/i.test(p.name) && !/hand|kit|set|lotion|tablet/i.test(p.name),
      fallback: p => /serum|ampoule/i.test(p.name) && !/hand|kit|set|tablet/i.test(p.name)
    },
    {
      day: 4,
      theme: "Daily Refreshing Face Washes (ডেইলি ফেস ওয়াশ ও স্কিন পিউরিফায়ার)",
      filter: p => (/face wash|facial wash|cleansing foam|foam cleanser/i.test(p.name) || p.catName.toLowerCase().includes('face wash')) && !/set|kit|serum|cream|gel moussant/i.test(p.name)
    },
    {
      day: 5,
      theme: "Gentle Cleansers, Scrubs & Peeling Gels (ক্লিনজার, স্ক্রাব ও এক্সফোলিয়েটর)",
      filter: p => (/facial scrub|peeling gel|micellar water|cleansing oil|cleansing water|cleansing balm/i.test(p.name) || p.catName.toLowerCase().includes('cleanser')) && !/face wash|shampoo|body scrub/i.test(p.name),
      fallback: p => /scrub|cleanser/i.test(p.name) && !/body|hair|shampoo/i.test(p.name)
    },
    {
      day: 6,
      theme: "Face Toners, Mists & Essences (হাইড্রেটিং টোনার ও স্কিন এসেন্স)",
      filter: p => (/\btoner\b|\bmist\b|\bessence\b/i.test(p.name) || p.catName.toLowerCase().includes('toner')) && !/set|kit|mask|cream/i.test(p.name),
      fallback: p => /\btoner\b|\bmist\b/i.test(p.name)
    },
    {
      day: 7,
      theme: "Day Creams & Daily Moisturizers (ডে ক্রিম ও ময়েশ্চারাইজার)",
      filter: p => (/day cream|moisturizer|aqua cream|gel cream|hydrating cream|light moisturiser/i.test(p.name) || p.catName.toLowerCase().includes('moisturizers')) && !/night|eye|bb|cc|hand|foot|body|set|tablet/i.test(p.name),
      fallback: p => /cream|moisturiz/i.test(p.name) && !/night|body|eye|hand|foot|bb|tablet/i.test(p.name)
    },
    {
      day: 8,
      theme: "Night Creams, Sleeping Packs & Eye Creams (নাইট কেয়ার ও স্লিপিং প্যাক)",
      filter: p => /night cream|sleeping pack|sleeping mask|eye cream|night gel|collagen cream|retinol cream/i.test(p.name) && !/sheet mask|patch/i.test(p.name),
      fallback: p => /night|sleeping/i.test(p.name)
    },
    {
      day: 9,
      theme: "Acne Fighting & Spot Treatment (ব্রণ ও দাগ রিমুভাল কেয়ার)",
      filter: p => /acne|tea tree|salicylic|blemish|spot|pimple|centella|anti-acne/i.test(p.name) && !/serum/i.test(p.name),
      fallback: p => /acne|tea tree|salicylic|blemish|spot|pimple/i.test(p.name)
    },
    {
      day: 10,
      theme: "Sheet Masks & Hydration Packs (ইনস্ট্যান্ট গ্লো শিট মাস্ক)",
      filter: p => /sheet mask|facial mask|essence mask/i.test(p.name) && !/mud|clay|peel off/i.test(p.name),
      fallback: p => /sheet mask/i.test(p.name) || (p.catName.toLowerCase().includes('mask') && !/clay|mud/i.test(p.name))
    },
    {
      day: 11,
      theme: "Clay, Mud & Peel-Off Masks (ক্লে ও পিল-অফ ডিপ ক্লিন মাস্ক)",
      filter: p => /clay mask|mud mask|peel off|blackhead|charcoal mask|dead sea/i.test(p.name) || p.catName.toLowerCase().includes('face mask')
    },
    {
      day: 12,
      theme: "Classic Matte & Velvet Lipsticks (ম্যাট ও ভেলভেট লিপস্টিক)",
      filter: p => (/matte lipstick|velvet lipstick|bullet lipstick|matte lip crayon|matte finish lipstick/i.test(p.name) || (p.catName.toLowerCase().includes('lipstick') && /matte|velvet/i.test(p.name))) && !/liquid/i.test(p.name),
      fallback: p => p.catName.toLowerCase().includes('lipstick') && !/liquid|oil|gloss/i.test(p.name)
    },
    {
      day: 13,
      theme: "Liquid Lipsticks & Lip Liners (লিকুইড লিপস্টিক ও লিপ লাইনার)",
      filter: p => (/liquid lipstick|matte liquid lip|lip liner/i.test(p.name) || p.catName.toLowerCase().includes('lip liner')) && !/oil|gloss|balm/i.test(p.name),
      fallback: p => p.catName.toLowerCase().includes('lipsticks') && !/oil|gloss|balm/i.test(p.name)
    },
    {
      day: 14,
      theme: "Lip Gloss, Lip Oils & Tinted Balms (লিপ গ্লস, লিপ অয়েল ও নারিশিং বাম)",
      filter: p => (/lip oil|lip gloss|lip balm|lip mask|lip butter/i.test(p.name) || p.catName.toLowerCase().includes('lip oil') || p.catName.toLowerCase().includes('lip care'))
    },
    {
      day: 15,
      theme: "Flawless Foundations & BB/CC Creams (বেস ফাউন্ডেশন ও বিবি ক্রিম)",
      filter: p => (/\bfoundation\b|bb cream|cc cream/i.test(p.name) || p.catName.toLowerCase().includes('foundation') || p.catName.toLowerCase().includes('bb cream')) && !/powder|brush/i.test(p.name)
    },
    {
      day: 16,
      theme: "Primers, Concealers & Correctors (প্রাইমার, কনসিলার ও কালার কারেক্টর)",
      filter: p => (/\bprimer\b|\bconcealer\b|color corrector|corrector/i.test(p.name) || p.catName.toLowerCase().includes('primer') || p.catName.toLowerCase().includes('concealer')) && !/brush|powder/i.test(p.name)
    },
    {
      day: 17,
      theme: "Compact, Loose Powder & Makeup Fixers (পাউডার ও সেটিং স্প্রে)",
      filter: p => (/compact powder|pressed powder|loose powder|banana powder|setting spray|makeup fixer/i.test(p.name) || p.catName.toLowerCase().includes('pressed powder') || p.catName.toLowerCase().includes('makeup setting spray'))
    },
    {
      day: 18,
      theme: "Blushes, Highlighters & Contours (ব্লাশ, হাইলাইটার ও কনট্যুর)",
      filter: p => (/\bblush\b|\bhighlighter\b|\bcontour\b|\bbronzer\b|shimmer brick/i.test(p.name) || p.catName.toLowerCase().includes('blush') || p.catName.toLowerCase().includes('highlighter')) && !/brush/i.test(p.name)
    },
    {
      day: 19,
      theme: "Eyeshadow Palettes & Eye Glitters (আইশ্যাডো প্যালেট ও আই গ্লিটার)",
      filter: p => (/eyeshadow|eye shadow|shadow palette|glitter palette|pigment palette/i.test(p.name) || p.catName.toLowerCase().includes('eye shadow')) && !/brush/i.test(p.name)
    },
    {
      day: 20,
      theme: "Kajal, Eyeliners & Mascaras (কাজল, আইলাইনার ও মাশকারা)",
      filter: p => (/\bkajal\b|eyeliner|eye liner|\bmascara\b|eyebrow|brow pencil/i.test(p.name) || p.catName.toLowerCase().includes('kajal'))
    },
    {
      day: 21,
      theme: "Hair Fall Defense & Nourishing Shampoos (শ্যাম্পু ও স্ক্যাল্প কেয়ার)",
      filter: p => (/\bshampoo\b/i.test(p.name) || p.catName.toLowerCase().includes('shampoo')) && !/conditioner|mask|serum|oil/i.test(p.name)
    },
    {
      day: 22,
      theme: "Hair Conditioners, Hair Masks & Spa Treatments (কন্ডিশনার ও হেয়ার স্পা মাস্ক)",
      filter: p => (/conditioner|hair mask|hair spa|hair treatment/i.test(p.name) || p.catName.toLowerCase().includes('hair mask')) && !/shampoo/i.test(p.name)
    },
    {
      day: 23,
      theme: "Hair Serums, Oils & Growth Tonics (হেয়ার সিরাম ও পুষ্টিকর তেল)",
      filter: p => (/hair serum|hair oil|castor oil|onion oil|hair tonic|hair growth|moroccan oil/i.test(p.name))
    },
    {
      day: 24,
      theme: "Body Washes, Shower Gels & Soaps (বডি ওয়াশ ও শাওয়ার জেল)",
      filter: p => (/shower gel|body wash|bath gel|bath soap/i.test(p.name) || p.catName.toLowerCase().includes('shower gel') || p.catName.toLowerCase().includes('body wash'))
    },
    {
      day: 25,
      theme: "Body Lotions, Hand & Foot Care (বডি লোশন, হ্যান্ড ও ফুট ক্রিম)",
      filter: p => (/body lotion|body butter|body milk|body cream|skin lotion|hand cream|foot cream|petroleum jelly/i.test(p.name)),
      fallback: p => /lotion|butter|hand|foot/i.test(p.name)
    },
    {
      day: 26,
      theme: "Body Scrubs, Whitening & Tan Removal (বডি স্ক্রাব ও স্কিন ব্রাইটনিং)",
      filter: p => (/body scrub|tan removal|body polish|underarm|brightening cream|whitening cream/i.test(p.name)),
      fallback: p => /scrub|whitening/i.test(p.name)
    },
    {
      day: 27,
      theme: "SHEGLAM Viral Trending Hits (শিগ্ল্যাম ভাইরাল মেকআপ কালেকশন)",
      filter: p => (/sheglam/i.test(p.name) || /sheglam/i.test(p.brandName))
    },
    {
      day: 28,
      theme: "Swiss Beauty & MARS Best Picks (সুইস বিউটি ও মার্স ফেভারিটস)",
      filter: p => (/swiss beauty|mars/i.test(p.name) || /swiss beauty|mars/i.test(p.brandName))
    },
    {
      day: 29,
      theme: "Beauty Glazed & Technic Must-Haves (বিউটি গ্লেজড ও টেকনিক কালেকশন)",
      filter: p => (/beauty glazed|technic/i.test(p.name) || /beauty glazed|technic/i.test(p.brandName))
    },
    {
      day: 30,
      theme: "All-Time Top Rated & Best-Sellers (অল-টাইম টপ রেটেড বেস্টসেলার)",
      filter: p => p.stock > 10,
      fallback: p => true
    }
  ];

  const results = [];
  let totalPicked = 0;

  for (const t of themes) {
    const items = pick(t.filter, 15, t.fallback);
    totalPicked += items.length;
    results.push({
      day: t.day,
      theme: t.theme,
      count: items.length,
      products: items
    });
    console.log(`Day ${t.day} (${t.theme}): ${items.length} items picked`);
  }

  console.log(`\n🎉 Total picked across 30 days: ${totalPicked} (Expected: 450)`);

  fs.writeFileSync('client/scripts/30_day_posting_plan.json', JSON.stringify(results, null, 2), 'utf8');

  // Also generate markdown report
  let md = `# LIORA Beauty & Wear - 30 Days Social Media Posting Plan\n\n`;
  md += `> **Total Days:** 30 | **Posts per day:** 15 products | **Total Featured Products:** 450 unique in-stock products\n`;
  md += `> **Website Search Usage:** প্রতিটা প্রোডাক্টের হুবহু নাম কপি করে ওয়েবসাইটে সার্চ করলেই ছবি ও ডেসক্রিপশন পেয়ে যাবেন।\n\n`;

  results.forEach(day => {
    md += `## 📅 Day ${day.day}: ${day.theme}\n\n`;
    md += `| # | প্রোডাক্টের নাম (Website Search Keyword) | ব্র্যান্ড | অফার প্রাইস | স্টক অবস্থা |\n`;
    md += `|---|---|---|---|---|\n`;
    day.products.forEach((p, idx) => {
      md += `| ${idx + 1} | **${p.name}** | ${p.brandName || 'Authentic'} | ৳${p.price} | In Stock (${p.stock}) |\n`;
    });
    md += `\n---\n\n`;
  });

  fs.writeFileSync('client/scripts/30_DAY_POSTING_PLAN.md', md, 'utf8');
  fs.writeFileSync('30_DAY_POSTING_PLAN.md', md, 'utf8');
  fs.writeFileSync('C:\\Users\\atiku\\.gemini\\antigravity-ide\\brain\\2153b3e4-b0be-4003-b6c6-999b37b15f60\\30_day_posting_plan.md', md, 'utf8');
  console.log("Markdown updated successfully everywhere!");

  process.exit(0);
}

run().catch(console.error);
