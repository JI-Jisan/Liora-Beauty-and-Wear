import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Product, Brand } from '@/lib/models';
import sharp from 'sharp';
import { createWorker } from 'tesseract.js';

// Cache brand names in memory for fast matching
let cachedBrandNames = null;
let lastBrandCacheTime = 0;

async function getBrandNames() {
  const now = Date.now();
  if (cachedBrandNames && now - lastBrandCacheTime < 300000) {
    return cachedBrandNames;
  }
  try {
    const brands = await Brand.find({}, { name: 1, slug: 1 }).lean();
    cachedBrandNames = brands.map(b => ({
      _id: b._id,
      name: b.name.toLowerCase().trim(),
      rawName: b.name
    }));
    lastBrandCacheTime = now;
    return cachedBrandNames;
  } catch (e) {
    return [];
  }
}

// Common cosmetics stopwords to ignore in search
const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'all', 'new', 'free', 'net', 'vol', 'wt', 'qty',
  'original', 'best', 'ml', 'gm', 'pcs', 'pack', 'care', 'beauty', 'skin', 'body',
  'face', 'daily', 'use', 'formula', 'ingredients', 'dermatologist', 'tested', 'natural'
]);

export async function POST(req) {
  try {
    await connectToDatabase();
    const contentType = req.headers.get('content-type') || '';

    let extractedText = '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('image');
      const textParam = formData.get('text');

      if (textParam && typeof textParam === 'string' && textParam.trim()) {
        extractedText = textParam.trim();
      } else if (file && typeof file === 'object') {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Preprocess image with sharp for optimal OCR speed & accuracy
        const processedBuffer = await sharp(buffer)
          .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
          .grayscale()
          .normalize()
          .sharpen()
          .toBuffer();

        // Run Tesseract OCR in-memory
        const worker = await createWorker('eng');
        const ret = await worker.recognize(processedBuffer);
        extractedText = ret.data.text || '';
        await worker.terminate();
      }
    } else {
      const body = await req.json().catch(() => ({}));
      extractedText = body.text || '';
    }

    if (!extractedText || !extractedText.trim()) {
      return NextResponse.json({
        success: false,
        message: 'No text or recognizable image detected. Please try a clearer photo of the product packaging.',
        products: [],
        detectedTags: []
      });
    }

    // Clean and normalize text
    const cleanRaw = extractedText
      .replace(/[^\w\s-]/g, ' ')
      .replace(/\s+/g, ' ')
      .toLowerCase()
      .trim();

    const allBrands = await getBrandNames();
    const detectedBrands = [];

    // Detect brand in text
    for (const b of allBrands) {
      if (b.name.length >= 3 && cleanRaw.includes(b.name)) {
        detectedBrands.push(b);
      }
    }

    // Extract significant keywords
    const rawTokens = cleanRaw.split(' ').filter(t => t.length >= 3 && !STOPWORDS.has(t));
    const uniqueTokens = Array.from(new Set(rawTokens)).slice(0, 12);

    // Build MongoDB query
    const searchConditions = [];

    // 1. If brand matched, query products of that brand
    if (detectedBrands.length > 0) {
      searchConditions.push({ brand: { $in: detectedBrands.map(b => b._id) } });
    }

    // 2. Keyword regex searches
    const tokenRegexes = uniqueTokens.map(t => new RegExp(t, 'i'));
    if (tokenRegexes.length > 0) {
      searchConditions.push({ name: { $in: tokenRegexes } });
    }

    let candidateProducts = [];
    if (searchConditions.length > 0) {
      candidateProducts = await Product.find({
        $or: searchConditions
      })
        .populate('brand', 'name slug')
        .populate('category', 'name')
        .limit(60)
        .lean();
    }

    // If candidate products are too few, try a broader search with the top 3 tokens
    if (candidateProducts.length < 5 && uniqueTokens.length > 0) {
      const broadRegex = new RegExp(uniqueTokens.slice(0, 3).join('|'), 'i');
      const broadCandidates = await Product.find({
        name: { $regex: broadRegex }
      })
        .populate('brand', 'name slug')
        .populate('category', 'name')
        .limit(40)
        .lean();

      // Merge unique
      const existingIds = new Set(candidateProducts.map(p => p._id.toString()));
      for (const bp of broadCandidates) {
        if (!existingIds.has(bp._id.toString())) {
          candidateProducts.push(bp);
        }
      }
    }

    // Score and rank candidates by relevance
    const scored = candidateProducts.map(prod => {
      let score = 0;
      const prodNameLower = prod.name.toLowerCase();

      // Brand match bonus (+50 points)
      if (prod.brand && detectedBrands.some(db => db._id.toString() === prod.brand._id?.toString())) {
        score += 50;
      }

      // Token match bonus (+10 points per matched word)
      for (const tok of uniqueTokens) {
        if (prodNameLower.includes(tok)) {
          score += 15;
        }
      }

      // In stock bonus (+10 points)
      if (prod.inStock && prod.stockStatus !== 'Out of Stock') {
        score += 10;
      }

      return {
        ...prod,
        matchScore: score
      };
    });

    // Sort by match score descending
    scored.sort((a, b) => b.matchScore - a.matchScore);
    const topResults = scored.slice(0, 16);

    // Format tags for UI display
    const detectedTags = [
      ...detectedBrands.map(b => b.rawName),
      ...uniqueTokens.slice(0, 5).map(t => t.charAt(0).toUpperCase() + t.slice(1))
    ];

    return NextResponse.json({
      success: true,
      extractedSnippet: extractedText.slice(0, 120),
      detectedTags: Array.from(new Set(detectedTags)),
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
