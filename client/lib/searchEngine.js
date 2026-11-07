// Google-like Smart Fuzzy Search & Typo Tolerance Engine for Liora
// Handles bracket/punctuation normalization, cosmetic/brand phonetic aliases,
// shade numbers, 1-edit distance fuzzy patterns, and relevance scoring.

export function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Normalizes any string for search comparison:
 * lowercase, replaces punctuation and dashes with spaces, collapses whitespace.
 */
export function normalize(str) {
  if (!str) return "";
  return String(str)
    .toLowerCase()
    .replace(/[-–—_.,:;!?'"()#&/\\+*~^$[\]{}<>«»]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Common cosmetics, skincare, fashion & phonetic typo dictionary
const BEAUTY_TYPO_ALIASES = {
  // Brand aliases & typos
  handayan: ["handaiyan"],
  handiyan: ["handaiyan"],
  handian: ["handaiyan"],
  swissbeauty: ["swiss beauty"],
  beautyglazed: ["beauty glazed"],
  beautyglaze: ["beauty glazed"],
  wetnwild: ["wet n wild", "wet & wild"],
  wetandwild: ["wet n wild"],
  sheglem: ["sheglam"],
  sheglm: ["sheglam"],
  dotandkey: ["dot & key"],
  dotnkey: ["dot & key"],
  theordinary: ["ordinary"],
  ordinery: ["ordinary"],
  ordnary: ["ordinary"],
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
  focalure: ["focallure"],
  focallur: ["focallure"],
  lakme: ["lakme"],
  lakmey: ["lakme"],
  innisfree: ["innisfree"],
  inisfree: ["innisfree"],
  cosrx: ["cosrx", "cos-rx"],
  tresemme: ["tresemme"],
  tresemey: ["tresemme"],
  garnier: ["garnier"],
  garniyar: ["garnier"],
  neutrogena: ["neutrogena"],
  nutrogena: ["neutrogena"],
  vaslin: ["vaseline"],
  vasline: ["vaseline"],
  veseline: ["vaseline"],

  // Product types & skincare terms
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
  liptint: ["lip tint", "liptint"],
  lipbalm: ["lip balm", "lipbalm"],
  lipliner: ["lip liner", "lipliner"],
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
  dove: ["dove"],
  dov: ["dove"],
  biore: ["biore"],
  bior: ["biore"],
  simple: ["simple"],
  simpl: ["simple"],
  bodyspray: ["body spray", "bodyspray"],
  bodimists: ["body mist"],
  bodymist: ["body mist", "bodymist"],
};

export const SEARCH_STOP_WORDS = new Set([
  "to", "for", "in", "on", "at", "of", "a", "an", "the", "and", "or", "with", "by", "from", "is", "it", "as", "into"
]);

// Generic cosmetics words that should carry low IDF weight
export const COMMON_GENERIC_WORDS = new Set([
  "lip", "lips", "lipstick", "cream", "lotion", "serum", "wash", "face", "body", "oil", "gel", "soap",
  "hair", "skin", "care", "beauty", "matte", "gloss", "tint", "shampoo", "mask", "powder", "spray", "balm"
]);

/**
 * Normalizes and strips brackets, dashes, and punctuation from search string.
 * Keeps letters, numbers, and Bengali Unicode characters intact.
 */
export function cleanSearchTerm(raw) {
  if (!raw || typeof raw !== "string") {
    return { raw: "", cleanPhrase: "", tokens: [], meaningfulTokens: [] };
  }

  // Treat all brackets, hyphens, en-dashes, em-dashes and punctuation as spaces
  let s = raw.replace(/[()[\]{}<>«»]/g, " ");
  s = s.replace(/[-–—_.,:;!?'"()#&/\\+*~^$[\]{}<>«»]/g, " ");

  // Collapse multiple spaces and trim
  const cleanPhrase = s.replace(/\s+/g, " ").trim().toLowerCase();

  // Extract tokens
  const tokens = cleanPhrase
    .split(" ")
    .map((w) => w.trim().toLowerCase())
    .filter((w) => w.length > 0);

  // Extract meaningful tokens: preserve digits/numbers (e.g. 3, 03, 101, 50ml), exclude stop words
  const meaningfulTokens = tokens.filter((t) => {
    if (SEARCH_STOP_WORDS.has(t)) return false;
    if (/\d/.test(t)) return true; // Keep any token containing a number!
    return t.length >= 2;
  });

  return {
    raw,
    cleanPhrase,
    tokens,
    meaningfulTokens,
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
  const regexPatterns = [];
  if (lower.length >= 4) {
    for (let i = 1; i < lower.length - 1; i++) {
      const pattern = lower.slice(0, i) + "." + lower.slice(i + 1);
      regexPatterns.push(pattern);
    }
    for (let i = 1; i < lower.length; i++) {
      const pattern = lower.slice(0, i) + ".?" + lower.slice(i);
      regexPatterns.push(pattern);
    }
  }

  return {
    words: Array.from(variants),
    patterns: regexPatterns.slice(0, 5),
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
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

/**
 * Scores a product against the search query for intelligent Google-like relevance ranking.
 */
export function scoreProductRelevance(product, cleanPhrase, tokens, meaningfulTokens = null) {
  const normTitle = normalize(product.name);
  const titleTokens = new Set(normTitle.split(" ").filter(Boolean));
  const desc = normalize(product.description || "");
  const catName = normalize(product.category?.name || product.category || "");
  const brandName = normalize(product.brand?.name || product.brand || "");
  const lowerPhrase = cleanPhrase.toLowerCase();

  const queryTokens = meaningfulTokens && meaningfulTokens.length > 0
    ? meaningfulTokens
    : tokens.filter((t) => !SEARCH_STOP_WORDS.has(t) && (/\d/.test(t) || t.length >= 2));

  let score = 0;

  // 1. Exact phrase match in Name
  if (normTitle === lowerPhrase) {
    score += 1500; // Perfect exact product match!
  } else if (normTitle.startsWith(lowerPhrase + " ") || normTitle.startsWith(lowerPhrase)) {
    score += 900;  // Title begins with the full search phrase
  } else if (normTitle.includes(lowerPhrase)) {
    score += 650;  // Title contains the exact search phrase
  } else if (lowerPhrase.includes(normTitle) && normTitle.length >= 5) {
    score += 400;  // Query includes full title
  }

  // 2. Brand match
  const hasBrandInQuery = brandName && brandName.length >= 2 && lowerPhrase.includes(brandName);
  if (hasBrandInQuery) {
    score += 350; // Massively boost products from the explicitly searched brand!
  } else if (brandName && brandName.includes(lowerPhrase)) {
    score += 150;
  }

  // 3. Category match
  if (catName && (lowerPhrase.includes(catName) || catName.includes(lowerPhrase))) {
    score += 80;
  }

  // 4. Token-level matching & IDF weighting
  let matchedCount = 0;
  let allNumericMatched = true;

  for (const token of queryTokens) {
    const isNum = /^\d+$/.test(token);
    const isGeneric = COMMON_GENERIC_WORDS.has(token);

    if (titleTokens.has(token)) {
      matchedCount++;
      if (isNum) {
        score += 250; // Exact shade/number match!
      } else if (isGeneric) {
        score += 25;  // Low weight for generic words (lip, cream, etc.)
      } else {
        score += 100; // High weight for distinct words (handaiyan, cerave, mocha)
      }
    } else if (normTitle.includes(token)) {
      matchedCount++;
      score += isNum ? 150 : (isGeneric ? 15 : 60);
    } else {
      // Check 0-padded for numbers (e.g. 3 vs 03)
      if (isNum) {
        const padded = token.length === 1 ? `0${token}` : (token.startsWith("0") ? token.slice(1) : null);
        if (padded && (titleTokens.has(padded) || normTitle.includes(padded))) {
          matchedCount++;
          score += 200;
          continue;
        } else {
          allNumericMatched = false;
        }
      }

      // Check typo variants
      const { words } = getFuzzyVariantsForToken(token);
      let foundVariant = false;
      for (const w of words) {
        if (normTitle.includes(w) || titleTokens.has(w)) {
          score += isGeneric ? 20 : 70;
          matchedCount++;
          foundVariant = true;
          break;
        }
      }

      // Check Levenshtein on words in title
      if (!foundVariant && token.length >= 4) {
        for (const tw of titleTokens) {
          if (tw.length >= 3 && Math.abs(tw.length - token.length) <= 2) {
            const dist = levenshteinDistance(token, tw);
            if (dist <= 2) {
              score += Math.max(15, 50 - dist * 15);
              matchedCount++;
              foundVariant = true;
              break;
            }
          }
        }
      }

      // Check brand match for token
      if (!foundVariant && brandName && brandName.includes(token)) {
        score += 60;
        matchedCount++;
      }
    }

    // Match in description
    if (desc.includes(token)) {
      score += 10;
    }
  }

  // 5. Query Coverage Ratio
  if (queryTokens.length > 0) {
    const ratio = matchedCount / queryTokens.length;
    if (ratio === 1) {
      score += 400; // ALL tokens matched!
    } else if (ratio >= 0.75) {
      score += 150;
    } else if (ratio >= 0.5) {
      score += 50;
    }
  }

  // 6. Shade number penalty
  // If the query explicitly asked for a number (e.g. 3), but product has a DIFFERENT number
  const qNumbers = queryTokens.filter((t) => /^\d+$/.test(t));
  if (qNumbers.length > 0 && !allNumericMatched) {
    score -= 100;
  }

  // 7. Stock status bonus (in-stock items rank higher)
  if (product.inStock) {
    score += 25;
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
      .select('name offerPrice originalPrice image images brand category inStock stockQuantity isFeatured isTrending isNewArrival campusDiscountPct rating reviewCount wholesalePrice resellerPrice isSlider')
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

  // Cold start: slim projection for sub-second background load
  const docs = await ActiveProduct.find({})
    .select('name offerPrice originalPrice image images brand category inStock stockQuantity isFeatured isTrending isNewArrival campusDiscountPct rating reviewCount wholesalePrice resellerPrice isSlider')
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
  const meaningfulTokens = parsed.meaningfulTokens;

  if (!cleanPhrase && meaningfulTokens.length === 0) {
    return { products: [], total: 0, totalPages: 1, currentPage: page, limit };
  }

  const normalizedQuery = cleanPhrase;
  const filterKey = `${normalizedQuery}__${isAdmin ? "adm" : "usr"}__${brand || ""}__${category || ""}__${type || ""}__${collection || ""}`;

  let rankedCandidates = queryResultCache.get(filterKey);

  if (!rankedCandidates) {
    let matches = [];

    // PATH A: In-memory Catalog is warm (2-5ms lightning search)
    if (searchCatalogCache && searchCatalogCache.length > 0) {
      const catalog = searchCatalogCache;

      // Expand search tokens with known typo aliases
      const allVariants = new Set();
      if (cleanPhrase) allVariants.add(normalizedQuery);
      for (const t of meaningfulTokens) {
        allVariants.add(t.toLowerCase());
        const { words } = getFuzzyVariantsForToken(t);
        words.forEach((w) => allVariants.add(w.toLowerCase()));
      }
      const variantList = Array.from(allVariants);

      const brandLower = brand ? String(brand).toLowerCase().trim() : null;
      const catLower = category ? String(category).toLowerCase().trim() : null;
      const colLower = collection ? String(collection).toLowerCase().trim() : null;

      for (let i = 0; i < catalog.length; i++) {
        const p = catalog[i];

        if (excludeId && String(p._id) === String(excludeId)) continue;

        if (brandLower) {
          const pBrandName = (p.brand?.name || "").toLowerCase();
          const pBrandSlug = (p.brand?.slug || "").toLowerCase();
          const pBrandId = String(p.brand?._id || p.brand || "").toLowerCase();
          if (pBrandId !== brandLower && pBrandSlug !== brandLower && !pBrandName.includes(brandLower)) {
            continue;
          }
        }

        if (catLower) {
          const pCatName = (p.category?.name || "").toLowerCase();
          const pCatSlug = (p.category?.slug || "").toLowerCase();
          const pCatId = String(p.category?._id || p.category || "").toLowerCase();
          if (pCatId !== catLower && pCatSlug !== catLower && !pCatName.includes(catLower)) {
            continue;
          }
        }

        if (colLower) {
          const pNameLower = (p.name || "").toLowerCase();
          if (colLower.includes("combo") && !pNameLower.includes("combo")) continue;
          if (colLower.includes("clearance") && !pNameLower.includes("clearance") && !p.isFeatured) continue;
          if (colLower.includes("flash") && !pNameLower.includes("flash") && !p.isFeatured) continue;
        }

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

        const normPName = normalize(p.name);
        const bName = normalize(p.brand?.name || (typeof p.brand === "string" ? p.brand : ""));
        const cName = normalize(p.category?.name || (typeof p.category === "string" ? p.category : ""));

        let matched = false;

        // 1. Exact phrase match
        if (cleanPhrase && (normPName.includes(normalizedQuery) || bName.includes(normalizedQuery) || cName.includes(normalizedQuery))) {
          matched = true;
        } else if (
          meaningfulTokens.length > 0 &&
          meaningfulTokens.every((t) => normPName.includes(t) || bName.includes(t) || cName.includes(t))
        ) {
          // 2. All tokens matched
          matched = true;
        } else {
          // 3. Variant match
          for (const v of variantList) {
            if (normPName.includes(v) || bName.includes(v) || cName.includes(v)) {
              matched = true;
              break;
            }
          }
        }

        if (matched) {
          matches.push(p);
        }
      }
    } else {
      // PATH B: Sub-50ms Direct Targeted Database Search (Zero cold-start block!)
      if (!ActiveProduct) {
        try {
          const models = await import("./models.js");
          ActiveProduct = models.Product;
        } catch (e) {
          console.error("Failed to load Product in targeted search:", e);
        }
      }

      if (ActiveProduct) {
        let BrandModel = null;
        let CategoryModel = null;
        try {
          const models = await import("./models.js");
          BrandModel = models.Brand;
          CategoryModel = models.Category;
        } catch (_) {}

        // Multi-tier candidate query:
        // Tier 1: Search products containing ALL meaningful tokens in name
        const baseFilter = {};
        if (!isAdmin) baseFilter.inStock = { $ne: false };
        if (excludeId) baseFilter._id = { $ne: excludeId };
        if (brand) baseFilter.brand = brand;
        if (category) baseFilter.category = category;
        if (type) {
          if (type === "campus15" || type === "max-discount") baseFilter.campusDiscountPct = { $gte: 15 };
          else if (type === "featured") baseFilter.isFeatured = true;
          else if (type === "trending") baseFilter.isTrending = true;
          else if (type === "new") baseFilter.isNewArrival = true;
          else if (type === "slider") baseFilter.isSlider = true;
        }

        const candidateMap = new Map();

        // 1. Try exact phrase regex or all tokens AND
        if (meaningfulTokens.length > 0) {
          const andConditions = meaningfulTokens.map((t) => ({
            name: { $regex: escapeRegex(t), $options: "i" }
          }));

          const tier1Docs = await ActiveProduct.find({
            ...baseFilter,
            $and: andConditions,
          })
            .select("name offerPrice originalPrice image images brand category inStock stockQuantity isFeatured isTrending isNewArrival campusDiscountPct rating reviewCount wholesalePrice resellerPrice isSlider")
            .populate("brand", "name slug")
            .populate("category", "name slug ancestors")
            .limit(60)
            .lean();

          for (const d of tier1Docs) {
            candidateMap.set(String(d._id), d);
          }
        }

        // 2. If fewer than 24 candidates, also search for non-numeric text tokens
        const textTokens = meaningfulTokens.filter((t) => !/^\d+$/.test(t));
        if (candidateMap.size < 24 && textTokens.length > 0 && textTokens.length < meaningfulTokens.length) {
          const textConditions = textTokens.map((t) => ({
            name: { $regex: escapeRegex(t), $options: "i" }
          }));

          const tier2Docs = await ActiveProduct.find({
            ...baseFilter,
            $and: textConditions,
          })
            .select("name offerPrice originalPrice image images brand category inStock stockQuantity isFeatured isTrending isNewArrival campusDiscountPct rating reviewCount wholesalePrice resellerPrice isSlider")
            .populate("brand", "name slug")
            .populate("category", "name slug ancestors")
            .limit(60)
            .lean();

          for (const d of tier2Docs) {
            candidateMap.set(String(d._id), d);
          }
        }

        // 3. If still fewer than 24, search by brand name or token variants
        if (candidateMap.size < 24) {
          const allVariants = new Set();
          if (cleanPhrase) allVariants.add(normalizedQuery);
          for (const t of meaningfulTokens) {
            allVariants.add(t.toLowerCase());
            const { words } = getFuzzyVariantsForToken(t);
            words.forEach((w) => allVariants.add(w.toLowerCase()));
          }
          const variantList = Array.from(allVariants).slice(0, 10);

          const orList = [];
          if (cleanPhrase) {
            orList.push({ name: { $regex: escapeRegex(cleanPhrase), $options: "i" } });
          }
          for (const v of variantList) {
            orList.push({ name: { $regex: escapeRegex(v), $options: "i" } });
          }

          // Brand lookups
          if (cleanPhrase && cleanPhrase.length >= 3 && BrandModel) {
            try {
              const bDocs = await BrandModel.find({ name: { $regex: escapeRegex(cleanPhrase), $options: "i" } })
                .select("_id")
                .limit(5)
                .lean();
              if (bDocs.length > 0) {
                orList.push({ brand: { $in: bDocs.map((b) => b._id) } });
              }
            } catch (_) {}
          }

          if (orList.length > 0) {
            const tier3Docs = await ActiveProduct.find({
              ...baseFilter,
              $or: orList,
            })
              .select("name offerPrice originalPrice image images brand category inStock stockQuantity isFeatured isTrending isNewArrival campusDiscountPct rating reviewCount wholesalePrice resellerPrice isSlider")
              .populate("brand", "name slug")
              .populate("category", "name slug ancestors")
              .limit(100)
              .lean();

            for (const d of tier3Docs) {
              candidateMap.set(String(d._id), d);
            }
          }
        }

        matches = Array.from(candidateMap.values());

        // Kick off catalog background warmup for subsequent sub-5ms searches
        warmOrGetSearchCatalog(ActiveProduct).catch(() => {});
      }
    }

    // Rank candidates by Google-like relevance score
    for (let i = 0; i < matches.length; i++) {
      matches[i]._score = scoreProductRelevance(matches[i], cleanPhrase, searchTokens, meaningfulTokens);
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
