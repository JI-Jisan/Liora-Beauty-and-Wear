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
