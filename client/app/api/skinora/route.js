import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Product } from "@/lib/models";
import { searchProductsFast, warmOrGetSearchCatalog } from "@/lib/searchEngine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// ── 1. COMPREHENSIVE BEAUTY & SKINCARE INTENT DOMAINS ──
const INTENT_DOMAINS = [
  {
    id: "lips",
    patterns: [/ঠোঁট/i, /thot/i, /thoot/i, /lip/i, /lips/i, /চাপস্টিক/i, /chapstick/i, /ফাটা ঠোঁট/i, /কালো ঠোঁট/i, /lipbalm/i, /lip balm/i],
    searchKeywords: ["Lip Balm", "Lip Care", "Vaseline Lip", "Laneige", "Lip Mask"],
    fallbackTitle: "ঠোঁটের শুষ্কতা ও কালচে ভাব দূর করার বিশেষ রুটিন",
    fallbackRoutine: `ঠোঁটের ত্বক আমাদের মুখের অন্যান্য অংশের চেয়ে অনেক পাতলা ও কোমল। শরীরে পানিশূন্যতা, তীব্র রোদ বা বারবার জিভ দিয়ে ঠোঁট ভেজানোর কারণে ঠোঁট দ্রুত ফেটে যায় এবং কালচে হয়ে পড়ে।

**লিপ কেয়ার কার্যকরী রুটিন:**
1. **মাইল্ড এক্সফোলিয়েশন (সপ্তাহে ১-২ দিন):** নরম ভেজা তুলা বা লিপ স্ক্রাব দিয়ে হালকাভাবে মরা চামড়া তুলে ফেলুন।
2. **ডিপ ময়েশ্চারাইজিং:** শিয়া বাটার, পেট্রোলিয়াম জেলি বা সিরামাইড যুক্ত লিপবাম দিনে কয়েকবার ব্যবহার করুন।
3. **নাইট রিপেয়ার:** ঘুমানোর আগে লিপ স্লিপিং মাস্ক বা ভেসলিন লিপ থেরাপি লাগিয়ে রাখুন, সারারাত ঠোঁট হাইড্রেটেড থাকবে।
4. **টিপস:** কখনোই ঠোঁটের শুকনো চামড়া হাত দিয়ে টানবেন না এবং পর্যাপ্ত পানি পান করুন।

নিচে LIORA-র আসল ও জনপ্রিয় লিপ কেয়ার প্রোডাক্টগুলো দেওয়া হলো:`
  },
  {
    id: "eyes",
    patterns: [/চোখ/i, /chokh/i, /চোখের নিচে/i, /chokher/i, /ডার্ক সার্কেল/i, /কালি/i, /kali/i, /dark circle/i, /eye cream/i, /puffy/i, /চোখ ফোলা/i],
    searchKeywords: ["Eye Cream", "Eye Serum", "Retinol", "Caffeine", "Eye"],
    fallbackTitle: "চোখের নিচের ডার্ক সার্কেল ও ফোলা ভাব কমানোর রুটিন",
    fallbackRoutine: `রাত জাগা, মোবাইল/ল্যাপটপের নীল আলো, চোখের ক্লান্তি এবং জেনেটিক কারণে চোখের নিচের সূক্ষ্ম রক্তনালী দৃশ্যমান হয়ে ডার্ক সার্কেল বা কালি তৈরি হয়।

**চোখের যত্নে কার্যকরী পরামর্শ:**
1. **ক্যাফেইন বা নিয়াসিনামাইড আই ক্রিম:** সকালে ক্যাফেইন যুক্ত আই সিরাম বা ক্রিম ব্যবহার করলে চোখের ফোলা ভাব এবং রক্ত সঞ্চালন উন্নত হয়।
2. **রেটিনল বা পেপটাইড নাইট কেয়ার:** রাতে মৃদু রেটিনল বা পেপটাইড আই ক্রিম দিয়ে রিং ফিঙ্গার (অনামিকা) দিয়ে হালকা ট্যাপ করে লাগান।
3. **ঠাণ্ডা সেঁক:** বরফের পানির কম্প্রেস বা শসার স্লাইস দিয়ে চোখের ক্লান্তি দূর করুন।
4. **ঘুম:** প্রতিদিন অন্তত ৭-৮ ঘণ্টা নিয়মিত ঘুমানোর অভ্যাস করুন।

নিচে ডার্ক সার্কেল দূর করতে LIORA-র ১০০% খাঁটি আই কেয়ার প্রোডাক্টগুলো দেওয়া হলো:`
  },
  {
    id: "dandruff",
    patterns: [/খুশকি/i, /khuski/i, /khushki/i, /dandruff/i, /মাথায় চুলকানি/i, /flaky scalp/i, /খুস্কি/i, /scalp/i],
    searchKeywords: ["Anti Dandruff", "Clear Shampoo", "Selsun", "Tea Tree", "Scalp"],
    fallbackTitle: "মাথার খুশকি ও স্ক্যাল্পের চুলকানি দূর করার সমাধান",
    fallbackRoutine: `স্ক্যাল্পে 'ম্যালাসেসিয়া' নামক ছত্রাকের বংশবৃদ্ধি এবং অতিরিক্ত তেলের কারণে খুশকি ও চুলকানি দেখা দেয়। শীতকালে আর্দ্রতা কমে গেলে এ সমস্যা আরও তীব্র হয়।

**খুশকি প্রতিরোধের রুটিন:**
1. **মেডিকেটেড / অ্যান্টি-ড্যানড্রাফ শ্যাম্পু:** জিঙ্ক পাইরিথিওন, কিটোকোনাজল বা টি-ট্রি অয়েল যুক্ত শ্যাম্পু সপ্তাহে ২-৩ দিন ব্যবহার করুন।
2. **সঠিক নিয়মে ব্যবহার:** শ্যাম্পুর ফেনা মাথার স্ক্যাল্পে ৩-৫ মিনিট রেখে তারপর ভালো করে ধুয়ে ফেলুন।
3. **ভেজা চুল বাঁধবেন না:** ভেজা চুল দীর্ঘক্ষণ বেঁধে রাখলে ছত্রাকের সংক্রমণ বাড়ে।
4. **তেল দেওয়া নিয়ন্ত্রণ:** খুশকি থাকা অবস্থায় স্ক্যাল্পে ভারী নারকেল তেল মাখবেন না, এতে খুশকি আরও বেড়ে যায়।

নিচে খুশকি নিরাময়ে LIORA-র কার্যকর অ্যান্টি-ড্যানড্রাফ প্রোডাক্টগুলো দেওয়া হলো:`
  },
  {
    id: "hairfall",
    patterns: [/চুল/i, /chul/i, /hair/i, /পড়ে যাচ্ছে/i, /ঝরে/i, /পড়া বন্ধ/i, /টাক/i, /হেয়ার/i, /shampoo/i],
    searchKeywords: ["Hair Fall", "Shampoo", "Hair Oil", "Rosemary", "Dove", "Tresemme", "Conditioner"],
    fallbackTitle: "চুল পড়া রোধ ও নতুন চুল গজানোর বিজ্ঞানসম্মত রুটিন",
    fallbackRoutine: `পুষ্টির ঘাটতি, মানসিক চাপ, শক্ত পানির (Hard Water) ব্যবহার বা স্ক্যাল্প অপরিচ্ছন্ন থাকার কারণে চুলের গোড়া দুর্বল হয়ে হেয়ার ফল হতে পারে।

**চুল পড়া কমানোর ৪-ধাপ রুটিন:**
1. **মাইল্ড অ্যান্টি-হেয়ারফল শ্যাম্পু:** সালফেট-ফ্রি বা পুষ্টিকর শ্যাম্পু দিয়ে সপ্তাহে ৩ দিন স্ক্যাল্প পরিষ্কার রাখুন।
2. **কন্ডিশনার মাস্ট:** শ্যাম্পুর পর চুলের মাঝখান থেকে ডগা পর্যন্ত কন্ডিশনার লাগান, তবে স্ক্যাল্পে লাগাবেন না।
3. **রোজমেরি বা পিঁয়াজের তেল:** রাতে হালকা গরম তেল দিয়ে চুলের গোড়ায় ম্যাসাজ করুন যা রক্ত সঞ্চালন বাড়ায়।
4. **ভেজা চুলে চিরুনি না চালানো:** ভেজা অবস্থায় চুল নরম থাকে, তাই শুকানোর পর মোটা দাঁতের চিরুনি ব্যবহার করুন।

নিচে চুল পড়া বন্ধে LIORA-র আসল ও জনপ্রিয় হেয়ার কেয়ার কালেকশন দেওয়া হলো:`
  },
  {
    id: "bodycare",
    patterns: [/শরীর/i, /গায়ের/i, /হাত পা/i, /হাত-পা/i, /hat pa/i, /body/i, /body tan/i, /body lotion/i, /বডি লোশন/i, /হাত কালো/i, /ঘাড়/i, /shorir/i],
    searchKeywords: ["Body Lotion", "Vaseline Lotion", "Nivea Body", "Gluta-Hya", "Shower Gel", "Lotion"],
    fallbackTitle: "হাত-পা ও পুরো শরীরের সানট্যান দূর ও ময়েশ্চারাইজিং রুটিন",
    fallbackRoutine: `মুখের পাশাপাশি আমাদের হাত, পা ও শরীরের খোলা অংশেও রোদের অতিবেগুনি রশ্মির কারণে জেদি সানট্যান ও কালচে ভাব পড়ে।

**বডি কেয়ার কার্যকরী রুটিন:**
1. **বডি ওয়াশ / ব্রাইটেনিং শাওয়ার জেল:** গোসলের সময় ত্বক ভালোভাবে ক্লিন করুন।
2. **বডি এক্সফোলিয়েশন (সপ্তাহে ২ দিন):** কফি বা সল্ট স্ক্রাব দিয়ে হাত ও পায়ের মরা কোষ দূর করুন।
3. **ময়েশ্চারাইজিং বডি লোশন:** গোসলের পরপরই ভেজা ত্বকে গ্লুটাথিয়ন বা নিয়াসিনামাইড যুক্ত বডি লোশন লাগান।
4. **বডি সানস্ক্রিন:** রোদে বের হওয়ার আগে উন্মুক্ত হাত-পায়ে সানস্ক্রিন বা এসপিএফ যুক্ত লোশন ব্যবহার করুন।

নিচে LIORA-র সেরা বডি লোশন ও বডি কেয়ার কালেকশন সাজেস্ট করা হলো:`
  },
  {
    id: "pores",
    patterns: [/পোরস/i, /pores/i, /pore/i, /blackhead/i, /whitehead/i, /ব্ল্যাকহেড/i, /হোয়াইটহেড/i, /ছিদ্র/i, /লোমকূপ/i],
    searchKeywords: ["Salicylic Acid", "BHA", "Blackhead", "Clay Mask", "Cosrx", "Toner"],
    fallbackTitle: "ওপেন পোরস ও ব্ল্যাকহেডস দূর করার কার্যকর সমাধান",
    fallbackRoutine: `ত্বকে অতিরিক্ত তেল ও ধুলোবালি জমে লোমকূপ বন্ধ হয়ে বাতাসের সংস্পর্শে অক্সিডাইজড হলে ব্ল্যাকহেডস তৈরি হয় এবং পোরস বড় দেখায়।

**পোরস মিনিমাইজিং রুটিন:**
1. **স্যালিসিলিক এসিড (BHA) ক্লিনজার:** BHA তেলের গভীরে ঢুকে পোরস পরিষ্কার করে।
2. **ক্লে মাস্ক (সপ্তাহে ১-২ দিন):** অতিরিক্ত সেবাম টেনে বের করতে কাওলিন ক্লে মাস্ক ব্যবহার করুন।
3. **নিয়াসিনামাইড সিরাম:** এটি পোরসের স্থিতিস্থাপকতা ফিরিয়ে এনে পোরসকে টাইট ও মসৃণ দেখাতে সাহায্য করে।
4. **হালকা অয়েল-ফ্রি ময়েশ্চারাইজার:** ভারী ক্রিম এড়িয়ে জেল বেসড ময়েশ্চারাইজার বেছে নিন।

নিচে ব্ল্যাকহেডস ও পোরস ক্লিনিংয়ের জন্য LIORA-র আসল প্রোডাক্ট দেওয়া হলো:`
  },
  {
    id: "barrier",
    patterns: [/ব্যারিয়ার/i, /barrier/i, /জ্বালাপোড়া/i, /jole/i, /jola/i, /burning/i, /চামড়া পাতলা/i, /জ্বলে/i, /সেনসিটিভ/i, /sensitive/i],
    searchKeywords: ["Centella", "Ceramide", "Cica", "Snail Mucin", "APLB", "Soothing"],
    fallbackTitle: "ড্যামেজড স্কিন ব্যারিয়ার রিপেয়ার ও সুদিং রুটিন",
    fallbackRoutine: `ভুল ক্রিম ব্যবহার, কড়া রোদে পোড়া বা অতিরিক্ত স্ক্রাবিংয়ের কারণে ত্বকের প্রাকৃতিক সুরক্ষাবলয় (স্কিন ব্যারিয়ার) নষ্ট হয়ে যায়, ফলে ত্বক লালচে হয় এবং যেকোনো কিছু লাগালেই জ্বলে।

**ব্যারিয়ার রিপেয়ার জরুরি রুটিন:**
1. **সব ধরণের এসিড ও স্ক্রাব বন্ধ রাখুন:** ভিটামিন সি, রেটিনল বা এক্সফোলিয়েটর সাময়িক বন্ধ করুন।
2. **মৃদু পিএইচ ব্যালান্সড ক্লিনজার:** ত্বক না টেনে নরম রাখবে এমন জেন্টল ক্লিনজার ব্যবহার করুন।
3. **সেন্টেলা ও সেরামাইড:** সেন্টেলা এশিয়াটিকা ত্বকের জ্বালাপোড়া শান্ত করে এবং সেরামাইড ব্যারিয়ারের দেয়াল মেরামত করে।
4. **স্নেল মুসিন বা সুদিং জেল:** গভীর আর্দ্রতা ফিরিয়ে ত্বককে ভেতর থেকে হিল করবে।

নিচে ব্যারিয়ার সুরক্ষায় LIORA-র সার্টিফাইড ১০০% অরিজিনাল সুদিং প্রোডাক্ট দেওয়া হলো:`
  },
  {
    id: "spots",
    patterns: [/মেস্তা/i, /mesta/i, /কালো দাগ/i, /kalo dag/i, /dark spot/i, /pigmentation/i, /দাগ/i, /dag/i, /ছোপ ছোপ/i],
    searchKeywords: ["Niacinamide", "Vitamin C", "Alpha Arbutin", "Rice", "Dark Spot", "Serum"],
    fallbackTitle: "ব্রণের জেদি দাগ, মেস্তা ও পিগমেন্টেশন রিমুভাল রুটিন",
    fallbackRoutine: `ব্রণ শুকিয়ে যাওয়ার পর বা হরমোনের তারতম্যের কারণে ত্বকের গভীর কোষে অতিরিক্ত মেলানিন জমে পিগমেন্টেশন বা বাদামী/কালচে দাগ তৈরি হয়।

**দাগ দূর করার বিশেষ রুটিন:**
1. **নিয়াসিনামাইড সিরাম (৫% বা ১০%):** এটি মেলানিন পরিবহন বাধা দিয়ে কালো দাগ দ্রুত হালকা করে।
2. **ভিটামিন সি বা আলফা আরবুটিন:** ত্বকের কোলাজেন বাড়িয়ে ব্রাইটনেস ও দাগমুক্ত মসৃণতা ফিরিয়ে আনে।
3. **রাইস এক্সট্র্যাক্ট বা গ্যালাক্টোমাইসিস টনার:** ত্বকের অসম টোন ঠিক করতে সাহায্য করে।
4. **নিয়মিত সানস্ক্রিন:** রোদের ইউভি রশ্মি ছাড়া কোনো দাগ নিরাময় সম্ভব নয়, তাই প্রতিদিন সানস্ক্রিন আবশ্যক।

নিচে দাগ দূর করার জন্য LIORA-র প্রমাণিত ও আসল প্রোডাক্ট দেওয়া হলো:`
  },
  {
    id: "acne",
    patterns: [/ব্রণ/i, /bron/i, /acne/i, /pimple/i, /বিচি/i, /bichi/i, /ফুসকুড়ি/i, /পিম্পল/i, /পুঁজ/i],
    searchKeywords: ["Salicylic Acid", "Cosrx", "Centella", "Tea Tree", "Acne", "Cleanser"],
    fallbackTitle: "ব্রণ ও পিম্পল দূর করার সঠিক ডার্মাটোলজিক্যাল রুটিন",
    fallbackRoutine: `ত্বকের সেবেসিয়াস গ্ল্যান্ড থেকে অতিরিক্ত সেবাম নিঃসরিত হয়ে ধুলোবালির সাথে মিশে লোমকূপ বন্ধ করে ফেলে। সেখানে একনে ব্যাকটেরিয়ার কারণে প্রদাহ ও পুঁজযুক্ত ব্রণ সৃষ্টি হয়।

**ব্রণ দূর করার ৪-ধাপ রুটিন:**
1. **স্যালিসিলিক এসিড ক্লিনজার:** দিনে দুবার হালকা গরম পানি দিয়ে মুখ ধুয়ে নিন।
2. **সুদিং সেন্টেলা টনার:** ব্রণের লালচে ভাব ও ইনফ্লামেশন কমাতে সেন্টেলা বা হার্টলিফ টনার লাগান।
3. **একনে স্পট ট্রিটমেন্ট:** ব্রণের ওপর সরাসরি টি-ট্রি বা পিম্পল প্যাচ ব্যবহার করুন। হাত দিয়ে ব্রণ খোঁচাবেন না।
4. **নন-কমেডোজেনিক সানস্ক্রিন:** রোদে ব্রণের দাগ স্থায়ী হয়, তাই ওয়াটার-বেসড সানস্ক্রিন ব্যবহার করুন।

নিচে ব্রণের জন্য সেরা ১০০% খাঁটি কোরিয়ান প্রোডাক্ট দেওয়া হলো:`
  },
  {
    id: "tan",
    patterns: [/সানট্যান/i, /suntan/i, /sun tan/i, /tan/i, /রোদ/i, /rood/i, /rode/i, /roode/i, /রোদে পোড়া/i, /sunburn/i, /কালো হয়ে গেছি/i, /কালো হয়ে গেছে/i],
    searchKeywords: ["Sunscreen", "Centella", "Niacinamide", "Rice", "Sun Cream", "Brightening"],
    fallbackTitle: "রোদে পোড়া সানট্যান ও কালচে ভাব দূর করার রিফ্রেশিং রুটিন",
    fallbackRoutine: `তীব্র রোদ ও ক্যাম্পাসে চলাফেরার সময় অতিবেগুনি (UVA ও UVB) রশ্মি ত্বকের মেলানোসাইট কোষকে উদ্দীপিত করে, ফলে ত্বক তামাটে বা সানট্যানে পুড়ে যায়।

**সানট্যান নিরাময়ের রুটিন:**
1. **কুলিং ও সুদিং:** রোদ থেকে ফিরে মুখ ঠাণ্ডা পানি ও সুদিং ক্লিনজার দিয়ে ধুয়ে অ্যালোভেরা বা সেন্টেলা জেল লাগান।
2. **ব্রাইটেনিং সিরাম:** রাতে নিয়াসিনামাইড বা রাইস সিরাম ব্যবহারে ত্বকের ন্যাচারাল গ্লো ফিরে আসে।
3. **SPF 50+ সানস্ক্রিন:** বাইরে বের হওয়ার ১৫ মিনিট আগে পর্যাপ্ত সানস্ক্রিন লাগান এবং ৩ ঘণ্টা পরপর রি-এপ্লাই করুন।

নিচে সানট্যান দূর ও প্রতিরোধের ১০০% আসল সানস্ক্রিন ও সিরাম দেওয়া হলো:`
  },
  {
    id: "sunscreen",
    patterns: [/সানস্ক্রিন/i, /sunscreen/i, /সানব্লক/i, /sunblock/i, /spf/i, /sun cream/i],
    searchKeywords: ["Sunscreen", "Sun Cream", "Sun Block", "3W Clinic Sun", "Aqua Sun"],
    fallbackTitle: "আপনার স্কিন টাইপের জন্য সেরা সানস্ক্রিন গাইড",
    fallbackRoutine: `স্কিনকেয়ারের ৮০% ফলাফল নির্ভর করে সঠিক সানস্ক্রিন ব্যবহারের ওপর। এটি শুধু ট্যান নয়, স্কিনের অকাল বার্ধক্য এবং পিগমেন্টেশন প্রতিরোধ করে।

**সানস্ক্রিন ব্যবহারের গোল্ডেন রুলস:**
1. **পরিমাণ:** দুই আঙুল (Two-finger rule) পরিমাণ সানস্ক্রিন মুখে ও গলায় ব্যবহার করুন।
2. **টাইপ:** তৈলাক্ত ত্বকে ওয়াটার-জেল বা ম্যাট সানস্ক্রিন এবং শুষ্ক ত্বকে ময়েশ্চারাইজিং সানস্ক্রিন বেছে নিন।
3. **রি-এপ্লিকেশন:** কড়া রোদে বা ঘেমে গেলে প্রতি ৩-৪ ঘণ্টা পর রি-এপ্লাই করা জরুরি।

নিচে LIORA-র টপ-রেটেড ১০০% অরিジナル সানস্ক্রিনগুলো সাজেস্ট করা হলো:`
  },
  {
    id: "glow",
    patterns: [/গ্লো/i, /glow/i, /উজ্জ্বল/i, /ujjol/i, /গ্লাস স্কিন/i, /glass skin/i, /ফর্সা/i, /forsa/i, /bright/i, /চকচকে/i],
    searchKeywords: ["Rice", "Galactomyces", "Niacinamide", "Vitamin C", "Serum", "Sheet Mask"],
    fallbackTitle: "কোরিয়ান গ্লাস স্কিন ও ন্যাচারাল গ্লো পাওয়ার সিক্রেট রুটিন",
    fallbackRoutine: `কোরিয়ান 'গ্লাস স্কিন' মানে কৃত্রিম ফর্সা হওয়া নয়; বরং ত্বককে ভেতর থেকে এতটাই আর্দ্র ও সুস্থ রাখা যাতে ত্বকে কাঁচের মতো ন্যাচারাল প্রতিফলন ঘটে।

**গ্লাস স্কিনের স্টেপ-বাই-স্টেপ রুটিন:**
1. **ডাবল ক্লিনজিং:** তেল-ভিত্তিক ক্লিনজারের পর ফোম ওয়াশ দিয়ে ত্বকের গভীরে জমে থাকা ময়লা দূর করুন।
2. **হাইড্রেটিং এসেন্স বা রাইস টনার:** চালের নির্যাস বা ফারমেন্টেড উপাদানে ত্বক ইনস্ট্যান্ট গ্লো পায়।
3. **গ্লুটাথিয়ন / ভিটামিন সি সিরাম:** ত্বককে ফ্ললেস ও উজ্জ্বল রাখবে।
4. **হালকা জেল ক্রিম:** ময়েশ্চার লক করে রাখবে সারাদিন।

নিচে কোরিয়ান গ্লাস স্কিনের জন্য জনপ্রিয় অথেনটিক প্রোডাক্টগুলো দেওয়া হলো:`
  },
  {
    id: "aging",
    patterns: [/বয়স/i, /boyos/i, /wrinkle/i, /wrinkles/i, /বলিরেখা/i, /aging/i, /anti aging/i, /anti-aging/i, /ঝুলে/i, /loose skin/i, /কোলাজেন/i, /retinol/i],
    searchKeywords: ["Retinol", "Collagen", "Anti Aging", "Peptide", "Firming", "Eye Cream"],
    fallbackTitle: "বলিরেখা ও বয়সের ছাপ প্রতিরোধে অ্যান্টি-এজিং রুটিন",
    fallbackRoutine: `২৫ বছরের পর থেকে ত্বকের প্রাকৃতিক কোলাজেন উৎপাদন কমতে শুরু করে। রোদ ও দূষণের কারণে ত্বকে ফাইন লাইনস ও বলিরেখা পড়তে পারে।

**অ্যান্টি-এজিং পাওয়ার রুটিন:**
1. **রেটিনল (নাইট রুটিন):** ত্বকের সেল টার্নওভার বাড়াতে সপ্তাহে ২-৩ রাত রেটিনল সিরাম ব্যবহার করুন।
2. **পেপটাইড ও কোলাজেন ক্রিম:** ত্বকের ইলাস্টিসিটি বজায় রেখে ত্বক টানটান রাখবে।
3. **অ্যান্টিঅক্সিডেন্ট:** দিনের বেলায় ভিটামিন সি সিরাম পরিবেশগত ফ্রি-র‍্যাডিক্যাল ড্যামেজ থেকে সুরক্ষা দেয়।
4. **মাস্ট সানস্ক্রিন:** রোদের ইউভি রশ্মিই কোলাজেন ভাঙার প্রধান কারণ, তাই সানস্ক্রিন ছাড়বেন না।

নিচে LIORA-র অথেনটিক অ্যান্টি-এজিং স্কিনকেয়ার প্রোডাক্ট সাজেস্ট করা হলো:`
  },
  {
    id: "oilyskin",
    patterns: [/তৈলাক্ত/i, /toilakto/i, /oil/i, /oily/i, /তেল চিটচিটে/i, /তেলাক্ত/i, /তেলতেলে/i, /ঘামে/i, /tel tel/i, /tel/i, /sebum/i],
    searchKeywords: ["Oil Free", "Salicylic Acid", "Cleanser", "Toner", "Gel Cream"],
    fallbackTitle: "তৈলাক্ত ত্বকের তেল নিয়ন্ত্রণ ও ফ্রেশ রাখার বিশেষ রুটিন",
    fallbackRoutine: `আমাদের দেশের আর্দ্র আবহাওয়া ও গরমে ত্বকের সেবেসিয়াস গ্ল্যান্ড বেশি সক্রিয় হয়ে মুখ তেলতেলে করে ফেলে, যা দ্রুত ব্রণ ও ব্ল্যাকহেডস ডেকে আনে।

**তৈলাক্ত স্কিনের ব্যালান্সড রুটিন:**
1. **জেল বা ফোম ক্লিনজার:** দিনে ২-৩ বার মৃদু জেল ক্লিনজার দিয়ে অতিরিক্ত সিবাম পরিষ্কার করুন।
2. **অ্যালকোহল-ফ্রি ব্যালান্সিং টনার:** ত্বকের পিএইচ লেভেল ঠিক রেখে পোরস টাইট রাখবে।
3. **হালকা ওয়াটার-জেল ময়েশ্চারাইজার:** তেল আছে ভেবে ময়েশ্চারাইজার বাদ দিলে ত্বক আরও বেশি তেল তৈরি করে, তাই লাইটওয়েট জেল ব্যবহার করুন।
4. **ম্যাট সানস্ক্রিন:** ওয়াটার-রেজিস্ট্যান্ট ও ম্যাট ফিনিশ সানস্ক্রিন বেছে নিন।

নিচে অয়েলি স্কিনের জন্য সেরা হালকা ও নন-গ্রিসি প্রোডাক্টগুলো দেওয়া হলো:`
  },
  {
    id: "dryskin",
    patterns: [/শুষ্ক/i, /shushko/i, /dry/i, /শীত/i, /sheet/i, /খসখসে/i, /khoskhose/i, /টান ধরে/i, /চামড়া ওঠে/i, /ডিহাইড্রেটেড/i],
    searchKeywords: ["Hyaluronic", "Moisturizer", "Snail", "Ceramide", "Lotion"],
    fallbackTitle: "শুষ্ক ও খসখসে ত্বকের জন্য ডিপ হাইড্রেটিং রুটিন",
    fallbackRoutine: `শীতের বাতাস, দীর্ঘক্ষণ এসি বা ত্বকের ন্যাচারাল ময়েশ্চার কমে গেলে ত্বক খসখসে হয়ে চুলকাতে পারে এবং টান ধরতে পারে।

**ড্রাই স্কিনের পুষ্টিকর রুটিন:**
1. **ক্রিমি জেন্টল ওয়াশ:** ফোমহীন বা ময়েশ্চারাইজিং ক্লিনজার দিয়ে মুখ ধুয়ে নিন।
2. **হায়ালুরনিক এসিড বা স্নেল মুসিন:** ভেজা ত্বকে লাগালে এটি বাতাস থেকে আর্দ্রতা টেনে ত্বকে লক করে রাখে।
3. **সেরামাইড সমৃদ্ধ ডিপ ময়েশ্চারাইজার:** ত্বকের ফাটা ভাব দূর করে দীর্ঘস্থায়ী সুরক্ষা দিবে।

নিচে শুষ্ক ত্বকের জন্য ১০০% আসল হাইড্রেটিং প্রোডাক্ট সাজেস্ট করা হলো:`
  }
];

// Helper: Match User Message to the best Intent Domain
function matchDomainIntent(userMessage) {
  const text = (userMessage || "").toLowerCase();
  for (const domain of INTENT_DOMAINS) {
    for (const pattern of domain.patterns) {
      if (pattern.test(text)) {
        return domain;
      }
    }
  }
  // Default general domain
  return {
    id: "general",
    searchKeywords: ["Cleanser", "Sunscreen", "Centella", "Serum", "Moisturizer"],
    fallbackTitle: "সুস্থ, দাগহীন ও উজ্জ্বল ত্বকের মৌলিক গাইড",
    fallbackRoutine: `আপনার ত্বকের সুস্থতা ও উজ্জ্বলতার জন্য নিয়মিত সঠিক নিয়মে যত্ন নেওয়া জরুরি। ত্বক পরিষ্কার রাখা, পর্যাপ্ত হাইড্রেশন এবং প্রতিদিন সানস্ক্রিন ব্যবহার করলে যেকোনো ত্বকের সমস্যা দ্রুত নিয়ন্ত্রণে আসে।

**ডেইলি স্কিনকেয়ারের ৩টি গোল্ডেন স্টেপ:**
1. **ক্লিনজিং:** দিনে দুবার আপনার স্কিন টাইপ অনুযায়ী জেন্টল ক্লিনজার ব্যবহার করুন।
2. **ময়েশ্চারাইজিং:** ত্বকের আর্দ্রতা ও ব্যারিয়ার ধরে রাখতে উপযুক্ত ময়েশ্চারাইজার লাগান।
3. **সান প্রোটেকশন:** দিনের বেলা নিয়মিত সানস্ক্রিন ব্যবহার করুন যা বার্ধক্য ও দাগ প্রতিরোধ করে।

LIORA-তে আপনি পাচ্ছেন ১০০% অথেনটিক কোরিয়ান ও ইন্টারন্যাশনাল স্কিনকেয়ার প্রোডাক্টের নিশ্চয়তা। নিচে আপনার জন্য জনপ্রিয় কিছু প্রোডাক্ট সাজেস্ট করা হলো:`
  };
}

// ── 2. FETCH MATCHING REAL PRODUCTS FAST VIA CATALOG SEARCH ──
async function fetchTargetedProducts(intent, userMessage) {
  const foundProducts = [];
  const seenIds = new Set();

  try {
    // 1. First warm the catalog
    await warmOrGetSearchCatalog(Product);

    // 2. Try each domain search keyword
    const kws = [...intent.searchKeywords];

    // Include any user-specific product mentions (e.g. if user asked about "Cosrx" or "Nivea")
    const words = userMessage.split(/\s+/).filter((w) => w.length > 3);
    for (const w of words.slice(0, 3)) {
      if (!kws.some((k) => k.toLowerCase().includes(w.toLowerCase()))) {
        kws.push(w);
      }
    }

    for (const kw of kws) {
      if (foundProducts.length >= 6) break;
      const res = await searchProductsFast(Product, kw, { limit: 4 });
      if (res && Array.isArray(res.products)) {
        for (const p of res.products) {
          const id = p._id?.toString() || p.id;
          if (id && !seenIds.has(id)) {
            seenIds.add(id);
            foundProducts.push(p);
            if (foundProducts.length >= 6) break;
          }
        }
      }
    }
  } catch (err) {
    console.warn("Fast catalog search failed in Skinora, falling back to Mongo:", err.message);
  }

  // If still fewer than 3, grab in-stock products from Mongo
  if (foundProducts.length < 3) {
    try {
      await connectToDatabase();
      const mongoMatches = await Product.find({
        stockStatus: { $ne: "Out of Stock" },
        $or: intent.searchKeywords.map((k) => ({
          name: { $regex: k, $options: "i" },
        })),
      })
        .select("_id name image images offerPrice originalPrice wholesalePrice stockStatus rating reviewCount brand campusDiscountPct")
        .populate("brand", "name slug")
        .limit(6)
        .lean();

      for (const p of mongoMatches) {
        const id = p._id.toString();
        if (!seenIds.has(id)) {
          seenIds.add(id);
          foundProducts.push(p);
          if (foundProducts.length >= 6) break;
        }
      }
    } catch (dbErr) {
      console.warn("Mongo fallback in Skinora failed:", dbErr.message);
    }
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

// ── 3. MAIN API HANDLER ──
export const POST = async (req) => {
  try {
    const body = await req.json();
    const userMessage = (body.message || "").trim();
    const history = Array.isArray(body.history) ? body.history : [];

    if (!userMessage) {
      return NextResponse.json({ error: "মেসেজ খালি হতে পারে না" }, { status: 400 });
    }

    // Identify user intent & fetch targeted products from LIORA catalog
    const intent = matchDomainIntent(userMessage);
    const matchedProducts = await fetchTargetedProducts(intent, userMessage);

    // Format available products to ground Gemini
    const productCatalogContext = matchedProducts
      .map((p, idx) => `${idx + 1}. ${p.name} - ৳${p.offerPrice}${p.brand?.name ? ` (${p.brand.name})` : ""}`)
      .join("\n");

    const geminiKey = process.env.GEMINI_API_KEY;
    const conversationContext = history
      .slice(-4)
      .map((h) => `${h.sender === "user" ? "User" : "Skinora"}: ${h.text}`)
      .join("\n");

    const systemPrompt = `You are "Skinora" (স্কিনোরা), LIORA Beauty & Wear's premier AI Skincare & Aesthetic Consultant in Bangladesh.
You assist customers with authentic Korean and international skincare & beauty solutions.
Always speak in warm, caring, polite, expert, and natural Bengali.

Customer Concern Category: ${intent.id}
User Query: "${userMessage}"

LIORA's Real In-Stock Products relevant to this concern:
${productCatalogContext || "Top authentic Korean & international skincare products available at LIORA."}

Instructions for Skinora:
1. Empathize warmly with the customer's exact concern.
2. Explain the root scientific cause simply (e.g. why sun UV, excess sebum, hormones, dandruff fungus, or dehydration causes this).
3. Provide a clear, actionable step-by-step routine (Step 1, Step 2, Step 3, etc.).
4. Naturally mention and recommend 1 to 3 of the EXACT products listed above with their authentic benefits.
5. Assure the customer that LIORA products are 100% authentic, barcode-verified with express delivery.
6. Use clean Markdown formatting with bold headers and numbered steps. DO NOT return raw JSON. Write directly as Skinora.`;

    let aiReply = "";

    if (geminiKey) {
      const models = ["gemini-3.5-flash", "gemini-3.8-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];
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
                  maxOutputTokens: 2048,
                  temperature: 0.7,
                },
              }),
              signal: AbortSignal.timeout(12000),
            }
          );

          if (aiRes.ok) {
            const resData = await aiRes.json();
            const rawText = resData.candidates?.[0]?.content?.parts?.[0]?.text;
            if (rawText && rawText.trim().length > 60) {
              aiReply = rawText.trim();
              break;
            }
          }
        } catch (err) {
          console.warn(`Skinora Gemini attempt on ${model}:`, err.message);
        }
      }
    }

    // If Gemini was busy, timed out, or unavailable, use the domain's rich fallback
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
      reply: `আপনার ত্বকের সুস্থতা ও উজ্জ্বলতার জন্য নিয়মিত সঠিক নিয়মে যত্ন নেওয়া জরুরি। ত্বক পরিষ্কার রাখা, পর্যাপ্ত হাইড্রেশন এবং প্রতিদিন সানস্ক্রিন ব্যবহার করলে যেকোনো ত্বকের সমস্যা দ্রুত নিয়ন্ত্রণে আসে।\n\nLIORA-তে আপনি পাচ্ছেন ১০০% অথেনটিক কোরিয়ান ও ইন্টারন্যাশনাল স্কিনকেয়ার প্রোডাক্টের নিশ্চয়তা। নিচে আপনার জন্য কিছু জনপ্রিয় ও কার্যকরী প্রোডাক্ট দেওয়া হলো:`,
      products: [],
    });
  }
};
