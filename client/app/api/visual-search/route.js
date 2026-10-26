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
        message: 'No text or recognizable packaging detected. Please snap a clearer front photo.',
        products: [],
        detectedTags: []
      });
    }

    // 1. Run Beauty Vision query extraction
    const { query: bestQuery, brand, heroes, types, keywords } = extractCleanQuery(extractedText);

    // Use best query if available, otherwise fallback to cleaned text
    const activeSearch = bestQuery || extractedText;
    const { cleanPhrase, tokens } = cleanSearchTerm(activeSearch);
    const meaningfulTokens = tokens.filter(t => !SEARCH_STOP_WORDS.has(t) && t.length >= 2);

    // 2. Fetch candidates matching brand and keywords
    const orConditions = [];

    if (cleanPhrase) {
      orConditions.push({ name: { $regex: cleanPhrase, $options: 'i' } });
    }

    if (meaningfulTokens.length >= 2) {
      // Combined match
      const combinedRegex = meaningfulTokens.map(t => `(?=.*${t})`).join('');
      orConditions.push({ name: { $regex: new RegExp(combinedRegex, 'i') } });
    }

    if (brand) {
      orConditions.push({ name: { $regex: brand, $options: 'i' } });
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

    // 3. Rank results with Relevance Engine
    const scored = candidateProducts.map(prod => ({
      ...prod,
      matchScore: scoreProductRelevance(prod, cleanPhrase, meaningfulTokens)
    }));

    scored.sort((a, b) => b.matchScore - a.matchScore);
    const topResults = scored.slice(0, 16);

    const redirectUrl = `/products?search=${encodeURIComponent(bestQuery || cleanPhrase || extractedText.slice(0, 30))}`;

    return NextResponse.json({
      success: true,
      bestQuery: bestQuery || cleanPhrase,
      redirectUrl,
      brand,
      keywords: keywords.length > 0 ? keywords : meaningfulTokens.slice(0, 4),
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
