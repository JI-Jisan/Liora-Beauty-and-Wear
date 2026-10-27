import { jsPDF } from "jspdf";
import QRCode from "qrcode";

export async function downloadInvoicePdf(order) {
  if (!order) return;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const orderNo = order.orderNumber || `LIORA-${order._id ? String(order._id).slice(-8) : Date.now()}`;
  const dateStr = order.createdAt
    ? new Date(order.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
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
  // Auto-detect discount if subtotal + deliveryCharge > total even if not explicitly stored
  const computedDiscount = Math.max(0, subtotal + deliveryCharge - total);
  const discount = rawDiscount > 0 ? rawDiscount : computedDiscount;
  const status = order.status || "Pending";
  const items = Array.isArray(order.items) ? order.items : [];

  // Colors
  const primaryColor = [225, 29, 72]; // Rose-600 #e11d48
  const darkNavy = [15, 23, 42]; // Slate-900 #0f172a
  const textMuted = [100, 116, 139]; // Slate-500
  const lightBg = [248, 250, 252]; // Slate-50
  const borderLine = [226, 232, 240]; // Slate-200

  // 1. Top Decorative Bar
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 210, 6, "F");

  // 2. Header Section
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...darkNavy);
  doc.text("LIORA", 14, 20);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...primaryColor);
  doc.text("BEAUTY & WEAR", 14, 25);

  doc.setFontSize(8);
  doc.setTextColor(...textMuted);
  doc.text("Authentic Skincare, Cosmetics & Fashion Wear", 14, 29);
  doc.text("Web: liorabeautyandwear.com  |  Email: liorabeautyandwear@gmail.com", 14, 33);

  // Invoice Title on Right
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...darkNavy);
  doc.text("INVOICE", 196, 20, { align: "right" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...primaryColor);
  doc.text(`#${orderNo}`, 196, 26, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...textMuted);
  doc.text(`Date: ${dateStr}`, 196, 31, { align: "right" });
  doc.text(`Status: ${status.toUpperCase()}`, 196, 36, { align: "right" });

  // Divider line
  doc.setDrawColor(...borderLine);
  doc.setLineWidth(0.4);
  doc.line(14, 42, 196, 42);

  // 3. Customer & Delivery Info Box
  doc.setFillColor(...lightBg);
  doc.roundedRect(14, 46, 182, 34, 3, 3, "F");
  doc.setDrawColor(...borderLine);
  doc.roundedRect(14, 46, 182, 34, 3, 3, "D");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...darkNavy);
  doc.text("BILL TO / DELIVERY DETAILS:", 19, 53);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...darkNavy);
  doc.text(`Customer Name: ${customerName}`, 19, 59);
  doc.text(`Phone Number: ${phone}`, 19, 64);
  doc.text(`District: ${district}`, 19, 69);
  doc.text(`Address: ${address.slice(0, 50)}`, 19, 74);
  if (address.length > 50) {
    doc.text(address.slice(50, 100), 19, 78);
  }

  doc.setFont("helvetica", "bold");
  doc.text("PAYMENT METHOD:", 114, 53);
  doc.setFont("helvetica", "normal");
  doc.text("Cash on Delivery (COD)", 114, 59);
  doc.text("Currency: BDT (Tk)", 114, 64);

  // QR Code Generation & Embedding (Offline Base64 PNG)
  try {
    const siteUrl =
      typeof window !== "undefined" && window.location?.origin
        ? window.location.origin
        : "https://liorabeautyandwear.com";

    const verifyUrl = order.accessToken
      ? `${siteUrl}/order/verify?no=${encodeURIComponent(orderNo)}&k=${encodeURIComponent(order.accessToken)}`
      : `${siteUrl}/order-tracking?query=${encodeURIComponent(orderNo)}`;

    const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
      margin: 1,
      width: 140,
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
    });

    // White card background for QR Code
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(165, 48, 28, 30, 2, 2, "F");
    doc.setDrawColor(...borderLine);
    doc.roundedRect(165, 48, 28, 30, 2, 2, "D");

    doc.addImage(qrDataUrl, "PNG", 167, 49.5, 24, 24);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6);
    doc.setTextColor(...primaryColor);
    doc.text("SCAN TO VERIFY", 179, 76, { align: "center" });
  } catch (qrErr) {
    console.warn("Could not generate QR code for PDF invoice:", qrErr);
  }

  // 4. Products Table Header
  let tableY = 88;
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

  // 5. Table Rows
  tableY += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);

  items.forEach((item, index) => {
    const isEven = index % 2 === 0;
    const name = item.productName || item.name || "Product Item";
    const itemLines = doc.splitTextToSize(name, 90);
    const lineCount = Array.isArray(itemLines) ? itemLines.length : 1;

    const price = Number(item.price) || 0;
    const origPrice = Number(item.originalPrice) || 0;
    const hasDiscount = origPrice > price;

    const rowHeight = hasDiscount || lineCount > 1
      ? Math.max(9.5, 4.5 + lineCount * 3.8)
      : 8;

    if (isEven) {
      doc.setFillColor(253, 253, 254);
      doc.rect(14, tableY, 182, rowHeight, "F");
    }

    doc.setTextColor(...darkNavy);
    const textBaseY = tableY + (hasDiscount ? 5.5 : 5);
    doc.text(String(index + 1), 18, textBaseY);

    // Full product name without truncation
    doc.text(itemLines, 32, textBaseY);

    const qty = Number(item.quantity) || 1;
    doc.text(String(qty), 130, textBaseY, { align: "center" });

    // Price Column: Strikethrough regular price + bold offer price
    const priceX = 160;
    if (hasDiscount) {
      // Strikethrough regular MRP
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.8);
      doc.setTextColor(148, 163, 184); // Slate-400
      const origText = `Tk ${origPrice.toLocaleString()}`;
      const origWidth = doc.getTextWidth(origText);
      const origY = tableY + 3.8;
      doc.text(origText, priceX, origY, { align: "right" });
      doc.setDrawColor(225, 29, 72); // Rose strike line
      doc.setLineWidth(0.25);
      doc.line(priceX - origWidth, origY - 0.7, priceX, origY - 0.7);

      // Offer price in bold
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

    // Row total
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

  // Calculate Total Market Value (MRP) and Savings
  let totalMrp = 0;
  items.forEach((item) => {
    const qty = Number(item.quantity) || 1;
    const pOrig = Number(item.originalPrice) || Number(item.price) || 0;
    totalMrp += pOrig * qty;
  });
  if (totalMrp < subtotal) totalMrp = subtotal;

  const productSavings = Math.max(0, totalMrp - subtotal);
  const orderDiscount = discount > 0 ? discount : 0;
  const totalSaved = productSavings + orderDiscount;
  const savedPercent = totalMrp > 0 ? Math.min(100, Math.round((totalSaved / totalMrp) * 100)) : 0;

  // 6. Summary Block (Subtotal, Delivery, Discount, Total)
  const summaryStartY = tableY + 4;
  const summaryX = 114;
  let currentSummaryY = summaryStartY;

  // If there are product savings, display Regular MRP vs Instant Discount
  if (productSavings > 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.2);
    doc.setTextColor(...textMuted);
    doc.text("Regular Market Value (MRP):", summaryX, currentSummaryY + 4.5);
    doc.setTextColor(...darkNavy);
    doc.text(`Tk ${totalMrp.toLocaleString()}`, 191, currentSummaryY + 4.5, { align: "right" });
    currentSummaryY += 5.2;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.2);
    doc.setTextColor(22, 163, 74); // Emerald Green
    doc.text("Instant Offer Discount:", summaryX, currentSummaryY + 4.5);
    doc.text(`- Tk ${productSavings.toLocaleString()}`, 191, currentSummaryY + 4.5, { align: "right" });
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

  if (orderDiscount > 0) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(22, 163, 74); // Vibrant Emerald Green #16a34a
    doc.text("Special Voucher / Discount:", summaryX, currentSummaryY + 4.5);
    doc.text(`- Tk ${orderDiscount.toLocaleString()}`, 191, currentSummaryY + 4.5, { align: "right" });
    currentSummaryY += 5.5;
  }

  currentSummaryY += 1.5;
  // Total Highlight Box
  doc.setFillColor(255, 241, 242); // Rose-50
  doc.roundedRect(summaryX - 4, currentSummaryY, 82, 9.5, 2, 2, "F");
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.5);
  doc.roundedRect(summaryX - 4, currentSummaryY, 82, 9.5, 2, 2, "D");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(...primaryColor);
  doc.text("Total Payable:", summaryX, currentSummaryY + 6.5);
  doc.text(`Tk ${total.toLocaleString()}`, 191, currentSummaryY + 6.5, { align: "right" });

  // Customer Happiness Badge: "You Saved Tk X (Y%) on this order!"
  if (totalSaved > 0) {
    currentSummaryY += 11.5;
    doc.setFillColor(240, 253, 244); // Green-50
    doc.roundedRect(summaryX - 4, currentSummaryY, 82, 8, 2, 2, "F");
    doc.setDrawColor(34, 197, 94); // Green-500
    doc.setLineWidth(0.3);
    doc.roundedRect(summaryX - 4, currentSummaryY, 82, 8, 2, 2, "D");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(22, 163, 74);
    doc.text(
      `You Saved Tk ${totalSaved.toLocaleString()} (${savedPercent}%) on this order!`,
      summaryX + 37,
      currentSummaryY + 5.2,
      { align: "center" }
    );
  }

  // 7. Policy & Trust Box (Left side)
  const leftBoxY = summaryStartY + 1;

  // 100% Authentic Product Guarantee Badge Box
  doc.setFillColor(248, 250, 252); // Slate-50
  doc.roundedRect(14, leftBoxY, 92, 15, 2, 2, "F");
  doc.setDrawColor(226, 232, 240); // Slate-200
  doc.setLineWidth(0.3);
  doc.roundedRect(14, leftBoxY, 92, 15, 2, 2, "D");

  // Emerald accent bar on left of guarantee card
  doc.setFillColor(34, 197, 94); // Green-500
  doc.roundedRect(14, leftBoxY, 3, 15, 1, 1, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42); // Dark Navy
  doc.text("100% AUTHENTIC PRODUCT GUARANTEE", 20, leftBoxY + 5.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...textMuted);
  doc.text("All skincare & cosmetics are 100% genuine & directly sourced.", 20, leftBoxY + 9.5);
  doc.text("We guarantee uncompromised quality & freshness for every product.", 20, leftBoxY + 13);

  // TERMS & CONDITIONS below the guarantee card
  const termsY = leftBoxY + 19;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...darkNavy);
  doc.text("TERMS & CONDITIONS:", 14, termsY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.2);
  doc.setTextColor(...textMuted);
  doc.text("• Please check product authenticity & condition in front of delivery rider.", 14, termsY + 4.5);
  doc.text("• For any return or exchange, please notify us within 24 hours with intact seal.", 14, termsY + 8.5);
  doc.text("• Track your live order progress anytime at liorabeautyandwear.com/order-tracking", 14, termsY + 12.5);

  // 8. Footer Bar
  const footerY = 280;
  doc.setDrawColor(...borderLine);
  doc.setLineWidth(0.4);
  doc.line(14, footerY, 196, footerY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...textMuted);
  doc.text(
    "Thank you for choosing LIORA Beauty & Wear! Beauty. Style. You.",
    105,
    footerY + 5,
    { align: "center" }
  );
  doc.text("https://liorabeautyandwear.com", 105, footerY + 9, { align: "center" });

  // Save / Trigger Download
  const filename = `Invoice-${orderNo}.pdf`;
  doc.save(filename);
}
