export const VALID_CAMPUS_COUPONS = {
  "DIU15": {
    code: "DIU15",
    campus: "Daffodil International University",
    short: "DIU",
    maxDiscount: 15,
    tagColor: "#ff4d6d",
    welcomeTitle: "🎓 DIU Student Privilege Active!",
    welcomeSubtitle: "Daffodil International University campus pricing unlocked (Up to 15% OFF) ✨"
  },
  "EWU15": {
    code: "EWU15",
    campus: "East West University",
    short: "EWU",
    maxDiscount: 15,
    tagColor: "#7c3aed",
    welcomeTitle: "🎓 EWU Student Privilege Active!",
    welcomeSubtitle: "East West University campus pricing unlocked (Up to 15% OFF) ✨"
  },
  "BRAC15": {
    code: "BRAC15",
    campus: "BRAC University",
    short: "BRAC",
    maxDiscount: 15,
    tagColor: "#2563eb",
    welcomeTitle: "🎓 BRACU Student Privilege Active!",
    welcomeSubtitle: "BRAC University campus pricing unlocked (Up to 15% OFF) ✨"
  },
  "NSU15": {
    code: "NSU15",
    campus: "North South University",
    short: "NSU",
    maxDiscount: 15,
    tagColor: "#059669",
    welcomeTitle: "🎓 NSU Student Privilege Active!",
    welcomeSubtitle: "North South University campus pricing unlocked (Up to 15% OFF) ✨"
  },
  "CAMPUS15": {
    code: "CAMPUS15",
    campus: "Campus Student Privilege",
    short: "Campus",
    maxDiscount: 15,
    tagColor: "#ec4899",
    welcomeTitle: "🎓 Student Privilege Active!",
    welcomeSubtitle: "Exclusive campus pricing unlocked across all products (Up to 15% OFF) ✨"
  }
};

export function getCampusCoupon(code) {
  if (!code || typeof code !== "string") return null;
  const clean = code.trim().toUpperCase();
  return VALID_CAMPUS_COUPONS[clean] || null;
}

export function getProductCampusPricing(product, coupon) {
  if (!product || !coupon) return null;

  const regularPrice = Number(product.offerPrice || product.originalPrice || 0);
  const mrp = Number(product.originalPrice || product.offerPrice || regularPrice);
  if (regularPrice <= 0) return null;

  // 1. Use product's database campusDiscountPct if present and > 0
  let discountPct = Number(product.campusDiscountPct || 0);

  // 2. Intelligent fallback if not yet populated or cached (guarantees student discount always activates)
  if (discountPct <= 0) {
    if (mrp > regularPrice && (mrp - regularPrice) / mrp >= 0.15) {
      discountPct = 8;
    } else {
      discountPct = 5;
    }
  }

  // Cap at coupon max (15%) and floor at 5%
  discountPct = Math.min(coupon.maxDiscount || 15, Math.max(5, discountPct));

  const campusPrice = Math.max(1, Math.round(regularPrice * (1 - discountPct / 100)));
  const savedAmount = Math.max(0, regularPrice - campusPrice);
  const savedFromMrp = Math.max(savedAmount, mrp - campusPrice);
  const savedFromMrpPct = mrp > 0 ? Math.round((savedFromMrp / mrp) * 100) : discountPct;

  return {
    hasDiscount: true,
    regularPrice,
    mrp,
    campusPrice,
    discountPct,
    savedAmount,
    savedFromMrp,
    savedFromMrpPct,
    badgeText: `🎓 ${coupon.short} -${discountPct}% OFF`,
    shortName: coupon.short
  };
}
