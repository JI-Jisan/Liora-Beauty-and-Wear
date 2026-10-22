import { jsPDF } from "jspdf";

/**
 * Converts an image URL to a scaled-down Base64 JPEG data URL
 * Uses canvas with crossOrigin="anonymous" and a 3.5s timeout.
 */
export async function urlToDataUrl(url) {
  if (!url || typeof window === "undefined") return null;
  return new Promise((resolve) => {
    let resolved = false;
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve(null);
      }
    }, 3500);

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeout);
      try {
        const maxDim = 120;
        let w = img.width || maxDim;
        let h = img.height || maxDim;
        if (w > h) {
          if (w > maxDim) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          }
        } else {
          if (h > maxDim) {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(20, w);
        canvas.height = Math.max(20, h);
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
        resolve(dataUrl);
      } catch (err) {
        resolve(null);
      }
    };
    img.onerror = () => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeout);
      resolve(null);
    };
    img.src = url;
  });
}

/**
 * Generates and downloads a wholesale billing invoice & price quotation PDF
 * Features Brand-wise grouping, Quantity/Pcs count, Line Totals, and official billing signatures.
 */
export async function generateWholesalePdf({
  items = [],
  clientInfo = {},
  profitPercent = 5,
  quoteNumber = null,
  onProgress = null,
}) {
  if (!items || items.length === 0) {
    throw new Error("No products selected for quotation.");
  }

  // 1. Pre-load product thumbnail images in parallel with concurrency
  const total = items.length;
  let completed = 0;
  if (onProgress) onProgress(0, total);

  const imageMap = new Map();
  const concurrency = 4;
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    await Promise.all(
      batch.map(async (item) => {
        const id = item._id || item.id || item.productId || item.name;
        if (item.image) {
          const dataUrl = await urlToDataUrl(item.image);
          if (dataUrl) imageMap.set(String(id), dataUrl);
        }
        completed++;
        if (onProgress) onProgress(completed, total);
      })
    );
  }

  // 2. Initialize jsPDF (A4 portrait)
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2; // 182mm

  // Color Palette
  const colorPrimary = [225, 29, 72];    // Rose-600 #e11d48
  const colorDark = [15, 23, 42];         // Slate-900 #0f172a
  const colorSlate800 = [30, 41, 59];     // Slate-800
  const colorMuted = [100, 116, 139];     // Slate-500
  const colorBorder = [226, 232, 240];    // Slate-200
  const colorBgLight = [248, 250, 252];   // Slate-50
  const colorGreen = [22, 163, 74];       // Green-600 #16a34a
  const colorGreenBg = [240, 253, 244];   // Green-50

  const todayStr = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const quoteRef = quoteNumber || `WS-${Date.now().toString().slice(-6)}`;

  // Calculate Totals & Line Totals
  let totalGrandQty = 0;
  let totalMarketSum = 0;
  let totalWholesaleSum = 0;
  let totalDiscountPercentSum = 0;

  const preparedItems = items.map((p) => {
    const buyPrice = Number(p.purchasePrice) || 0;
    const origPrice = Number(p.originalPrice) || Number(p.offerPrice) || (buyPrice > 0 ? Math.round(buyPrice * 1.5) : 0);
    const customWholesale = Number(p.wholesalePrice);
    
    const calculatedWholesale = customWholesale > 0
      ? customWholesale
      : Math.round(buyPrice * (1 + Number(profitPercent || 0) / 100));

    const finalWholesale = Math.max(1, calculatedWholesale);
    const qty = Math.max(1, parseInt(p.quantity) || 1);
    const lineTotal = finalWholesale * qty;
    const lineMarket = origPrice * qty;

    const discountPct = origPrice > finalWholesale
      ? Math.round(((origPrice - finalWholesale) / origPrice) * 100)
      : 0;

    totalGrandQty += qty;
    totalMarketSum += lineMarket;
    totalWholesaleSum += lineTotal;
    totalDiscountPercentSum += discountPct;

    const rawBrand = (p.brand && typeof p.brand === "object" ? p.brand?.name : p.brand) || p.brandName || "Other Brands";
    const brandName = String(rawBrand).trim() || "Other Brands";

    return {
      id: String(p._id || p.id || p.productId || p.name),
      name: p.name || "Product Item",
      brandName,
      categoryName: (p.category && typeof p.category === "object" ? p.category?.name : p.category) || p.categoryName || "",
      buyPrice,
      originalPrice: origPrice,
      wholesalePrice: finalWholesale,
      quantity: qty,
      lineTotal,
      discountPct,
    };
  });

  const avgDiscount = total > 0 ? Math.round(totalDiscountPercentSum / total) : 0;
  const totalSavings = Math.max(0, totalMarketSum - totalWholesaleSum);

  // Group items by Brand
  const brandGroups = {};
  preparedItems.forEach((item) => {
    const b = item.brandName || "Other Brands";
    if (!brandGroups[b]) {
      brandGroups[b] = [];
    }
    brandGroups[b].push(item);
  });

  // Sort brand keys alphabetically (Unilever brands first if present)
  const brandNames = Object.keys(brandGroups).sort((a, b) => a.localeCompare(b));

  // Helper: Draw Header & Top Banner on Page 1
  function drawFirstPageHeader() {
    // Top decorative bar
    doc.setFillColor(...colorPrimary);
    doc.rect(0, 0, pageWidth, 5, "F");

    // Brand Name & Subtitle
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(...colorDark);
    doc.text("LIORA", marginX, 17);

    doc.setFontSize(8.5);
    doc.setTextColor(...colorPrimary);
    doc.text("BEAUTY & WEAR  •  WHOLESALE BILLING INVOICE & QUOTATION", marginX, 22);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...colorMuted);
    doc.text("Official Importer & Distributor | Authentic Cosmetics, Skincare & Fragrance", marginX, 26);
    doc.text("Web: liorabeautyandwear.com  |  Helpline: +8801837223147  |  Dhaka, Bangladesh", marginX, 29.5);

    // Quotation / Invoice Details (Right Side)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...colorDark);
    doc.text("WHOLESALE INVOICE", 196, 17, { align: "right" });

    doc.setFontSize(9);
    doc.setTextColor(...colorPrimary);
    doc.text(`Invoice / Quote Ref: #${quoteRef}`, 196, 22, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...colorMuted);
    doc.text(`Date: ${todayStr}`, 196, 26, { align: "right" });
    doc.text("Official B2B Wholesale Billing", 196, 29.5, { align: "right" });

    // Thin separator
    doc.setDrawColor(...colorBorder);
    doc.setLineWidth(0.3);
    doc.line(marginX, 33, 196, 33);

    // Client Info Box
    const clientY = 36;
    const clientName = clientInfo.clientName || "Valued Wholesale Partner / Super Shop Buyer";
    const clientPhone = clientInfo.clientPhone || "";
    const clientAddress = clientInfo.clientAddress || "";

    doc.setFillColor(...colorBgLight);
    doc.roundedRect(marginX, clientY, contentWidth, 16, 2, 2, "F");
    doc.setDrawColor(...colorBorder);
    doc.roundedRect(marginX, clientY, contentWidth, 16, 2, 2, "D");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...colorMuted);
    doc.text("BILLED TO / PREPARED FOR:", marginX + 4, clientY + 5.5);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...colorDark);
    doc.text(clientName, marginX + 4, clientY + 11.5);

    if (clientPhone || clientAddress) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...colorMuted);
      const contactStr = [clientPhone, clientAddress].filter(Boolean).join("  |  ");
      const safeContact = doc.splitTextToSize(contactStr, 95)[0];
      doc.text(safeContact, 192, clientY + 9, { align: "right" });
    }

    // ⭐ HIGHLIGHT SAVINGS & INVOICE SUMMARY BANNER
    const bannerY = clientY + 19;
    doc.setFillColor(...colorGreenBg);
    doc.roundedRect(marginX, bannerY, contentWidth, 18, 3, 3, "F");
    doc.setDrawColor(34, 197, 94);
    doc.setLineWidth(0.5);
    doc.roundedRect(marginX, bannerY, contentWidth, 18, 3, 3, "D");

    // Big Discount Highlight Badge on Left
    doc.setFillColor(...colorGreen);
    doc.roundedRect(marginX + 3, bannerY + 3, 44, 12, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text(`${avgDiscount}% OFF`, marginX + 25, bannerY + 8, { align: "center" });
    doc.setFontSize(6.5);
    doc.text("AVG WHOLESALE DISCOUNT", marginX + 25, bannerY + 12, { align: "center" });

    // Metrics in middle & right
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...colorDark);
    doc.text("INVOICE SUMMARY & WHOLESALE SAVINGS:", marginX + 51, bannerY + 6);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...colorMuted);
    doc.text(
      `• Total Items: ${total} Items  |  Total Pcs: ${totalGrandQty} Pcs  |  Market MRP: Tk ${totalMarketSum.toLocaleString()}`,
      marginX + 51,
      bannerY + 10.5
    );
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...colorGreen);
    doc.text(
      `• Total Billing Payable: Tk ${totalWholesaleSum.toLocaleString()}  (Buyer Saves: Tk ${totalSavings.toLocaleString()} on MRP!)`,
      marginX + 51,
      bannerY + 15
    );

    return bannerY + 22;
  }

  // Draw Table Headers (Column Layout)
  // Total width: 182mm (marginX: 14 to 196)
  // Col 1: # (8mm) -> 14 to 22
  // Col 2: IMAGE (15mm) -> 22 to 37
  // Col 3: PRODUCT DETAILS (65mm) -> 37 to 102
  // Col 4: MARKET MRP (22mm) -> 102 to 124
  // Col 5: WHOLESALE RATE (22mm) -> 124 to 146
  // Col 6: QTY (PCS) (16mm) -> 146 to 162
  // Col 7: LINE TOTAL (34mm) -> 162 to 196
  function drawTableHeader(y) {
    const h = 8;
    doc.setFillColor(241, 245, 249); // Slate-100
    doc.rect(marginX, y, contentWidth, h, "F");
    doc.setDrawColor(...colorBorder);
    doc.setLineWidth(0.3);
    doc.rect(marginX, y, contentWidth, h, "D");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...colorDark);

    doc.text("#", marginX + 4, y + 5.5, { align: "center" });
    doc.text("IMAGE", marginX + 15, y + 5.5, { align: "center" });
    doc.text("PRODUCT DETAILS", marginX + 26, y + 5.5);
    doc.text("MRP", marginX + 108, y + 5.5, { align: "right" });
    doc.text("RATE (TK)", marginX + 130, y + 5.5, { align: "right" });
    doc.text("QTY (PCS)", marginX + 148, y + 5.5, { align: "center" });
    doc.text("LINE TOTAL (TK)", 194, y + 5.5, { align: "right" });

    return y + h;
  }

  // Draw Brand Group Header Banner
  function drawBrandHeader(brandName, itemCount, brandQty, brandSubtotal, y) {
    const h = 7.5;
    doc.setFillColor(...colorSlate800); // Sleek Slate-800
    doc.rect(marginX, y, contentWidth, h, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text(`BRAND: ${brandName.toUpperCase()}`, marginX + 4, y + 5.2);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(226, 232, 240);
    const summaryStr = `${itemCount} Items  |  ${brandQty} Pcs  |  Subtotal: Tk ${brandSubtotal.toLocaleString()}`;
    doc.text(summaryStr, 194, y + 5.2, { align: "right" });

    return y + h;
  }

  // Draw Footer on Every Page
  function drawFooter(pageNum, totalPages) {
    const footerY = pageHeight - 12;
    doc.setDrawColor(...colorBorder);
    doc.setLineWidth(0.3);
    doc.line(marginX, footerY, 196, footerY);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...colorMuted);
    doc.text("LIORA Beauty & Wear • Wholesale Billing Invoice • Helpline: +8801837223147", marginX, footerY + 4);
    doc.text("Terms: 100% authentic products. Prices valid for 7 days. Payments via Cash/Bank.", marginX, footerY + 7.5);

    doc.setFont("helvetica", "bold");
    doc.text(`Page ${pageNum} of ${totalPages}`, 196, footerY + 5.5, { align: "right" });
  }

  // Draw Page Content
  let currentY = drawFirstPageHeader();
  currentY = drawTableHeader(currentY);

  let serialCounter = 1;
  const rowMinHeight = 15;

  for (const bName of brandNames) {
    const bItems = brandGroups[bName];
    const bQty = bItems.reduce((acc, it) => acc + it.quantity, 0);
    const bSubtotal = bItems.reduce((acc, it) => acc + it.lineTotal, 0);

    // Check page break before Brand Header
    if (currentY + 12 > pageHeight - 20) {
      doc.addPage();
      currentY = 14;
      currentY = drawTableHeader(currentY);
    }

    currentY = drawBrandHeader(bName, bItems.length, bQty, bSubtotal, currentY);

    for (let i = 0; i < bItems.length; i++) {
      const item = bItems[i];
      const itemImg = imageMap.get(item.id);

      // Text wrapping for product name
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      const titleLines = doc.splitTextToSize(item.name, 60);
      const titleHeight = titleLines.length * 3.8;
      const rowHeight = Math.max(rowMinHeight, titleHeight + 7);

      // Page break check
      if (currentY + rowHeight > pageHeight - 18) {
        doc.addPage();
        // Mini header on continuation page
        doc.setFillColor(...colorPrimary);
        doc.rect(0, 0, pageWidth, 3, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(...colorDark);
        doc.text(`LIORA Wholesale Invoice #${quoteRef} — (Continued)`, marginX, 10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...colorMuted);
        doc.text(`Date: ${todayStr}`, 196, 10, { align: "right" });
        currentY = drawTableHeader(14);
      }

      // Zebra striping
      if (i % 2 === 1) {
        doc.setFillColor(252, 253, 254);
        doc.rect(marginX, currentY, contentWidth, rowHeight, "F");
      }

      // Row Border bottom
      doc.setDrawColor(...colorBorder);
      doc.setLineWidth(0.2);
      doc.line(marginX, currentY + rowHeight, marginX + contentWidth, currentY + rowHeight);

      // 1. Serial Number
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(...colorMuted);
      doc.text(String(serialCounter++), marginX + 4, currentY + rowHeight / 2 + 1.2, { align: "center" });

      // 2. Thumbnail Image
      const imgX = marginX + 9;
      const imgY = currentY + (rowHeight - 11) / 2;
      const imgDim = 11;

      if (itemImg) {
        try {
          doc.addImage(itemImg, "JPEG", imgX, imgY, imgDim, imgDim);
          doc.setDrawColor(...colorBorder);
          doc.setLineWidth(0.2);
          doc.rect(imgX, imgY, imgDim, imgDim, "D");
        } catch (e) {
          doc.setFillColor(241, 245, 249);
          doc.rect(imgX, imgY, imgDim, imgDim, "F");
        }
      } else {
        doc.setFillColor(241, 245, 249);
        doc.roundedRect(imgX, imgY, imgDim, imgDim, 1, 1, "F");
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6);
        doc.setTextColor(...colorMuted);
        doc.text("No Pic", imgX + imgDim / 2, imgY + imgDim / 2 + 1, { align: "center" });
      }

      // 3. Product Details (Name + Category)
      const textX = marginX + 24;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(...colorDark);
      doc.text(titleLines, textX, currentY + 5);

      if (item.categoryName) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6.8);
        doc.setTextColor(...colorMuted);
        doc.text(item.categoryName, textX, currentY + 5.5 + titleHeight);
      }

      // 4. Market Price (MRP)
      const mrpX = marginX + 108;
      const mrpY = currentY + rowHeight / 2 + 1.2;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...colorMuted);
      const mrpStr = `Tk ${item.originalPrice.toLocaleString()}`;
      doc.text(mrpStr, mrpX, mrpY, { align: "right" });
      const mrpWidth = doc.getTextWidth(mrpStr);
      doc.setDrawColor(...colorMuted);
      doc.setLineWidth(0.2);
      doc.line(mrpX - mrpWidth, mrpY - 0.8, mrpX, mrpY - 0.8);

      // 5. Wholesale Unit Rate
      const wsX = marginX + 130;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(...colorDark);
      doc.text(`Tk ${item.wholesalePrice.toLocaleString()}`, wsX, mrpY, { align: "right" });

      // 6. Quantity (Pcs) Badge
      const qtyX = marginX + 148;
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(qtyX - 10, currentY + (rowHeight - 6.5) / 2, 20, 6.5, 1.5, 1.5, "F");
      doc.setDrawColor(...colorBorder);
      doc.roundedRect(qtyX - 10, currentY + (rowHeight - 6.5) / 2, 20, 6.5, 1.5, 1.5, "D");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(...colorDark);
      doc.text(`${item.quantity} Pcs`, qtyX, currentY + (rowHeight - 6.5) / 2 + 4.5, { align: "center" });

      // 7. Line Total
      const totX = 194;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...colorPrimary);
      doc.text(`Tk ${item.lineTotal.toLocaleString()}`, totX, mrpY, { align: "right" });

      currentY += rowHeight;
    }
  }

  // Grand Total & Signatures Box (at end of catalog)
  const invoiceBottomHeight = 36;
  if (currentY + invoiceBottomHeight > pageHeight - 16) {
    doc.addPage();
    currentY = 16;
  } else {
    currentY += 4;
  }

  // Grand Summary Card
  doc.setFillColor(...colorBgLight);
  doc.roundedRect(marginX, currentY, contentWidth, 16, 2, 2, "F");
  doc.setDrawColor(...colorBorder);
  doc.setLineWidth(0.4);
  doc.roundedRect(marginX, currentY, contentWidth, 16, 2, 2, "D");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...colorDark);
  doc.text(`TOTAL DISTINCT ITEMS: ${total}`, marginX + 6, currentY + 6.5);
  doc.text(`TOTAL QUANTITY: ${totalGrandQty} PCS`, marginX + 6, currentY + 11.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...colorMuted);
  doc.text(`Retail MRP Value: Tk ${totalMarketSum.toLocaleString()}  |  Total Savings: Tk ${totalSavings.toLocaleString()}`, 115, currentY + 6.5, { align: "right" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...colorPrimary);
  doc.text(`GRAND TOTAL BILL: Tk ${totalWholesaleSum.toLocaleString()}`, 192, currentY + 12, { align: "right" });

  currentY += 22;

  // Signatures Row
  doc.setDrawColor(...colorBorder);
  doc.setLineWidth(0.3);

  // Left: Prepared By
  doc.line(marginX + 6, currentY + 8, marginX + 46, currentY + 8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...colorMuted);
  doc.text("Prepared By (LIORA Sales Desk)", marginX + 8, currentY + 11.5);

  // Middle: Authorized Signature
  doc.line(marginX + 70, currentY + 8, marginX + 112, currentY + 8);
  doc.text("Authorized Signature & Stamp", marginX + 72, currentY + 11.5);

  // Right: Receiver's Signature
  doc.line(152, currentY + 8, 194, currentY + 8);
  doc.text("Receiver Signature & Date", 154, currentY + 11.5);

  // Page Numbers
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    drawFooter(p, totalPages);
  }

  // Save & Trigger Download
  const cleanName = (clientInfo.clientName || "Invoice")
    .trim()
    .replace(/[^a-zA-Z0-9_\u0980-\u09FF]/g, "_")
    .slice(0, 20);
  const fileName = `LIORA_Wholesale_Invoice_${cleanName}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);

  return { ok: true, fileName, totalItems: total, totalGrandQty, totalWholesaleSum };
}
