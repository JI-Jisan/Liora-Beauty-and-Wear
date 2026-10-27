import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Product, Brand } from "@/lib/models";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const body = await req.json();
    const userMessage = (body.message || "").trim();
    const history = Array.isArray(body.history) ? body.history : [];

    if (!userMessage) {
      return NextResponse.json({ error: "মেসেজ খালি হতে পারে না" }, { status: 400 });
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return NextResponse.json({
        reply: "দুঃখিত, এআই সার্ভিস সাময়িকভাবে অনুপলব্ধ। দয়া করে সরাসরি আমাদের প্রোডাক্টগুলো ব্রাউজ করুন।",
        products: []
      });
    }

    await connectToDatabase();

    // Format chat history for context
    const conversationContext = history
      .slice(-6)
      .map((h) => `${h.sender === "user" ? "User" : "Skinora"}: ${h.text}`)
      .join("\n");

    const systemInstruction = `You are "Skinora" (স্কিনোরা), LIORA Beauty & Wear's premier AI Skincare & Aesthetic Consultant in Bangladesh.
You assist customers with authentic Korean & international skincare recommendations.
Always speak in warm, polite, caring, and expert Bengali.

Your goals:
1. Empathize with the user's skin concerns (e.g. acne, dark spots, sun tan, oiliness, dry skin, barrier damage, sensitive skin).
2. Explain the root cause simply and clearly (e.g. why campus sun, UV rays, dust, or humidity causes it).
3. Recommend a simple, step-by-step routine (Step 1: Cleanse, Step 2: Tone/Soothe, Step 3: Treat/Serum, Step 4: Moisturize, Step 5: Sun Protection).
4. Recommend key active ingredients (e.g. Centella, Salicylic Acid, Niacinamide, Snail Mucin, Hyaluronic Acid, Ceramide, Zinc, Rice extract).
5. Highlight that all LIORA products are 100% authentic, barcode verified with express campus/nationwide delivery.
6. Provide 2 to 4 specific search terms of product types, ingredients, or brand lines (e.g. "Centella", "Cosrx", "Sunscreen", "Salicylic Acid", "Niacinamide") that exist in cosmetics stores so we can fetch real products from our database.

You MUST return strictly valid JSON matching this schema:
{
  "advice": "Full Bengali advice with clean markdown formatting, bullets for steps, and friendly encouraging sign-off.",
  "searchKeywords": ["Keyword 1", "Keyword 2", "Keyword 3"]
}`;

    const promptText = `${systemInstruction}

${conversationContext ? `Previous Conversation:\n${conversationContext}\n` : ""}
Current User Question: ${userMessage}
Skinora's Response (JSON only):`;

    const models = ["gemini-3.5-flash", "gemini-flash-latest", "gemini-3.1-flash-lite"];
    let aiJson = null;

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
                temperature: 0.7,
              },
            }),
            signal: AbortSignal.timeout(9000),
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
        console.warn(`Skinora Gemini fallback on model ${model}:`, err.message);
      }
    }

    if (!aiJson || !aiJson.advice) {
      aiJson = {
        advice: `আপনার ত্বকের যত্নে নিয়মিত ক্লিনজিং, উপযুক্ত ময়েশ্চারাইজিং এবং অবশ্যই সানস্ক্রিন ব্যবহার করা সবচেয়ে জরুরি। LIORA-তে আপনি পাচ্ছেন ১০০% অথেনটিক কোরিয়ান ও ইন্টারন্যাশনাল স্কিনকেয়ার প্রোডাক্ট। নিচে আপনার জন্য কিছু জনপ্রিয় ও কার্যকরী প্রডাক্ট দেওয়া হলো:`,
        searchKeywords: ["Sunscreen", "Centella", "Cosrx", "Cleanser"],
      };
    }

    const keywords = Array.isArray(aiJson.searchKeywords) && aiJson.searchKeywords.length > 0
      ? aiJson.searchKeywords.slice(0, 4)
      : ["Sunscreen", "Centella", "Cleanser"];

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
    return NextResponse.json(
      {
        success: false,
        reply: "দুঃখিত, কোনো একটি প্রযুক্তিগত কারণে অনুরোধটি সম্পন্ন করা যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন।",
        products: [],
      },
      { status: 500 }
    );
  }
}
