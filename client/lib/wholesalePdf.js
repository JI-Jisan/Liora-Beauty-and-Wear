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
 * Generates and downloads a wholesale price quotation PDF catalog
 */
export async function generateWholesalePdf({
  items = [],
  clientInfo = {},
  profitPercent = 5,
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
        const id = item._id || item.id || item.name;
        if (item.image) {
          const dataUrl = await urlToDataUrl(item.image);
          if (dataUrl) imageMap.set(id, dataUrl);
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
  const colorPrimary = [225, 29, 72];   // Rose-600 #e11d48
  const colorDark = [15, 23, 42];        // Slate-900 #0f172a
  const colorMuted = [100, 116, 139];    // Slate-500
  const colorBorder = [226, 232, 240];   // Slate-200
  const colorBgLight = [248, 250, 252];  // Slate-50
  const colorGreen = [22, 163, 74];      // Green-600 #16a34a
  const colorGreenBg = [240, 253, 244];  // Green-50

  const todayStr = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const quoteRef = `WS-${Date.now().toString().slice(-6)}`;

  // Calculate Overall Statistics & Average Discount
  let totalMarketSum = 0;
  let totalWholesaleSum = 0;
  let totalDiscountPercentSum = 0;

  const preparedItems = items.map((p) => {
    const buyPrice = Number(p.purchasePrice) || 0;
    const origPrice = Number(p.originalPrice) || Number(p.offerPrice) || (buyPrice > 0 ? Math.round(buyPrice * 1.5) : 0);
    const customWholesale = Number(p.wholesalePrice);
    
    // Default wholesale calculation: purchasePrice + % profit
    const calculatedWholesale = customWholesale > 0
      ? customWholesale
      : Math.round(buyPrice * (1 + Number(profitPercent || 0) / 100));

    const finalWholesale = Math.max(1, calculatedWholesale);
    
    // Discount % from original retail market price
    const discountPct = origPrice > finalWholesale
      ? Math.round(((origPrice - finalWholesale) / origPrice) * 100)
      : 0;

    totalMarketSum += origPrice;
    totalWholesaleSum += finalWholesale;
    totalDiscountPercentSum += discountPct;

    return {
      id: p._id || p.id || p.name,
      name: p.name || "Product Item",
      brandName: (p.brand && typeof p.brand === "object" ? p.brand?.name : p.brand) || "",
      categoryName: (p.category && typeof p.category === "object" ? p.category?.name : p.category) || "",
      buyPrice,
      originalPrice: origPrice,
      wholesalePrice: finalWholesale,
      discountPct,
    };
  });

  const avgDiscount = total > 0 ? Math.round(totalDiscountPercentSum / total) : 0;
  const totalSavings = Math.max(0, totalMarketSum - totalWholesaleSum);

  // Helper to draw Header & Top Banner on Page 1
  function drawFirstPageHeader() {
    // Top decorative bar
    doc.setFillColor(...colorPrimary);
    doc.rect(0, 0, pageWidth, 5, "F");

    // Brand Name & Subtitle
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(...colorDark);
    doc.text("LIORA", marginX, 17);

    doc.setFontSize(9);
    doc.setTextColor(...colorPrimary);
    doc.text("BEAUTY & WEAR  •  WHOLESALE & B2B CATALOG", marginX, 22);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...colorMuted);
    doc.text("Official Importer & Distributor | Authentic Cosmetics, Skincare & Fragrance", marginX, 26);
    doc.text("Web: liorabeautyandwear.com  |  Helpline: +8801837223147  |  Dhaka, Bangladesh", marginX, 29.5);

    // Quotation Details (Right Side)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(...colorDark);
    doc.text("WHOLESALE QUOTATION", 196, 17, { align: "right" });

    doc.setFontSize(9);
    doc.setTextColor(...colorPrimary);
    doc.text(`Ref: #${quoteRef}`, 196, 22, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...colorMuted);
    doc.text(`Date: ${todayStr}`, 196, 26, { align: "right" });
    doc.text("Special B2B Wholesale Pricing", 196, 29.5, { align: "right" });

    // Thin separator
    doc.setDrawColor(...colorBorder);
    doc.setLineWidth(0.3);
    doc.line(marginX, 34, 196, 34);

    // Client Info Box
    let clientY = 38;
    const clientName = clientInfo.clientName || "Valued Wholesale Partner / Reseller";
    const clientPhone = clientInfo.clientPhone || "";
    const clientAddress = clientInfo.clientAddress || "";

    doc.setFillColor(...colorBgLight);
    doc.roundedRect(marginX, clientY, contentWidth, 16, 2, 2, "F");
    doc.setDrawColor(...colorBorder);
    doc.roundedRect(marginX, clientY, contentWidth, 16, 2, 2, "D");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...colorDark);
    doc.text("QUOTATION PREPARED FOR:", marginX + 4, clientY + 6);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...colorPrimary);
    doc.text(clientName, marginX + 4, clientY + 11.5);

    if (clientPhone || clientAddress) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...colorMuted);
      const contactStr = [clientPhone, clientAddress].filter(Boolean).join("  |  ");
      const safeContact = doc.splitTextToSize(contactStr, 90)[0];
      doc.text(safeContact, 192, clientY + 9, { align: "right" });
    }

    // ⭐ HIGHLIGHT SAVINGS BANNER (Customer Delight)
    const bannerY = clientY + 19;
    doc.setFillColor(...colorGreenBg);
    doc.roundedRect(marginX, bannerY, contentWidth, 18, 3, 3, "F");
    doc.setDrawColor(34, 197, 94); // Green-500
    doc.setLineWidth(0.5);
    doc.roundedRect(marginX, bannerY, contentWidth, 18, 3, 3, "D");

    // Big Discount Highlight Badge on Left
    doc.setFillColor(...colorGreen);
    doc.roundedRect(marginX + 3, bannerY + 3, 48, 12, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text(`${avgDiscount}% OFF`, marginX + 27, bannerY + 8.5, { align: "center" });
    doc.setFontSize(6.5);
    doc.text("AVERAGE DISCOUNT", marginX + 27, bannerY + 12.5, { align: "center" });

    // Metrics in middle & right
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...colorDark);
    doc.text("SPECIAL WHOLESALE BENEFIT & SAVINGS:", marginX + 56, bannerY + 6.5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...colorMuted);
    doc.text(
      `• Total Items: ${total} Products  |  Total Retail Market Value: Tk ${totalMarketSum.toLocaleString()}`,
      marginX + 56,
      bannerY + 11
    );
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...colorGreen);
    doc.text(
      `• Your Wholesale Total: Tk ${totalWholesaleSum.toLocaleString()}  (You Save: Tk ${totalSavings.toLocaleString()} on MRP!)`,
      marginX + 56,
      bannerY + 15
    );

    return bannerY + 23;
  }

  // Draw Table Headers
  function drawTableHeader(y) {
    const h = 8;
    doc.setFillColor(241, 245, 249); // Slate-100
    doc.rect(marginX, y, contentWidth, h, "F");
    doc.setDrawColor(...colorBorder);
    doc.setLineWidth(0.3);
    doc.rect(marginX, y, contentWidth, h, "D");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...colorDark);

    // Columns within 182mm (marginX: 14 to 196):
    // Serial (8mm) | Image (16mm) | Product Details (76mm) | Market MRP (24mm) | Wholesale Rate (28mm) | Discount (30mm)
    doc.text("#", marginX + 4, y + 5.5, { align: "center" });
    doc.text("IMAGE", marginX + 16, y + 5.5, { align: "center" });
    doc.text("PRODUCT DETAILS", marginX + 26, y + 5.5);
    doc.text("MARKET (MRP)", marginX + 118, y + 5.5, { align: "right" });
    doc.text("WHOLESALE RATE", marginX + 148, y + 5.5, { align: "right" });
    doc.text("DISCOUNT", marginX + 167, y + 5.5, { align: "center" });

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
    doc.text("LIORA Beauty & Wear • Wholesale & B2B Distribution Desk • Helpline: +8801837223147", marginX, footerY + 4);
    doc.text("Note: Prices valid for 7 days from issue date. Subject to stock availability.", marginX, footerY + 7.5);

    doc.setFont("helvetica", "bold");
    doc.text(`Page ${pageNum} of ${totalPages}`, 196, footerY + 5.5, { align: "right" });
  }

  // Draw Page Content
  let currentY = drawFirstPageHeader();
  currentY = drawTableHeader(currentY);

  const rowMinHeight = 16;

  for (let idx = 0; idx < preparedItems.length; idx++) {
    const item = preparedItems[idx];
    const itemImg = imageMap.get(item.id);

    // Text wrapping for product name
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    const titleLines = doc.splitTextToSize(item.name, 72);
    const titleHeight = titleLines.length * 4;
    const rowHeight = Math.max(rowMinHeight, titleHeight + 7);

    // Page break check
    if (currentY + rowHeight > pageHeight - 18) {
      doc.addPage();
      // Mini header for continuation pages
      doc.setFillColor(...colorPrimary);
      doc.rect(0, 0, pageWidth, 3, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(...colorDark);
      doc.text(`LIORA Wholesale Quotation #${quoteRef} — (Continued)`, marginX, 10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...colorMuted);
      doc.text(`Date: ${todayStr}`, 196, 10, { align: "right" });
      currentY = drawTableHeader(14);
    }

    // Row Background (Zebra Striping)
    if (idx % 2 === 1) {
      doc.setFillColor(252, 253, 254);
      doc.rect(marginX, currentY, contentWidth, rowHeight, "F");
    }

    // Row Border bottom
    doc.setDrawColor(...colorBorder);
    doc.setLineWidth(0.2);
    doc.line(marginX, currentY + rowHeight, marginX + contentWidth, currentY + rowHeight);

    // 1. Serial Number
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...colorMuted);
    doc.text(String(idx + 1), marginX + 4, currentY + rowHeight / 2 + 1.5, { align: "center" });

    // 2. Thumbnail Image
    const imgX = marginX + 9;
    const imgY = currentY + (rowHeight - 12) / 2;
    const imgDim = 12;

    if (itemImg) {
      try {
        doc.addImage(itemImg, "JPEG", imgX, imgY, imgDim, imgDim);
        doc.setDrawColor(...colorBorder);
        doc.setLineWidth(0.2);
        doc.rect(imgX, imgY, imgDim, imgDim, "D");
      } catch (e) {
        // Fallback placeholder
        doc.setFillColor(241, 245, 249);
        doc.rect(imgX, imgY, imgDim, imgDim, "F");
      }
    } else {
      // Placeholder box
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(imgX, imgY, imgDim, imgDim, 1, 1, "F");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6);
      doc.setTextColor(...colorMuted);
      doc.text("No Pic", imgX + imgDim / 2, imgY + imgDim / 2 + 1, { align: "center" });
    }

    // 3. Product Details (Name + Brand)
    const textX = marginX + 26;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...colorDark);
    doc.text(titleLines, textX, currentY + 5.5);

    const brandCat = [item.brandName, item.categoryName].filter(Boolean).join(" • ");
    if (brandCat) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...colorMuted);
      doc.text(brandCat, textX, currentY + 6 + titleHeight);
    }

    // 4. Market Price (MRP / Regular Retail)
    const mrpX = marginX + 118;
    const mrpY = currentY + rowHeight / 2 + 1.5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...colorMuted);
    const mrpStr = `Tk ${item.originalPrice.toLocaleString()}`;
    doc.text(mrpStr, mrpX, mrpY, { align: "right" });
    // Strikethrough line over regular price
    const mrpWidth = doc.getTextWidth(mrpStr);
    doc.setDrawColor(...colorMuted);
    doc.setLineWidth(0.25);
    doc.line(mrpX - mrpWidth, mrpY - 1, mrpX, mrpY - 1);

    // 5. Wholesale Rate (Highlighted in Bold Rose/Dark)
    const wsX = marginX + 148;
    const wsY = currentY + rowHeight / 2 + 1.5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...colorPrimary);
    doc.text(`Tk ${item.wholesalePrice.toLocaleString()}`, wsX, wsY, { align: "right" });

    // 6. Savings % Badge (Properly inside table border)
    const badgeW = 20;
    const badgeH = 6.5;
    const badgeX = marginX + 157; // 14 + 157 = 171. Right edge = 191 (< 196)
    const badgeY = currentY + (rowHeight - badgeH) / 2;

    doc.setFillColor(...colorGreenBg);
    doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 1.5, 1.5, "F");
    doc.setDrawColor(34, 197, 94);
    doc.setLineWidth(0.2);
    doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 1.5, 1.5, "D");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...colorGreen);
    doc.text(`${item.discountPct}% OFF`, marginX + 167, badgeY + 4.5, { align: "center" });

    currentY += rowHeight;
  }

  // 4. Add Page Numbers on all pages
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    drawFooter(p, totalPages);
  }

  // 5. Save & Trigger Download
  const cleanName = (clientInfo.clientName || "Catalog")
    .trim()
    .replace(/[^a-zA-Z0-9_\u0980-\u09FF]/g, "_")
    .slice(0, 20);
  const fileName = `LIORA_Wholesale_${cleanName}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);

  return { ok: true, fileName, totalItems: total };
}
