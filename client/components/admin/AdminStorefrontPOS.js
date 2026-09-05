"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import PromoBanner from "@/components/PromoBanner";
import FeaturedCategories from "@/components/FeaturedCategories";
import ProductGrid from "@/components/ProductGrid";

export default function AdminStorefrontPOS() {
  const router = useRouter();
  const { cartItems, cartCount, addToCart, openCart } = useCart();
  const [searchTerm, setSearchTerm] = useState("");

  const unitPrice = (item) => Number(item.offerPrice ?? item.price ?? 0);
  const cartSubtotal = cartItems.reduce(
    (sum, item) => sum + unitPrice(item) * (item.quantity || 1),
    0
  );

  return (
    <div className="jt-admin-storefront-wrap" style={{ width: "100%", margin: "0 auto" }}>
      {/* TOP POS CONTROL BANNER */}
      <div
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          color: "#ffffff",
          padding: "16px 20px",
          borderRadius: "16px",
          marginBottom: "20px",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          boxShadow: "0 4px 18px rgba(15, 23, 42, 0.15)",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <span style={{ fontSize: "20px" }}>🛍️</span>
            <h3 style={{ margin: 0, fontSize: "17px", fontWeight: "800", color: "#fff" }}>
              Offline Order Mode (Live Storefront View)
            </h3>
            <span
              style={{
                background: "#f43f5e",
                color: "#fff",
                fontSize: "11px",
                fontWeight: "800",
                padding: "2px 8px",
                borderRadius: "12px",
                textTransform: "uppercase",
              }}
            >
              POS / Phone Orders
            </span>
          </div>
          <p style={{ margin: 0, fontSize: "13px", color: "#94a3b8" }}>
            Browse and add products to cart exactly like a customer to create orders for phone or offline sales.
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={openCart}
            style={{
              background: "rgba(255, 255, 255, 0.12)",
              color: "#fff",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              borderRadius: "50px",
              padding: "8px 16px",
              fontWeight: "700",
              fontSize: "13px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span>🛍️ View Cart</span>
            <span
              style={{
                background: "#f43f5e",
                color: "#fff",
                borderRadius: "12px",
                padding: "1px 6px",
                fontSize: "11px",
                fontWeight: "800",
              }}
            >
              {cartCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => router.push("/checkout")}
            style={{
              background: "linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)",
              color: "#fff",
              border: "none",
              borderRadius: "50px",
              padding: "9px 20px",
              fontWeight: "800",
              fontSize: "13.5px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "0 4px 14px rgba(244, 63, 94, 0.35)",
            }}
          >
            <span>⚡ Create Order / Checkout</span>
            {cartSubtotal > 0 && <span>(৳{cartSubtotal})</span>}
          </button>

          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: "#ffffff",
              color: "#0f172a",
              border: "none",
              borderRadius: "50px",
              padding: "8px 14px",
              fontWeight: "700",
              fontSize: "12px",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <span>🌐 Open Client Site ↗</span>
          </a>
        </div>
      </div>

      {/* POS SEARCH BAR */}
      <div
        style={{
          background: "#ffffff",
          padding: "12px 16px",
          borderRadius: "14px",
          border: "1px solid #e2e8f0",
          marginBottom: "20px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
        }}
      >
        <span style={{ fontSize: "18px", color: "#f43f5e" }}>🔍</span>
        <input
          type="text"
          placeholder="Search all products for offline customer..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            flex: 1,
            border: "none",
            outline: "none",
            fontSize: "15px",
            color: "#0f172a",
            background: "transparent",
          }}
        />
        {searchTerm.trim().length > 0 && (
          <button
            type="button"
            onClick={() => setSearchTerm("")}
            style={{
              background: "#e2e8f0",
              border: "none",
              borderRadius: "50%",
              width: "22px",
              height: "22px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: "11px",
              color: "#475569",
              fontWeight: "700",
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* 1. PROMO BANNER */}
      <PromoBanner />

      {/* 2. FEATURED CATEGORIES CAROUSEL */}
      <div style={{ marginTop: "16px", marginBottom: "24px" }}>
        <FeaturedCategories />
      </div>

      {/* 3. ALL PRODUCTS GRID */}
      <section style={{ marginBottom: "32px" }}>
        <ProductGrid
          searchTerm={searchTerm}
          onAddToCart={addToCart}
          type="all"
          title="All Products (Offline Catalog)"
        />
      </section>

      {/* 4. FEATURED PRODUCTS */}
      <section style={{ marginBottom: "32px" }}>
        <ProductGrid
          onAddToCart={addToCart}
          type="featured"
          title="Featured Products"
        />
      </section>

      {/* 5. TRENDING PRODUCTS */}
      <section style={{ marginBottom: "32px" }}>
        <ProductGrid
          onAddToCart={addToCart}
          type="trending"
          title="Trending Products"
        />
      </section>

      {/* 6. NEW ARRIVALS */}
      <section style={{ marginBottom: "40px" }}>
        <ProductGrid
          onAddToCart={addToCart}
          type="new"
          title="New Arrivals"
        />
      </section>

      {/* FLOATING BOTTOM CART BAR FOR ADMIN IF CART HAS ITEMS */}
      {cartCount > 0 && (
        <div
          style={{
            position: "fixed",
            bottom: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
            color: "#ffffff",
            padding: "12px 24px",
            borderRadius: "50px",
            display: "flex",
            alignItems: "center",
            gap: "16px",
            zIndex: 9999,
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.35)",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            maxWidth: "92vw",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "20px" }}>🛍️</span>
            <div>
              <div style={{ fontSize: "14px", fontWeight: "800" }}>
                {cartCount} item{cartCount > 1 ? "s" : ""} selected
              </div>
              <div style={{ fontSize: "12px", color: "#cbd5e1" }}>
                Subtotal: <strong>৳{cartSubtotal}</strong>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={openCart}
            style={{
              background: "rgba(255, 255, 255, 0.15)",
              color: "#ffffff",
              border: "none",
              borderRadius: "50px",
              padding: "8px 14px",
              fontWeight: "700",
              fontSize: "13px",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            View Cart
          </button>

          <button
            type="button"
            onClick={() => router.push("/checkout")}
            style={{
              background: "linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)",
              color: "#ffffff",
              border: "none",
              borderRadius: "50px",
              padding: "8px 18px",
              fontWeight: "800",
              fontSize: "13.5px",
              cursor: "pointer",
              whiteSpace: "nowrap",
              boxShadow: "0 3px 12px rgba(244, 63, 94, 0.4)",
            }}
          >
            Checkout Order →
          </button>
        </div>
      )}
    </div>
  );
}
