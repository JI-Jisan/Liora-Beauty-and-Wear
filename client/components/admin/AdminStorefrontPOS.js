"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import FeaturedCategories from "@/components/FeaturedCategories";
import ProductGrid from "@/components/ProductGrid";
import PromoBanner from "@/components/PromoBanner";
import WhatsAppButton from "@/components/WhatsAppButton";
import { API_BASE_URL } from "@/lib/api";
import { useCart } from "@/context/CartContext";

export default function AdminStorefrontPOS({ onBackToDashboard }) {
  const [searchTerm, setSearchTerm] = useState("");
  const { addToCart } = useCart();

  const [siteSettings, setSiteSettings] = useState({
    brandName: "LIORA Beauty & Wear",
    brandSubtitle: "Beauty. Style. You.",
    heroTitle: "Beauty That Inspires Confidence & Style That Speaks Elegance",
    heroText:
      "Shop 100% authentic cosmetics, luxury perfumes, skincare, and fashion wear in one place.",
    offerText:
      "💖 Welcome to LIORA Beauty & Wear   🚚 Cash on Delivery Available   🎁 Free delivery on orders above 1500 Tk   ✨ 100% Authentic Products",
    promoSlides: [],
  });

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/settings`)
      .then((res) => res.json())
      .then((data) => {
        if (data) {
          setSiteSettings({
            brandName: data.brandName || "LIORA Beauty & Wear",
            brandSubtitle: data.brandSubtitle || "Beauty. Style. You.",
            heroTitle:
              data.heroTitle ||
              "Beauty That Inspires Confidence & Style That Speaks Elegance",
            heroText:
              data.heroText ||
              "Shop 100% authentic cosmetics, luxury perfumes, skincare, and fashion wear in one place.",
            offerText:
              data.offerText ||
              "💖 Welcome to LIORA Beauty & Wear   🚚 Cash on Delivery Available   🎁 Free delivery on orders above 1500 Tk   ✨ 100% Authentic Products",
            promoSlides: data.promoSlides || [],
          });
        }
      })
      .catch((err) => console.error(err));
  }, []);

  return (
    <div style={{ width: "100%", minHeight: "100vh", background: "#fdf8f9" }}>
      {/* Sleek Minimal Admin Bar at Very Top */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10001,
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          color: "#ffffff",
          padding: "8px 16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          boxShadow: "0 2px 10px rgba(0,0,0,0.25)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "16px" }}>🛍️</span>
          <span style={{ fontSize: "13px", fontWeight: "800", color: "#f8fafc" }}>
            Admin Storefront (Offline Orders)
          </span>
        </div>

        {onBackToDashboard && (
          <button
            type="button"
            onClick={onBackToDashboard}
            style={{
              background: "linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)",
              color: "#ffffff",
              border: "none",
              borderRadius: "6px",
              padding: "6px 14px",
              fontSize: "12px",
              fontWeight: "800",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "5px",
              boxShadow: "0 2px 8px rgba(244, 63, 94, 0.4)",
            }}
          >
            <span>⬅</span> Back to Admin Panel
          </button>
        )}
      </div>

      {/* EXACT CLIENT HOME PAGE */}
      <main className="jt-page" style={{ paddingTop: 0 }}>
        <Header
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          brandName={siteSettings.brandName}
          brandSubtitle={siteSettings.brandSubtitle}
        />

        <PromoBanner promoSlides={siteSettings.promoSlides} />

        <FeaturedCategories />

        <section id="shop-products">
          <ProductGrid
            searchTerm={searchTerm}
            onAddToCart={addToCart}
            type="all"
            title="All Products"
          />
        </section>

        <section id="view-offers">
          <ProductGrid
            onAddToCart={addToCart}
            type="featured"
            title="Featured Products"
          />
        </section>

        <section>
          <ProductGrid
            onAddToCart={addToCart}
            type="trending"
            title="Trending Products"
          />
        </section>

        <section>
          <ProductGrid
            onAddToCart={addToCart}
            type="new"
            title="New Arrivals"
          />
        </section>

        <WhatsAppButton />
      </main>
    </div>
  );
}
