export function normalizeBdPhone(input) {
  let p = String(input || "").replace(/\D/g, "");
  if (p.startsWith("00880")) p = p.slice(5);
  if (p.startsWith("880")) p = p.slice(3);
  if (p.length === 10 && p.startsWith("1")) p = "0" + p;
  return p;
}

export function isValidBdPhone(p) {
  if (!/^01[3-9]\d{8}$/.test(p)) return false;   // অপারেটর কোড চেক (013-019)
  if (/^(\d)\1{10}$/.test(p)) return false;      // 01111111111 ইত্যাদি ফেক নম্বর
  if (p === "01234567890" || p === "01987654321") return false;
  return true;
}
