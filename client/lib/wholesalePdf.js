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
 * Helper to build 2-level hierarchy:
 * - When groupBy === "brand": Brand (Primary) -> Category (Secondary) -> items
 * - When groupBy === "category": Category (Primary) -> Brand (Secondary) -> items
 */
export function buildHierarchicalGroups(items = [], groupBy = "brand") {
  const isBrandFirst = groupBy === "brand";
  const primaryMap = new Map();

  items.forEach((item) => {
    const rawBrand = (item.brandName || "Other Brands").trim();
    const rawCat = (item.categoryName || "General / Others").trim();

    const primaryKey = isBrandFirst ? rawBrand : rawCat;
    const secondaryKey = isBrandFirst ? rawCat : rawBrand;

    if (!primaryMap.has(primaryKey)) {
      primaryMap.set(primaryKey, {
        primaryName: primaryKey,
        isBrandPrimary: isBrandFirst,
        items: [],
        totalQty: 0,
        subtotal: 0,
        subtotalMarket: 0,
        secondaryMap: new Map(),
      });
    }

    const pGroup = primaryMap.get(primaryKey);
    pGroup.items.push(item);
    pGroup.totalQty += item.quantity;
    pGroup.subtotal += item.lineTotal;
    pGroup.subtotalMarket += item.originalPrice * item.quantity;

    if (!pGroup.secondaryMap.has(secondaryKey)) {
      pGroup.secondaryMap.set(secondaryKey, {
        secondaryName: secondaryKey,
        isBrandSecondary: !isBrandFirst,
        items: [],
        totalQty: 0,
        subtotal: 0,
        subtotalMarket: 0,
      });
    }

    const sGroup = pGroup.secondaryMap.get(secondaryKey);
    sGroup.items.push(item);
    sGroup.totalQty += item.quantity;
    sGroup.subtotal += item.lineTotal;
    sGroup.subtotalMarket += item.originalPrice * item.quantity;
  });

  // Convert to sorted arrays
  return Array.from(primaryMap.values())
    .sort((a, b) => a.primaryName.localeCompare(b.primaryName))
    .map((pGroup) => ({
      ...pGroup,
      secondaryGroups: Array.from(pGroup.secondaryMap.values()).sort((a, b) =>
        a.secondaryName.localeCompare(b.secondaryName)
      ),
    }));
}

/**
 * Generates and downloads a wholesale billing invoice & price quotation PDF
 * Features:
 *  - 2 Grouping Options: Brand -> Category OR Category -> Brand
 *  - Clean Retail MRP column (no strikethrough, clearly showing retail selling price)
 *  - Product-level Discount % (% OFF) badge
 *  - High visual elegance with LIORA branding
 */
export async function generateWholesalePdf({
  items = [],
  clientInfo = {},
  profitPercent = 5,
  quoteNumber = null,
  groupBy = "brand", // "brand" (Brand -> Category) | "category" (Category -> Brand)
  groupLabel = null, // e.g. "COSRX" when downloading single brand/category PDF
  onProgress = null,
}) {
  if (!items || items.length === 0) {
    throw new Error("No products selected for quotation.");
  }

  const isBrandFirst = groupBy !== "category";

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
  const colorSlate800 = [30, 41, 59];     // Slate-800 #1e293b
  const colorMuted = [100, 116, 139];     // Slate-500 #64748b
  const colorBorder = [226, 232, 240];    // Slate-200 #e2e8f0
  const colorBgLight = [248, 250, 252];   // Slate-50 #f8fafc
  const colorGreen = [22, 163, 74];       // Green-600 #16a34a
  const colorGreenBg = [240, 253, 244];   // Green-50 #f0fdf4
  const colorMrp = [51, 65, 85];          // Slate-700 #334155 (Crisp, clean for Retail MRP)

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
    const origPrice =
      Number(p.originalPrice) ||
      Number(p.offerPrice) ||
      (buyPrice > 0 ? Math.round(buyPrice * 1.5) : 0);
    const customWholesale = Number(p.wholesalePrice);

    const calculatedWholesale =
      customWholesale > 0
        ? customWholesale
        : Math.round(buyPrice * (1 + Number(profitPercent || 0) / 100));

    const finalWholesale = Math.max(1, calculatedWholesale);
    const qty = Math.max(1, parseInt(p.quantity) || 1);
    const lineTotal = finalWholesale * qty;
    const lineMarket = origPrice * qty;

    const discountPct =
      origPrice > finalWholesale
        ? Math.round(((origPrice - finalWholesale) / origPrice) * 100)
        : 0;

    totalGrandQty += qty;
    totalMarketSum += lineMarket;
    totalWholesaleSum += lineTotal;
    totalDiscountPercentSum += discountPct;

    const rawBrand =
      (p.brand && typeof p.brand === "object" ? p.brand?.name : p.brand) ||
      p.brandName ||
      "Other Brands";
    const brandName = String(rawBrand).trim() || "Other Brands";

    const rawCategory =
      (p.category && typeof p.category === "object" ? p.category?.name : p.category) ||
      p.categoryName ||
      "General";
    const categoryName = String(rawCategory).trim() || "General";

    return {
      id: String(p._id || p.id || p.productId || p.name),
      name: p.name || "Product Item",
      brandName,
      categoryName,
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

  // Build hierarchical group structure based on selected groupBy
  const hierarchicalGroups = buildHierarchicalGroups(preparedItems, groupBy);

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
    const subDesc = groupLabel
      ? `Filter: ${groupLabel} (${isBrandFirst ? "Brand View" : "Category View"})`
      : `Grouped By: ${isBrandFirst ? "Brand → Category" : "Category → Brand"}`;
    doc.text(subDesc, 196, 29.5, { align: "right" });

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

  // Draw Table Headers (Column Layout with Retail MRP & Discount % columns)
  // Total width: 182mm (marginX: 14 to 196)
  // Col 1: # (8mm) -> center at marginX + 4
  // Col 2: IMAGE (14mm) -> center at marginX + 15
  // Col 3: PRODUCT DETAILS (54mm) -> left at marginX + 24
  // Col 4: RETAIL MRP (22mm) -> right at marginX + 104
  // Col 5: DISCOUNT (18mm) -> center at marginX + 118
  // Col 6: RATE (TK) (22mm) -> right at marginX + 144
  // Col 7: QTY (PCS) (16mm) -> center at marginX + 160
  // Col 8: LINE TOTAL (28mm) -> right at 194
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
    doc.text("PRODUCT DETAILS", marginX + 24, y + 5.5);
    doc.text("RETAIL MRP", marginX + 104, y + 5.5, { align: "right" });
    doc.text("DISCOUNT", marginX + 118, y + 5.5, { align: "center" });
    doc.text("RATE (TK)", marginX + 144, y + 5.5, { align: "right" });
    doc.text("QTY (PCS)", marginX + 160, y + 5.5, { align: "center" });
    doc.text("LINE TOTAL (TK)", 194, y + 5.5, { align: "right" });

    return y + h;
  }

  // Draw Primary Group Header Banner (Brand or Category)
  function drawPrimaryHeader(name, labelPrefix, itemCount, groupQty, groupSubtotal, y) {
    const h = 7.5;
    doc.setFillColor(...colorSlate800); // Slate-800
    doc.rect(marginX, y, contentWidth, h, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text(`${labelPrefix}: ${name.toUpperCase()}`, marginX + 4, y + 5.2);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(226, 232, 240);
    const summaryStr = `${itemCount} Items  |  ${groupQty} Pcs  |  Subtotal: Tk ${groupSubtotal.toLocaleString()}`;
    doc.text(summaryStr, 194, y + 5.2, { align: "right" });

    return y + h;
  }

  // Draw Secondary Sub-Header Banner (Category within Brand OR Brand within Category)
  function drawSecondaryHeader(name, labelPrefix, itemCount, subQty, subTotal, y) {
    const h = 6.2;
    doc.setFillColor(248, 250, 252); // Slate-50
    doc.rect(marginX, y, contentWidth, h, "F");
    doc.setDrawColor(...colorBorder);
    doc.setLineWidth(0.25);
    doc.rect(marginX, y, contentWidth, h, "D");

    // Rose accent indicator on left
    doc.setFillColor(...colorPrimary);
    doc.rect(marginX, y, 2.5, h, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...colorDark);
    doc.text(`${labelPrefix}: ${name}`, marginX + 5.5, y + 4.3);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...colorMuted);
    const summaryStr = `${itemCount} Items  •  ${subQty} Pcs  •  Tk ${subTotal.toLocaleString()}`;
    doc.text(summaryStr, 194, y + 4.3, { align: "right" });

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

  for (const pGroup of hierarchicalGroups) {
    // Check page break before Primary Header
    if (currentY + 16 > pageHeight - 20) {
      doc.addPage();
      currentY = 14;
      currentY = drawTableHeader(currentY);
    }

    currentY = drawPrimaryHeader(
      pGroup.primaryName,
      isBrandFirst ? "BRAND" : "CATEGORY",
      pGroup.items.length,
      pGroup.totalQty,
      pGroup.subtotal,
      currentY
    );

    for (const sGroup of pGroup.secondaryGroups) {
      // Check page break before Secondary Sub-header
      if (currentY + 14 > pageHeight - 20) {
        doc.addPage();
        currentY = 14;
        currentY = drawTableHeader(currentY);
      }

      currentY = drawSecondaryHeader(
        sGroup.secondaryName,
        isBrandFirst ? "Category" : "Brand",
        sGroup.items.length,
        sGroup.totalQty,
        sGroup.subtotal,
        currentY
      );

      for (let i = 0; i < sGroup.items.length; i++) {
        const item = sGroup.items[i];
        const itemImg = imageMap.get(item.id);

        // Text wrapping for product name
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        const titleLines = doc.splitTextToSize(item.name, 50);
        const titleHeight = titleLines.length * 3.8;
        const rowHeight = Math.max(rowMinHeight, titleHeight + 7);

        // Page break check for item row
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

        const rowMidY = currentY + rowHeight / 2 + 1.2;

        // 1. Serial Number
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(...colorMuted);
        doc.text(String(serialCounter++), marginX + 4, rowMidY, { align: "center" });

        // 2. Thumbnail Image
        const imgX = marginX + 9.5;
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

        // 3. Product Details (Name + secondary tag)
        const textX = marginX + 24;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(...colorDark);
        doc.text(titleLines, textX, currentY + 5);

        const detailTag = isBrandFirst ? item.categoryName : item.brandName;
        if (detailTag) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(6.8);
          doc.setTextColor(...colorMuted);
          doc.text(detailTag, textX, currentY + 5.5 + titleHeight);
        }

        // 4. Retail Market Price (MRP) — CLEAR, DISTINCT, NO STRIKETHROUGH
        const mrpX = marginX + 104;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(...colorMrp);
        doc.text(`Tk ${item.originalPrice.toLocaleString()}`, mrpX, rowMidY, { align: "right" });

        // 5. Discount Percentage Badge (% OFF from MRP)
        const discX = marginX + 118;
        const discBadgeW = 16;
        const discBadgeH = 5.5;
        const discBadgeY = currentY + (rowHeight - discBadgeH) / 2;

        doc.setFillColor(...colorGreenBg);
        doc.roundedRect(discX - discBadgeW / 2, discBadgeY, discBadgeW, discBadgeH, 1.2, 1.2, "F");
        doc.setDrawColor(134, 239, 172); // Green-300
        doc.setLineWidth(0.2);
        doc.roundedRect(discX - discBadgeW / 2, discBadgeY, discBadgeW, discBadgeH, 1.2, 1.2, "D");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.2);
        doc.setTextColor(...colorGreen);
        doc.text(
          item.discountPct > 0 ? `${item.discountPct}% OFF` : "0% OFF",
          discX,
          discBadgeY + 4,
          { align: "center" }
        );

        // 6. Wholesale Unit Rate (Buying Rate for buyer)
        const wsX = marginX + 144;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(...colorDark);
        doc.text(`Tk ${item.wholesalePrice.toLocaleString()}`, wsX, rowMidY, { align: "right" });

        // 7. Quantity (Pcs) Badge
        const qtyX = marginX + 160;
        const qtyBadgeW = 16;
        const qtyBadgeH = 6;
        const qtyBadgeY = currentY + (rowHeight - qtyBadgeH) / 2;

        doc.setFillColor(241, 245, 249);
        doc.roundedRect(qtyX - qtyBadgeW / 2, qtyBadgeY, qtyBadgeW, qtyBadgeH, 1.5, 1.5, "F");
        doc.setDrawColor(...colorBorder);
        doc.roundedRect(qtyX - qtyBadgeW / 2, qtyBadgeY, qtyBadgeW, qtyBadgeH, 1.5, 1.5, "D");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(...colorDark);
        doc.text(`${item.quantity} Pcs`, qtyX, qtyBadgeY + 4.2, { align: "center" });

        // 8. Line Total
        const totX = 194;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(...colorPrimary);
        doc.text(`Tk ${item.lineTotal.toLocaleString()}`, totX, rowMidY, { align: "right" });

        currentY += rowHeight;
      }
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
  doc.text(
    `Retail MRP Value: Tk ${totalMarketSum.toLocaleString()}  |  Total Savings: Tk ${totalSavings.toLocaleString()}`,
    115,
    currentY + 6.5,
    { align: "right" }
  );

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
  const modeTag = isBrandFirst ? "BrandGrouped" : "CategoryGrouped";
  const groupTag = groupLabel
    ? `_${String(groupLabel).trim().replace(/[^a-zA-Z0-9_\u0980-\u09FF]/g, "_").slice(0, 20)}`
    : "";
  const fileName = `LIORA_Wholesale_Invoice_${modeTag}${groupTag}_${cleanName}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);

  return { ok: true, fileName, totalItems: total, totalGrandQty, totalWholesaleSum };
}
