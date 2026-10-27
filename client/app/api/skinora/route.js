import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Product, Brand } from "@/lib/models";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function extractSkinKeywords(text) {
  const lower = (text || "").toLowerCase();
  const kws = [];
  if (lower.includes("acne") || lower.includes("ব্রণ") || lower.includes("pimple") || lower.includes("দাগ") || lower.includes("বিচি")) {
    kws.push("Salicylic Acid", "Centella", "Cosrx", "Cleanser");
  } else if (lower.includes("tan") || lower.includes("সানট্যান") || lower.includes("রোদ") || lower.includes("কালো") || lower.includes("sun")) {
    kws.push("Sunscreen", "Centella", "Niacinamide");
  } else if (lower.includes("dry") || lower.includes("শুষ্ক") || lower.includes("শীত") || lower.includes("খসখসে")) {
    kws.push("Hyaluronic", "Moisturizer", "Snail", "Ceramide");
  } else if (lower.includes("oil") || lower.includes("তৈলাক্ত") || lower.includes("তেল")) {
    kws.push("Oil Free", "Sunscreen", "Cleanser", "Toner");
  } else if (lower.includes("dark circle") || lower.includes("চোখের নিচে") || lower.includes("কালি")) {
    kws.push("Eye Cream", "Retinol", "Serum");
  } else if (lower.includes("glow") || lower.includes("উজ্জ্বল") || lower.includes("ফর্সা")) {
    kws.push("Niacinamide", "Vitamin C", "Serum", "Rice");
  } else {
    kws.push("Sunscreen", "Centella", "Cleanser", "Moisturizer");
  }
  return kws;
}

export async function POST(req) {
  try {
    const body = await req.json();
    const userMessage = (body.message || "").trim();
    const history = Array.isArray(body.history) ? body.history : [];

    if (!userMessage) {
      return NextResponse.json({ error: "মেসেজ খালি হতে পারে না" }, { status: 400 });
    }

    await connectToDatabase();

    const geminiKey = process.env.GEMINI_API_KEY;
    const conversationContext = history
      .slice(-4)
      .map((h) => `${h.sender === "user" ? "User" : "Skinora"}: ${h.text}`)
      .join("\n");

    const systemInstruction = `You are "Skinora" (স্কিনোরা), LIORA Beauty & Wear's premier AI Skincare & Aesthetic Consultant in Bangladesh.
You assist customers with authentic Korean & international skincare recommendations.
Always speak in warm, polite, caring, and expert Bengali.

Your goals:
1. Empathize with the user's skin concerns (e.g. acne, dark spots, sun tan, oiliness, dry skin, barrier damage, sensitive skin).
2. Explain the root cause simply and clearly (e.g. why campus sun, UV rays, dust, or excess sebum causes it).
3. Recommend a concise 3-step or 4-step routine (Step 1: Cleanse, Step 2: Tone/Soothe, Step 3: Treat/Serum, Step 4: Sun Protection).
4. Recommend key active ingredients (e.g. Centella, Salicylic Acid, Niacinamide, Snail Mucin, Hyaluronic Acid, Zinc).
5. Highlight that all LIORA products are 100% authentic, barcode verified with fast campus/nationwide delivery.
6. Provide 2 to 4 search terms of product types or ingredients (e.g. "Centella", "Cosrx", "Sunscreen", "Salicylic Acid").

Return strictly valid JSON:
{
  "advice": "Bengali advice with clean markdown formatting",
  "searchKeywords": ["Keyword 1", "Keyword 2"]
}`;

    const promptText = `${systemInstruction}

${conversationContext ? `Previous Conversation:\n${conversationContext}\n` : ""}
Current User Question: ${userMessage}
Skinora's Response (JSON only):`;

    const models = ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];
    let aiJson = null;

    if (geminiKey) {
      for (const model of models) {
        try {
          const aiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ parts: [{ text: promptText }] }],
                generationConfig: {
                  responseMimeType: "application/json",
                  maxOutputTokens: 650,
                  temperature: 0.7,
                },
              }),
              signal: AbortSignal.timeout(15000),
            }
          );

          if (aiRes.ok) {
            const resData = await aiRes.json();
            const rawText = resData.candidates?.[0]?.content?.parts?.[0]?.text;
            if (rawText) {
              aiJson = JSON.parse(rawText);
              break;
            }
          }
        } catch (err) {
          console.warn(`Skinora Gemini attempt on ${model}:`, err.message);
        }
      }
    }

    // Contextual fallback if Gemini took too long
    if (!aiJson || !aiJson.advice) {
      const isAcne = /acne|ব্রণ|pimple|দাগ|বিচি/i.test(userMessage);
      const isTan = /tan|সানট্যান|রোদ|কালো/i.test(userMessage);
      const isDry = /dry|শুষ্ক|শীত|খসখসে/i.test(userMessage);

      let fallbackAdvice = "";
      if (isAcne) {
        fallbackAdvice = `হ্যালো! ব্রণ বা একনের সমস্যা নিয়ে একদম মন খারাপ করবেন না। ত্বকে অতিরিক্ত তেল (সেবাম) এবং ধুলোবালি জমে ব্যাকটেরিয়ার সংক্রমণের কারণে সাধারণত ব্রণ দেখা দেয়।\n\n**আপনার জন্য কার্যকরী ব্রণের রুটিন:**\n1. **ক্লিনজার (Cleanse):** একটি জেন্টল সালিসাইলিক এসিড (Salicylic Acid) যুক্ত ফেসওয়াশ ব্যবহার করুন, যা লোমকূপের গভীর থেকে তেল পরিষ্কার করবে।\n2. **সুদিং টনার (Tone):** সেন্টেলা (Centella) বা গ্রিন টি টনার দিয়ে স্কিনের লালচে ভাব ও জ্বালাপোড়া শান্ত রাখুন।\n3. **সিরাম (Treat):** ব্রণের জেদি দাগ কমাতে নিয়াসিনামাইড (Niacinamide) সিরাম নিয়মিত ব্যবহার করুন।\n4. **সানস্ক্রিন (Protect):** তেলহীন, নন-কমেডোজেনিক সানস্ক্রিন ছাড়া রোদে যাবেন না।\n\nLIORA-র সব প্রোডাক্ট ১০০% আসল কোরিয়ান অথেনটিক। নিচে আপনার জন্য সেরা প্রোডাক্টগুলো দেওয়া হলো:`;
      } else if (isTan) {
        fallbackAdvice = `ক্যাম্পাসে যাতায়াত এবং রোদের তীব্র আল্ট্রাভায়োলেট (UV) রশ্মির কারণে ত্বকে সানট্যান পড়া ও মেলামিন বেড়ে যাওয়া খুব সাধারণ সমস্যা।\n\n**সানট্যান দূর করার রুটিন:**\n1. **ডিপ ক্লিনজিং:** ডাস্ট ও সানট্যান সরাতে মাইল্ড ক্লিনজার ব্যবহার করুন।\n2. **ব্রাইটনিং সিরাম:** নিয়াসিনামাইড বা রাইস ওয়াটার সিরাম দিয়ে সানট্যান ও কালচে ভাব দূর করুন।\n3. **মাস্ট সানস্ক্রিন (SPF 50+):** বাইরে বের হওয়ার অন্তত ১৫ মিনিট আগে লাইটওয়েট সানস্ক্রিন ব্যবহার করুন এবং প্রতি ৩-৪ ঘণ্টা পর রি-এপ্লাই করুন।\n\nনিচে আপনার জন্য কিছু ১০০% অরিজিনাল কোরিয়ান প্রোডাক্ট দেওয়া হলো:`;
      } else if (isDry) {
        fallbackAdvice = `ত্বক অতিরিক্ত শুষ্ক বা ডিহাইড্রেটেড হয়ে গেলে ত্বকের ন্যাচারাল ব্যারিয়ার দুর্বল হয়ে পড়ে।\n\n**ড্রাই স্কিন কেয়ার রুটিন:**\n1. **হাইড্রেটিং ক্লিনজার:** ফোমহীন জেন্টল ময়েশ্চারাইজিং ক্লিনজার ব্যবহার করুন।\n2. **হায়ালুরনিক এসিড বা স্নেল মুসিন:** ত্বকে পর্যাপ্ত পানি ও ময়েশ্চার ধরে রাখতে সিরাম ব্যবহার করুন।\n3. **সেরামাইড ময়েশ্চারাইজার:** ব্যারিয়ার রিপেয়ার করে ত্বক নরম ও মসৃণ রাখবে।\n\nনিচে আপনার ত্বকের জন্য উপযুক্ত ১০০% আসল প্রোডাক্ট দেওয়া হলো:`;
      } else {
        fallbackAdvice = `আপনার ত্বকের সুস্থতা ও উজ্জ্বলতার জন্য নিয়মিত সঠিক নিয়মে যত্ন নেওয়া জরুরি। ত্বক পরিষ্কার রাখা, পর্যাপ্ত হাইড্রেশন এবং প্রতিদিন সানস্ক্রিন ব্যবহার করলে যেকোনো ত্বকের সমস্যা দ্রুত নিয়ন্ত্রণে আসে।\n\nLIORA-তে আপনি পাচ্ছেন ১০০% অথেনটিক কোরিয়ান ও ইন্টারন্যাশনাল স্কিনকেয়ার প্রোডাক্টের নিশ্চয়তা। নিচে আপনার জন্য কিছু জনপ্রিয় ও কার্যকরী প্রোডাক্ট সাজেস্ট করা হলো:`;
      }

      aiJson = {
        advice: fallbackAdvice,
        searchKeywords: extractSkinKeywords(userMessage),
      };
    }

    const keywords = Array.isArray(aiJson.searchKeywords) && aiJson.searchKeywords.length > 0
      ? aiJson.searchKeywords.slice(0, 4)
      : extractSkinKeywords(userMessage);

    // Find real products in LIORA's MongoDB matching keywords
    const productList = [];
    const seenIds = new Set();

    for (const kw of keywords) {
      const cleanKw = kw.trim();
      if (!cleanKw || cleanKw.length < 2) continue;

      const matched = await Product.find({
        $or: [
          { name: { $regex: cleanKw, $options: "i" } },
          { description: { $regex: cleanKw, $options: "i" } },
        ],
        stockStatus: { $ne: "Out of Stock" },
      })
        .select("_id name image images offerPrice originalPrice wholesalePrice stockStatus rating reviewCount brand campusDiscountPct")
        .populate("brand", "name slug")
        .sort({ rating: -1, reviewCount: -1 })
        .limit(2)
        .lean();

      for (const p of matched) {
        if (!seenIds.has(p._id.toString())) {
          seenIds.add(p._id.toString());
          productList.push(p);
        }
      }
      if (productList.length >= 6) break;
    }

    // Fallback if no products matched
    if (productList.length === 0) {
      const featured = await Product.find({ stockStatus: { $ne: "Out of Stock" } })
        .select("_id name image images offerPrice originalPrice wholesalePrice stockStatus rating reviewCount brand campusDiscountPct")
        .populate("brand", "name slug")
        .sort({ rating: -1 })
        .limit(4)
        .lean();
      productList.push(...featured);
    }

    return NextResponse.json({
      success: true,
      reply: aiJson.advice,
      products: productList.slice(0, 6),
      keywords,
    });
  } catch (error) {
    console.error("Skinora API error:", error);
    return NextResponse.json({
      success: true,
      reply: "আপনার ত্বকের যত্নে নিয়মিত ক্লিনজিং, উপযুক্ত ময়েশ্চারাইজিং এবং অবশ্যই সানস্ক্রিন ব্যবহার করা সবচেয়ে জরুরি। LIORA-তে আপনি পাচ্ছেন ১০০% অথেনটিক কোরিয়ান ও ইন্টারন্যাশনাল স্কিনকেয়ার প্রোডাক্ট। নিচে আপনার জন্য কিছু জনপ্রিয় ও কার্যকরী প্রডাক্ট দেওয়া হলো:",
      products: [],
    });
  }
}
