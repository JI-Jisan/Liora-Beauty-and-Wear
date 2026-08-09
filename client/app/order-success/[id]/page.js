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
      <Header cartCount={0} onOpenCart={() => {}} />

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
                      {order.deliveryCharge === 65
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
                    <div className="jt-breakdown-row jt-breakdown-total">
                      <span>Total Amount (COD):</span>
                      <strong>{order.total} Tk</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="jt-success-actions">
                <Link href="/products" className="jt-success-btn">
                  🛍️ Continue Shopping
                </Link>

                <a
                  href={`https://wa.me/8801700000000?text=Hi%2C%20I%20have%20a%20question%20about%20Order%20%23${order.orderNumber || order._id}`}
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
