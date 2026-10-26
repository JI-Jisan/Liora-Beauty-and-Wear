import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Product, Brand } from '@/lib/models';
import { cleanSearchTerm, scoreProductRelevance } from '@/lib/searchEngine';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Common generic cosmetics words and volumes
const COMMON_WORDS = new Set([
  'skin', 'care', 'beauty', 'face', 'wash', 'body', 'lotion', 'cream', 'gel', 'soap',
  'oil', 'serum', 'the', 'and', 'for', 'with', 'from', 'all', 'new', 'free', 'net',
  'vol', 'wt', 'qty', 'original', 'best', 'pcs', 'pack', 'daily', 'use', 'formula',
  'ingredients', 'dermatologist', 'tested', 'natural'
]);

const isVolume = (w) => /^\d+(ml|gm|g|kg|l|oz|pcs)?$/i.test(w);

export async function POST(req) {
  try {
    await connectToDatabase();
    const contentType = req.headers.get('content-type') || '';

    let extractedText = '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const textParam = formData.get('text');
      if (textParam && typeof textParam === 'string') {
        extractedText = textParam.trim();
      }
    } else {
      const body = await req.json().catch(() => ({}));
      extractedText = body.text || '';
    }

    if (!extractedText || !extractedText.trim()) {
      return NextResponse.json({
        success: false,
        message: 'No text or recognizable product name detected. Please try a clearer photo.',
        products: [],
        detectedTags: []
      });
    }

    const { cleanPhrase, tokens } = cleanSearchTerm(extractedText);

    // Extract specific (distinctive) and common tokens
    const specificTokens = tokens.filter(t => t.length >= 3 && !COMMON_WORDS.has(t) && !isVolume(t));
    const allTokens = tokens.filter(t => t.length >= 2 && !isVolume(t));

    let candidateProducts = [];

    // 1. First Priority: Pair Token Matching (e.g. "saffron" + "glow" or "cosrx" + "snail")
    if (specificTokens.length >= 2) {
      const pairConditions = [];
      const topSpecific = specificTokens.slice(0, 5);
      for (let i = 0; i < topSpecific.length - 1; i++) {
        for (let j = i + 1; j < topSpecific.length; j++) {
          pairConditions.push({
            $and: [
              { name: { $regex: topSpecific[i], $options: 'i' } },
              { name: { $regex: topSpecific[j], $options: 'i' } }
            ]
          });
        }
      }
      if (pairConditions.length > 0) {
        candidateProducts = await Product.find({ $or: pairConditions })
          .populate('brand', 'name slug')
          .populate('category', 'name')
          .limit(60)
          .lean();
      }
    }

    // 2. Second Priority: Individual specific tokens
    if (candidateProducts.length < 15 && specificTokens.length > 0) {
      const extra = await Product.find({
        name: { $regex: specificTokens.slice(0, 5).join('|'), $options: 'i' }
      })
        .populate('brand', 'name slug')
        .populate('category', 'name')
        .limit(50)
        .lean();

      const existingIds = new Set(candidateProducts.map(p => p._id.toString()));
      for (const ep of extra) {
        if (!existingIds.has(ep._id.toString())) {
          candidateProducts.push(ep);
        }
      }
    }

    // 3. Fallback: Broader search if still too few candidates
    if (candidateProducts.length < 5 && allTokens.length > 0) {
      const fallback = await Product.find({
        name: { $regex: allTokens.slice(0, 4).join('|'), $options: 'i' }
      })
        .populate('brand', 'name slug')
        .populate('category', 'name')
        .limit(40)
        .lean();

      const existingIds = new Set(candidateProducts.map(p => p._id.toString()));
      for (const fp of fallback) {
        if (!existingIds.has(fp._id.toString())) {
          candidateProducts.push(fp);
        }
      }
    }

    // 4. Rank using Liora's Search Relevance Engine
    const scored = candidateProducts.map(prod => ({
      ...prod,
      matchScore: scoreProductRelevance(prod, cleanPhrase, allTokens)
    }));

    scored.sort((a, b) => b.matchScore - a.matchScore);
    const topResults = scored.slice(0, 16);

    // Filter tags for display
    const detectedTags = specificTokens
      .slice(0, 6)
      .map(t => t.charAt(0).toUpperCase() + t.slice(1));

    return NextResponse.json({
      success: true,
      extractedSnippet: extractedText.slice(0, 120),
      detectedTags: detectedTags.length > 0 ? detectedTags : tokens.slice(0, 4),
      totalMatches: topResults.length,
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
