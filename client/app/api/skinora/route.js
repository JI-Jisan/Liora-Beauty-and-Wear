import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Product } from "@/lib/models";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// ── 1. GRANULAR BEAUTY & SKINCARE INTENT DOMAINS ──
// High-priority specific intents come FIRST before general categories
const INTENT_DOMAINS = [
  // 1. Hair Mask & Spa / Intensive Deep Conditioning
  {
    id: "hair_mask",
    patterns: [
      /হেয়ার মাস্ক/i, /হেয়ার মাস্ক/i, /hair mask/i, /হেয়ার স্পা/i, /হেয়ার স্পা/i, /hair spa/i,
      /ডিপ কন্ডিশনিং/i, /deep condition/i, /মাস্ক কি প্রয়োজন/i, /মাস্ক কি প্রয়োজন/i, /mask ki/i
    ],
    searchKeywords: ["Hair Mask", "Ginger Hair Mask", "Hair Treatment", "Conditioner Intense Repair", "Hair Spa", "Keratin"],
    fallbackTitle: "হেয়ার মাস্কের গুরুত্ব ও সঠিক ব্যবহারের নিয়ম",
    fallbackRoutine: `কালার, হিট স্টাইলিং বা তীব্র রোদে চুলের কিউটিকল ক্ষতিগ্রস্ত হলে সাধারণ কন্ডিশনার পর্যাপ্ত পুষ্টি জোগাতে পারে না। হেয়ার মাস্ক চুলের গভীর স্তরে (Cortex) পৌঁছে হারানো প্রোটিন, আর্দ্রতা ও কেরাটিন ফিরিয়ে আনে।

**সঠিক ব্যবহারবিধি:**
1. শ্যাম্পু করার পর চুলের অতিরিক্ত পানি আলতো করে চিপে নিন।
2. স্ক্যাল্প বাদ দিয়ে চুলের মাঝখান থেকে ডগা পর্যন্ত পর্যাপ্ত হেয়ার মাস্ক লাগান।
3. ৫-১০ মিনিট অপেক্ষা করুন (ডিপ কন্ডিশনিংয়ের জন্য গরম তোয়ালে জড়িয়ে রাখতে পারেন)।
4. এরপর সাধারণ পানি দিয়ে ভালোভাবে ধুয়ে ফেলুন। সপ্তাহে ১-২ বার ব্যবহারই যথেষ্ট।`
  },

  // 2. Color Damaged / Chemically Treated / Rough Dry Hair
  {
    id: "hair_color_damage",
    patterns: [
      /কালার/i, /color/i, /colour/i, /রুক্ষ/i, /rukho/i, /rough hair/i, /ব্লিচ/i, /bleach/i,
      /রিবন্ডিং/i, /rebonding/i, /ড্যামেজ/i, /damage/i, /চুলের ডগা ফাটা/i, /split ends/i, /প্রাণহীন চুল/i
    ],
    searchKeywords: ["Hair Mask", "Conditioner Intense Repair", "Hair Vitamin Serum", "Keratin", "Argan Oil Hair", "Serum Capsules"],
    fallbackTitle: "কালার করা রুক্ষ চুলের ডিপ নারিশিং ও রিপেয়ার রুটিন",
    fallbackRoutine: `চুল কালার বা ব্লিচ করার সময় রাসায়নিক উপাদান চুলের প্রাকৃতিক সুরক্ষা স্তর বা 'কিউটিকল' ভেঙে ফেলে। এর ফলে ভেতরের আর্দ্রতা ও প্রোটিন শুকিয়ে গিয়ে চুল খসখসে, রুক্ষ ও ভঙ্গুর হয়ে পড়ে।

**কালার ড্যামেজ রিকভারি ৩-ধাপ রুটিন:**
1. **সালফেট-ফ্রি বা জেন্টল ময়েশ্চারাইজিং শ্যাম্পু:** কালার করা চুলে প্রতিদিন কড়া শ্যাম্পু করবেন না; সপ্তাহে ২-৩ দিন মাইল্ড শ্যাম্পু ব্যবহার করুন।
2. **ডিপ কন্ডিশনিং হেয়ার মাস্ক (সপ্তাহে ২ দিন):** সাধারণ কন্ডিশনারের বদলে ডিপ রিপেয়ার হেয়ার মাস্ক লাগান, যা কিউটিকল সিল করে চুল রেশমি নরম করবে।
3. **লিভ-ইন হেয়ার সিরাম বা ভিটামিন ক্যাপসুল:** ভেজা চুল শুকানোর পর কয়েক ফোঁটা হেয়ার সিরাম লাগান, যা চুলকে বাইরের রোদ ও ঘর্ষণ থেকে সুরক্ষিত রাখবে।`
  },

  // 3. Dandruff & Itchy Scalp
  {
    id: "dandruff",
    patterns: [
      /খুশকি/i, /khuski/i, /khushki/i, /dandruff/i, /স্ক্যাল্পে চুলকানি/i, /মাথায় চুলকানি/i,
      /ইচিং/i, /flaky scalp/i, /খুস্কি/i, /scalp itch/i
    ],
    searchKeywords: ["Anti Dandruff", "Clear Shampoo", "Selsun", "Tea Tree", "Scalp"],
    fallbackTitle: "মাথার জেদি খুশকি ও স্ক্যাল্পের চুলকানি নিরাময়ের সমাধান",
    fallbackRoutine: `স্ক্যাল্পে অতিরিক্ত তেল ও ম্যালাসেসিয়া ফাঙ্গাসের কারণে খুশকি ও চুলকানি দেখা দেয়।

**কার্যকর রুটিন:**
1. জিঙ্ক পাইরিথিওন বা টি-ট্রি সমৃদ্ধ অ্যান্টি-ড্যানড্রাফ শ্যাম্পু সপ্তাহে ২-৩ দিন ব্যবহার করুন।
2. শ্যাম্পুর ফেনা মাথার স্ক্যাল্পে ৩-৫ মিনিট রেখে তারপর ধুয়ে নিন।
3. খুশকি চলাকালীন স্ক্যাল্পে ভারী তেল দেওয়া এড়িয়ে চলুন।`
  },

  // 4. Hair Fall & Thinning
  {
    id: "hairfall",
    patterns: [
      /চুল পড়া/i, /chul pora/i, /hair fall/i, /পড়ে যাচ্ছে/i, /চুল ঝরে/i, /টাক/i, /নতুন চুল/i,
      /চুল পাতলা/i, /thinning/i, /hair loss/i
    ],
    searchKeywords: ["Hair Fall", "Biotin", "Rosemary", "Anti Hair Loss", "Hair Growth", "Minoxidil"],
    fallbackTitle: "চুল পড়া রোধ ও চুলের গোড়া শক্ত করার সায়েন্টিফিক রুটিন",
    fallbackRoutine: `পুষ্টির অভাব, মানসিক চাপ, শক্ত পানি বা দুর্বল ফলিকলের কারণে হেয়ার ফল বাড়ে।

**প্রতিরোধের ৪ ধাপ:**
1. মাইল্ড অ্যান্টি-হেয়ারফল বা বায়োটিন শ্যাম্পু দিয়ে স্ক্যাল্প পরিষ্কার রাখুন।
2. শ্যাম্পু শেষে চুলে কন্ডিশনার লাগান (স্ক্যাল্প এড়িয়ে)।
3. রোজমেরি বা নারিশিং হেয়ার অয়েল দিয়ে হালকা ম্যাসাজ করুন।
4. ভেজা চুলে কখনোই শক্ত চিরুনি চালাবেন না।`
  },

  // 5. Active Acne & Pimples
  {
    id: "acne",
    patterns: [
      /ব্রণ/i, /bron/i, /acne/i, /pimple/i, /বিচি/i, /bichi/i, /ফুসকুড়ি/i, /পিম্পল/i, /পুঁজ/i, /breakout/i
    ],
    searchKeywords: ["Salicylic Acid", "Cosrx Cleanser", "Centella", "Tea Tree", "Acne Removal", "Cica"],
    fallbackTitle: "অ্যাকনে ও ব্রণ দ্রুত দূর করার ডার্মাটোলজিক্যাল রুটিন",
    fallbackRoutine: `অতিরিক্ত সিবাম ও ব্যাকটেরিয়া লোমকূপে আটকে গিয়ে প্রদাহ ও ব্রণের সৃষ্টি করে।

**একনে কেয়ার রুটিন:**
1. স্যালিসিলিক এসিড (BHA) ক্লিনজার দিয়ে দিনে দুবার মুখ পরিষ্কার করুন।
2. সেন্টেলা বা টি-ট্রি সিরাম দিয়ে ব্রণের লালচে ভাব শান্ত করুন।
3. ব্রণে হাত দেওয়া বা খোঁটা একদম বন্ধ রাখুন।
4. দিনের বেলা হালকা নন-কমেডোজেনিক সানস্ক্রিন ব্যবহার করুন।`
  },

  // 6. Acne Marks, Dark Spots & Pigmentation
  {
    id: "spots",
    patterns: [
      /মেস্তা/i, /mesta/i, /কালো দাগ/i, /kalo dag/i, /dark spot/i, /pigmentation/i, /দাগ/i, /dag/i,
      /ছোপ ছোপ/i, /পোস্ট একনে/i, /marks/i
    ],
    searchKeywords: ["Niacinamide", "Vitamin C", "Alpha Arbutin", "Dark Spot", "Tranexamic", "Rice Serum"],
    fallbackTitle: "জেদি কালো দাগ ও পিগমেন্টেশন হালকা করার রুটিন",
    fallbackRoutine: `ব্রণের পর বা রোদের মেলানিন জমার কারণে ত্বকে জেদি দাগ তৈরি হয়।

**দাগমুক্তির রুটিন:**
1. জেন্টল ফোম ওয়াশ দিয়ে মুখ ধুয়ে নিন।
2. নিয়াসিনামাইড (১০%) বা ভিটামিন সি সিরাম নিয়মিত ব্যবহার করুন।
3. আলফা আরবুটিন মেলানিন তৈরি কমিয়ে দাগ দ্রুত হালকা করে।
4. প্রতিদিন নিয়ম করে SPF 50+ সানস্ক্রিন লাগান, সানস্ক্রিন ছাড়া দাগ দূর হবে না।`
  },

  // 7. Sunburn, Tan & Sun Damage
  {
    id: "tan",
    patterns: [
      /সানট্যান/i, /suntan/i, /sun tan/i, /রোদ/i, /rood/i, /rode/i, /রোদে পোড়া/i, /sunburn/i,
      /কালো হয়ে গে/i, /মুখ কালো/i
    ],
    searchKeywords: ["Sunscreen", "Centella Soothing", "Niacinamide", "Rice", "Sun Cream", "Aloe"],
    fallbackTitle: "রোদে পোড়া সানট্যান ও কালচে ভাব দূর করার রিফ্রেশিং রুটিন",
    fallbackRoutine: `রোদের আল্ট্রাভায়োলেট রশ্মি ত্বকের মেলানোসাইটকে উদ্দীপ্ত করে সানট্যান ফেলে।

**সানট্যান রিমুভাল রুটিন:**
1. রোদ থেকে ফিরে মুখ ঠাণ্ডা পানি ও সুদিং ফেসওয়াশ দিয়ে ধুয়ে অ্যালোভেরা বা সেন্টেলা জেল লাগান।
2. রাতে নিয়াসিনামাইড বা রাইস সিরাম ব্যবহারে ত্বকের উজ্জ্বলতা ফিরে আসে।
3. বাইরে বের হওয়ার ১৫ মিনিট আগে পর্যাপ্ত সানস্ক্রিন লাগান এবং ৩ ঘণ্টা পর পর রি-এপ্লাই করুন।`
  },

  // 8. Dedicated Sunscreen & UV Shield
  {
    id: "sunscreen",
    patterns: [/সানস্ক্রিন/i, /sunscreen/i, /সানব্লক/i, /sunblock/i, /spf/i, /sun cream/i],
    searchKeywords: ["Sunscreen", "Sun Cream", "Sun Block", "Aqua Sun", "3W Clinic Sun"],
    fallbackTitle: "স্কিন টাইপ অনুযায়ী সঠিক সানস্ক্রিন গাইড",
    fallbackRoutine: `ত্বকের বার্ধক্য, মেস্তা ও সানট্যান প্রতিরোধে সানস্ক্রিন সবচেয়ে গুরুত্বপূর্ণ ধাপ।

**ব্যবহারের নিয়ম:**
1. দুই আঙুল (Two-finger rule) পরিমাণ সানস্ক্রিন পুরো মুখে ও গলায় সমানভাবে লাগান।
2. অয়েলি ত্বকে ওয়াটার-জেল বা ম্যাট সানস্ক্রিন এবং শুষ্ক ত্বকে ময়েশ্চারাইজিং সানস্ক্রিন বেছে নিন।`
  },

  // 9. Dry, Flaky, Dehydrated Skin
  {
    id: "dryskin",
    patterns: [/শুষ্ক/i, /shushko/i, /dry/i, /খসখসে/i, /টান ধরে/i, /চামড়া ওঠে/i, /ডিহাইড্রেটেড/i],
    searchKeywords: ["Hyaluronic", "Moisturizer", "Snail Mucin", "Ceramide", "Lotion"],
    fallbackTitle: "শুষ্ক ও প্রাণহীন ত্বকের ডিপ হাইড্রেটিং রুটিন",
    fallbackRoutine: `আর্দ্রতার ঘাটতিতে ত্বকের ন্যাচারাল ব্যারিয়ার দুর্বল হয়ে ত্বক খসখসে হয়ে পড়ে।

**হাইড্রেটিং রুটিন:**
1. মাইল্ড ক্রিমি ক্লিনজার দিয়ে মুখ ধুয়ে নিন।
2. ভেজা ত্বকে হায়ালুরনিক এসিড বা স্নেল মুসিন লাগান।
3. সেরামাইড যুক্ত ডিপ ময়েশ্চারাইজার দিয়ে ত্বকের আর্দ্রতা লক করুন।`
  },

  // 10. Oily Skin & Open Pores
  {
    id: "oilyskin",
    patterns: [/তৈলাক্ত/i, /toilakto/i, /oil/i, /oily/i, /তেল চিটচিটে/i, /পোরস/i, /pores/i, /ব্ল্যাকহেড/i, /ছিদ্র/i],
    searchKeywords: ["Oil Free", "Salicylic Acid", "Pore Minimizer", "Cleanser", "Gel Cream"],
    fallbackTitle: "তৈলাক্ত ত্বক ও ওপেন পোরস নিয়ন্ত্রণের রুটিন",
    fallbackRoutine: `অতিরিক্ত সিবাম নিয়ন্ত্রণ ও পোরস টাইট রাখতে সঠিক নিয়মে স্কিনকেয়ার জরুরি।

**অয়েল কন্ট্রোল রুটিন:**
1. স্যালিসিলিক এসিড সমৃদ্ধ জেল ক্লিনজার ব্যবহার করুন।
2. পোরস পরিষ্কার রাখতে নিয়াসিনামাইড সিরাম অত্যন্ত কার্যকর।
3. তেলযুক্ত ক্রিম এড়িয়ে হালকা ওয়াটার-জেল ময়েশ্চারাইজার লাগান।`
  },

  // 11. Lip Care
  {
    id: "lips",
    patterns: [/ঠোঁট/i, /thot/i, /lip/i, /lips/i, /চাপস্টিক/i, /ফাটা ঠোঁট/i, /লিপবাম/i, /lip mask/i],
    searchKeywords: ["Lip Balm", "Lip Mask", "Laneige", "Vaseline Lip", "Lip Care"],
    fallbackTitle: "ঠোঁটের শুষ্কতা ও কালচে ভাব দূর করার বিশেষ রুটিন",
    fallbackRoutine: `ঠোঁটের ত্বক খুব পাতলা হওয়ায় দ্রুত আর্দ্রতা হারায়।

**লিপ কেয়ার রুটিন:**
1. সপ্তাহে ১ দিন নরম ভেজা কাপড় দিয়ে ঠোঁটের মরা চামড়া আলতো করে তুলে ফেলুন।
2. শিয়া বাটার বা পেট্রোলিয়াম সমৃদ্ধ লিপবাম দিনে কয়েকবার ব্যবহার করুন।
3. রাতে ঘুমানোর আগে লিপ স্লিপিং মাস্ক লাগিয়ে রাখুন।`
  },

  // 12. Eye Care & Dark Circles
  {
    id: "eyes",
    patterns: [/চোখ/i, /chokh/i, /ডার্ক সার্কেল/i, /কালি/i, /dark circle/i, /eye cream/i, /চোখ ফোলা/i],
    searchKeywords: ["Eye Cream", "Eye Serum", "Retinol Eye", "Caffeine", "Eye"],
    fallbackTitle: "চোখের নিচের কালো দাগ ও ক্লান্তি দূর করার গাইড",
    fallbackRoutine: `রাত জাগা, মোবাইল স্ক্রিনের আলো ও ক্লান্তিতে চোখের নিচের রক্তনালী দৃশ্যমান হয়।

**চোখের যত্নে:**
1. সকালে ক্যাফেইন বা পেপটাইড আই সিরাম লাগান।
2. রাতে মৃদু রেটিনল বা ময়েশ্চারাইজিং আই ক্রিম অনামিকা আঙুল দিয়ে আলতো ট্যাপ করে লাগান।
3. পর্যাপ্ত ঘুম ও পানি পান নিশ্চিত করুন।`
  },

  // 13. Glass Skin & Natural Glow
  {
    id: "glow",
    patterns: [/গ্লো/i, /glow/i, /উজ্জ্বল/i, /ujjol/i, /গ্লাস স্কিন/i, /glass skin/i, /ফর্সা/i, /চকচকে/i],
    searchKeywords: ["Rice", "Galactomyces", "Vitamin C", "Niacinamide", "Glow Serum", "Sheet Mask"],
    fallbackTitle: "কোরিয়ান গ্লাস স্কিন ও ন্যাচারাল গ্লো পাওয়ার সিক্রেট রুটিন",
    fallbackRoutine: `কোরিয়ান গ্লাস স্কিন মানে ভেতর থেকে হাইড্রেটেড ও সুস্থ ত্বক।

**গ্লাস স্কিন স্টেপস:**
1. জেন্টল ফোম ওয়াশ দিয়ে গভীর ময়লা পরিষ্কার করুন।
2. রাইস টনার বা ফারমেন্টেড এসেন্স দিয়ে ত্বকে ইনস্ট্যান্ট গ্লো এনে দিন।
3. ভিটামিন সি বা নিয়াসিনামাইড সিরাম দিয়ে দাগহীন উজ্জ্বলতা ধরে রাখুন।
4. হালকা জেল ক্রিম দিয়ে ময়েশ্চার লক করুন।`
  }
];

// Helper: Match User Message & Chat History to the best Intent Domain
function matchDomainIntent(userMessage, history = []) {
  const fullText = [
    ...history.slice(-3).map((h) => h.text || ""),
    userMessage || ""
  ].join(" ").toLowerCase();

  for (const domain of INTENT_DOMAINS) {
    for (const pattern of domain.patterns) {
      if (pattern.test(fullText)) {
        return domain;
      }
    }
  }

  // Fallback General Domain
  return {
    id: "general",
    searchKeywords: ["Cleanser", "Sunscreen", "Centella", "Serum", "Moisturizer"],
    fallbackTitle: "সুস্থ, দাগহীন ও উজ্জ্বল ত্বকের মৌলিক গাইড",
    fallbackRoutine: `আপনার ত্বকের সুস্থতা ও উজ্জ্বলতার জন্য ত্বক পরিষ্কার রাখা, পর্যাপ্ত হাইড্রেশন এবং প্রতিদিন সানস্ক্রিন ব্যবহার করা সবচেয়ে গুরুত্বপূর্ণ।`
  };
}

// ── 2. SUB-50MS TARGETED PRODUCT SEARCH (Zero Cold-Start Freeze!) ──
async function fetchTargetedProducts(intent, userMessage, history = []) {
  const foundProducts = [];
  const seenIds = new Set();

  try {
    await connectToDatabase();

    // 1. Build smart search phrases combining user's specific words + intent
    const candidateKeywords = new Set();

    // Direct user keywords extraction
    const combinedMsg = [
      ...history.slice(-2).map((h) => h.text || ""),
      userMessage || ""
    ].join(" ").toLowerCase();

    if (/মাস্ক|mask/i.test(combinedMsg)) {
      if (/hair|চুল|কালার|রিবন্ডিং/i.test(combinedMsg)) {
        candidateKeywords.add("Hair Mask");
        candidateKeywords.add("Bioaqua Ginger Hair Mask");
      } else {
        candidateKeywords.add("Mask");
      }
    }
    if (/কালার|color|রুক্ষ|ড্যামেজ|damage/i.test(combinedMsg)) {
      candidateKeywords.add("Hair Mask");
      candidateKeywords.add("Intense Repair");
      candidateKeywords.add("Hair Vitamin");
      candidateKeywords.add("Conditioner");
    }
    if (/সানস্ক্রিন|sunscreen|spf/i.test(combinedMsg)) {
      candidateKeywords.add("Sunscreen");
      candidateKeywords.add("Sun Cream");
    }
    if (/সিরাম|serum/i.test(combinedMsg)) {
      candidateKeywords.add("Serum");
    }
    if (/ক্লিনজার|ফেসওয়াশ|wash|cleanser/i.test(combinedMsg)) {
      candidateKeywords.add("Cleanser");
      candidateKeywords.add("Face Wash");
    }

    // Add intent search keywords
    for (const kw of intent.searchKeywords) {
      candidateKeywords.add(kw);
    }

    const keywordList = Array.from(candidateKeywords).slice(0, 6);

    // Direct targeted MongoDB query with index and lean projection
    const orConditions = keywordList.map((kw) => ({
      name: { $regex: kw, $options: "i" }
    }));

    // Exclude completely unrelated products (e.g. shower gel or soap when user is asking about hair)
    const isHairQuery = intent.id.startsWith("hair") || /hair|চুল/i.test(combinedMsg);
    const excludePattern = isHairQuery ? /shower gel|bath soap|body wash|foot/i : null;

    const query = {
      stockStatus: { $ne: "Out of Stock" },
      $or: orConditions
    };

    if (excludePattern) {
      query.name = { $not: excludePattern };
    }

    const rawDocs = await Product.find(query)
      .select("_id name image images offerPrice originalPrice brand stockStatus rating campusDiscountPct")
      .populate("brand", "name slug")
      .limit(8)
      .lean();

    for (const p of rawDocs) {
      const id = p._id.toString();
      if (!seenIds.has(id)) {
        seenIds.add(id);
        foundProducts.push(p);
        if (foundProducts.length >= 6) break;
      }
    }
  } catch (err) {
    console.warn("Skinora targeted search error:", err.message);
  }

  // Format clean product objects for client
  return foundProducts.slice(0, 6).map((p) => ({
    _id: p._id?.toString() || p.id,
    name: p.name,
    image: p.image || p.images?.[0] || "",
    offerPrice: p.offerPrice || p.price || 0,
    originalPrice: p.originalPrice || 0,
    brand: typeof p.brand === "object" ? p.brand : { name: p.brand || "" },
    stockStatus: p.stockStatus || "In Stock",
    campusDiscountPct: p.campusDiscountPct || 0,
    rating: p.rating || 5,
  }));
}

// ── 3. MAIN API HANDLER (ChatGPT-Grade Conversational Intelligence) ──
export const POST = async (req) => {
  try {
    const body = await req.json();
    const userMessage = (body.message || "").trim();
    const history = Array.isArray(body.history) ? body.history : [];

    if (!userMessage) {
      return NextResponse.json({ error: "মেসেজ খালি হতে পারে না" }, { status: 400 });
    }

    // Identify user intent & fetch targeted products from LIORA catalog
    const intent = matchDomainIntent(userMessage, history);
    const matchedProducts = await fetchTargetedProducts(intent, userMessage, history);

    // Format available real products to ground Gemini
    const productCatalogContext = matchedProducts
      .map((p, idx) => `${idx + 1}. ${p.name} - ৳${p.offerPrice}${p.brand?.name ? ` (${p.brand.name})` : ""}`)
      .join("\n");

    const geminiKey = process.env.GEMINI_API_KEY;
    const conversationContext = history
      .slice(-4)
      .map((h) => `${h.sender === "user" ? "Customer" : "Skinora"}: ${h.text}`)
      .join("\n");

    const systemPrompt = `You are "Skinora" (স্কিনোরা), LIORA Beauty & Wear's premier AI Skincare & Aesthetic Consultant in Bangladesh.
Your goal is to provide warm, empathetic, scientifically accurate, and conversational advice in natural, elegant Bengali — exactly like ChatGPT or an expert doctor chatting on WhatsApp.

Customer's Query: "${userMessage}"
Context Domain: ${intent.id}

Authentic In-Stock Products at LIORA matching this concern:
${productCatalogContext || "Top authentic beauty products in store."}

RULES FOR A NATURAL CHATGPT-GRADE EXPERIENCE:
1. DIRECT ANSWER FIRST: Directly answer the customer's question right away! If they ask "হেয়ার মাস্ক কি প্রয়োজন?", do NOT give a generic shampoo routine. Explain directly why a hair mask is essential for their condition (e.g. penetrating deeper than a conditioner to repair open cuticles and broken bonds caused by chemical dyes/bleach), how often to apply (1-2 times weekly), and how to apply it (mid-length to tips).
2. CONTEXTUAL MEMORY: Pay attention to previous messages in the chat history! If the customer previously mentioned color damage or dry hair, seamlessly maintain that context in your follow-ups without asking them to repeat.
3. CONVERSATIONAL & HUMAN TONE: Speak warmly, politely, and intelligently in standard Bengali. DO NOT sound like a rigid template or bot. 
4. NO ROBOTIC SALES SPAM: NEVER copy-paste boilerplate headers like "### কেন LIORA-ই সেরা?" or "১০০% বারকোড ভেরিফাইড" or "ইনবক্সে মেসেজ দিন" repeatedly on every single response! Focus genuinely on solving the customer's beauty problem.
5. RECOMMEND RELEVANT PRODUCTS: Naturally weave in 1 to 3 of the exact in-stock products from the list above by name and price in Taka (৳). Explain briefly why that specific product helps.
6. FORMATTING: Use clean, easy-to-read Markdown with short paragraphs and bullet points where useful. Write directly as Skinora.`;

    let aiReply = "";

    if (geminiKey) {
      const models = ["gemini-3.5-flash", "gemini-3.8-flash", "gemini-3.5-flash-lite", "gemini-flash-latest"];
      for (const model of models) {
        try {
          const aiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [
                  {
                    parts: [
                      {
                        text: `${systemPrompt}\n\n${conversationContext ? `Chat History:\n${conversationContext}\n` : ""}Customer: ${userMessage}\nSkinora:`,
                      },
                    ],
                  },
                ],
                generationConfig: {
                  maxOutputTokens: 1500,
                  temperature: 0.7,
                },
              }),
              signal: AbortSignal.timeout(5000),
            }
          );

          if (aiRes.ok) {
            const resData = await aiRes.json();
            const rawText = resData.candidates?.[0]?.content?.parts?.[0]?.text;
            if (rawText && rawText.trim().length > 50) {
              aiReply = rawText.trim();
              break;
            }
          }
        } catch (err) {
          console.warn(`Skinora Gemini attempt on ${model}:`, err.message);
        }
      }
    }

    // Fallback if AI was unavailable
    if (!aiReply) {
      aiReply = intent.fallbackRoutine;
    }

    return NextResponse.json({
      success: true,
      reply: aiReply,
      products: matchedProducts,
      intent: intent.id,
      keywords: intent.searchKeywords,
    });
  } catch (error) {
    console.error("Skinora API error:", error);
    return NextResponse.json({
      success: true,
      reply: `আপনার ত্বক ও চুলের সুস্থতার জন্য নিয়মিত সঠিক যত্ন নেওয়া প্রয়োজন। আপনি আপনার সুনির্দিষ্ট সমস্যা বা প্রশ্নের বিবরণ দিলে আমি ডার্মাটোলজি অনুযায়ী সেরা সমাধান ও উপযুক্ত প্রোডাক্ট সাজেস্ট করছি।`,
      products: [],
    });
  }
};
