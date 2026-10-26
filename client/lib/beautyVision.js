// LIORA Beauty Vision - Cosmetics Packaging & Brand Recognition Engine

export const LIORA_BRANDS = [
  'Skino', 'Innsaei', 'Caplino', 'Axis-y', 'Beauty Glazed', 'The Ordinary',
  'Maybelline', "L'Oreal", 'Simple', 'Bioaqua', 'Wet n Wild', 'MARS', 'W7',
  'Swiss Beauty', 'Ponds', 'Garnier', 'Neutrogena', 'Cosrx', 'Technic',
  'Sebamed', 'Dot & Key', 'Focallure', 'Plix', 'CeraVe', 'Cetaphil',
  'Innisfree', 'Nivea', 'Paxmoly', 'Skin Cafe', 'Ribana', 'Rajkonna',
  'Missha', 'Laikou', 'Fenyi', 'Breylee', 'Lanbena', 'Sunsilk', 'Axe Brand',
  'Enchanteur', 'Imagic', 'SKIN1004', 'Sheglam', 'Menow', 'Nirvana Color',
  'Handaiyan', 'Earth Beauty', 'Melao', 'Colormax', 'Organikaon', 'Maange',
  'Vaseline', '3W Clinic', 'Streax', 'Mamaearth', 'Tresemme', 'L.A. Girl',
  'Cos De BAHA', 'Medicube', 'Quiyum', 'Makeup Revolution', 'Dove', 'Boots',
  'Zafran', 'Pax Moly', 'Bio Glow', 'Clear', 'Pepsodent', 'Clinic Plus',
  'Closeup', 'Lifebuoy', 'Glow & Lovely', 'Lux', 'Glow & Handsome',
  'My Skin', 'Essence', 'Bob', 'Insight', 'O.TWO.O', 'Colorbar', 'Lakme',
  'Wishcare', 'Aqualogica', 'St. Ives', 'Matrix', 'Mama Earth'
];

export const BRAND_TYPOS = {
  'imasic': 'Imagic',
  'lmaglc': 'Imagic',
  '1maglc': 'Imagic',
  'lmagtc': 'Imagic',
  '1magtc': 'Imagic',
  'imaglc': 'Imagic',
  'c0srx': 'Cosrx',
  'cos rx': 'Cosrx',
  'slmple': 'Simple',
  's1mple': 'Simple',
  'technlc': 'Technic',
  'tecbnic': 'Technic',
  'maybelllne': 'Maybelline',
  'pond': 'Ponds',
  'ponds': 'Ponds',
  'cerave': 'CeraVe',
  'cetaphll': 'Cetaphil',
  'wish care': 'Wishcare',
  'skin cafe': 'Skin Cafe',
  'my skin': 'My Skin',
  'skin 1004': 'SKIN1004',
  'the ordinary': 'The Ordinary'
};

export const HERO_INGREDIENTS = [
  'giant brush', 'snail mucin', 'snail', 'saffron', 'glow boost', 'aloe vera',
  'niacinamide', 'salicylic', 'vitamin c', 'retinol', 'hyaluronic',
  'super light gel', 'opti care', 'duraline', 'rice', 'tea tree',
  'green tea', 'centella', 'kojic', 'glutathione', 'collagen',
  'rose water', 'watermelon', 'papaya', 'turmeric'
];

export const PRODUCT_TYPES = [
  'mascara', 'face wash', 'facewash', 'cleanser', 'serum', 'moisturizer',
  'moisturiser', 'cream', 'sunscreen', 'sunblock', 'lotion', 'liquid lipstick',
  'matte lipstick', 'lipstick', 'lip gloss', 'lip balm', 'eyeliner', 'kajal',
  'foundation', 'concealer', 'setting spray', 'powder', 'compact', 'blush',
  'highlighter', 'eyeshadow', 'palette', 'shampoo', 'conditioner', 'hair oil',
  'scrub', 'mask', 'toner', 'essence', 'soap', 'mist', 'spray', 'soothing gel'
];

// Noise words commonly produced by OCR on cosmetic packaging
export const NOISE_WORDS = new Set([
  'wgwenc', 'oral', 'togs', 'sam', 'fren', 'net', 'wt', 'vol', 'oz',
  'batch', 'mfg', 'exp', 'ingredients', 'dermatologist', 'tested',
  'formula', 'made', 'in', 'prc', 'china', 'india', 'korea', 'usa',
  'uk', 'london', 'paris', 'dist', 'by', 'caution', 'warning', 'keep',
  'out', 'reach', 'children', 'fl', 'bar', 'code', 'retake', 'choose',
  'another', 'photo', 'detected', 'keywords', 'matching', 'products',
  'liora', 'visual', 'lens', 'search', 'cosmetics', 'skincare'
]);

function capitalize(str) {
  if (!str) return '';
  return str.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

/**
 * Extracts the most relevant and clean cosmetic search query from raw OCR text.
 * Discards broken OCR artifacts, detects official brand, hero ingredient, and product category.
 */
export function extractCleanQuery(rawText) {
  if (!rawText || typeof rawText !== 'string') return { query: '', brand: '', keywords: [] };
  
  const clean = rawText
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // 1. Detect Brand
  let detectedBrand = '';
  let earliestBrandPos = Infinity;

  // Exact Brand Matching (longest brands first to avoid partial conflicts)
  const sortedBrands = [...LIORA_BRANDS].sort((a, b) => b.length - a.length);
  for (const b of sortedBrands) {
    const brandLower = b.toLowerCase().replace(/['.]/g, '');
    const reg = new RegExp(`\\b${brandLower}\\b`, 'i');
    const match = reg.exec(clean);
    if (match && match.index < earliestBrandPos) {
      // Special check: don't match 'Essence' brand if 'cosrx' is present (Cosrx Snail Mucin Essence)
      if (brandLower === 'essence' && clean.includes('cosrx')) continue;
      // Don't match 'Skin' if part of 'My Skin'
      if (brandLower === 'skino' && clean.includes('my skin')) continue;
      earliestBrandPos = match.index;
      detectedBrand = b;
    }
  }

  // Typo Brand Matching
  if (!detectedBrand) {
    for (const [typo, correct] of Object.entries(BRAND_TYPOS)) {
      if (clean.includes(typo)) {
        detectedBrand = correct;
        break;
      }
    }
  }

  // 2. Detect Hero Ingredients & Formulas
  const detectedHeroes = [];
  for (const hero of HERO_INGREDIENTS) {
    if (clean.includes(hero)) {
      detectedHeroes.push(hero);
    }
  }

  // 3. Detect Product Category
  const detectedTypes = [];
  for (const pType of PRODUCT_TYPES) {
    if (clean.includes(pType)) {
      detectedTypes.push(pType);
    }
  }

  // Special inference: If 'giant brush' detected without 'mascara', append 'mascara'
  if (detectedHeroes.includes('giant brush') && !detectedTypes.includes('mascara')) {
    detectedTypes.unshift('mascara');
  }

  // Special inference: If 'saffron' and 'glow boost' detected without 'face wash', check if 'wash' in text
  if (detectedHeroes.includes('saffron') && clean.includes('wash') && !detectedTypes.includes('face wash')) {
    detectedTypes.push('face wash');
  }

  // 4. Assemble high-precision search query
  const queryParts = [];

  if (detectedBrand) {
    queryParts.push(detectedBrand);
  }

  // Add top hero ingredient
  if (detectedHeroes.length > 0) {
    let topHero = detectedHeroes[0];
    if (topHero === 'snail') topHero = 'snail mucin';
    // Avoid repeating brand name if hero is in brand
    if (!detectedBrand || !detectedBrand.toLowerCase().includes(topHero)) {
      queryParts.push(capitalize(topHero));
    }
  }

  // Add top product type
  if (detectedTypes.length > 0) {
    const topType = detectedTypes[0];
    // Avoid repeating hero (e.g. if hero is 'super light gel' and type is 'gel')
    const currentQuery = queryParts.join(' ').toLowerCase();
    if (!currentQuery.includes(topType)) {
      queryParts.push(capitalize(topType));
    }
  }

  let finalQuery = queryParts.join(' ').trim();

  // 5. Fallback if no brand or category detected
  if (!finalQuery) {
    // Filter out numbers, noise words, and short tokens
    const tokens = clean
      .split(' ')
      .filter(w => w.length >= 3 && !NOISE_WORDS.has(w) && !/^\d+$/.test(w));

    if (tokens.length > 0) {
      finalQuery = tokens.slice(0, 3).map(capitalize).join(' ');
    }
  }

  const allDetected = [
    ...(detectedBrand ? [detectedBrand] : []),
    ...detectedHeroes.map(capitalize),
    ...detectedTypes.map(capitalize)
  ];

  return {
    query: finalQuery,
    brand: detectedBrand,
    heroes: detectedHeroes,
    types: detectedTypes,
    keywords: Array.from(new Set(allDetected))
  };
}
