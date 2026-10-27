export function getDiscount(p) {
  const op = Number(p?.originalPrice) || 0;
  const fp = Number(p?.offerPrice) || op;
  if (!op || fp >= op) return 0;
  return Math.round(((op - fp) / op) * 100);
}

export function getSaved(p) {
  const op = Number(p?.originalPrice) || 0;
  const fp = Number(p?.offerPrice) || op;
  return op > fp ? op - fp : 0;
}

/**
 * Returns the verified wholesale price for a product.
 * Rule: Wholesale price must NEVER be higher than or equal to retail offer price.
 */
export function getWholesalePrice(p) {
  if (!p) return 0;
  const retailOffer = Number(p.offerPrice || p.originalPrice || 0);
  const regularMrp = Number(p.originalPrice || p.offerPrice || 0);
  const explicitWs = Number(p.wholesalePrice || 0);

  // 1. If product has an explicit wholesale price that is lower than retailOffer, use it directly!
  if (explicitWs > 0 && retailOffer > 0 && explicitWs < retailOffer) {
    return explicitWs;
  }

  // 2. If wholesalePrice is valid and lower than regular MRP (when no offerPrice)
  if (explicitWs > 0 && regularMrp > 0 && explicitWs < regularMrp && retailOffer <= 0) {
    return explicitWs;
  }

  // 3. Fallback: wholesale price is guaranteed to be 10%-15% lower than the retail offer price
  if (retailOffer > 0) {
    const discounted = Math.round(retailOffer * 0.88);
    return Math.max(1, Math.min(discounted, retailOffer - 1));
  }

  if (regularMrp > 0) {
    return Math.max(1, Math.round(regularMrp * 0.75));
  }

  return explicitWs > 0 ? explicitWs : 100;
}
