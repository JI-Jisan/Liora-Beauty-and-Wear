/**
 * Intelligent Wholesale Pricing Engine for LIORA B2B
 * Modeled after Aloktori B2B Catalog Analysis:
 * - High spread / Cosmetic sets (Retail >> Cost): 20% - 25% profit markup
 * - High spread Skincare: 18% - 20% profit markup
 * - Good spread items: 12% profit markup
 * - Moderate spread items: 7% - 8% profit markup
 * - Low spread / FMCG fast movers (Shampoo, Toothpaste): 4% - 5% profit markup
 * 
 * Safety Bounds:
 * - Guaranteed wholesale price > costPrice (never sell at cost!)
 * - Guaranteed wholesale price < retailPrice (wholesale is always cheaper than retail)
 */

export function calculateIntelligentWholesalePrice(cost, retail) {
  cost = Number(cost) || 0;
  retail = Number(retail) || 0;

  if (cost <= 0 && retail <= 0) return 0;
  if (cost <= 0) return Math.round(retail * 0.78);
  if (retail <= cost) {
    return Math.round(cost * 1.05);
  }

  const gapPct = ((retail - cost) / cost) * 100;
  let markupPct;

  if (gapPct >= 150) {
    markupPct = 25; // 25% profit
  } else if (gapPct >= 80) {
    markupPct = 20; // 20% profit
  } else if (gapPct >= 40) {
    markupPct = 12; // 12% profit
  } else if (gapPct >= 20) {
    markupPct = 7;  // 7% profit
  } else {
    markupPct = 4;  // 4% profit
  }

  let ws = Math.round(cost * (1 + markupPct / 100));

  // Safety boundaries:
  // 1. Must never sell at or below cost (at least 3% minimum margin)
  ws = Math.max(Math.ceil(cost * 1.03), ws);

  // 2. Must never exceed retail price (ensure at least 2% discount below retail)
  if (ws >= retail) {
    ws = Math.max(Math.ceil(cost * 1.02), Math.round(retail * 0.95));
  }

  return ws;
}
