"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import { API_BASE_URL } from "@/lib/api";

const STATUS_STEPS = ["Pending", "Confirmed", "Shipped", "Delivered"];

export default function OrderSuccessPage() {
  const params = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!params?.id) return;

    fetch(`${API_BASE_URL}/api/orders/${params.id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Order not found");
        return res.json();
      })
      .then((data) => {
        setOrder(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError(err.message || "Failed to load order details");
        setLoading(false);
      });
  }, [params]);

  const currentStatusIndex = order
    ? STATUS_STEPS.indexOf(order.status)
    : 0;

  return (
    <main className="jt-page">
      <Header />

      <div className="jt-success-wrapper">
        <div className="jt-success-container">
          {loading ? (
            <div className="jt-success-loading">
              <h2>Loading order confirmation...</h2>
            </div>
          ) : error ? (
            <div className="jt-success-error">
              <h2>Order Details</h2>
              <p>{error}</p>
              <Link href="/" className="jt-success-btn">
                Back to Home
              </Link>
            </div>
          ) : (
            <>
              {/* Big Success Header */}
              <div className="jt-success-head">
                <div className="jt-success-icon-badge">✓</div>
                <h1>Order Placed Successfully!</h1>
                <p className="jt-success-subtitle">
                  Thank you <strong>{order.customerName}</strong>! Your order has been placed and is currently being processed.
                </p>
                <div className="jt-order-number-pill">
                  Order Number: <span>#{order.orderNumber || order._id}</span>
                </div>
              </div>

              {/* Order Status Progress Tracker */}
              <div className="jt-status-tracker">
                <h3>Order Status: <span className="jt-status-name">{order.status}</span></h3>
                <div className="jt-tracker-steps">
                  {STATUS_STEPS.map((step, index) => {
                    const isCompleted = index <= currentStatusIndex && order.status !== "Cancelled";
                    const isCurrent = index === currentStatusIndex;

                    return (
                      <div
                        key={step}
                        className={`jt-tracker-step ${
                          isCompleted ? "completed" : ""
                        } ${isCurrent ? "current" : ""}`}
                      >
                        <div className="jt-step-circle">
                          {isCompleted ? "✓" : index + 1}
                        </div>
                        <span className="jt-step-label">{step}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 🚚 Live Steadfast Tracking Box */}
              {order.courierDetails?.trackingCode && (
                <div
                  style={{
                    marginTop: "16px",
                    marginBottom: "20px",
                    padding: "14px 18px",
                    background: "#ecfdf5",
                    border: "1.5px solid #a7f3d0",
                    borderRadius: "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "10px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontSize: "24px" }}>🚚</span>
                    <div>
                      <div style={{ fontSize: "11px", fontWeight: "800", color: "#047857", textTransform: "uppercase" }}>
                        Steadfast Courier পার্সেল ট্র্যাকিং
                      </div>
                      <div style={{ fontSize: "16px", fontWeight: "900", color: "#065f46", fontFamily: "monospace" }}>
                        {order.courierDetails.trackingCode}
                      </div>
                    </div>
                  </div>
                  <a
                    href={`https://steadfast.com.bd/t/${order.courierDetails.trackingCode}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
                      color: "#ffffff",
                      padding: "8px 18px",
                      borderRadius: "8px",
                      fontSize: "13px",
                      fontWeight: "800",
                      textDecoration: "none",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                      boxShadow: "0 2px 6px rgba(5, 150, 105, 0.25)",
                    }}
                  >
                    লাইভ পার্সেল ট্র্যাক করুন ↗
                  </a>
                </div>
              )}

              <div className="jt-success-grid">
                {/* Customer Details Box */}
                <div className="jt-success-card">
                  <h3>Delivery Information</h3>
                  <div className="jt-info-row">
                    <span>Customer Name:</span>
                    <strong>{order.customerName}</strong>
                  </div>
                  <div className="jt-info-row">
                    <span>Phone Number:</span>
                    <strong>{order.phone}</strong>
                  </div>
                  <div className="jt-info-row">
                    <span>Delivery Address:</span>
                    <strong>{order.address}</strong>
                  </div>
                  {order.note && (
                    <div className="jt-info-row">
                      <span>Order Note:</span>
                      <strong>{order.note}</strong>
                    </div>
                  )}
                  <div className="jt-info-row">
                    <span>Estimated Delivery:</span>
                    <strong>
                      {order.deliveryCharge === 70 || order.deliveryCharge === 65 || order.deliveryZone === "inside_dhaka"
                        ? "24-48 Hours (Inside Dhaka)"
                        : "48-72 Hours (Outside Dhaka)"}
                    </strong>
                  </div>
                </div>

                {/* Purchased Items & Summary Box */}
                <div className="jt-success-card">
                  <h3>Order Summary</h3>
                  <div className="jt-summary-items-list">
                    {order.items &&
                      order.items.map((item, i) => (
                        <div key={i} className="jt-summary-item-row">
                          <div>
                            <strong>{item.productName}</strong>
                            <p>
                              {item.price} Tk × {item.quantity}
                            </p>
                          </div>
                          <strong>{item.price * item.quantity} Tk</strong>
                        </div>
                      ))}
                  </div>

                  <div className="jt-summary-breakdown">
                    <div className="jt-breakdown-row">
                      <span>Subtotal:</span>
                      <strong>{order.subtotal} Tk</strong>
                    </div>
                    <div className="jt-breakdown-row">
                      <span>Delivery Charge:</span>
                      <strong>{order.deliveryCharge} Tk</strong>
                    </div>
                    {((Number(order.discount) > 0) || ((order.subtotal || 0) + (order.deliveryCharge || 0) > (order.total || 0))) && (
                      <div className="jt-breakdown-row" style={{ color: "#16a34a", fontWeight: "700" }}>
                        <span>Special Discount:</span>
                        <strong>- {Number(order.discount) || ((order.subtotal || 0) + (order.deliveryCharge || 0) - (order.total || 0))} Tk</strong>
                      </div>
                    )}
                    <div className="jt-breakdown-row jt-breakdown-total">
                      <span>Total Amount (COD):</span>
                      <strong>{order.total} Tk</strong>
                    </div>
                    {((Number(order.discount) > 0) || ((order.subtotal || 0) + (order.deliveryCharge || 0) > (order.total || 0))) && (
                      <div style={{ marginTop: "8px", background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "6px 10px", borderRadius: "6px", fontSize: "12px", color: "#16a34a", fontWeight: "700", textAlign: "center" }}>
                        🎉 You Saved {Number(order.discount) || ((order.subtotal || 0) + (order.deliveryCharge || 0) - (order.total || 0))} Tk on this order!
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="jt-success-actions">
                <Link href="/products" className="jt-success-btn">
                  🛍️ Continue Shopping
                </Link>

                <a
                  href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "8801837223147"}?text=${encodeURIComponent(`Hi, I have a question about Order #${order.orderNumber || order._id}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="jt-whatsapp-support-btn"
                >
                  💬 Chat on WhatsApp Support
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
