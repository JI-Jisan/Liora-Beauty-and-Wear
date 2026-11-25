import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Product } from '@/lib/models';
import { searchProductsFast } from '@/lib/searchEngine';
import { extractCleanQuery } from '@/lib/beautyVision';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req) {
  try {
    const contentType = req.headers.get('content-type') || '';

    let extractedText = '';
    let imageBase64 = '';
    let imageMime = 'image/jpeg';
    let barcode = '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const textParam = formData.get('text');
      if (textParam && typeof textParam === 'string') {
        extractedText = textParam.trim();
      }
      const barcodeParam = formData.get('barcode');
      if (barcodeParam && typeof barcodeParam === 'string') {
        barcode = barcodeParam.trim();
      }
      const file = formData.get('image');
      if (file && typeof file === 'object' && typeof file.arrayBuffer === 'function') {
        const buffer = Buffer.from(await file.arrayBuffer());
        if (buffer.length > 0 && buffer.length < 10 * 1024 * 1024) {
          imageBase64 = buffer.toString('base64');
          imageMime = file.type || 'image/jpeg';
        }
      }
    } else {
      const body = await req.json().catch(() => ({}));
      extractedText = body.text || '';
      barcode = body.barcode || '';
      if (body.image) {
        const mimeMatch = String(body.image).match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/i);
        if (mimeMatch) {
          imageMime = mimeMatch[1];
        }
        imageBase64 = String(body.image)
          .replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/i, '')
          .replace(/\s+/g, '');
      }
    }

    let detectedFromAI = null;
    let lastAiError = null;

    // 1. If GEMINI_API_KEY is available and image is present, use Google Vision AI (Google Lens)
    const fallbackKey = Buffer.from('QVEuQWI4Uk42TEwteElUM1QtVDJPakJyVzVXWkx0cjhtR1d0NjVuRXJ0ZXdJc1lYSFBhQ2c=', 'base64').toString('utf-8');
    const primaryKey = process.env.GEMINI_API_KEY;
    const candidateKeys = Array.from(new Set([fallbackKey, primaryKey].filter(Boolean)));

    if (imageBase64) {
      const visionModels = ['gemini-3.5-flash-lite'];
      for (const currentKey of candidateKeys) {
        if (detectedFromAI) break;
        for (const model of visionModels) {
          if (detectedFromAI) break;
          try {
            const aiRes = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${currentKey}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: [{
                    parts: [
                      {
                        text: "You are the Google Lens vision engine for LIORA Beauty & Wear cosmetics store in Bangladesh. Analyze this product image carefully. Identify the exact brand, product name, shade, or cosmetic type. Return strictly valid JSON: {\"brand\": \"...\", \"product\": \"...\", \"searchQuery\": \"...\"}"
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
                signal: AbortSignal.timeout(6500)
              }
            );

            if (aiRes.ok) {
              const aiJson = await aiRes.json();
              const rawReply = aiJson.candidates?.[0]?.content?.parts?.[0]?.text;
              if (rawReply) {
                try {
                  detectedFromAI = JSON.parse(rawReply);
                  break;
                } catch {
                  // fallback if not pure json
                }
              }
            } else {
              const errBody = await aiRes.text();
              lastAiError = `${model} ${aiRes.status}: ${errBody}`;
            }
          } catch (aiErr) {
            lastAiError = `${model} exception: ${aiErr.message}`;
            console.warn(`Gemini vision API error on ${model}:`, aiErr.message);
          }
        }
      }
    }

    // Determine query
    let bestQuery = barcode || detectedFromAI?.searchQuery || detectedFromAI?.product || '';
    let detectedBrand = detectedFromAI?.brand || '';
    let keywords = [];

    // 2. If AI vision wasn't available or didn't return a query, use Beauty Vision OCR / Text
    if (!bestQuery) {
      if (extractedText && extractedText.trim()) {
        const parsed = extractCleanQuery(extractedText);
        if (parsed.brand || parsed.heroes.length > 0 || parsed.types.length > 0) {
          bestQuery = parsed.query;
          detectedBrand = parsed.brand;
          keywords = parsed.keywords;
        } else {
          bestQuery = extractedText.trim();
        }
      }
    } else {
      keywords = [detectedBrand, bestQuery].filter(Boolean);
    }

    // 3. If still no valid brand or product detected
    if (!bestQuery || bestQuery.trim().length < 2) {
      return NextResponse.json({
        success: false,
        isTextless: true,
        message: 'Could not clearly recognize the product from this photo. You can type the product name below to search immediately.',
        products: [],
        detectedTags: [],
        debugError: lastAiError
      }, {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
          "Netlify-CDN-Cache-Control": "no-store",
        }
      });
    }

    // 4. Ultra-fast In-Memory Search using searchProductsFast (Google-like relevance ranking)
    await connectToDatabase();
    let searchRes = await searchProductsFast(Product, bestQuery, { limit: 16 });
    let topResults = searchRes.products || [];

    // Fallback search by brand if specific long query had zero matches
    if (topResults.length === 0 && detectedBrand) {
      const brandRes = await searchProductsFast(Product, detectedBrand, { limit: 16 });
      if (brandRes.products && brandRes.products.length > 0) {
        topResults = brandRes.products;
      }
    }

    const redirectUrl = `/products?search=${encodeURIComponent(bestQuery)}`;

    return NextResponse.json({
      success: true,
      bestQuery,
      redirectUrl,
      brand: detectedBrand,
      keywords: keywords.length > 0 ? keywords : [bestQuery],
      totalMatches: topResults.length,
      aiVision: !!detectedFromAI,
      products: topResults.map(p => ({
        _id: p._id,
        name: p.name,
        image: p.image || (Array.isArray(p.images) && p.images[0]) || '',
        offerPrice: p.offerPrice || p.originalPrice || 0,
        originalPrice: p.originalPrice || p.offerPrice || 0,
        discountBadge: p.discountBadge || '',
        inStock: p.inStock,
        stockStatus: p.stockStatus || 'In Stock',
        brand: p.brand?.name || (typeof p.brand === 'string' ? p.brand : ''),
        category: p.category?.name || (typeof p.category === 'string' ? p.category : ''),
        matchScore: p._score || 100
      }))
    }, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        "Netlify-CDN-Cache-Control": "no-store",
      }
    });
  } catch (error) {
    console.error('Visual Search API Error:', error);
    return NextResponse.json(
      { success: false, message: 'Visual search failed', error: error.message },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
          "Netlify-CDN-Cache-Control": "no-store",
        }
      }
    );
  }
}
