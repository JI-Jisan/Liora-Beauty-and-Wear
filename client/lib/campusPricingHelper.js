/**
 * Computes safe campus pricing with guaranteed 12%-15% minimum profit floor
 * and snaps the resulting price to end in 1 or 11.
 */
export function calculateSafeCampusPrice(offerPrice, cost, desiredDiscountPct = 15, minProfitPct = 12) {
  const regular = Number(offerPrice) || 0;
  const unitCost = Number(cost) || 0;
  if (regular <= 0) return { price: 0, discountPct: 0, profit: 0, marginPct: 0 };

  // If cost is 0, fallback to nominal cost (72% of regular price)
  const safeCost = unitCost > 0 ? unitCost : Math.round(regular * 0.72);

  // Minimum price required to guarantee at least minProfitPct (default 12%)
  const minSafePrice = Math.ceil(safeCost / (1 - (minProfitPct / 100)));

  // Product's profit margin at regular price
  const regularMargin = regular > safeCost ? (regular - safeCost) / regular : 0;

  // Safe discount allowed
  let allowedPct = Number(desiredDiscountPct) || 15;
  if (allowedPct > 15) allowedPct = 15;

  // If margin is under 18%, cannot give discount without dipping below 12-15% floor
  if (regularMargin < 0.18) {
    allowedPct = 0;
  } else if (regularMargin < 0.25) {
    allowedPct = Math.min(allowedPct, 6);
  } else if (regularMargin < 0.30) {
    allowedPct = Math.min(allowedPct, 10);
  }

  // Calculate candidate price
  let target = Math.round(regular * (1 - allowedPct / 100));
  if (target < minSafePrice && regular >= minSafePrice) {
    target = minSafePrice;
  }

  // Snap to 1 or 11
  let chosen = target;
  let r1 = chosen % 10;
  let cand1 = r1 === 1 ? chosen : (r1 === 0 ? chosen - 9 : chosen - (r1 - 1));
  if (cand1 < minSafePrice && regular >= minSafePrice) {
    // Snap UP to next 1 so profit is preserved
    let d = minSafePrice % 10;
    cand1 = d <= 1 ? minSafePrice + (1 - d) : minSafePrice + (11 - d);
  }

  let r100 = chosen % 100;
  let cand11 = null;
  if (r100 >= 11) cand11 = chosen - (r100 - 11);
  else if (chosen >= 111) cand11 = chosen - (r100 + 89);

  if (cand11 !== null && cand11 >= minSafePrice && (chosen - cand11) <= 15) {
    chosen = cand11;
  } else {
    chosen = cand1;
  }

  if (chosen > regular) chosen = regular;
  if (chosen < minSafePrice && regular >= minSafePrice) {
    chosen = cand1 <= regular ? cand1 : regular;
  }

  const unitProfit = chosen - unitCost;
  const marginPct = chosen > 0 ? parseFloat(((unitProfit / chosen) * 100).toFixed(1)) : 0;
  const actualDiscountPct = regular > chosen ? Math.round(((regular - chosen) / regular) * 100) : 0;

  return {
    price: chosen,
    discountPct: actualDiscountPct,
    profit: unitProfit,
    marginPct: marginPct,
  };
}
