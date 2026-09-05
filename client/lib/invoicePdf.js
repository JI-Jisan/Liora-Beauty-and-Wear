import { jsPDF } from "jspdf";

export function downloadInvoicePdf(order) {
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
  const total = Number(order.total) || subtotal + deliveryCharge;
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
  doc.text(`Address: ${address.slice(0, 80)}`, 19, 74);

  doc.setFont("helvetica", "bold");
  doc.text("PAYMENT METHOD:", 120, 53);
  doc.setFont("helvetica", "normal");
  doc.text("Cash on Delivery (COD)", 120, 59);
  doc.text("Currency: BDT (Tk)", 120, 64);

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

  // 6. Summary Block (Subtotal, Delivery, Total)
  tableY += 4;
  const summaryX = 120;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...textMuted);
  doc.text("Subtotal:", summaryX, tableY + 5);
  doc.setTextColor(...darkNavy);
  doc.text(`Tk ${subtotal.toLocaleString()}`, 191, tableY + 5, { align: "right" });

  tableY += 6;
  doc.setTextColor(...textMuted);
  doc.text("Delivery Charge:", summaryX, tableY + 5);
  doc.setTextColor(...darkNavy);
  doc.text(`Tk ${deliveryCharge.toLocaleString()}`, 191, tableY + 5, { align: "right" });

  tableY += 7;
  // Total Highlight Box
  doc.setFillColor(255, 241, 242); // Rose-50
  doc.roundedRect(summaryX - 4, tableY, 80, 10, 2, 2, "F");
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.5);
  doc.roundedRect(summaryX - 4, tableY, 80, 10, 2, 2, "D");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(...primaryColor);
  doc.text("Total Payable:", summaryX, tableY + 6.5);
  doc.text(`Tk ${total.toLocaleString()}`, 191, tableY + 6.5, { align: "right" });

  // 7. Policy & Note Box
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...darkNavy);
  doc.text("TERMS & CONDITIONS:", 14, tableY - 5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...textMuted);
  doc.text("• Please check product authenticity and condition in front of delivery rider.", 14, tableY);
  doc.text("• For any return or exchange, please notify us within 24 hours with unbroken seal.", 14, tableY + 4);
  doc.text("• Track your live order progress anytime at liorabeautyandwear.com/order-tracking", 14, tableY + 8);

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
