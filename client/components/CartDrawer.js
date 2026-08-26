"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function CartDrawer({
  cartItems = [],
  isOpen,
  onClose,
  onIncrease,
  onDecrease,
  onRemove,
}) {
  const router = useRouter();

  // Android Hardware Back Button Handling
  useEffect(() => {
    if (!isOpen) return;

    window.history.pushState({ cartOpen: true }, "");

    const handlePopState = () => {
      onClose();
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [isOpen, onClose]);

  const unit = (i) => Number(i.offerPrice ?? i.price ?? 0);
  const qty = (i) => Number(i.quantity) || 1;
  const subtotal = cartItems.reduce((s, i) => s + unit(i) * qty(i), 0);
  const totalQty = cartItems.reduce((s, i) => s + qty(i), 0);

  return (
    <>
      <div
        className={`jt-cart-overlay ${isOpen ? "open" : ""}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`jt-cart-drawer ${isOpen ? "open" : ""}`}
        style={{ height: "100dvh", display: "flex", flexDirection: "column" }}
      >
        <div className="jt-cart-header" style={{ flexShrink: 0 }}>
          <h3>Your Cart ({totalQty})</h3>
          <button onClick={onClose} aria-label="Close cart">
            ✕
          </button>
        </div>

        {cartItems.length === 0 ? (
          <div className="jt-empty-cart-view" style={{ flex: 1 }}>
            <p className="jt-empty-cart">Your cart is empty</p>
            <button className="jt-continue-shopping-btn" onClick={onClose}>
              Start Shopping
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
            {/* ---- স্ক্রলযোগ্য আইটেম লিস্ট ---- */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "12px",
                paddingBottom: "24px",
                WebkitOverflowScrolling: "touch",
              }}
            >
              {cartItems.map((item) => (
                <div
                  key={item._id}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: "12px",
                    padding: "12px",
                    marginBottom: "10px",
                    background: "#fff",
                  }}
                >
                  <strong style={{ fontSize: "14px", lineHeight: 1.4, display: "block" }}>
                    {item.name}
                  </strong>

                  {item.categoryName && (
                    <p style={{ fontSize: "12px", color: "#94a3b8", margin: "4px 0 0" }}>
                      Category: {item.categoryName}
                    </p>
                  )}

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginTop: "10px",
                      gap: "8px",
                    }}
                  >
                    {/* quantity কন্ট্রোল */}
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <button
                        type="button"
                        onClick={() => onDecrease(item._id)}
                        disabled={qty(item) <= 1}
                        aria-label="কমান"
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          border: "none",
                          background: qty(item) <= 1 ? "#fca5a5" : "#f43f5e",
                          color: "#fff",
                          fontSize: 18,
                          cursor: "pointer",
                        }}
                      >
                        −
                      </button>
                      <span style={{ minWidth: 20, textAlign: "center", fontWeight: 600 }}>
                        {qty(item)}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const available = Number(item.stockQuantity ?? 0);
                          if ((item.quantity || 1) >= available) {
                            alert(`দুঃখিত, স্টকে মাত্র ${available} টি আছে।`);
                            return;
                          }
                          onIncrease(item._id);
                        }}
                        aria-label="বাড়ান"
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          border: "none",
                          background: "#f43f5e",
                          color: "#fff",
                          fontSize: 18,
                          cursor: "pointer",
                        }}
                      >
                        +
                      </button>
                    </div>

                    {/* পাশে: unit × qty এবং ওই আইটেমের মোট */}
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "12px", color: "#64748b" }}>
                        {unit(item).toLocaleString("en-US")} × {qty(item)}
                      </div>
                      <strong style={{ fontSize: "15px", color: "#0f172a" }}>
                        {(unit(item) * qty(item)).toLocaleString("en-US")} Tk
                      </strong>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onRemove(item._id)}
                    style={{
                      marginTop: 8,
                      background: "none",
                      border: "none",
                      color: "#ef4444",
                      fontSize: 13,
                      padding: 0,
                      cursor: "pointer",
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            {/* ---- নিচে আটকানো subtotal + checkout ---- */}
            <div
              className="has-bottom-nav"
              style={{
                borderTop: "1px solid #e5e7eb",
                background: "#fff",
                padding: "14px",
                position: "sticky",
                bottom: 0,
                boxShadow: "0 -4px 12px rgba(0,0,0,0.05)",
                zIndex: 10,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "14px",
                  color: "#475569",
                }}
              >
                <span>মোট আইটেম</span>
                <span>{totalQty} টি</span>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  margin: "8px 0 4px",
                }}
              >
                <span style={{ fontSize: "16px", fontWeight: 700 }}>Subtotal</span>
                <strong style={{ fontSize: "20px", color: "#0f172a" }}>
                  {subtotal.toLocaleString("en-US")} Tk
                </strong>
              </div>

              <p style={{ fontSize: "12px", color: "#64748b", margin: "0 0 12px" }}>
                ডেলিভারি চার্জ চেকআউট পেজে যোগ হবে
              </p>

              <Link
                href="/checkout"
                onClick={() => {
                  localStorage.setItem("jt_cart", JSON.stringify(cartItems));
                  onClose();
                }}
                style={{
                  display: "block",
                  textAlign: "center",
                  padding: "15px",
                  background: "#ef4444",
                  color: "#fff",
                  borderRadius: "12px",
                  fontWeight: 700,
                  fontSize: "16px",
                  textDecoration: "none",
                }}
              >
                Checkout করুন ({subtotal.toLocaleString("en-US")} Tk) &rarr;
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
}