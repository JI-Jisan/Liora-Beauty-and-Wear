export function deriveStockStatus(qty) {
  if (qty <= 0) return "Out of Stock";
  if (qty <= 5) return "Limited Stock";
  return "In Stock";
}

export function buildPayload(body) {
  const originalPrice = Number(body.originalPrice);
  const offerPrice = Number(body.offerPrice);
  const purchasePrice = Number(body.purchasePrice ?? 0);
  const stockQuantity = Math.max(0, parseInt(body.stockQuantity) || 0);

  const name = String(body.name || "").trim();
  if (name.length < 2) throw new Error("প্রোডাক্টের নাম দিন");
  if (!Number.isFinite(originalPrice) || originalPrice <= 0)
    throw new Error("সঠিক Original Price দিন");
  if (!Number.isFinite(offerPrice) || offerPrice <= 0)
    throw new Error("সঠিক Offer Price দিন");
  if (offerPrice > originalPrice)
    throw new Error("Offer Price, Original Price এর চেয়ে বেশি হতে পারে না");
  if (!Number.isFinite(purchasePrice) || purchasePrice < 0)
    throw new Error("সঠিক Purchase Price দিন");
  if (offerPrice < purchasePrice)
    throw new Error("Offer Price ক্রয়মূল্যের (Purchase Price) চেয়ে কম হতে পারে না (লোকসান হবে)");

  const images = Array.isArray(body.images)
    ? body.images.filter((u) => typeof u === "string" && u.trim()).slice(0, 3)
    : [];

  return {
    name,
    category: body.category || null,
    brand: body.brand || null,
    purchasePrice,
    originalPrice,
    offerPrice,
    stockQuantity,
    stockStatus: deriveStockStatus(stockQuantity),
    discountBadge: originalPrice > offerPrice ? String(Math.round(((originalPrice - offerPrice) / originalPrice) * 100)) : "",
    image: String(body.image || "").trim(),
    images,
    description: String(body.description || "").trim().slice(0, 5000),
    isFeatured: Boolean(body.isFeatured),
    isTrending: Boolean(body.isTrending),
    isNewArrival: Boolean(body.isNewArrival),
    isSlider: Boolean(body.isSlider),
  };
}
