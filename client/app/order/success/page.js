"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { API_BASE_URL } from "@/lib/api";

export default function OrderSuccessPage() {
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
        const res = await fetch(`${API_BASE_URL}/api/orders/track?id=${orderId}`);
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

  const handlePrint = () => {
    window.print();
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
          padding: "30px",
          borderRadius: "16px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
          border: "1px solid #e2e8f0"
        }}
      >
        <div style={{ textAlign: "center", borderBottom: "2px dashed #cbd5e1", paddingBottom: "20px" }}>
          <div style={{ fontSize: "40px", marginBottom: "10px" }}>🎉</div>
          <h1 style={{ color: "#0f172a", margin: "0 0 6px", fontSize: "24px" }}>Thank You for Your Order!</h1>
          <p style={{ color: "#64748b", margin: 0, fontSize: "14px" }}>
            We have received your order. Below is your official invoice.
          </p>
        </div>

        {/* Invoice Meta */}
        <div style={{ display: "flex", justifyContent: "space-between", margin: "24px 0", flexWrap: "wrap", gap: "10px" }}>
          <div>
            <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "700" }}>ORDER NUMBER / TRACKING ID</span>
            <h3 style={{ margin: "4px 0 0", color: "#e11d48", letterSpacing: "1px" }}>
              {order?.orderNumber || "Liora_Order"}
            </h3>
          </div>
          <div style={{ textAlign: "right" }}>
            <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "700" }}>STORE</span>
            <h4 style={{ margin: "4px 0 0", color: "#0f172a" }}>LIORA Beauty & Wear</h4>
          </div>
        </div>

        {/* Customer Details */}
        <div style={{ background: "#f8fafc", padding: "14px", borderRadius: "10px", marginBottom: "20px" }}>
          <h4 style={{ margin: "0 0 8px", fontSize: "14px", color: "#334155" }}>Customer & Delivery Info:</h4>
          <p style={{ margin: "2px 0", fontSize: "13px", color: "#475569" }}><strong>Name:</strong> {order?.customerName}</p>
          <p style={{ margin: "2px 0", fontSize: "13px", color: "#475569" }}><strong>Phone:</strong> {order?.phone}</p>
          <p style={{ margin: "2px 0", fontSize: "13px", color: "#475569" }}><strong>Delivery Address:</strong> {order?.address}</p>
          {order?.note && <p style={{ margin: "2px 0", fontSize: "13px", color: "#475569" }}><strong>Note:</strong> {order.note}</p>}
        </div>

        {/* Items Table */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "20px" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #e2e8f0", textAlign: "left", fontSize: "12px", color: "#64748b" }}>
              <th style={{ padding: "8px 0" }}>ITEM</th>
              <th style={{ padding: "8px 0", textAlign: "center" }}>QTY</th>
              <th style={{ padding: "8px 0", textAlign: "right" }}>PRICE</th>
            </tr>
          </thead>
          <tbody>
            {order?.items?.map((item, idx) => (
              <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9", fontSize: "13px" }}>
                <td style={{ padding: "10px 0", fontWeight: "600", color: "#1e293b" }}>{item.name}</td>
                <td style={{ padding: "10px 0", textAlign: "center", color: "#475569" }}>{item.quantity || 1}</td>
                <td style={{ padding: "10px 0", textAlign: "right", fontWeight: "700" }}>
                  {(item.offerPrice || item.price) * (item.quantity || 1)} Tk
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Total Summary */}
        <div style={{ borderTop: "2px solid #0f172a", paddingTop: "14px", textAlign: "right" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "13px", color: "#475569" }}>
            <span>Subtotal:</span>
            <span>{order?.subtotal || order?.total} Tk</span>
          </div>
          {order?.deliveryFee && (
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "13px", color: "#475569" }}>
              <span>Delivery Charge:</span>
              <span>{order.deliveryFee} Tk</span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "16px", fontWeight: "800", color: "#0f172a", marginTop: "10px" }}>
            <span>Total Payable (COD):</span>
            <span style={{ color: "#e11d48" }}>{order?.total} Tk</span>
          </div>
        </div>
      </div>

      {/* Action Buttons (Hidden on Print) */}
      <div className="no-print" style={{ display: "flex", gap: "14px", marginTop: "24px", justifyContent: "center" }}>
        <button
          onClick={handlePrint}
          style={{
            background: "#0f172a",
            color: "#ffffff",
            border: "none",
            padding: "12px 24px",
            borderRadius: "10px",
            fontWeight: "800",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}
        >
          📄 Download / Print Invoice
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
          body * {
            visibility: hidden;
          }
          #printable-invoice, #printable-invoice * {
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
