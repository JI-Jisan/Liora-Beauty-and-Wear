export function deriveStockStatus(qty) {
  if (qty <= 0) return "Out of Stock";
  if (qty <= 5) return "Limited Stock";
  return "In Stock";
}

export function buildPayload(body, isUpdate = false, existing = null) {
  const rawOrig = body.originalPrice !== undefined && body.originalPrice !== "" ? body.originalPrice : (existing?.originalPrice ?? 0);
  const rawOffer = body.offerPrice !== undefined && body.offerPrice !== "" ? body.offerPrice : (body.price !== undefined && body.price !== "" ? body.price : (existing?.offerPrice ?? 0));
  const rawPurchase = body.purchasePrice !== undefined && body.purchasePrice !== "" ? body.purchasePrice : (existing?.purchasePrice ?? 0);
  const rawStock = body.stockQuantity !== undefined && body.stockQuantity !== "" ? body.stockQuantity : (existing?.stockQuantity ?? 0);

  let originalPrice = Number(rawOrig);
  let offerPrice = Number(rawOffer);
  const purchasePrice = Number(rawPurchase);
  const stockQuantity = Math.max(0, parseInt(rawStock) || 0);

  const rawName = body.name !== undefined ? body.name : existing?.name;
  const name = String(rawName || "").trim();
  if (name.length < 2 && !isUpdate) throw new Error("প্রোডাক্টের নাম দিন");

  // If one price is given and the other is 0 or missing, sync them
  if ((!Number.isFinite(originalPrice) || originalPrice <= 0) && Number.isFinite(offerPrice) && offerPrice > 0) {
    originalPrice = offerPrice;
  }
  if ((!Number.isFinite(offerPrice) || offerPrice <= 0) && Number.isFinite(originalPrice) && originalPrice > 0) {
    offerPrice = originalPrice;
  }

  if (!Number.isFinite(originalPrice) || originalPrice <= 0)
    throw new Error("সঠিক Price দিন");
  if (!Number.isFinite(offerPrice) || offerPrice <= 0)
    throw new Error("সঠিক Price দিন");

  // If offer price is higher than regular price, auto-adjust regular price
  if (offerPrice > originalPrice) {
    originalPrice = offerPrice;
  }

  const images = Array.isArray(body.images)
    ? body.images.filter((u) => typeof u === "string" && u.trim()).slice(0, 3)
    : (existing?.images || []);

  const rawImage = body.image !== undefined ? body.image : (existing?.image || "");
  const rawDesc = body.description !== undefined ? body.description : (existing?.description || "");
  const rawCat = body.category !== undefined ? body.category : existing?.category;
  const rawBrand = body.brand !== undefined ? body.brand : existing?.brand;

  const validCategory =
    rawCat && typeof rawCat === "object" && rawCat._id
      ? rawCat._id
      : (typeof rawCat === "string" && /^[0-9a-fA-F]{24}$/.test(rawCat) ? rawCat : null);

  const validBrand =
    rawBrand && typeof rawBrand === "object" && rawBrand._id
      ? rawBrand._id
      : (typeof rawBrand === "string" && /^[0-9a-fA-F]{24}$/.test(rawBrand) ? rawBrand : null);

  return {
    name: name || existing?.name || "Product",
    category: validCategory,
    brand: validBrand,
    purchasePrice: Number.isFinite(purchasePrice) ? purchasePrice : 0,
    originalPrice,
    offerPrice,
    stockQuantity,
    stockStatus: deriveStockStatus(stockQuantity),
    inStock: stockQuantity > 0 && deriveStockStatus(stockQuantity) !== "Out of Stock",
    discountBadge: originalPrice > offerPrice ? String(Math.round(((originalPrice - offerPrice) / originalPrice) * 100)) : "",
    image: String(rawImage || "").trim(),
    images,
    description: String(rawDesc || "").trim().slice(0, 5000),
    isFeatured: body.isFeatured !== undefined ? Boolean(body.isFeatured) : Boolean(existing?.isFeatured),
    isTrending: body.isTrending !== undefined ? Boolean(body.isTrending) : Boolean(existing?.isTrending),
    isNewArrival: body.isNewArrival !== undefined ? Boolean(body.isNewArrival) : Boolean(existing?.isNewArrival),
    isSlider: body.isSlider !== undefined ? Boolean(body.isSlider) : Boolean(existing?.isSlider),
  };
}
