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
