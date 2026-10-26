import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Product, Brand } from '@/lib/models';
import { cleanSearchTerm, scoreProductRelevance, SEARCH_STOP_WORDS } from '@/lib/searchEngine';
import { extractCleanQuery } from '@/lib/beautyVision';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req) {
  try {
    await connectToDatabase();
    const contentType = req.headers.get('content-type') || '';

    let extractedText = '';
    let imageBase64 = '';
    let imageMime = 'image/jpeg';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const textParam = formData.get('text');
      if (textParam && typeof textParam === 'string') {
        extractedText = textParam.trim();
      }
      const file = formData.get('image');
      if (file && typeof file === 'object' && typeof file.arrayBuffer === 'function') {
        const buffer = Buffer.from(await file.arrayBuffer());
        if (buffer.length > 0 && buffer.length < 5 * 1024 * 1024) {
          imageBase64 = buffer.toString('base64');
          imageMime = file.type || 'image/jpeg';
        }
      }
    } else {
      const body = await req.json().catch(() => ({}));
      extractedText = body.text || '';
      if (body.image) {
        imageBase64 = body.image.replace(/^data:image\/[a-zA-Z]+;base64,/, '');
      }
    }

    let detectedFromAI = null;

    // 1. If GEMINI_API_KEY is available, use Google Vision AI (True Google Lens)
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey && imageBase64) {
      try {
        const aiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [
                  {
                    text: "You are the Google Lens vision engine for LIORA Beauty & Wear cosmetics store in Bangladesh. Analyze this product image carefully. Identify the exact brand, product name, shade, or cosmetic type (for example 'Swiss Beauty More Than Glitter Lipstick' or 'IMAGIC Mascara Giant Brush' or 'COSRX Snail Mucin' or 'My Skin Saffron Face Wash'). Return strictly valid JSON: {\"brand\": \"...\", \"product\": \"...\", \"searchQuery\": \"...\"}"
                  },
                  {
                    inlineData: {
                      mimeType: imageMime,
                      data: imageBase64
                    }
                  }
                ]
              }],
              generationConfig: {
                responseMimeType: "application/json"
              }
            }),
            signal: AbortSignal.timeout(6000)
          }
        );

        if (aiRes.ok) {
          const aiJson = await aiRes.json();
          const rawReply = aiJson.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawReply) {
            try {
              detectedFromAI = JSON.parse(rawReply);
            } catch {
              // fallback if not pure json
            }
          }
        }
      } catch (aiErr) {
        console.warn('Gemini vision API error:', aiErr.message);
      }
    }

    // Determine query
    let bestQuery = detectedFromAI?.searchQuery || detectedFromAI?.product || '';
    let detectedBrand = detectedFromAI?.brand || '';
    let keywords = [];

    // 2. If AI vision wasn't available or didn't return a query, use Beauty Vision OCR
    if (!bestQuery) {
      if (extractedText && extractedText.trim()) {
        const parsed = extractCleanQuery(extractedText);
        // Only use parsed query if it actually recognized a known brand or beauty keyword
        if (parsed.brand || parsed.heroes.length > 0 || parsed.types.length > 0) {
          bestQuery = parsed.query;
          detectedBrand = parsed.brand;
          keywords = parsed.keywords;
        }
      }
    } else {
      keywords = [detectedBrand, bestQuery].filter(Boolean);
    }

    // 3. If still no valid brand or product detected (e.g. textless image without AI key)
    if (!bestQuery || bestQuery.trim().length < 2) {
      return NextResponse.json({
        success: false,
        isTextless: true,
        message: 'Could not clearly recognize the product brand on this image. You can type the product name below to find it immediately.',
        products: [],
        detectedTags: []
      });
    }

    // 4. Query Database
    const { cleanPhrase, tokens } = cleanSearchTerm(bestQuery);
    const meaningfulTokens = tokens.filter(t => !SEARCH_STOP_WORDS.has(t) && t.length >= 2);

    const orConditions = [];
    if (cleanPhrase) {
      orConditions.push({ name: { $regex: cleanPhrase, $options: 'i' } });
    }
    if (meaningfulTokens.length >= 2) {
      const combinedRegex = meaningfulTokens.map(t => `(?=.*${t})`).join('');
      orConditions.push({ name: { $regex: new RegExp(combinedRegex, 'i') } });
    }
    if (detectedBrand) {
      orConditions.push({ name: { $regex: detectedBrand, $options: 'i' } });
    }
    if (meaningfulTokens.length > 0) {
      orConditions.push({ name: { $regex: meaningfulTokens.slice(0, 4).join('|'), $options: 'i' } });
    }

    let candidateProducts = [];
    if (orConditions.length > 0) {
      candidateProducts = await Product.find({ $or: orConditions })
        .populate('brand', 'name slug')
        .populate('category', 'name')
        .limit(60)
        .lean();
    }

    // Rank candidates
    const scored = candidateProducts.map(prod => ({
      ...prod,
      matchScore: scoreProductRelevance(prod, cleanPhrase, meaningfulTokens)
    }));

    scored.sort((a, b) => b.matchScore - a.matchScore);
    const topResults = scored.slice(0, 16);

    const redirectUrl = `/products?search=${encodeURIComponent(bestQuery)}`;

    return NextResponse.json({
      success: true,
      bestQuery,
      redirectUrl,
      brand: detectedBrand,
      keywords: keywords.length > 0 ? keywords : meaningfulTokens.slice(0, 4),
      totalMatches: topResults.length,
      aiVision: !!detectedFromAI,
      products: topResults.map(p => ({
        _id: p._id,
        name: p.name,
        image: p.image || '',
        offerPrice: p.offerPrice || p.originalPrice || 0,
        originalPrice: p.originalPrice || p.offerPrice || 0,
        discountBadge: p.discountBadge || '',
        inStock: p.inStock,
        stockStatus: p.stockStatus || 'In Stock',
        brand: p.brand ? p.brand.name : '',
        category: p.category ? p.category.name : '',
        matchScore: p.matchScore
      }))
    });
  } catch (error) {
    console.error('Visual Search API Error:', error);
    return NextResponse.json(
      { success: false, message: 'Visual search failed', error: error.message },
      { status: 500 }
    );
  }
}
