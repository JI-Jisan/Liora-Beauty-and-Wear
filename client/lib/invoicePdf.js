import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import { DIU_LOGO_BASE64 } from "./diuLogoBase64";

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
  const diuBlue = [0, 75, 135]; // DIU Royal Blue #004b87
  const diuGreen = [22, 163, 74]; // DIU Emerald Green #16a34a
  const darkNavy = [15, 23, 42]; // Slate-900 #0f172a
  const textMuted = [100, 116, 139]; // Slate-500
  const lightBg = [248, 250, 252]; // Slate-50
  const borderLine = [226, 232, 240]; // Slate-200

  // 1. Top Decorative Bar (LIORA Rose + DIU Royal Blue + DIU Green accent line)
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 105, 5, "F");
  doc.setFillColor(...diuBlue);
  doc.rect(105, 0, 105, 5, "F");
  doc.setFillColor(34, 197, 94);
  doc.rect(0, 5, 210, 1.2, "F");

  // 2. Header Section
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

  // Center: DIU Logo + Official Campus Privilege Badge
  if (DIU_LOGO_BASE64) {
    try {
      doc.addImage(DIU_LOGO_BASE64, "PNG", 79, 11.5, 45, 12.5);

      doc.setFillColor(240, 253, 244);
      doc.roundedRect(77, 26, 49, 4.4, 1.2, 1.2, "F");
      doc.setDrawColor(34, 197, 94);
      doc.setLineWidth(0.3);
      doc.roundedRect(77, 26, 49, 4.4, 1.2, 1.2, "D");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.2);
      doc.setTextColor(...diuGreen);
      doc.text("CAMPUS PRIVILEGE PARTNER", 101.5, 29.2, { align: "center" });
    } catch (imgErr) {
      console.warn("Could not add DIU logo to PDF:", imgErr);
    }
  }

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

  // 3. Customer & Delivery Info Box
  doc.setFillColor(...lightBg);
  doc.roundedRect(14, 41, 182, 36, 3, 3, "F");
  doc.setDrawColor(...borderLine);
  doc.roundedRect(14, 41, 182, 36, 3, 3, "D");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...darkNavy);
  doc.text("BILL TO / DELIVERY DETAILS:", 19, 48);

  // DIU Student Badge Pill in Customer Box
  doc.setFillColor(238, 242, 255);
  doc.roundedRect(77, 43.5, 68, 5, 1.5, 1.5, "F");
  doc.setDrawColor(99, 102, 241);
  doc.setLineWidth(0.3);
  doc.roundedRect(77, 43.5, 68, 5, 1.5, 1.5, "D");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(67, 56, 202);
  doc.text("DIU STUDENT SPECIAL PRIVILEGE", 111, 47.1, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...darkNavy);
  doc.text(`Customer Name: ${customerName}`, 19, 55);
  doc.text(`Phone Number: ${phone}`, 19, 60);
  doc.text(`District: ${district}`, 19, 65);
  doc.text(`Address: ${address.slice(0, 50)}`, 19, 70);
  if (address.length > 50) {
    doc.text(address.slice(50, 100), 19, 74);
  }

  doc.setFont("helvetica", "bold");
  doc.text("PAYMENT METHOD:", 114, 55);
  doc.setFont("helvetica", "normal");
  doc.text("Cash on Delivery (COD)", 114, 60);
  doc.text("Currency: BDT (Tk)", 114, 65);

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
    doc.roundedRect(165, 43, 28, 32, 2, 2, "F");
    doc.setDrawColor(...borderLine);
    doc.roundedRect(165, 43, 28, 32, 2, 2, "D");

    doc.addImage(qrDataUrl, "PNG", 167, 44.5, 24, 24);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6);
    doc.setTextColor(...primaryColor);
    doc.text("SCAN TO VERIFY", 179, 72.5, { align: "center" });
  } catch (qrErr) {
    console.warn("Could not generate QR code for PDF invoice:", qrErr);
  }

  // 4. Products Table Header
  let tableY = 82;
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
    const pOrig = Number(item.originalPrice) || Number(item.mrp) || Number(item.regularPrice) || Number(item.price) || 0;
    totalMrp += pOrig * qty;
  });
  if (totalMrp <= subtotal && discount > 0) totalMrp = subtotal + discount;

  const totalSaved = Math.max(0, totalMrp - (total - deliveryCharge));
  const savedPercent = totalMrp > 0 ? Math.min(100, Math.round((totalSaved / totalMrp) * 100)) : 0;

  // 6. Summary Block (Subtotal, Delivery, Discount, Total)
  const summaryStartY = tableY + 4;
  const summaryX = 114;
  let currentSummaryY = summaryStartY;

  // If there are savings from regular MRP, display Regular MRP vs Instant Discount
  if (totalSaved > 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.2);
    doc.setTextColor(...textMuted);
    doc.text("Regular Market Value (MRP):", summaryX, currentSummaryY + 4.5);
    doc.setTextColor(...darkNavy);
    doc.text(`Tk ${totalMrp.toLocaleString()}`, 191, currentSummaryY + 4.5, { align: "right" });
    currentSummaryY += 5.2;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.2);
    doc.setTextColor(...diuGreen);
    doc.text("Instant Offer Discount:", summaryX, currentSummaryY + 4.5);
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
    doc.roundedRect(summaryX - 4, currentSummaryY, 82, 8.5, 2, 2, "F");
    doc.setDrawColor(34, 197, 94); // Green-500
    doc.setLineWidth(0.35);
    doc.roundedRect(summaryX - 4, currentSummaryY, 82, 8.5, 2, 2, "D");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...diuGreen);
    doc.text(
      `You Saved Tk ${totalSaved.toLocaleString()} (${savedPercent}%) on this order!`,
      summaryX + 37,
      currentSummaryY + 5.5,
      { align: "center" }
    );
  }

  // 7. Policy & Trust Box (Left side)
  const leftBoxY = summaryStartY + 1;

  // 100% Authentic Product Guarantee Badge Box
  doc.setFillColor(248, 250, 252); // Slate-50
  doc.roundedRect(14, leftBoxY, 94, 18, 2, 2, "F");
  doc.setDrawColor(226, 232, 240); // Slate-200
  doc.setLineWidth(0.3);
  doc.roundedRect(14, leftBoxY, 94, 18, 2, 2, "D");

  // Emerald accent bar on left of guarantee card
  doc.setFillColor(34, 197, 94); // Green-500
  doc.roundedRect(14, leftBoxY, 3, 18, 1, 1, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42); // Dark Navy
  doc.text("100% AUTHENTIC PRODUCT GUARANTEE", 20, leftBoxY + 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.8);
  doc.setTextColor(...textMuted);
  doc.text("All skincare & cosmetics are 100% genuine & directly sourced.", 20, leftBoxY + 8.8);
  doc.text("We guarantee uncompromised quality & freshness for every product.", 20, leftBoxY + 12.2);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...diuGreen);
  doc.text("[ DIU CAMPUS ] Exclusively privileged for Daffodil University students.", 20, leftBoxY + 15.6);

  // TERMS & CONDITIONS below the guarantee card
  const termsY = leftBoxY + 22;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...darkNavy);
  doc.text("TERMS & CONDITIONS:", 14, termsY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.2);
  doc.setTextColor(...textMuted);
  doc.text("• Please check product authenticity & condition in front of delivery rider.", 14, termsY + 4.5);
  doc.text("• Check & receive in front of rider. No return/exchange after rider departs.", 14, termsY + 8.5);
  doc.text("• Track your live order progress anytime at liorabeautyandwear.com/order-tracking", 14, termsY + 12.5);

  // Special Daffodil Campus Privilege Banner Box
  const diuBannerY = termsY + 17;
  doc.setFillColor(240, 249, 255); // Sky-50
  doc.roundedRect(14, diuBannerY, 94, 16, 2, 2, "F");
  doc.setDrawColor(186, 230, 253); // Sky-200
  doc.setLineWidth(0.35);
  doc.roundedRect(14, diuBannerY, 94, 16, 2, 2, "D");

  doc.setFillColor(...diuBlue);
  doc.roundedRect(14, diuBannerY, 3, 16, 1, 1, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...diuBlue);
  doc.text("DAFFODIL (DIU) STUDENT PRIVILEGE", 20, diuBannerY + 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.8);
  doc.setTextColor(71, 85, 105);
  doc.text("Special student campus discount was verified on this order.", 20, diuBannerY + 8.8);
  doc.text("Priority packaging & 100% verified authentic products guaranteed.", 20, diuBannerY + 12.5);

  // 8. Official DIU Certified Partner Stamp (Positioned neatly under summary)
  const stampX = 155;
  const stampY = Math.max(currentSummaryY + 20, 185);

  doc.setDrawColor(...diuBlue);
  doc.setLineWidth(0.7);
  doc.circle(stampX, stampY, 14, "D");

  doc.setDrawColor(34, 197, 94);
  doc.setLineWidth(0.3);
  doc.circle(stampX, stampY, 12.5, "D");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(5);
  doc.setTextColor(...diuBlue);
  doc.text("DAFFODIL INTL UNIVERSITY", stampX, stampY - 6.5, { align: "center" });

  doc.setFontSize(6.2);
  doc.setTextColor(...diuGreen);
  doc.text("CAMPUS PRIVILEGE", stampX, stampY - 1.5, { align: "center" });

  doc.setFontSize(7.5);
  doc.setTextColor(...primaryColor);
  doc.text("[ VERIFIED ]", stampX, stampY + 3.2, { align: "center" });

  doc.setFontSize(5);
  doc.setTextColor(...diuBlue);
  doc.text("100% AUTHENTIC • DIU15", stampX, stampY + 7.5, { align: "center" });

  // 9. Footer Bar
  const footerY = 280;
  doc.setDrawColor(...borderLine);
  doc.setLineWidth(0.4);
  doc.line(14, footerY, 196, footerY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...textMuted);
  doc.text(
    "LIORA Beauty & Wear x Daffodil International University | Campus Privilege Partner",
    105,
    footerY + 5,
    { align: "center" }
  );
  doc.text("https://liorabeautyandwear.com  •  Special privilege for DIU Students & Faculty", 105, footerY + 9, { align: "center" });

  // Save / Trigger Download
  const filename = `Invoice-${orderNo}.pdf`;
  doc.save(filename);
}
