"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
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
      downloadInvoicePdf(order);
    }
  };

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
        {/* Duo-tone DIU x LIORA Top Bar */}
        <div style={{ height: "6px", display: "flex", width: "100%" }}>
          <div style={{ flex: 1, background: "#e11d48" }}></div>
          <div style={{ flex: 1, background: "#004b87" }}></div>
        </div>
        <div style={{ height: "2px", background: "#22c55e", width: "100%" }}></div>

        <div style={{ padding: "28px" }}>
          {/* Header Section: LIORA + DIU Official Partner */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px dashed #cbd5e1", paddingBottom: "20px", flexWrap: "wrap", gap: "16px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h2 style={{ margin: 0, fontSize: "24px", color: "#0f172a", fontWeight: "900", letterSpacing: "1.5px" }}>LIORA</h2>
              </div>
              <div style={{ fontSize: "11px", fontWeight: "800", color: "#e11d48", letterSpacing: "1px", marginTop: "2px" }}>BEAUTY & WEAR</div>
              <p style={{ color: "#64748b", margin: "4px 0 0", fontSize: "12px" }}>
                Authentic Skincare, Cosmetics & Fashion Wear
              </p>
              <p style={{ color: "#94a3b8", margin: "2px 0 0", fontSize: "11px" }}>
                Web: liorabeautyandwear.com | Email: liorabeautyandwear@gmail.com
              </p>
            </div>

            {/* DIU Campus Partner Badge */}
            <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "#f0fdf4", border: "1px solid #86efac", padding: "6px 12px", borderRadius: "10px" }}>
                <img src="/diu-logo-trimmed.png" alt="Daffodil International University" style={{ height: "26px", width: "auto", objectFit: "contain" }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                <div style={{ textAlign: "left" }}>
                  <span style={{ display: "block", fontSize: "10px", fontWeight: "800", color: "#004b87", letterSpacing: "0.5px" }}>CAMPUS PRIVILEGE</span>
                  <span style={{ fontSize: "9px", fontWeight: "700", color: "#16a34a" }}>Daffodil Intl University</span>
                </div>
              </div>
              <div>
                <span style={{ fontSize: "11px", color: "#64748b", fontWeight: "700" }}>INVOICE #{order?.orderNumber || "Liora_Order"}</span>
              </div>
            </div>
          </div>

          {/* Invoice Meta Bar */}
          <div style={{ display: "flex", justifyContent: "space-between", margin: "18px 0 14px", flexWrap: "wrap", gap: "10px", fontSize: "12px" }}>
            <div>
              <span style={{ color: "#64748b" }}>Date: </span>
              <strong style={{ color: "#0f172a" }}>
                {order?.createdAt ? new Date(order.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : new Date().toLocaleDateString("en-US")}
              </strong>
            </div>
            <div>
              <span style={{ color: "#64748b" }}>Status: </span>
              <span style={{ background: "#fef3c7", color: "#b45309", padding: "2px 8px", borderRadius: "4px", fontWeight: "700", fontSize: "11px" }}>
                {(order?.status || "PENDING").toUpperCase()}
              </span>
            </div>
          </div>

          {/* Customer Details Box */}
          <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "12px", marginBottom: "20px", border: "1px solid #e2e8f0", position: "relative" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", flexWrap: "wrap", gap: "8px" }}>
              <h4 style={{ margin: 0, fontSize: "13px", color: "#334155", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.5px" }}>Bill To / Delivery Details</h4>
              <span style={{ background: "#eef2ff", border: "1px solid #c7d2fe", color: "#4338ca", fontSize: "10px", fontWeight: "800", padding: "3px 8px", borderRadius: "6px" }}>
                DIU STUDENT SPECIAL PRIVILEGE
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "6px", fontSize: "13px", color: "#475569" }}>
              <p style={{ margin: "2px 0" }}><strong>Customer Name:</strong> {order?.customerName}</p>
              <p style={{ margin: "2px 0" }}><strong>Payment Method:</strong> Cash on Delivery (COD)</p>
              <p style={{ margin: "2px 0" }}><strong>Phone:</strong> {order?.phone}</p>
              <p style={{ margin: "2px 0" }}><strong>District:</strong> {order?.district || "Dhaka"}</p>
              <p style={{ margin: "2px 0", gridColumn: "1 / -1" }}><strong>Delivery Address:</strong> {order?.address}</p>
              {order?.note && <p style={{ margin: "2px 0", gridColumn: "1 / -1" }}><strong>Note:</strong> {order.note}</p>}
            </div>
          </div>

          {/* Verification Alert if Multiple Pending Orders */}
          {(order?.isFlagged || (order?.pendingOrdersCount && order.pendingOrdersCount > 0)) && (
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
                const price = item.offerPrice || item.price || 0;
                const mrp = item.mrp || item.regularPrice || 0;
                const totalItemPrice = price * qty;
                return (
                  <tr key={idx} style={{ borderBottom: "1px solid #e2e8f0", fontSize: "13px", background: idx % 2 === 1 ? "#f8fafc" : "#ffffff" }}>
                    <td style={{ padding: "10px 12px", color: "#64748b" }}>{idx + 1}</td>
                    <td style={{ padding: "10px 12px", fontWeight: "600", color: "#1e293b" }}>{item.productName || item.name}</td>
                    <td style={{ padding: "10px 12px", textAlign: "center", color: "#475569" }}>{qty}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right" }}>
                      {mrp > price && (
                        <div style={{ textDecoration: "line-through", color: "#94a3b8", fontSize: "11px" }}>Tk {mrp}</div>
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

          {/* Bottom Columns: Guarantee & DIU Privilege on Left, Financials on Right */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px", alignItems: "start" }}>
            {/* Left Box: Guarantees & DIU Verification */}
            <div>
              <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderLeft: "4px solid #16a34a", padding: "12px", borderRadius: "8px", marginBottom: "12px" }}>
                <h5 style={{ margin: "0 0 4px", fontSize: "12px", color: "#166534", fontWeight: "800" }}>100% AUTHENTIC PRODUCT GUARANTEE</h5>
                <p style={{ margin: "0 0 4px", fontSize: "11px", color: "#374151" }}>
                  All skincare & cosmetics are 100% genuine & directly sourced from official distributors.
                </p>
                <span style={{ fontSize: "10px", fontWeight: "800", color: "#16a34a" }}>
                  [ DIU CAMPUS ] Exclusively privileged for Daffodil University students.
                </span>
              </div>

              <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderLeft: "4px solid #004b87", padding: "12px", borderRadius: "8px" }}>
                <h5 style={{ margin: "0 0 4px", fontSize: "12px", color: "#0369a1", fontWeight: "800" }}>DAFFODIL (DIU) STUDENT PRIVILEGE</h5>
                <p style={{ margin: 0, fontSize: "11px", color: "#334151" }}>
                  Special student campus discount was verified on this order. Priority packaging & authentic quality guaranteed.
                </p>
              </div>

              <div style={{ marginTop: "12px", fontSize: "11px", color: "#64748b" }}>
                <strong>TERMS & CONDITIONS:</strong>
                <ul style={{ margin: "4px 0 0", paddingLeft: "16px", lineHeight: "1.4" }}>
                  <li>Please check product authenticity & condition in front of delivery rider.</li>
                  <li>For any return or exchange, please notify us within 24 hours with intact seal.</li>
                  <li>Track your live order anytime at liorabeautyandwear.com/order-tracking</li>
                </ul>
              </div>
            </div>

            {/* Right Box: Totals & Savings */}
            {(() => {
              const subtotal = Number(order?.subtotal) || 0;
              const delivery = Number(order?.deliveryCharge) || 0;
              const total = Number(order?.total) || 0;
              let totalMrp = 0;
              (order?.items || []).forEach(item => {
                const qty = Number(item.quantity) || 1;
                const m = Number(item.mrp || item.regularPrice || item.price || item.offerPrice || 0);
                totalMrp += m * qty;
              });
              if (totalMrp < subtotal) {
                totalMrp = subtotal + Math.max(0, subtotal + delivery - total);
              }
              const totalSaved = Math.max(0, totalMrp - (total - delivery));
              const savePercent = totalMrp > 0 ? Math.min(100, Math.round((totalSaved / totalMrp) * 100)) : 0;

              return (
                <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                  {totalMrp > subtotal && (
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "13px", color: "#64748b" }}>
                      <span>Regular Market Value (MRP):</span>
                      <span>Tk {totalMrp}</span>
                    </div>
                  )}
                  {totalSaved > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "13px", color: "#16a34a", fontWeight: "700" }}>
                      <span>DIU Student Instant Discount:</span>
                      <span>- Tk {totalSaved}</span>
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "13px", color: "#475569" }}>
                    <span>Subtotal:</span>
                    <strong style={{ color: "#0f172a" }}>Tk {subtotal}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "13px", color: "#475569" }}>
                    <span>Delivery Charge:</span>
                    <span>Tk {delivery}</span>
                  </div>
                  <div style={{ borderTop: "2px solid #e11d48", paddingTop: "8px", marginTop: "8px", display: "flex", justifyContent: "space-between", fontSize: "18px", fontWeight: "900", color: "#e11d48" }}>
                    <span>Total Payable:</span>
                    <span>Tk {total}</span>
                  </div>
                  {totalSaved > 0 && (
                    <div style={{ marginTop: "10px", background: "#f0fdf4", border: "1.5px solid #22c55e", padding: "8px", borderRadius: "8px", fontSize: "12px", color: "#166534", fontWeight: "800", textAlign: "center" }}>
                      DIU Student Savings: You Saved Tk {totalSaved} ({savePercent}%) on this order!
                    </div>
                  )}
                </div>
              );
            })()}
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
