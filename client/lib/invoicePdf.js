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
    if (isEven) {
      doc.setFillColor(253, 253, 254);
      doc.rect(14, tableY, 182, 7.5, "F");
    }

    doc.setTextColor(...darkNavy);
    doc.text(String(index + 1), 18, tableY + 5);

    const name = item.productName || item.name || "Product Item";
    const displayName = name.length > 55 ? name.slice(0, 52) + "..." : name;
    doc.text(displayName, 32, tableY + 5);

    const qty = Number(item.quantity) || 1;
    doc.text(String(qty), 130, tableY + 5, { align: "center" });

    const price = Number(item.price) || 0;
    doc.text(`${price}`, 160, tableY + 5, { align: "right" });

    const rowTotal = price * qty;
    doc.text(`${rowTotal}`, 191, tableY + 5, { align: "right" });

    doc.setDrawColor(...borderLine);
    doc.setLineWidth(0.2);
    doc.line(14, tableY + 7.5, 196, tableY + 7.5);

    tableY += 7.5;
  });

  // 6. Summary Block (Subtotal, Delivery, Discount, Total)
  const summaryStartY = tableY + 5;
  const summaryX = 120;
  let currentSummaryY = summaryStartY;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...textMuted);
  doc.text("Subtotal:", summaryX, currentSummaryY + 5);
  doc.setTextColor(...darkNavy);
  doc.text(`Tk ${subtotal.toLocaleString()}`, 191, currentSummaryY + 5, { align: "right" });

  currentSummaryY += 6;
  doc.setTextColor(...textMuted);
  doc.text("Delivery Charge:", summaryX, currentSummaryY + 5);
  doc.setTextColor(...darkNavy);
  doc.text(`Tk ${deliveryCharge.toLocaleString()}`, 191, currentSummaryY + 5, { align: "right" });

  if (discount > 0) {
    currentSummaryY += 6;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(22, 163, 74); // Vibrant Emerald Green #16a34a
    doc.text("Special Discount:", summaryX, currentSummaryY + 5);
    doc.text(`- Tk ${discount.toLocaleString()}`, 191, currentSummaryY + 5, { align: "right" });
  }

  currentSummaryY += 7;
  // Total Highlight Box
  doc.setFillColor(255, 241, 242); // Rose-50
  doc.roundedRect(summaryX - 4, currentSummaryY, 80, 10, 2, 2, "F");
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.5);
  doc.roundedRect(summaryX - 4, currentSummaryY, 80, 10, 2, 2, "D");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(...primaryColor);
  doc.text("Total Payable:", summaryX, currentSummaryY + 6.5);
  doc.text(`Tk ${total.toLocaleString()}`, 191, currentSummaryY + 6.5, { align: "right" });

  if (discount > 0) {
    currentSummaryY += 12;
    // Customer Happiness Badge: "You Saved Tk 50 on this order!"
    doc.setFillColor(240, 253, 244); // Green-50
    doc.roundedRect(summaryX - 4, currentSummaryY, 80, 7.5, 2, 2, "F");
    doc.setDrawColor(34, 197, 94); // Green-500
    doc.setLineWidth(0.3);
    doc.roundedRect(summaryX - 4, currentSummaryY, 80, 7.5, 2, 2, "D");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(22, 163, 74);
    doc.text(`You Saved Tk ${discount.toLocaleString()} on this order!`, summaryX + 36, currentSummaryY + 5, { align: "center" });
  }

  // 7. Policy & Note Box (Left side)
  const termsY = summaryStartY + 2;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...darkNavy);
  doc.text("TERMS & CONDITIONS:", 14, termsY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...textMuted);
  doc.text("• Please check product authenticity and condition in front of delivery rider.", 14, termsY + 5);
  doc.text("• For any return or exchange, please notify us within 24 hours with unbroken seal.", 14, termsY + 9.5);
  doc.text("• Track your live order progress anytime at liorabeautyandwear.com/order-tracking", 14, termsY + 14);

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
