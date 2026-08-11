"use client";

import { useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { API_BASE_URL } from "@/lib/api";

const STATUS_STEPS = ["Pending", "Confirmed", "Shipped", "Delivered"];

export default function OrderTrackingPage() {
  const [query, setQuery] = useState("");
  const [orders, setOrders] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleTrack = async (e) => {
    e.preventDefault();

    if (!query.trim()) {
      setError("Please enter your Phone Number or Order Number");
      return;
    }

    setLoading(true);
    setError("");
    setOrders(null);

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/orders/track?query=${encodeURIComponent(
          query.trim()
        )}`
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to search order");
      }

      if (Array.isArray(data) && data.length > 0) {
        setOrders(data);
      } else {
        setError("No orders found matching your phone number or order number.");
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="jt-page">
      <Header />

      <div className="jt-tracking-wrapper">
        <div className="jt-tracking-container">
          <div className="jt-policy-breadcrumb">
            <Link href="/">Home</Link> / <span>Track Order</span>
          </div>

          <h1 className="jt-policy-title">Track Your Order (অর্ডার ট্র্যাকিং)</h1>
          <p className="jt-policy-subtitle">
            Enter your phone number or order number below to check the real-time status of your order.
          </p>

          {/* Search Form Card */}
          <div className="jt-tracking-search-card">
            <form className="jt-tracking-form" onSubmit={handleTrack}>
              <input
                type="text"
                placeholder="Enter Phone Number (e.g. 017...) or Order ID (e.g. JT-10024)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                required
              />
              <button type="submit" disabled={loading}>
                {loading ? "Searching..." : "Track Order"}
              </button>
            </form>
          </div>

          {/* Search Error Message */}
          {error && <div className="jt-tracking-error">{error}</div>}

          {/* Search Results List */}
          {orders && (
            <div className="jt-tracking-results">
              <h2>Found {orders.length} Order(s)</h2>

              {orders.map((order) => {
                const currentStatusIndex = STATUS_STEPS.indexOf(order.status);

                return (
                  <div key={order._id} className="jt-tracking-order-card">
                    <div className="jt-tracking-card-header">
                      <div>
                        <h3>Order #{order.orderNumber || order._id}</h3>
                        <p>
                          Date: {new Date(order.createdAt).toLocaleDateString()}
                        </p>
                      </div>

                      <span className="jt-status-badge">{order.status}</span>
                    </div>

                    {/* Progress Tracker */}
                    <div className="jt-status-tracker" style={{ marginTop: "16px" }}>
                      <div className="jt-tracker-steps">
                        {STATUS_STEPS.map((step, index) => {
                          const isCompleted =
                            index <= currentStatusIndex &&
                            order.status !== "Cancelled";
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

                    {/* Order Information Breakdown */}
                    <div className="jt-tracking-card-body">
                      <div className="jt-tracking-info-col">
                        <h4>Customer Information</h4>
                        <p>
                          <strong>Name:</strong> {order.customerName}
                        </p>
                        <p>
                          <strong>Phone:</strong> {order.phone}
                        </p>
                        <p>
                          <strong>Address:</strong> {order.address}
                        </p>
                      </div>

                      <div className="jt-tracking-info-col">
                        <h4>Order Details</h4>
                        {order.items &&
                          order.items.map((item, i) => (
                            <p key={i}>
                              {item.productName} — {item.quantity} × {item.price}{" "}
                              Tk
                            </p>
                          ))}
                        <p style={{ marginTop: "10px", fontWeight: "800" }}>
                          Total: {order.total} Tk (COD)
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
