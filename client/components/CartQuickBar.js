"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { getImageUrl } from "@/lib/api";

export default function CartQuickBar() {
  const router = useRouter();
  const pathname = usePathname() || "";
  const { cartItems, cartCount, openCart, recentlyAdded } = useCart();
  const [toastItem, setToastItem] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const hideTimerRef = useRef(null);

  // Calculate cart subtotal
  const subtotal = cartItems.reduce(
    (sum, item) => sum + Number(item.price !== undefined ? item.price : (item.offerPrice ?? 0)) * (Number(item.quantity) || 1),
    0
  );

  // Trigger toast whenever a new item is added
  useEffect(() => {
    if (!recentlyAdded?.product) return;

    setToastItem(recentlyAdded.product);
    setShowToast(true);

    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }

    hideTimerRef.current = setTimeout(() => {
      setShowToast(false);
    }, 4500);

    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [recentlyAdded]);

  // Don't show floating cart or toast on checkout or admin pages
  if (pathname === "/checkout" || pathname.startsWith("/admin") || pathname.startsWith("/invoice")) {
    return null;
  }

  const thumbSrc = toastItem
    ? getImageUrl(toastItem.image || (Array.isArray(toastItem.images) ? toastItem.images[0] : null))
    : null;

  return (
    <>
      {/* 1. SLIDE-UP COMPACT "ADDED TO CART" NOTIFICATION TOAST */}
      {showToast && toastItem && (
        <div
          role="status"
          aria-live="polite"
          className="jt-cart-toast-wrap"
          style={{
            position: "fixed",
            bottom: "24px",
            left: "24px",
            zIndex: 9999,
            maxWidth: "min(460px, calc(100vw - 32px))",
            width: "100%",
            background: "#ffffff",
            borderRadius: "16px",
            boxShadow: "0 14px 40px rgba(225, 29, 72, 0.22), 0 4px 16px rgba(0,0,0,0.08)",
            border: "1.5px solid #fecdd3",
            padding: "12px 14px",
            boxSizing: "border-box",
            animation: "jtToastSlideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          {/* Top Row: Thumbnail + Title + Added Checkmark + Close Button */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: "#f8fafc",
                border: "1px solid #f1f5f9",
                overflow: "hidden",
                flexShrink: 0,
                position: "relative",
              }}
            >
              {thumbSrc ? (
                <img
                  src={thumbSrc}
                  alt={toastItem.name || "Product"}
                  style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
                />
              ) : (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontSize: 20 }}>
                  🛍️
                </div>
              )}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    background: "#10b981",
                    color: "#ffffff",
                    fontSize: 10,
                    fontWeight: 900,
                  }}
                >
                  ✓
                </span>
                <span style={{ fontSize: 12, fontWeight: 800, color: "#10b981", letterSpacing: "0.02em" }}>
                  কার্টে যোগ হয়েছে!
                </span>
              </div>
              <p
                style={{
                  margin: "2px 0 0",
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#0f172a",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {toastItem.name}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowToast(false)}
              aria-label="Dismiss notification"
              style={{
                background: "none",
                border: "none",
                color: "#94a3b8",
                fontSize: 18,
                cursor: "pointer",
                padding: "2px 6px",
                lineHeight: 1,
                alignSelf: "flex-start",
              }}
            >
              ✕
            </button>
          </div>

          {/* Bottom Row: Subtotal Info + Action Buttons */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              borderTop: "1px solid #ffe4e6",
              paddingTop: 8,
            }}
          >
            <div style={{ fontSize: 12, color: "#475569" }}>
              ব্যাগ: <strong style={{ color: "#0f172a" }}>{cartCount}টি</strong> •{" "}
              <strong style={{ color: "#e11d48", fontSize: 13 }}>৳{subtotal}</strong>
            </div>

            <div style={{ display: "flex", gap: 6 }}>
              <button
                type="button"
                onClick={() => {
                  setShowToast(false);
                  openCart();
                }}
                style={{
                  background: "#fff1f2",
                  color: "#e11d48",
                  border: "1px solid #fecdd3",
                  borderRadius: "8px",
                  padding: "5px 10px",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                কার্ট দেখুন
              </button>
              <Link
                href="/checkout"
                onClick={() => setShowToast(false)}
                style={{
                  background: "linear-gradient(135deg, #e11d48 0%, #be123c 100%)",
                  color: "#ffffff",
                  textDecoration: "none",
                  borderRadius: "8px",
                  padding: "5px 14px",
                  fontSize: 12,
                  fontWeight: 800,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  boxShadow: "0 3px 10px rgba(225, 29, 72, 0.3)",
                }}
              >
                চেকআউট ➔
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* 2. PERSISTENT FLOATING CART QUICK BUTTON (WHEN CART HAS ITEMS) */}
      {cartCount > 0 && !showToast && (
        <div
          className="jt-floating-cart-pill-wrap"
          style={{
            position: "fixed",
            bottom: "24px",
            left: "20px",
            zIndex: 9980,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "linear-gradient(135deg, #e11d48 0%, #be123c 100%)",
              color: "#ffffff",
              borderRadius: "999px",
              boxShadow: "0 8px 24px rgba(225, 29, 72, 0.45)",
              padding: "4px 6px 4px 14px",
              gap: "10px",
              cursor: "pointer",
              transition: "transform 0.2s ease, box-shadow 0.2s ease",
            }}
          >
            {/* Click bag to open cart */}
            <div
              onClick={openCart}
              title="View Cart"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "13px",
                fontWeight: 800,
              }}
            >
              <span style={{ fontSize: "16px" }}>🛍️</span>
              <span>{cartCount}টি</span>
              <span style={{ opacity: 0.7 }}>•</span>
              <span style={{ fontSize: "14px", fontWeight: 900 }}>৳{subtotal}</span>
            </div>

            {/* Direct Checkout button */}
            <Link
              href="/checkout"
              style={{
                background: "#ffffff",
                color: "#e11d48",
                textDecoration: "none",
                borderRadius: "999px",
                padding: "6px 14px",
                fontSize: "12px",
                fontWeight: 900,
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
                letterSpacing: "0.02em",
              }}
            >
              চেকআউট ➔
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
