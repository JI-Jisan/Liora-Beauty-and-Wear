"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { API_BASE_URL } from "@/lib/api";
import { downloadInvoicePdf } from "@/lib/invoicePdf";

function OrderSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get("id");

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const invoiceRef = useRef(null);

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }

    const fetchOrder = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/orders/${orderId}`);
        if (res.ok) {
          const data = await res.json();
          setOrder(data);
        }
      } catch (err) {
        console.error("Order fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  const handleDownloadInvoice = () => {
    if (order) {
      downloadInvoicePdf({ ...order, couponCode: order.couponCode || couponCode });
    }
  };

  const noteMatch = (order?.note || "").match(/(?:Privilege|Coupon|Campus):\s*([A-Za-z0-9_-]+)/i);
  const searchCoupon = searchParams.get("coupon") || "";
  const couponCode = (
    order?.couponCode ||
    searchCoupon ||
    (noteMatch ? noteMatch[1] : "") ||
    ((order?.note || "").toLowerCase().includes("diu") ? "DIU15" : "") ||
    (order?.discount > 0 ? "DIU15" : "")
  ).toUpperCase();

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "80px 20px" }}>
        <h2>Loading your order details...</h2>
      </div>
    );
  }

  return (
    <div className="order-success-container" style={{ maxWidth: "700px", margin: "40px auto", padding: "20px" }}>
      {/* Printable Invoice Container */}
      <div
        ref={invoiceRef}
        id="printable-invoice"
        style={{
          background: "#ffffff",
          borderRadius: "16px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
          border: "1px solid #e2e8f0",
          overflow: "hidden"
        }}
      >
        {/* Top Decorative Bar */}
        <div style={{ height: "5px", background: "#e11d48", width: "100%" }}></div>

        <div style={{ padding: "28px" }}>
          {/* Header Section: LIORA (Left) | INVOICE Meta (Right) */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid #e2e8f0", paddingBottom: "18px", gap: "16px" }}>
            {/* Left: LIORA Brand */}
            <div>
              <h2 style={{ margin: 0, fontSize: "28px", color: "#0f172a", fontWeight: "900", letterSpacing: "1px" }}>LIORA</h2>
              <div style={{ fontSize: "11px", fontWeight: "800", color: "#e11d48", letterSpacing: "1.5px", marginTop: "2px" }}>BEAUTY & WEAR</div>
              <p style={{ color: "#64748b", margin: "4px 0 0", fontSize: "12px" }}>
                Authentic Skincare, Cosmetics & Fashion Wear
              </p>
              <p style={{ color: "#94a3b8", margin: "2px 0 0", fontSize: "11px" }}>
                Web: liorabeautyandwear.com | Email: liorabeautyandwear@gmail.com
              </p>
            </div>

            {/* Right: INVOICE Meta */}
            <div style={{ textAlign: "right" }}>
              <h1 style={{ margin: 0, fontSize: "24px", color: "#0f172a", fontWeight: "900", letterSpacing: "1px" }}>INVOICE</h1>
              <div style={{ fontSize: "13px", fontWeight: "800", color: "#e11d48", margin: "3px 0 2px" }}>
                #{order?.orderNumber || "LIORA-Order"}
              </div>
              <div style={{ fontSize: "12px", color: "#64748b" }}>
                Date: {order?.createdAt ? new Date(order.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : new Date().toLocaleDateString("en-US")}
              </div>
              <div style={{ fontSize: "12px", color: "#64748b" }}>
                Status: <strong style={{ color: "#475569" }}>{(order?.status || "PENDING").toUpperCase()}</strong>
              </div>
            </div>
          </div>

          {/* Customer Details Box with QR Code Scanner */}
          {(() => {
            const orderNo = order?.orderNumber || "Liora_Order";
            const siteUrl = typeof window !== "undefined" && window.location?.origin ? window.location.origin : "https://liorabeautyandwear.com";
            const verifyUrl = order?.accessToken
              ? `${siteUrl}/order/verify?no=${encodeURIComponent(orderNo)}&k=${encodeURIComponent(order?.accessToken)}`
              : `${siteUrl}/order-tracking?query=${encodeURIComponent(orderNo)}`;

            const cleanNote = (order?.note || "").replace(/\[.*?Privilege:.*?\]/gi, "").trim();
            const noteMatch = (order?.note || "").match(/(?:Privilege|Coupon|Campus):\s*([A-Za-z0-9_-]+)/i);
            const searchCoupon = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("coupon") : "";
            const couponCode = (
              order?.couponCode ||
              searchCoupon ||
              (noteMatch ? noteMatch[1] : "") ||
              ((order?.note || "").toLowerCase().includes("diu") ? "DIU15" : "") ||
              (order?.discount > 0 ? "DIU15" : "")
            ).toUpperCase();

            return (
              <div style={{ background: "#ffffff", padding: "12px 18px", borderRadius: "10px", margin: "14px 0 18px", border: "1px solid #e2e8f0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", flexWrap: "wrap", gap: "6px" }}>
                  <strong style={{ fontSize: "11.5px", color: "#0f172a", letterSpacing: "0.5px" }}>BILL TO / DELIVERY DETAILS:</strong>
                  {couponCode && (
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "5px", background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "2px 8px", borderRadius: "6px" }}>
                      <span style={{ fontSize: "10.5px", fontWeight: "800", color: "#16a34a" }}>Coupon: {couponCode}</span>
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "14px" }}>
                  {/* Left Column: Customer & Delivery Info (Compact, values bolded) */}
                  <div style={{ flex: "1 1 250px", fontSize: "12px", color: "#475569", lineHeight: "1.5" }}>
                    <p style={{ margin: "1px 0" }}>Customer Name: <strong style={{ color: "#0f172a", fontWeight: "800" }}>{order?.customerName}</strong></p>
                    <p style={{ margin: "1px 0" }}>Phone Number: <strong style={{ color: "#0f172a", fontWeight: "800" }}>{order?.phone}</strong></p>
                    <p style={{ margin: "1px 0" }}>District: <strong style={{ color: "#0f172a", fontWeight: "800" }}>{order?.district || "Dhaka"}</strong></p>
                    <p style={{ margin: "1px 0" }}>Address: <strong style={{ color: "#0f172a", fontWeight: "800" }}>{order?.address}</strong></p>
                    {cleanNote && <p style={{ margin: "1px 0" }}>Note: <strong style={{ color: "#0f172a" }}>{cleanNote}</strong></p>}
                  </div>

                  {/* Middle Column: Payment Info (Compact) */}
                  <div style={{ flex: "0 1 170px", fontSize: "12px", color: "#475569", lineHeight: "1.5" }}>
                    <strong style={{ fontSize: "11px", color: "#0f172a", display: "block", marginBottom: "3px" }}>PAYMENT METHOD:</strong>
                    <p style={{ margin: "1px 0", color: "#0f172a", fontWeight: "700" }}>Cash on Delivery (COD)</p>
                    <p style={{ margin: "1px 0", color: "#64748b" }}>Currency: BDT (Tk)</p>
                  </div>

                  {/* Right Column: QR Code Scanner */}
                  <div style={{
                    background: "#ffffff",
                    border: "1px solid #cbd5e1",
                    borderRadius: "8px",
                    padding: "6px 8px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.03)",
                    flexShrink: 0
                  }}>
                    <QRCodeSVG value={verifyUrl} size={72} level="M" />
                    <span style={{ fontSize: "8px", fontWeight: "800", color: "#e11d48", marginTop: "3px", letterSpacing: "0.5px" }}>
                      SCAN TO VERIFY
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Verification Alert if Multiple Pending Orders */}
          {Boolean(order?.isFlagged || (order?.pendingOrdersCount && order.pendingOrdersCount > 0)) && (
            <div
              style={{
                background: "#fffbeb",
                border: "1px solid #fde68a",
                borderRadius: "12px",
                padding: "14px 16px",
                marginBottom: "20px",
                display: "flex",
                alignItems: "flex-start",
                gap: "12px",
                textAlign: "left",
              }}
            >
              <span style={{ fontSize: "24px", lineHeight: "1" }}>📞</span>
              <div>
                <h4 style={{ margin: "0 0 4px", fontSize: "14px", color: "#92400e", fontWeight: "800" }}>
                  অর্ডার ভেরিফিকেশন ও নিশ্চিতকরণ নোটিশ
                </h4>
                <p style={{ margin: 0, fontSize: "13px", color: "#78350f", lineHeight: "1.5" }}>
                  আপনার পূর্বেও অর্ডার প্রসেসিং এ থাকায়, আমাদের প্রতিনিধি শীঘ্রই ফোনে যোগাযোগ করে এই অর্ডারটি নিশ্চিত (Confirmed) করবেন। আপনি চাইলে সরাসরি আমাদের হটলাইনে কল করেও দ্রুত কনফার্ম করে নিতে পারেন।
                </p>
              </div>
            </div>
          )}

          {/* Items Table */}
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "20px" }}>
            <thead>
              <tr style={{ background: "#0f172a", color: "#ffffff", textAlign: "left", fontSize: "12px" }}>
                <th style={{ padding: "10px 12px", borderRadius: "6px 0 0 0" }}>SL</th>
                <th style={{ padding: "10px 12px" }}>ITEM DESCRIPTION</th>
                <th style={{ padding: "10px 12px", textAlign: "center" }}>QTY</th>
                <th style={{ padding: "10px 12px", textAlign: "right" }}>PRICE (Tk)</th>
                <th style={{ padding: "10px 12px", textAlign: "right", borderRadius: "0 6px 0 0" }}>TOTAL (Tk)</th>
              </tr>
            </thead>
            <tbody>
              {order?.items?.map((item, idx) => {
                const qty = item.quantity || 1;
                const price = Number(item.offerPrice || item.price || 0);
                const origPrice = Number(item.originalPrice || item.mrp || item.regularPrice || 0);
                const hasDiscount = origPrice > price;
                const totalItemPrice = price * qty;
                return (
                  <tr key={idx} style={{ borderBottom: "1px solid #e2e8f0", fontSize: "13px", background: idx % 2 === 1 ? "#f8fafc" : "#ffffff" }}>
                    <td style={{ padding: "10px 12px", color: "#64748b" }}>{idx + 1}</td>
                    <td style={{ padding: "10px 12px", fontWeight: "600", color: "#1e293b" }}>{item.productName || item.name}</td>
                    <td style={{ padding: "10px 12px", textAlign: "center", color: "#475569" }}>{qty}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right" }}>
                      {hasDiscount && (
                        <div style={{ textDecoration: "line-through", color: "#e11d48", fontSize: "11px", fontWeight: "600" }}>Tk {origPrice}</div>
                      )}
                      <strong style={{ color: "#0f172a" }}>Tk {price}</strong>
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: "800", color: "#0f172a" }}>
                      Tk {totalItemPrice}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Bottom Columns: Guarantee & Terms on Left, Financials on Right */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px", alignItems: "start" }}>
            {/* Left Box: Guarantees & Terms */}
            <div>
              <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderLeft: "4px solid #16a34a", padding: "12px 14px", borderRadius: "8px", marginBottom: "14px" }}>
                <h5 style={{ margin: "0 0 4px", fontSize: "12px", color: "#166534", fontWeight: "800" }}>100% AUTHENTIC PRODUCT GUARANTEE</h5>
                <p style={{ margin: 0, fontSize: "11px", color: "#475569", lineHeight: "1.4" }}>
                  All skincare & cosmetics are 100% genuine & directly sourced.<br/>
                  We guarantee uncompromised quality & freshness for every product.
                </p>
              </div>

              <div style={{ fontSize: "11.5px", color: "#64748b", lineHeight: "1.6" }}>
                <strong style={{ color: "#0f172a", fontSize: "12px" }}>TERMS & CONDITIONS:</strong>
                <p style={{ margin: "4px 0 2px" }}>• Please check product authenticity & condition in front of delivery rider.</p>
                <p style={{ margin: "2px 0" }}>• Check and accept product at delivery time. No returns once accepted.</p>
                <p style={{ margin: "2px 0" }}>• Track your live order progress anytime at liorabeautyandwear.com/order-tracking</p>
              </div>
            </div>

            {/* Right Box: Financial Totals & Savings */}
            {(() => {
              const subtotal = Number(order?.subtotal) || 0;
              const delivery = Number(order?.deliveryCharge) || 0;
              const total = Number(order?.total) || 0;
              let totalMrp = 0;
              (order?.items || []).forEach(item => {
                const qty = Number(item.quantity) || 1;
                const m = Number(item.originalPrice || item.mrp || item.regularPrice || item.price || item.offerPrice || 0);
                totalMrp += m * qty;
              });
              const rawDiscount = Number(order?.discount) || 0;
              if (totalMrp <= subtotal && rawDiscount > 0) {
                totalMrp = subtotal + rawDiscount;
              }
              const totalSaved = Math.max(0, totalMrp - (total - delivery));
              const savePercent = totalMrp > 0 ? Math.min(100, Math.round((totalSaved / totalMrp) * 100)) : 0;

              return (
                <div>
                  {totalSaved > 0 && (
                    <>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "13px", color: "#64748b" }}>
                        <span>Regular Market Value (MRP):</span>
                        <span style={{ fontWeight: "600", color: "#475569" }}>Tk {totalMrp}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "13px", color: "#16a34a", fontWeight: "700" }}>
                        <span>{couponCode ? `Instant & Coupon Discount (${couponCode}):` : "Instant Offer Discount:"}</span>
                        <span>- Tk {totalSaved}</span>
                      </div>
                    </>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "13px", color: "#475569" }}>
                    <span>Subtotal:</span>
                    <strong style={{ color: "#0f172a" }}>Tk {subtotal}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "13px", color: "#475569" }}>
                    <span>Delivery Charge:</span>
                    <span>Tk {delivery}</span>
                  </div>

                  {/* Total Payable Card */}
                  <div style={{
                    border: "2px solid #e11d48",
                    borderRadius: "8px",
                    padding: "8px 14px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    margin: "12px 0 8px",
                    background: "#ffffff"
                  }}>
                    <span style={{ fontSize: "14px", fontWeight: "800", color: "#e11d48" }}>Total Payable:</span>
                    <span style={{ fontSize: "18px", fontWeight: "900", color: "#e11d48" }}>Tk {total}</span>
                  </div>

                  {/* You Saved Card */}
                  {totalSaved > 0 && (
                    <div style={{
                      border: "1.5px solid #22c55e",
                      borderRadius: "8px",
                      padding: "8px 12px",
                      background: "#f0fdf4",
                      color: "#16a34a",
                      fontWeight: "800",
                      fontSize: "12.5px",
                      textAlign: "center"
                    }}>
                      {couponCode
                        ? `You Saved Tk ${totalSaved} (${savePercent}%) with Coupon ${couponCode}!`
                        : `You Saved Tk ${totalSaved} (${savePercent}%) on this order!`}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Invoice Footer */}
          <div style={{ marginTop: "28px", borderTop: "1px solid #e2e8f0", paddingTop: "14px", textAlign: "center", color: "#64748b", fontSize: "11px" }}>
            <p style={{ margin: "0 0 3px" }}>Thank you for choosing LIORA Beauty & Wear! Beauty. Style. You.</p>
            <p style={{ margin: 0 }}><a href="https://liorabeautyandwear.com" style={{ color: "#e11d48", textDecoration: "none" }}>https://liorabeautyandwear.com</a></p>
          </div>
        </div>
      </div>

      {/* Action Buttons (Hidden on Print) */}
      <div className="no-print" style={{ display: "flex", gap: "14px", marginTop: "24px", justifyContent: "center" }}>
        <button
          onClick={handleDownloadInvoice}
          style={{
            background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
            color: "#ffffff",
            border: "none",
            padding: "12px 24px",
            borderRadius: "10px",
            fontWeight: "800",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            boxShadow: "0 4px 14px rgba(15, 23, 42, 0.2)",
          }}
        >
          📥 Download Official Invoice (PDF)
        </button>

        <Link
          href="/"
          style={{
            background: "#f1f5f9",
            color: "#334155",
            textDecoration: "none",
            padding: "12px 24px",
            borderRadius: "10px",
            fontWeight: "700",
            display: "inline-block"
          }}
        >
          🛍️ Continue Shopping
        </Link>
      </div>

      {/* CSS For Seamless PDF Print */}
      <style jsx global>{`
        @media print {
          body:has(#printable-invoice) * {
            visibility: hidden;
          }
          body:has(#printable-invoice) #printable-invoice,
          body:has(#printable-invoice) #printable-invoice * {
            visibility: visible;
          }
          #printable-invoice {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            border: none !important;
            box-shadow: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: "center", padding: "80px 20px" }}><h2>Loading your order details...</h2></div>}>
      <OrderSuccessContent />
    </Suspense>
  );
}
