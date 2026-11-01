import { jsPDF } from "jspdf";
import QRCode from "qrcode";

const KNOWN_BRANDS = [
  "Beauty Glazed", "The Ordinary", "Maybelline", "L'Oreal", "Loreal", "Simple",
  "Bioaqua", "Wet n Wild", "MARS", "W7", "Swiss Beauty", "Ponds", "Pond's", "Garnier",
  "Neutrogena", "Cosrx", "Technic", "Sebamed", "Dot & Key", "Focallure", "Plix",
  "CeraVe", "Cetaphil", "Innisfree", "Nivea", "Paxmoly", "Skin Cafe", "Ribana",
  "Rajkonna", "Missha", "Laikou", "Fenyi", "Breylee", "Lanbena", "Sunsilk",
  "Axe Brand", "Enchanteur", "Caplino", "Skino", "Skin O", "Axis-y", "Innsaei",
  "Dove", "Tresemme", "Head & Shoulders", "Pantene", "Mamaearth", "Vaseline",
  "SKIN1004", "Purito", "IUNIK", "Arencia", "Medicube", "Etude", "Handaiyan",
  "Mary&May", "BOB", "I'M From", "3W Clinic", "Cos De BAHA", "Some By Mi",
  "Tiam", "Haruharu", "Beauty of Joseon", "Anua", "Torriden", "Round Lab",
  "Dermacol", "O.TWO.O", "PinkFlash"
];

export function detectBrand(item) {
  if (item.brandName && String(item.brandName).trim() && !["other", "others", "none", "null"].includes(String(item.brandName).trim().toLowerCase())) {
    return String(item.brandName).trim();
  }
  const name = String(item.productName || item.name || "").trim();
  const lowerName = name.toLowerCase();
  for (const b of KNOWN_BRANDS) {
    if (lowerName.includes(b.toLowerCase())) return b;
  }
  return "General Brands";
}

export function detectCategory(item) {
  if (item.categoryName && String(item.categoryName).trim() && !["other", "others", "none", "null"].includes(String(item.categoryName).trim().toLowerCase())) {
    return String(item.categoryName).trim();
  }
  const name = String(item.productName || item.name || "").toLowerCase();
  if (name.includes("soap") || name.includes("shower gel") || name.includes("body wash") || name.includes("bath soap")) return "Soap & Body Wash";
  if (name.includes("shampoo") || name.includes("conditioner") || name.includes("hair oil") || name.includes("hair")) return "Hair Care";
  if (name.includes("serum") || name.includes("ampoule") || name.includes("essence")) return "Serums & Treatments";
  if (name.includes("toner") || name.includes("mist")) return "Toners & Mists";
  if (name.includes("cream") || name.includes("moisturiz") || name.includes("lotion") || name.includes("gel")) return "Creams & Moisturizers";
  if (name.includes("sunscreen") || name.includes("sun block") || name.includes("spf")) return "Sun Protection";
  if (name.includes("cleanser") || name.includes("facewash") || name.includes("face wash") || name.includes("foam")) return "Cleansers & Facewash";
  if (name.includes("lip") || name.includes("lipstick") || name.includes("kajal") || name.includes("eyeliner") || name.includes("mascara") || name.includes("powder") || name.includes("foundation") || name.includes("blush")) return "Makeup & Cosmetics";
  return "Cosmetics & Personal Care";
}

export function groupItemsByBrandAndCategory(items = []) {
  const brandMap = new Map();

  items.forEach((item, idx) => {
    const brand = detectBrand(item);
    const category = detectCategory(item);

    if (!brandMap.has(brand)) {
      brandMap.set(brand, {
        brandName: brand,
        categories: new Map(),
        totalPcs: 0,
        subtotal: 0,
      });
    }

    const bGroup = brandMap.get(brand);
    const qty = Number(item.quantity) || 1;
    const price = Number(item.price) || 0;
    const lineTotal = price * qty;

    bGroup.totalPcs += qty;
    bGroup.subtotal += lineTotal;

    if (!bGroup.categories.has(category)) {
      bGroup.categories.set(category, {
        categoryName: category,
        items: [],
        totalPcs: 0,
        subtotal: 0,
      });
    }

    const cGroup = bGroup.categories.get(category);
    cGroup.items.push({ ...item, originalIndex: idx + 1 });
    cGroup.totalPcs += qty;
    cGroup.subtotal += lineTotal;
  });

  return Array.from(brandMap.values()).map((bGroup) => ({
    brandName: bGroup.brandName,
    totalPcs: bGroup.totalPcs,
    subtotal: bGroup.subtotal,
    categories: Array.from(bGroup.categories.values()),
  }));
}

/**
 * Main Download Function:
 * Automatically selects the appropriate invoice design:
 * 1. Retail Normal -> Classic official LIORA branding
 * 2. Retail DIU15 -> Official LIORA branding + DIU15 Coupon Tag & Savings Breakdown
 * 3. Reseller -> Pure White-Label ("সাদামাটা"), NO LIORA branding, neutral Commercial Invoice
 * 4. Wholesale -> Grouped hierarchically by Brand ➔ Category in serial order
 */
export async function downloadInvoicePdf(order) {
  if (!order) return;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const orderType = String(order.orderType || order.role || "retail").toLowerCase();
  const isReseller = orderType === "reseller";
  const isWholesale = orderType === "wholesale";

  // Coupon Detection (e.g. DU15, BRAC15, NSU15, CAMPUS15)
  const noteMatch = (order.note || "").match(/(?:Privilege|Coupon|Campus):\s*([A-Za-z0-9_-]+)/i);
  const rawCoupon = (
    order.couponCode ||
    (noteMatch ? noteMatch[1] : "") ||
    (order.discount > 0 && !isReseller && !isWholesale ? "CAMPUS15" : "")
  ).toUpperCase();
  const couponCode = rawCoupon.trim();
  const isCampusOrder = Boolean(couponCode && !isReseller && !isWholesale);
  const isDIU15 = isCampusOrder;

  const orderNo = order.orderNumber || `LIORA-${order._id ? String(order._id).slice(-8) : Date.now()}`;

  if (isReseller) {
    await renderResellerInvoice(doc, order, orderNo);
    doc.save(`Commercial-Invoice-${orderNo}.pdf`);
  } else if (isWholesale) {
    await renderWholesaleInvoice(doc, order, orderNo);
    doc.save(`Wholesale-Invoice-${orderNo}.pdf`);
  } else {
    await renderRetailInvoice(doc, order, orderNo, isDIU15, couponCode);
    doc.save(`Invoice-${orderNo}.pdf`);
  }
}

// ============================================================================
// 1 & 2. RETAIL INVOICE (Normal & DIU15 Student Privilege)
// ============================================================================
async function renderRetailInvoice(doc, order, orderNo, isDIU15, couponCode) {
  const dateStr = order.createdAt
    ? new Date(order.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
    : new Date().toLocaleDateString("en-US");

  const customerName = order.customerName || "Valued Customer";
  const phone = order.phone || "";
  const district = order.district || (order.deliveryZone?.includes("inside") ? "Dhaka" : "Outside Dhaka");
  const address = order.address || "";
  const subtotal = Number(order.subtotal) || 0;
  const deliveryCharge = Number(order.deliveryCharge) || 0;
  const rawDiscount = Number(order.discount) || 0;
  const total =
    order.total !== undefined && order.total !== null && !isNaN(order.total)
      ? Number(order.total)
      : Math.max(0, subtotal + deliveryCharge - rawDiscount);
  const computedDiscount = Math.max(0, subtotal + deliveryCharge - total);
  const discount = rawDiscount > 0 ? rawDiscount : computedDiscount;
  const status = order.status || "Pending";
  const items = Array.isArray(order.items) ? order.items : [];

  // Colors
  const primaryColor = [225, 29, 72]; // Rose-600 #e11d48
  const diuGreen = [22, 163, 74];     // Emerald Green #16a34a
  const darkNavy = [15, 23, 42];      // Slate-900 #0f172a
  const textMuted = [100, 116, 139];  // Slate-500
  const lightBg = [248, 250, 252];    // Slate-50
  const borderLine = [226, 232, 240]; // Slate-200

  // Top Decorative Bar (Solid LIORA Rose)
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 210, 5, "F");

  // Header Section
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...darkNavy);
  doc.text("LIORA", 14, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...primaryColor);
  doc.text("BEAUTY & WEAR", 14, 23);

  doc.setFontSize(7.5);
  doc.setTextColor(...textMuted);
  doc.text("Authentic Skincare, Cosmetics & Fashion Wear", 14, 27);
  doc.text("Web: liorabeautyandwear.com  |  Email: liorabeautyandwear@gmail.com", 14, 31);

  // Invoice Title on Right
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...darkNavy);
  doc.text("INVOICE", 196, 18, { align: "right" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...primaryColor);
  doc.text(`#${orderNo}`, 196, 24, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...textMuted);
  doc.text(`Date: ${dateStr}`, 196, 29, { align: "right" });
  doc.text(`Status: ${status.toUpperCase()}`, 196, 33.5, { align: "right" });

  // Divider line
  doc.setDrawColor(...borderLine);
  doc.setLineWidth(0.4);
  doc.line(14, 37, 196, 37);

  // Customer & Delivery Info Box
  doc.setFillColor(...lightBg);
  doc.roundedRect(14, 41, 182, 33, 2, 2, "F");
  doc.setDrawColor(...borderLine);
  doc.roundedRect(14, 41, 182, 33, 2, 2, "D");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...darkNavy);
  doc.text("BILL TO / DELIVERY DETAILS:", 19, 47);

  // DIU15 / Campus Coupon Pill Tag
  if (isDIU15 && couponCode) {
    doc.setFillColor(240, 253, 244);
    doc.roundedRect(128, 43, 32, 4.5, 1.2, 1.2, "F");
    doc.setDrawColor(34, 197, 94);
    doc.setLineWidth(0.25);
    doc.roundedRect(128, 43, 32, 4.5, 1.2, 1.2, "D");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.2);
    doc.setTextColor(...diuGreen);
    doc.text(`Coupon: ${couponCode}`, 144, 46.2, { align: "center" });
  }

  // Customer details
  const textYStart = 53;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.2);
  doc.setTextColor(...textMuted);
  doc.text("Customer Name: ", 19, textYStart);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...darkNavy);
  doc.text(customerName, 19 + doc.getTextWidth("Customer Name: "), textYStart);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textMuted);
  doc.text("Phone Number: ", 19, textYStart + 4.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...darkNavy);
  doc.text(phone, 19 + doc.getTextWidth("Phone Number: "), textYStart + 4.5);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textMuted);
  doc.text("District: ", 19, textYStart + 9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...darkNavy);
  doc.text(district, 19 + doc.getTextWidth("District: "), textYStart + 9);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textMuted);
  doc.text("Address: ", 19, textYStart + 13.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...darkNavy);
  doc.text(address.slice(0, 48), 19 + doc.getTextWidth("Address: "), textYStart + 13.5);
  if (address.length > 48) {
    doc.text(address.slice(48, 96), 19, textYStart + 17.5);
  }

  // Payment Method
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...darkNavy);
  doc.text("PAYMENT METHOD:", 114, textYStart);
  doc.setFont("helvetica", "bold");
  doc.text("Cash on Delivery (COD)", 114, textYStart + 4.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textMuted);
  doc.text("Currency: BDT (Tk)", 114, textYStart + 9);

  // QR Code Generation & Embedding
  try {
    const siteUrl = typeof window !== "undefined" && window.location?.origin ? window.location.origin : "https://liorabeautyandwear.com";
    const verifyUrl = order.accessToken
      ? `${siteUrl}/order/verify?no=${encodeURIComponent(orderNo)}&k=${encodeURIComponent(order.accessToken)}`
      : `${siteUrl}/order-tracking?query=${encodeURIComponent(orderNo)}`;

    const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
      margin: 1,
      width: 140,
      color: { dark: "#0f172a", light: "#ffffff" },
    });

    doc.setFillColor(255, 255, 255);
    doc.roundedRect(165, 43, 28, 29, 2, 2, "F");
    doc.setDrawColor(...borderLine);
    doc.roundedRect(165, 43, 28, 29, 2, 2, "D");

    doc.addImage(qrDataUrl, "PNG", 167.5, 44.5, 23, 23);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(5.5);
    doc.setTextColor(...primaryColor);
    doc.text("SCAN TO VERIFY", 179, 70, { align: "center" });
  } catch (qrErr) {
    // optional QR fallback
  }

  // Products Table Header
  let tableY = 78;
  doc.setFillColor(...darkNavy);
  doc.rect(14, tableY, 182, 8, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text("SL", 18, tableY + 5.5);
  doc.text("ITEM DESCRIPTION", 32, tableY + 5.5);
  doc.text("QTY", 130, tableY + 5.5, { align: "center" });
  doc.text("PRICE (Tk)", 160, tableY + 5.5, { align: "right" });
  doc.text("TOTAL (Tk)", 191, tableY + 5.5, { align: "right" });

  tableY += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);

  items.forEach((item, index) => {
    if (tableY > 260) {
      doc.addPage();
      tableY = 20;
    }

    const isEven = index % 2 === 0;
    const name = item.productName || item.name || "Product Item";
    const itemLines = doc.splitTextToSize(name, 90);
    const lineCount = Array.isArray(itemLines) ? itemLines.length : 1;

    const price = Number(item.price) || 0;
    const origPrice = Number(item.originalPrice) || 0;
    const hasDiscount = origPrice > price;

    const rowHeight = hasDiscount || lineCount > 1 ? Math.max(9.5, 4.5 + lineCount * 3.8) : 8;

    if (isEven) {
      doc.setFillColor(253, 253, 254);
      doc.rect(14, tableY, 182, rowHeight, "F");
    }

    doc.setTextColor(...darkNavy);
    const textBaseY = tableY + (hasDiscount ? 5.5 : 5);
    doc.text(String(index + 1), 18, textBaseY);
    doc.text(itemLines, 32, textBaseY);

    const qty = Number(item.quantity) || 1;
    doc.text(String(qty), 130, textBaseY, { align: "center" });

    const priceX = 160;
    if (hasDiscount) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.8);
      doc.setTextColor(148, 163, 184);
      const origText = `Tk ${origPrice.toLocaleString()}`;
      const origWidth = doc.getTextWidth(origText);
      const origY = tableY + 3.8;
      doc.text(origText, priceX, origY, { align: "right" });
      doc.setDrawColor(225, 29, 72);
      doc.setLineWidth(0.25);
      doc.line(priceX - origWidth, origY - 0.7, priceX, origY - 0.7);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(...darkNavy);
      doc.text(`Tk ${price.toLocaleString()}`, priceX, tableY + 7.6, { align: "right" });
    } else {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(...darkNavy);
      doc.text(`Tk ${price.toLocaleString()}`, priceX, textBaseY, { align: "right" });
    }

    const rowTotal = price * qty;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...darkNavy);
    doc.text(`Tk ${rowTotal.toLocaleString()}`, 191, textBaseY, { align: "right" });

    doc.setDrawColor(...borderLine);
    doc.setLineWidth(0.2);
    doc.line(14, tableY + rowHeight, 196, tableY + rowHeight);

    tableY += rowHeight;
  });

  // Calculate Market Value (MRP) and Savings
  let totalMrp = 0;
  items.forEach((item) => {
    const qty = Number(item.quantity) || 1;
    const pOrig = Number(item.originalPrice) || Number(item.mrp) || Number(item.regularPrice) || Number(item.price) || 0;
    totalMrp += pOrig * qty;
  });
  if (totalMrp <= subtotal && discount > 0) totalMrp = subtotal + discount;

  const totalSaved = Math.max(0, totalMrp - (total - deliveryCharge));
  const savedPercent = totalMrp > 0 ? Math.min(100, Math.round((totalSaved / totalMrp) * 100)) : 0;

  // Summary Block
  const summaryStartY = tableY + 4;
  const summaryX = 114;
  let currentSummaryY = summaryStartY;

  if (totalSaved > 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.2);
    doc.setTextColor(...textMuted);
    doc.text("Regular Market Value (MRP):", summaryX, currentSummaryY + 4.5);
    doc.setTextColor(...darkNavy);
    doc.text(`Tk ${totalMrp.toLocaleString()}`, 191, currentSummaryY + 4.5, { align: "right" });
    currentSummaryY += 5.2;

    const discountLabel = isDIU15 && couponCode
      ? `Instant & Coupon Discount (${couponCode}):`
      : "Instant Offer Discount:";

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.2);
    doc.setTextColor(...diuGreen);
    doc.text(discountLabel, summaryX, currentSummaryY + 4.5);
    doc.text(`- Tk ${totalSaved.toLocaleString()}`, 191, currentSummaryY + 4.5, { align: "right" });
    currentSummaryY += 5.2;
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...textMuted);
  doc.text("Subtotal:", summaryX, currentSummaryY + 4.5);
  doc.setTextColor(...darkNavy);
  doc.text(`Tk ${subtotal.toLocaleString()}`, 191, currentSummaryY + 4.5, { align: "right" });
  currentSummaryY += 5.5;

  doc.setTextColor(...textMuted);
  doc.text("Delivery Charge:", summaryX, currentSummaryY + 4.5);
  doc.setTextColor(...darkNavy);
  doc.text(`Tk ${deliveryCharge.toLocaleString()}`, 191, currentSummaryY + 4.5, { align: "right" });
  currentSummaryY += 5.5;

  currentSummaryY += 1.5;
  // Total Highlight Box
  doc.setFillColor(255, 241, 242);
  doc.roundedRect(summaryX - 4, currentSummaryY, 82, 9.5, 2, 2, "F");
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.5);
  doc.roundedRect(summaryX - 4, currentSummaryY, 82, 9.5, 2, 2, "D");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(...primaryColor);
  doc.text("Total Payable:", summaryX, currentSummaryY + 6.5);
  doc.text(`Tk ${total.toLocaleString()}`, 191, currentSummaryY + 6.5, { align: "right" });

  // DIU15 Celebration Savings Badge
  if (totalSaved > 0) {
    currentSummaryY += 11.5;
    doc.setFillColor(240, 253, 244);
    doc.roundedRect(summaryX - 4, currentSummaryY, 82, 8.5, 2, 2, "F");
    doc.setDrawColor(34, 197, 94);
    doc.setLineWidth(0.35);
    doc.roundedRect(summaryX - 4, currentSummaryY, 82, 8.5, 2, 2, "D");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...diuGreen);
    const saveMsg = isDIU15 && couponCode
      ? `You Saved Tk ${totalSaved.toLocaleString()} (${savedPercent}%) with ${couponCode}!`
      : `You Saved Tk ${totalSaved.toLocaleString()} (${savedPercent}%) on this order!`;
    doc.text(saveMsg, summaryX + 37, currentSummaryY + 5.5, { align: "center" });
  }

  // Policy & Trust Box (Left side)
  const leftBoxY = summaryStartY + 1;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, leftBoxY, 94, 15, 2, 2, "F");
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(14, leftBoxY, 94, 15, 2, 2, "D");

  doc.setFillColor(34, 197, 94);
  doc.roundedRect(14, leftBoxY, 3, 15, 1, 1, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text("100% AUTHENTIC PRODUCT GUARANTEE", 20, leftBoxY + 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.8);
  doc.setTextColor(...textMuted);
  doc.text("All skincare & cosmetics are 100% genuine & directly sourced.", 20, leftBoxY + 8.8);
  doc.text("We guarantee uncompromised quality & freshness for every product.", 20, leftBoxY + 12.2);

  // Terms & Conditions
  const termsY = leftBoxY + 19;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...darkNavy);
  doc.text("TERMS & CONDITIONS:", 14, termsY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.2);
  doc.setTextColor(...textMuted);
  doc.text("• Please check product authenticity & condition in front of delivery rider.", 14, termsY + 4.5);
  doc.text("• Check and accept product at delivery time. No returns once accepted.", 14, termsY + 8.5);
  doc.text("• Track your live order progress anytime at liorabeautyandwear.com/order-tracking", 14, termsY + 12.5);

  // Footer
  const footerY = 280;
  doc.setDrawColor(...borderLine);
  doc.setLineWidth(0.4);
  doc.line(14, footerY, 196, footerY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...textMuted);
  doc.text("Thank you for choosing LIORA Beauty & Wear! Beauty. Style. You.", 105, footerY + 5, { align: "center" });
  doc.text("https://liorabeautyandwear.com", 105, footerY + 9, { align: "center" });
}

// ============================================================================
// 3. RESELLER INVOICE (White-Label, "সাদামাটা", NO LIORA BRANDING)
// ============================================================================
async function renderResellerInvoice(doc, order, orderNo) {
  const dateStr = order.createdAt
    ? new Date(order.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
    : new Date().toLocaleDateString("en-US");

  const customerName = order.customerName || "Valued Customer";
  const phone = order.phone || "";
  const district = order.district || "Dhaka";
  const address = order.address || "";
  const deliveryCharge = Number(order.deliveryCharge) || 0;
  // For Reseller dropship invoice, total COD amount is what the customer pays to courier
  const finalCodAmount = Number(order.resellerDetails?.customerCodAmount) || Number(order.total) || 0;
  const total = finalCodAmount > 0 ? finalCodAmount : (Number(order.total) || 0);
  const subtotal = Math.max(0, total - deliveryCharge);
  const status = order.status || "Pending";
  const items = Array.isArray(order.items) ? order.items : [];

  const originalItemsSubtotal = items.reduce((s, it) => s + (Number(it.price) || 0) * (Number(it.quantity) || 1), 0);
  const priceScale = (order.resellerDetails?.customerCodAmount && originalItemsSubtotal > 0 && subtotal > 0)
    ? (subtotal / originalItemsSubtotal)
    : 1;

  const storeName = order.resellerDetails?.storeName || "";
  const storePhone = order.resellerDetails?.storePhone || "";

  // Neutral colors (NO pink/rose brand accent)
  const neutralDark = [30, 41, 59];    // Slate-800
  const neutralGray = [100, 116, 139]; // Slate-500
  const borderLine = [203, 213, 225];  // Slate-300
  const lightBg = [248, 250, 252];     // Slate-50

  // 1. Clean Neutral Top Accent Bar
  doc.setFillColor(71, 85, 105); // Slate-600
  doc.rect(0, 0, 210, 4, "F");

  // 2. Neutral Commercial Header (NO LIORA LOGO OR NAME)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...neutralDark);
  doc.text("COMMERCIAL INVOICE", 14, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...neutralGray);
  doc.text("Official Customer Order Slip & Packing Invoice", 14, 23.5);

  if (storeName) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...neutralDark);
    doc.text(`Fulfilled On Behalf Of: ${storeName}`, 14, 28.5);
    if (storePhone) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...neutralGray);
      doc.text(`Merchant Hotline: ${storePhone}`, 14, 33);
    }
  }

  // Invoice Meta on Right
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(...neutralDark);
  doc.text(`INVOICE NO: #${orderNo}`, 196, 18, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...neutralGray);
  doc.text(`Order Date: ${dateStr}`, 196, 23.5, { align: "right" });
  doc.text(`Delivery Status: ${status.toUpperCase()}`, 196, 28.5, { align: "right" });
  doc.text("Payment: Cash on Delivery (COD)", 196, 33, { align: "right" });

  // Divider
  doc.setDrawColor(...borderLine);
  doc.setLineWidth(0.4);
  doc.line(14, 37, 196, 37);

  // 3. Customer & Delivery Info Box
  doc.setFillColor(...lightBg);
  doc.roundedRect(14, 41, 182, 33, 2, 2, "F");
  doc.setDrawColor(...borderLine);
  doc.roundedRect(14, 41, 182, 33, 2, 2, "D");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...neutralDark);
  doc.text("DELIVERY & RECIPIENT DETAILS:", 19, 47);

  const textYStart = 53;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.2);
  doc.setTextColor(...neutralGray);
  doc.text("Recipient Name: ", 19, textYStart);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...neutralDark);
  doc.text(customerName, 19 + doc.getTextWidth("Recipient Name: "), textYStart);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...neutralGray);
  doc.text("Contact Number: ", 19, textYStart + 4.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...neutralDark);
  doc.text(phone, 19 + doc.getTextWidth("Contact Number: "), textYStart + 4.5);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...neutralGray);
  doc.text("District / Area: ", 19, textYStart + 9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...neutralDark);
  doc.text(district, 19 + doc.getTextWidth("District / Area: "), textYStart + 9);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...neutralGray);
  doc.text("Shipping Address: ", 19, textYStart + 13.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...neutralDark);
  doc.text(address.slice(0, 48), 19 + doc.getTextWidth("Shipping Address: "), textYStart + 13.5);
  if (address.length > 48) {
    doc.text(address.slice(48, 96), 19, textYStart + 17.5);
  }

  // Right Side Payment Note
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...neutralDark);
  doc.text("BILLING SUMMARY:", 114, textYStart);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...neutralGray);
  doc.text("Method: Cash on Delivery", 114, textYStart + 4.5);
  doc.text("Currency: BDT (৳)", 114, textYStart + 9);
  doc.text("Handling: Standard Shipping", 114, textYStart + 13.5);

  // QR Code (Neutral verification reference, NO LIORA text)
  try {
    const qrDataUrl = await QRCode.toDataURL(`ORDER-REF:${orderNo}`, {
      margin: 1,
      width: 140,
      color: { dark: "#1e293b", light: "#ffffff" },
    });

    doc.setFillColor(255, 255, 255);
    doc.roundedRect(165, 43, 28, 29, 2, 2, "F");
    doc.setDrawColor(...borderLine);
    doc.roundedRect(165, 43, 28, 29, 2, 2, "D");

    doc.addImage(qrDataUrl, "PNG", 167.5, 44.5, 23, 23);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(5.5);
    doc.setTextColor(...neutralGray);
    doc.text("VERIFIED ORDER", 179, 70, { align: "center" });
  } catch (e) {
    // optional
  }

  // 4. Items Table
  let tableY = 78;
  doc.setFillColor(51, 65, 85); // Slate-700
  doc.rect(14, tableY, 182, 8, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text("SL", 18, tableY + 5.5);
  doc.text("ITEM DESCRIPTION", 32, tableY + 5.5);
  doc.text("QTY", 130, tableY + 5.5, { align: "center" });
  doc.text("RATE (Tk)", 160, tableY + 5.5, { align: "right" });
  doc.text("TOTAL (Tk)", 191, tableY + 5.5, { align: "right" });

  tableY += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);

  items.forEach((item, index) => {
    if (tableY > 260) {
      doc.addPage();
      tableY = 20;
    }

    const isEven = index % 2 === 0;
    const name = item.productName || item.name || "Product Item";
    const itemLines = doc.splitTextToSize(name, 90);
    const lineCount = Array.isArray(itemLines) ? itemLines.length : 1;
    const basePrice = Number(item.price) || 0;
    const price = (order.resellerDetails?.customerCodAmount && priceScale > 0) ? Math.round(basePrice * priceScale) : basePrice;
    const qty = Number(item.quantity) || 1;
    const rowTotal = price * qty;
    const rowHeight = lineCount > 1 ? Math.max(8.5, 4.5 + lineCount * 3.8) : 8;

    if (isEven) {
      doc.setFillColor(250, 250, 252);
      doc.rect(14, tableY, 182, rowHeight, "F");
    }

    doc.setTextColor(...neutralDark);
    const textBaseY = tableY + 5;
    doc.text(String(index + 1), 18, textBaseY);
    doc.text(itemLines, 32, textBaseY);
    doc.text(String(qty), 130, textBaseY, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.text(`Tk ${price.toLocaleString()}`, 160, textBaseY, { align: "right" });
    doc.text(`Tk ${rowTotal.toLocaleString()}`, 191, textBaseY, { align: "right" });
    doc.setFont("helvetica", "normal");

    doc.setDrawColor(...borderLine);
    doc.setLineWidth(0.2);
    doc.line(14, tableY + rowHeight, 196, tableY + rowHeight);

    tableY += rowHeight;
  });

  // 5. Summary
  const summaryStartY = tableY + 6;
  const summaryX = 114;
  let currentSummaryY = summaryStartY;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...neutralGray);
  doc.text("Items Subtotal:", summaryX, currentSummaryY + 4.5);
  doc.setTextColor(...neutralDark);
  doc.text(`Tk ${subtotal.toLocaleString()}`, 191, currentSummaryY + 4.5, { align: "right" });
  currentSummaryY += 5.5;

  doc.setTextColor(...neutralGray);
  doc.text("Delivery Charge:", summaryX, currentSummaryY + 4.5);
  doc.setTextColor(...neutralDark);
  doc.text(`Tk ${deliveryCharge.toLocaleString()}`, 191, currentSummaryY + 4.5, { align: "right" });
  currentSummaryY += 5.5;

  currentSummaryY += 2;
  // Total Box
  doc.setFillColor(241, 245, 249); // Slate-100
  doc.roundedRect(summaryX - 4, currentSummaryY, 82, 10, 2, 2, "F");
  doc.setDrawColor(71, 85, 105); // Slate-600
  doc.setLineWidth(0.5);
  doc.roundedRect(summaryX - 4, currentSummaryY, 82, 10, 2, 2, "D");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...neutralDark);
  doc.text("Total COD Amount:", summaryX, currentSummaryY + 6.8);
  doc.text(`Tk ${total.toLocaleString()}`, 191, currentSummaryY + 6.8, { align: "right" });

  // Delivery Notes (Left side)
  const leftBoxY = summaryStartY + 2;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...neutralDark);
  doc.text("DELIVERY & RECEIVING TERMS:", 14, leftBoxY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.2);
  doc.setTextColor(...neutralGray);
  doc.text("• Please verify that parcel contents match this delivery invoice upon receiving.", 14, leftBoxY + 5);
  doc.text("• Cash on Delivery: Please pay the exact amount stated above to the courier.", 14, leftBoxY + 9);
  doc.text("• For any product inquiries or support, please reach out to your seller.", 14, leftBoxY + 13);

  // Footer (Neutral, NO company website)
  const footerY = 280;
  doc.setDrawColor(...borderLine);
  doc.setLineWidth(0.4);
  doc.line(14, footerY, 196, footerY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...neutralGray);
  doc.text("Thank you for your order! All rights reserved.", 105, footerY + 6, { align: "center" });
}

// ============================================================================
// 4. WHOLESALE INVOICE (Brand ➔ Category Hierarchical Serial Grouping)
// ============================================================================
async function renderWholesaleInvoice(doc, order, orderNo) {
  const dateStr = order.createdAt
    ? new Date(order.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
    : new Date().toLocaleDateString("en-US");

  const customerName = order.customerName || "Wholesale Partner";
  const businessName = order.wholesaleDetails?.businessName || customerName;
  const tradeLicense = order.wholesaleDetails?.tradeLicense || "B2B Registered";
  const phone = order.phone || "";
  const district = order.district || "Dhaka";
  const address = order.address || "";
  const subtotal = Number(order.subtotal) || 0;
  const deliveryCharge = Number(order.deliveryCharge) || 0;
  const total =
    order.total !== undefined && order.total !== null && !isNaN(order.total)
      ? Number(order.total)
      : subtotal + deliveryCharge;
  const status = order.status || "Pending";
  const items = Array.isArray(order.items) ? order.items : [];

  // Colors
  const wholesaleNavy = [15, 23, 42];  // Slate-900
  const wholesaleBlue = [2, 132, 199]; // Sky-600
  const textMuted = [100, 116, 139];   // Slate-500
  const borderLine = [226, 232, 240];  // Slate-200

  // 1. Top Decorative Bar (Wholesale Deep Navy + Sky accent)
  doc.setFillColor(...wholesaleNavy);
  doc.rect(0, 0, 210, 5, "F");

  // 2. Header Section
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...wholesaleNavy);
  doc.text("LIORA WHOLESALE", 14, 18);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...wholesaleBlue);
  doc.text("B2B DISTRIBUTION & SUPPLY NETWORK", 14, 23);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...textMuted);
  doc.text("Wholesale Cosmetic, Skincare & Personal Care Importer & Distributor", 14, 27);
  doc.text("Web: liorabeautyandwear.com/wholesale  |  B2B Desk: +880 1711-000000", 14, 31);

  // Right Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...wholesaleNavy);
  doc.text("WHOLESALE INVOICE", 196, 18, { align: "right" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...wholesaleBlue);
  doc.text(`#${orderNo}`, 196, 24, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...textMuted);
  doc.text(`Billing Date: ${dateStr}`, 196, 29, { align: "right" });
  doc.text(`Status: ${status.toUpperCase()} (B2B)`, 196, 33.5, { align: "right" });

  // Divider
  doc.setDrawColor(...borderLine);
  doc.setLineWidth(0.4);
  doc.line(14, 37, 196, 37);

  // 3. Wholesale Client Details Box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 41, 182, 33, 2, 2, "F");
  doc.setDrawColor(...borderLine);
  doc.roundedRect(14, 41, 182, 33, 2, 2, "D");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...wholesaleNavy);
  doc.text("WHOLESALE BUYER & BUSINESS DETAILS:", 19, 47);

  const textYStart = 53;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.2);
  doc.setTextColor(...textMuted);
  doc.text("Business / Trader: ", 19, textYStart);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...wholesaleNavy);
  doc.text(businessName, 19 + doc.getTextWidth("Business / Trader: "), textYStart);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textMuted);
  doc.text("Contact Person: ", 19, textYStart + 4.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...wholesaleNavy);
  doc.text(`${customerName} (${phone})`, 19 + doc.getTextWidth("Contact Person: "), textYStart + 4.5);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textMuted);
  doc.text("Trade License / Ref: ", 19, textYStart + 9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...wholesaleNavy);
  doc.text(tradeLicense, 19 + doc.getTextWidth("Trade License / Ref: "), textYStart + 9);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textMuted);
  doc.text("Delivery Destination: ", 19, textYStart + 13.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...wholesaleNavy);
  doc.text(`${address}, ${district}`.slice(0, 52), 19 + doc.getTextWidth("Delivery Destination: "), textYStart + 13.5);

  // Right Side B2B Stats
  let totalOrderPcs = 0;
  items.forEach((it) => {
    totalOrderPcs += Number(it.quantity) || 1;
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...wholesaleNavy);
  doc.text("WHOLESALE CONSIGNMENT:", 120, textYStart);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textMuted);
  doc.text("Pricing Tier: Direct Wholesale Rates", 120, textYStart + 4.5);
  doc.text(`Total Volume: ${totalOrderPcs} Pieces (Pcs)`, 120, textYStart + 9);
  doc.text("Dispatch: Packed by Brand & Category", 120, textYStart + 13.5);

  // 4. Products Table (Hierarchical Brand ➔ Category Grouping)
  let tableY = 78;
  const drawTableHeader = (y) => {
    doc.setFillColor(...wholesaleNavy);
    doc.rect(14, y, 182, 8, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text("SL", 18, y + 5.5);
    doc.text("PRODUCT / ITEM DESCRIPTION", 32, y + 5.5);
    doc.text("PCS (QTY)", 130, y + 5.5, { align: "center" });
    doc.text("RATE (Tk)", 160, y + 5.5, { align: "right" });
    doc.text("TOTAL (Tk)", 191, y + 5.5, { align: "right" });
    return y + 8;
  };

  tableY = drawTableHeader(tableY);

  // Group items by Brand -> Category
  const brandGroups = groupItemsByBrandAndCategory(items);
  let globalSerial = 1;

  for (const bGroup of brandGroups) {
    if (tableY > 250) {
      doc.addPage();
      tableY = drawTableHeader(20);
    }

    // Brand Header Band (Deep Indigo/Navy highlight)
    doc.setFillColor(241, 245, 249); // Slate-100
    doc.rect(14, tableY, 182, 6.5, "F");
    doc.setFillColor(...wholesaleBlue);
    doc.rect(14, tableY, 3, 6.5, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...wholesaleNavy);
    doc.text(`BRAND: ${bGroup.brandName.toUpperCase()}`, 19, tableY + 4.6);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.8);
    doc.setTextColor(...textMuted);
    doc.text(
      `Total: ${bGroup.totalPcs} Pcs  |  Subtotal: ৳${bGroup.subtotal.toLocaleString()}`,
      191,
      tableY + 4.6,
      { align: "right" }
    );

    tableY += 6.5;

    // Categories under this Brand
    for (const cGroup of bGroup.categories) {
      if (tableY > 255) {
        doc.addPage();
        tableY = drawTableHeader(20);
      }

      // Category Sub-header
      doc.setFillColor(248, 250, 252);
      doc.rect(14, tableY, 182, 5, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.8);
      doc.setTextColor(...wholesaleBlue);
      doc.text(`◆ Category: ${cGroup.categoryName} (${cGroup.totalPcs} Pcs)`, 20, tableY + 3.8);
      tableY += 5;

      // Products under this Category
      cGroup.items.forEach((item, rIdx) => {
        if (tableY > 260) {
          doc.addPage();
          tableY = drawTableHeader(20);
        }

        const name = item.productName || item.name || "Product Item";
        const itemLines = doc.splitTextToSize(name, 90);
        const lineCount = Array.isArray(itemLines) ? itemLines.length : 1;
        const price = Number(item.price) || 0;
        const qty = Number(item.quantity) || 1;
        const lineTotal = price * qty;
        const rowHeight = lineCount > 1 ? Math.max(8, 4 + lineCount * 3.5) : 7.5;

        if (rIdx % 2 === 0) {
          doc.setFillColor(255, 255, 255);
        } else {
          doc.setFillColor(253, 253, 254);
        }
        doc.rect(14, tableY, 182, rowHeight, "F");

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.2);
        doc.setTextColor(...wholesaleNavy);
        const textBaseY = tableY + 4.8;

        doc.text(String(globalSerial++), 18, textBaseY);
        doc.text(itemLines, 32, textBaseY);
        doc.text(`${qty} Pcs`, 130, textBaseY, { align: "center" });

        doc.setFont("helvetica", "bold");
        doc.text(`৳${price.toLocaleString()}`, 160, textBaseY, { align: "right" });
        doc.text(`৳${lineTotal.toLocaleString()}`, 191, textBaseY, { align: "right" });

        doc.setDrawColor(...borderLine);
        doc.setLineWidth(0.2);
        doc.line(14, tableY + rowHeight, 196, tableY + rowHeight);

        tableY += rowHeight;
      });
    }
  }

  // 5. Wholesale Summary Section
  if (tableY > 240) {
    doc.addPage();
    tableY = 20;
  }

  const summaryStartY = tableY + 6;
  const summaryX = 114;
  let currentSummaryY = summaryStartY;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...textMuted);
  doc.text("Total Quantity Ordered:", summaryX, currentSummaryY + 4.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...wholesaleNavy);
  doc.text(`${totalOrderPcs} Pcs`, 191, currentSummaryY + 4.5, { align: "right" });
  currentSummaryY += 5.5;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textMuted);
  doc.text("Wholesale Subtotal:", summaryX, currentSummaryY + 4.5);
  doc.setTextColor(...wholesaleNavy);
  doc.text(`৳${subtotal.toLocaleString()}`, 191, currentSummaryY + 4.5, { align: "right" });
  currentSummaryY += 5.5;

  doc.setTextColor(...textMuted);
  doc.text("Cargo / Transport Fee:", summaryX, currentSummaryY + 4.5);
  doc.setTextColor(...wholesaleNavy);
  doc.text(deliveryCharge > 0 ? `৳${deliveryCharge.toLocaleString()}` : "FREE / Included", 191, currentSummaryY + 4.5, { align: "right" });
  currentSummaryY += 5.5;

  currentSummaryY += 2;
  // Wholesale Total Payable Box
  doc.setFillColor(240, 249, 255); // Sky-50
  doc.roundedRect(summaryX - 4, currentSummaryY, 82, 10, 2, 2, "F");
  doc.setDrawColor(...wholesaleBlue);
  doc.setLineWidth(0.5);
  doc.roundedRect(summaryX - 4, currentSummaryY, 82, 10, 2, 2, "D");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(...wholesaleNavy);
  doc.text("Net Wholesale Total:", summaryX, currentSummaryY + 6.8);
  doc.setTextColor(...wholesaleBlue);
  doc.text(`৳${total.toLocaleString()}`, 191, currentSummaryY + 6.8, { align: "right" });

  // Wholesale Policy & Dispatch Notes (Left side)
  const leftBoxY = summaryStartY + 2;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...wholesaleNavy);
  doc.text("B2B DISPATCH & SUPPLY TERMS:", 14, leftBoxY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.2);
  doc.setTextColor(...textMuted);
  doc.text("• Consignments sorted and packaged by Brand and Sub-Category for retail display.", 14, leftBoxY + 5);
  doc.text("• Quantity and batch integrity inspected before dispatch.", 14, leftBoxY + 9);
  doc.text("• For replenishment orders & B2B quotations, contact your wholesale manager.", 14, leftBoxY + 13);

  // Wholesale Footer
  const footerY = 280;
  doc.setDrawColor(...borderLine);
  doc.setLineWidth(0.4);
  doc.line(14, footerY, 196, footerY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...textMuted);
  doc.text("LIORA Wholesale & Distribution Network  |  Web: liorabeautyandwear.com/wholesale", 105, footerY + 6, { align: "center" });
}
