// Google-like Smart Fuzzy Search & Typo Tolerance Engine for Liora
// Handles bracket/punctuation normalization, cosmetic/brand phonetic aliases,
// 1-edit distance fuzzy patterns, and relevance scoring.

export function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Common cosmetics, skincare, fashion & phonetic typo dictionary
const BEAUTY_TYPO_ALIASES = {
  nivia: ["nivea"],
  nevia: ["nivea"],
  nevea: ["nivea"],
  setaphil: ["cetaphil"],
  sitaphil: ["cetaphil"],
  cetapil: ["cetaphil"],
  serav: ["cerave"],
  serave: ["cerave"],
  ceravee: ["cerave"],
  loreal: ["l'oreal", "loreal"],
  lorealparis: ["l'oreal", "loreal"],
  loreall: ["l'oreal", "loreal"],
  maybeline: ["maybelline"],
  maybelin: ["maybelline"],
  mebelline: ["maybelline"],
  moisturiser: ["moisturizer", "moistur"],
  moisturizer: ["moisturiser", "moistur"],
  moisturising: ["moistur"],
  moisturizing: ["moistur"],
  moistur: ["moisturizing", "moisturising"],
  sunblock: ["sunscreen", "sun block"],
  suncreen: ["sunscreen"],
  suncreem: ["sunscreen"],
  sanscreen: ["sunscreen"],
  suncren: ["sunscreen"],
  lipstik: ["lipstick"],
  lipstck: ["lipstick"],
  lipistik: ["lipstick"],
  lipgloss: ["lip gloss", "lipgloss"],
  lipglos: ["lip gloss", "lipgloss"],
  shampo: ["shampoo"],
  sampoo: ["shampoo"],
  champo: ["shampoo"],
  konditioner: ["conditioner"],
  condishoner: ["conditioner"],
  eyeliner: ["eye liner", "eyeliner"],
  eyelinar: ["eyeliner"],
  kajol: ["kajal"],
  kazal: ["kajal"],
  foundasion: ["foundation"],
  foundasen: ["foundation"],
  fondation: ["foundation"],
  perfum: ["perfume"],
  perfeum: ["perfume"],
  parfume: ["perfume"],
  parfum: ["perfume"],
  attar: ["atar", "itr"],
  vaslin: ["vaseline"],
  vasline: ["vaseline"],
  veseline: ["vaseline"],
  theordinary: ["ordinary"],
  ordinery: ["ordinary"],
  ordnary: ["ordinary"],
  facewash: ["face wash", "facewash"],
  facewosh: ["face wash", "facewash"],
  cleanser: ["cleanse", "cleanser"],
  clenzer: ["cleanser"],
  cleenser: ["cleanser"],
  toner: ["tonar", "toner"],
  tonar: ["toner"],
  seram: ["serum"],
  searum: ["serum"],
  loson: ["lotion"],
  loshan: ["lotion"],
  creem: ["cream"],
  krim: ["cream"],
  gluta: ["glutathione"],
  glutathion: ["glutathione"],
  niacinamide: ["niacinamide", "niacin"],
  niacinamid: ["niacinamide"],
  niacina: ["niacinamide"],
  retinol: ["retinol"],
  retinole: ["retinol"],
  hyaluronic: ["hyaluronic", "hialuronic"],
  hialuronic: ["hyaluronic"],
  salicylic: ["salicylic", "salisilic"],
  salisilic: ["salicylic"],
  tresemme: ["tresemme"],
  tresemey: ["tresemme"],
  dove: ["dove"],
  dov: ["dove"],
  biore: ["biore"],
  bior: ["biore"],
  simple: ["simple"],
  simpl: ["simple"],
  neutrogena: ["neutrogena"],
  nutrogena: ["neutrogena"],
  garnier: ["garnier"],
  garniyar: ["garnier"],
  cosrx: ["cosrx", "cos-rx"],
  innisfree: ["innisfree"],
  inisfree: ["innisfree"],
  bodyspray: ["body spray", "bodyspray"],
  bodimists: ["body mist"],
  bodymist: ["body mist", "bodymist"],
};

export const SEARCH_STOP_WORDS = new Set([
  "to", "for", "in", "on", "at", "of", "a", "an", "the", "and", "or", "with", "by", "from", "is", "it", "as", "into"
]);

/**
 * Normalizes and strips brackets and punctuation from search string.
 * Keeps letters, numbers, and Bengali Unicode characters intact.
 */
export function cleanSearchTerm(raw) {
  if (!raw || typeof raw !== "string") {
    return { raw: "", cleanPhrase: "", tokens: [] };
  }

  // Remove brackets: () [] {} <>
  let s = raw.replace(/[()[\]{}<>«»]/g, " ");

  // Replace common punctuation symbols with space
  s = s.replace(/["'?!:;,+*~^$\\/#@|_.=]/g, " ");

  // Collapse multiple spaces and trim
  const cleanPhrase = s.replace(/\s+/g, " ").trim();

  // Extract tokens (length >= 2, or length 1 if alphanumeric)
  const tokens = cleanPhrase
    .split(" ")
    .map((w) => w.trim().toLowerCase())
    .filter((w) => w.length > 0);

  return {
    raw,
    cleanPhrase,
    tokens,
  };
}

/**
 * Generates fuzzy regex patterns and alias expansions for a given token.
 */
export function getFuzzyVariantsForToken(token) {
  const lower = token.toLowerCase();
  const variants = new Set([lower]);

  // 1. Check dictionary aliases
  if (BEAUTY_TYPO_ALIASES[lower]) {
    for (const a of BEAUTY_TYPO_ALIASES[lower]) {
      variants.add(a.toLowerCase());
    }
  }

  // Check reverse alias (e.g. if key is nivea and user typed nivia)
  for (const [key, list] of Object.entries(BEAUTY_TYPO_ALIASES)) {
    if (list.includes(lower)) {
      variants.add(key.toLowerCase());
    }
  }

  // 2. Generate 1-edit wildcard regex for words of length >= 4
  // e.g. for "nivea" -> "n.vea", "ni.ea", "niv.a"
  const regexPatterns = [];
  if (lower.length >= 4) {
    for (let i = 1; i < lower.length - 1; i++) {
      const pattern = lower.slice(0, i) + "." + lower.slice(i + 1);
      regexPatterns.push(pattern);
    }
    // Also allow missing character transposition e.g. "shapo" -> "sha.?po"
    for (let i = 1; i < lower.length; i++) {
      const pattern = lower.slice(0, i) + ".?" + lower.slice(i);
      regexPatterns.push(pattern);
    }
  }

  return {
    words: Array.from(variants),
    patterns: regexPatterns.slice(0, 5), // Keep top 5 to keep query fast
  };
}

/**
 * Standard Levenshtein distance for ranking
 */
export function levenshteinDistance(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

/**
 * Scores a product against the search query for intelligent Google-like relevance ranking.
 */
export function scoreProductRelevance(product, cleanPhrase, tokens) {
  const name = String(product.name || "").toLowerCase();
  const desc = String(product.description || "").toLowerCase();
  const catName = String(product.category?.name || product.category || "").toLowerCase();
  const brandName = String(product.brand?.name || product.brand || "").toLowerCase();
  const lowerPhrase = cleanPhrase.toLowerCase();

  let score = 0;

  // 1. Exact phrase in name
  if (name.includes(lowerPhrase)) {
    score += 150;
    if (name.startsWith(lowerPhrase)) {
      score += 50;
    }
  }

  // 2. Brand match
  if (brandName && lowerPhrase.includes(brandName)) {
    score += 80;
  } else if (brandName && brandName.includes(lowerPhrase)) {
    score += 60;
  }

  // 3. Category match
  if (catName && (lowerPhrase.includes(catName) || catName.includes(lowerPhrase))) {
    score += 50;
  }

  // 4. Token matches in Name
  let matchedTokens = 0;
  for (const token of tokens) {
    if (token.length < 2) continue;

    if (name.includes(token)) {
      score += 40;
      matchedTokens++;
    } else {
      // Check typo variants
      const { words } = getFuzzyVariantsForToken(token);
      let foundVariant = false;
      for (const w of words) {
        if (name.includes(w)) {
          score += 35;
          matchedTokens++;
          foundVariant = true;
          break;
        }
      }

      // Check Levenshtein on words in title
      if (!foundVariant && token.length >= 4) {
        const titleWords = name.split(/\s+/);
        for (const tw of titleWords) {
          if (tw.length >= 3 && Math.abs(tw.length - token.length) <= 2) {
            const dist = levenshteinDistance(token, tw);
            if (dist <= 2) {
              score += Math.max(10, 30 - dist * 10);
              matchedTokens++;
              break;
            }
          }
        }
      }
    }

    // Match in description
    if (desc.includes(token)) {
      score += 10;
    }
  }

  // Bonus if all query tokens matched
  if (tokens.length > 0 && matchedTokens === tokens.length) {
    score += 50;
  }

  // 5. Stock status bonus (available products rank higher)
  if (product.inStock) {
    score += 10;
  }
  if (product.isFeatured) {
    score += 5;
  }

  return score;
}

// ---------------------------------------------------------------------------
// LIGHTNING IN-MEMORY SEARCH CATALOG & QUERY RESULT CACHE
// Delivers sub-10ms search responses across the entire product catalog
// ---------------------------------------------------------------------------
let searchCatalogCache = null;
let searchCatalogTimestamp = 0;
const CATALOG_TTL_MS = 4 * 60 * 1000; // 4 minutes TTL
let isRefreshingCatalog = false;

// Query memoization cache: Map<cacheKey, rankedProducts>
const queryResultCache = new Map();
const MAX_QUERY_CACHE = 500;

/**
 * Invalidate in-memory caches when products are created, updated, or deleted
 */
export function invalidateSearchCatalog() {
  searchCatalogCache = null;
  searchCatalogTimestamp = 0;
  queryResultCache.clear();
}

/**
 * Loads or returns cached product catalog in memory with stale-while-revalidate background refresh
 */
export async function warmOrGetSearchCatalog(Product) {
  const now = Date.now();
  if (searchCatalogCache && now - searchCatalogTimestamp < CATALOG_TTL_MS) {
    return searchCatalogCache;
  }

  // Resolve Product model if not explicitly passed
  let ActiveProduct = Product;
  if (!ActiveProduct) {
    try {
      const models = await import("./models.js");
      ActiveProduct = models.Product;
    } catch (e) {
      console.error("Failed to load Product model in searchEngine:", e);
    }
  }

  if (!ActiveProduct) {
    return searchCatalogCache || [];
  }

  // Stale-while-revalidate: if stale cache exists, return it immediately and refresh in background!
  if (searchCatalogCache && !isRefreshingCatalog) {
    isRefreshingCatalog = true;
    ActiveProduct.find({})
      .select('name offerPrice originalPrice image images brand category inStock stockQuantity isFeatured isTrending isNewArrival campusDiscountPct rating reviewCount wholesalePrice resellerPrice description isSlider')
      .populate('category', 'name ancestors slug')
      .populate('brand', 'name slug')
      .lean()
      .then((fresh) => {
        searchCatalogCache = fresh;
        searchCatalogTimestamp = Date.now();
        queryResultCache.clear();
      })
      .catch((err) => console.error('Background search catalog refresh error:', err))
      .finally(() => {
        isRefreshingCatalog = false;
      });
    return searchCatalogCache;
  }

  // Cold start: synchronous initial load
  const docs = await ActiveProduct.find({})
    .select('name offerPrice originalPrice image images brand category inStock stockQuantity isFeatured isTrending isNewArrival campusDiscountPct rating reviewCount wholesalePrice resellerPrice description isSlider')
    .populate('category', 'name ancestors slug')
    .populate('brand', 'name slug')
    .lean();

  searchCatalogCache = docs;
  searchCatalogTimestamp = Date.now();
  return searchCatalogCache;
}

/**
 * Ultra-fast in-memory product search with typo tolerance and relevance ranking
 */
export async function searchProductsFast(
  productOrSearch,
  rawSearchOrOptions,
  maybeOptions = {}
) {
  let ActiveProduct = null;
  let rawSearch = "";
  let options = {};

  if (typeof productOrSearch === "string") {
    rawSearch = productOrSearch;
    options = (typeof rawSearchOrOptions === "object" && rawSearchOrOptions !== null) ? rawSearchOrOptions : {};
  } else {
    ActiveProduct = productOrSearch;
    rawSearch = typeof rawSearchOrOptions === "string" ? rawSearchOrOptions : "";
    options = (typeof maybeOptions === "object" && maybeOptions !== null) ? maybeOptions : {};
  }

  const {
    isAdmin = false,
    page = 1,
    limit = 24,
    isPaginated = false,
    brand = null,
    category = null,
    type = null,
    collection = null,
    excludeId = null,
  } = options;

  const parsed = cleanSearchTerm(rawSearch);
  const cleanPhrase = parsed.cleanPhrase;
  const searchTokens = parsed.tokens;
  const meaningfulTokens = searchTokens.filter((t) => !SEARCH_STOP_WORDS.has(t) && t.length >= 2);

  if (!cleanPhrase && meaningfulTokens.length === 0) {
    return { products: [], total: 0, totalPages: 1, currentPage: page, limit };
  }

  const normalizedQuery = cleanPhrase.toLowerCase();
  const filterKey = `${normalizedQuery}__${isAdmin ? "adm" : "usr"}__${brand || ""}__${category || ""}__${type || ""}__${collection || ""}`;

  let rankedCandidates = queryResultCache.get(filterKey);

  if (!rankedCandidates) {
    const catalog = await warmOrGetSearchCatalog(ActiveProduct);

    // Expand search tokens with known typo aliases
    const allVariants = new Set();
    if (cleanPhrase) allVariants.add(normalizedQuery);
    for (const t of meaningfulTokens) {
      allVariants.add(t.toLowerCase());
      const { words } = getFuzzyVariantsForToken(t);
      words.forEach((w) => allVariants.add(w.toLowerCase()));
    }
    const variantList = Array.from(allVariants);

    const matches = [];
    const brandLower = brand ? String(brand).toLowerCase().trim() : null;
    const catLower = category ? String(category).toLowerCase().trim() : null;
    const colLower = collection ? String(collection).toLowerCase().trim() : null;

    for (let i = 0; i < catalog.length; i++) {
      const p = catalog[i];

      // Exclude specific ID if requested
      if (excludeId && String(p._id) === String(excludeId)) continue;

      // Filter by stock if regular user
      if (!isAdmin && p.inStock === false) {
        // Still allow out of stock if directly searched, but lower priority
      }

      // Filter by brand if provided
      if (brandLower) {
        const pBrandName = (p.brand?.name || "").toLowerCase();
        const pBrandSlug = (p.brand?.slug || "").toLowerCase();
        const pBrandId = String(p.brand?._id || p.brand || "").toLowerCase();
        if (pBrandId !== brandLower && pBrandSlug !== brandLower && !pBrandName.includes(brandLower)) {
          continue;
        }
      }

      // Filter by category if provided
      if (catLower) {
        const pCatName = (p.category?.name || "").toLowerCase();
        const pCatSlug = (p.category?.slug || "").toLowerCase();
        const pCatId = String(p.category?._id || p.category || "").toLowerCase();
        if (pCatId !== catLower && pCatSlug !== catLower && !pCatName.includes(catLower)) {
          continue;
        }
      }

      // Filter by collection
      if (colLower) {
        const pNameLower = (p.name || "").toLowerCase();
        if (colLower.includes("combo") && !pNameLower.includes("combo")) continue;
        if (colLower.includes("clearance") && !pNameLower.includes("clearance") && !p.isFeatured) continue;
        if (colLower.includes("flash") && !pNameLower.includes("flash") && !p.isFeatured) continue;
      }

      // Filter by type
      if (type) {
        if (type === "campus15" || type === "max-discount") {
          if ((p.campusDiscountPct || 0) < 15) continue;
        } else if (type === "featured" && !p.isFeatured) {
          continue;
        } else if (type === "trending" && !p.isTrending) {
          continue;
        } else if (type === "new" && !p.isNewArrival) {
          continue;
        } else if (type === "slider" && !p.isSlider) {
          continue;
        }
      }

      const pName = (p.name || "").toLowerCase();
      const bName = (p.brand?.name || (typeof p.brand === "string" ? p.brand : "")).toLowerCase();
      const cName = (p.category?.name || (typeof p.category === "string" ? p.category : "")).toLowerCase();
      const pDesc = (p.description || "").toLowerCase();

      let matched = false;

      // 1. Direct phrase match in product name, brand, or category
      if (cleanPhrase && (pName.includes(normalizedQuery) || bName.includes(normalizedQuery) || cName.includes(normalizedQuery))) {
        matched = true;
      }
      // 2. All meaningful tokens match in name/brand/category
      else if (
        meaningfulTokens.length > 0 &&
        meaningfulTokens.every((t) => pName.includes(t) || bName.includes(t) || cName.includes(t))
      ) {
        matched = true;
      }
      // 3. Typo variants match in name/brand/category
      else {
        for (const v of variantList) {
          if (pName.includes(v) || bName.includes(v) || cName.includes(v)) {
            matched = true;
            break;
          }
        }
      }

      // 4. Fallback search in description if still not matched
      if (!matched && cleanPhrase.length >= 3 && pDesc.includes(normalizedQuery)) {
        matched = true;
      }

      if (matched) {
        matches.push(p);
      }
    }

    // Rank candidates by relevance
    for (let i = 0; i < matches.length; i++) {
      matches[i]._score = scoreProductRelevance(matches[i], cleanPhrase, searchTokens);
    }
    matches.sort((a, b) => (b._score || 0) - (a._score || 0));

    rankedCandidates = matches;

    // Save to query cache with LRU eviction
    if (queryResultCache.size >= MAX_QUERY_CACHE) {
      const oldestKey = queryResultCache.keys().next().value;
      queryResultCache.delete(oldestKey);
    }
    queryResultCache.set(filterKey, rankedCandidates);
  }

  // Sanitize fields if not admin
  const sanitized = isAdmin
    ? rankedCandidates
    : rankedCandidates.map((p) => {
        if (!p.purchasePrice) return p;
        const { purchasePrice, ...rest } = p;
        return rest;
      });

  const total = sanitized.length;
  const skip = (page - 1) * limit;
  const products = isPaginated ? sanitized.slice(skip, skip + limit) : sanitized.slice(0, limit);

  return {
    products,
    total,
    totalPages: Math.ceil(total / limit) || 1,
    currentPage: page,
    limit,
  };
}
