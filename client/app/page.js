"use client";

import { useEffect, useState } from "react";
import Header from "../components/Header";
import FeaturedCategories from "../components/FeaturedCategories";
import ProductGrid from "../components/ProductGrid";
import PromoBanner from "../components/PromoBanner";
import TrustBadgesBar from "../components/TrustBadgesBar";
import FlashSaleLive from "../components/FlashSaleLive";
import ShopByConcern from "../components/ShopByConcern";
import CuratedCombos from "../components/CuratedCombos";
import BrandScroller from "../components/BrandScroller";
import CustomerLove from "../components/CustomerLove";
import DualMiniBanners from "../components/DualMiniBanners";
import MiddleStripBanner from "../components/MiddleStripBanner";
import { API_BASE_URL } from "@/lib/api";
import { useCart } from "@/context/CartContext";

export default function HomePage() {
  const [searchTerm, setSearchTerm] = useState("");
  const { addToCart } = useCart();

  const [siteSettings, setSiteSettings] = useState({
    brandName: "LIORA Beauty & Wear",
    brandSubtitle: "Beauty. Style. You.",
    heroTitle: "Beauty That Inspires Confidence & Style That Speaks Elegance",
    heroText:
      "Shop 100% authentic cosmetics, luxury perfumes, skincare, and fashion wear in one place.",
    offerText:
      "💖 Welcome to LIORA Beauty & Wear   🚚 Cash on Delivery Available   🎁 Free delivery on orders above 1999 Tk   ✨ 100% Authentic Products",
    promoSlides: [],

    flashTitle: "Limited Time Special Offer",
    flashSubtitle:
      "Grab selected trending beauty & wear items before the timer runs out.",
    flashButtonText: "Shop Flash Sale",
    flashButtonLink: "/products",
    flashDurationHours: 6,
  });

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/settings`)
      .then((res) => res.json())
      .then((data) => {
        setSiteSettings({
          brandName: data.brandName || "LIORA Beauty & Wear",
          brandSubtitle: data.brandSubtitle || "Beauty. Style. You.",
          heroTitle:
            data.heroTitle ||
            "Beauty That Inspires Confidence & Style That Speaks Elegance",
          heroText:
            data.heroText ||
            "Shop 100% authentic cosmetics, luxury perfumes, skincare, and fashion wear in one place.",
          heroImage: data.heroImage || "/hero-banner-main.jpg",
          offerText:
            data.offerText ||
            "💖 Welcome to LIORA Beauty & Wear   🚚 Cash on Delivery Available   🎁 Free delivery on orders above 1999 Tk   ✨ 100% Authentic Products",
          promoSlides: data.promoSlides || [],
          flashTitle: data.flashTitle || "Limited Time Special Offer",
          flashSubtitle:
            data.flashSubtitle ||
            "Grab selected trending beauty & wear items before the timer runs out.",
          flashButtonText: data.flashButtonText || "Shop Flash Sale",
          flashButtonLink: data.flashButtonLink || "/products",
          flashDurationHours: data.flashDurationHours || 6,
        });
      })
      .catch((err) => {
        console.error(err);
      });
  }, []);

  return (
    <main className="jt-page">
      <Header
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        brandName={siteSettings.brandName}
        brandSubtitle={siteSettings.brandSubtitle}
      />

      {/* 1. CAMPAIGN PROMO SLIDER BANNER */}
      <PromoBanner promoSlides={siteSettings.promoSlides} />

      {/* 2. 🛡️ 4-PILLAR TRUST BADGES (100% AUTHENTIC, COD, 24-48H, EASY RETURN) */}
      <TrustBadgesBar />

      {/* 3. FEATURED CIRCLE CATEGORIES SLIDER */}
      <FeaturedCategories />

      {/* 4. ⚡ FLASH SALE DEALS WITH LIVE COUNTDOWN TIMER */}
      <FlashSaleLive onAddToCart={addToCart} />

      {/* 5. 🎯 DUAL MINI PROMO BANNERS (KOREAN SKINCARE & LUXURY PERFUMES) */}
      <DualMiniBanners />

      {/* 6. 🌿 SHOP BY CONCERN (ACNE, GLOW, DARK SPOTS, SUN, DRY SKIN, HAIR) */}
      <ShopByConcern />

      {/* 7. ⭐ FEATURED COLLECTION (CURATED PICKS) */}
      <section id="view-offers" style={{ padding: "10px 0" }}>
        <ProductGrid
          onAddToCart={addToCart}
          type="featured"
          title="Featured Collection"
          subtitle="Hand-picked premium selections curated for you"
          badge="⭐ Curated Picks"
          badgeBg="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
          limit={8}
          showCategoryBar={false}
          showPagination={false}
        />
      </section>

      {/* 8. 🚚 MIDDLE STRIP CAMPAIGN BANNER (100% AUTHENTIC & FREE DELIVERY) */}
      <MiddleStripBanner />

      {/* 9. 🔥 HOT ITEMS / HOT DEALS */}
      <section id="hot-items" style={{ padding: "20px 0", background: "linear-gradient(180deg, #fff5f7 0%, #ffffff 100%)", borderRadius: "24px", margin: "10px auto 26px", maxWidth: "1440px" }}>
        <ProductGrid
          onAddToCart={addToCart}
          type="hot"
          title="🔥 Hot Items & Deals"
          subtitle="Trending beauty essentials and biggest discounts selling fast"
          badge="🔥 Hot Deals"
          badgeBg="linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)"
          limit={8}
          showCategoryBar={false}
          showPagination={false}
        />
      </section>

      {/* 8. 🎁 CURATED COMBOS & STUDENT BUDGET BUNDLES */}
      <CuratedCombos onAddToCart={addToCart} />

      {/* 9. ✨ NEW ARRIVALS */}
      <section id="new-arrivals" style={{ padding: "10px 0" }}>
        <ProductGrid
          onAddToCart={addToCart}
          type="new"
          title="New Arrivals"
          subtitle="Fresh additions of 100% authentic cosmetics and skincare"
          badge="✨ Just Arrived"
          badgeBg="linear-gradient(135deg, #ec4899 0%, #be185d 100%)"
          limit={8}
          showCategoryBar={false}
          showPagination={false}
        />
      </section>

      {/* 10. 🏷️ TOP AUTHENTIC BRANDS SHOWCASE */}
      <BrandScroller />

      {/* 11. 💬 REAL CUSTOMER LOVE & TESTIMONIALS */}
      <CustomerLove />

      {/* 12. 🛍️ ALL PRODUCTS (FULL CATALOG WITH CATEGORY FILTER & PAGINATION) */}
      <section id="shop-products" style={{ padding: "20px 0 60px" }}>
        <ProductGrid
          searchTerm={searchTerm}
          onAddToCart={addToCart}
          type="all"
          title="Explore All Products"
          subtitle="Browse our complete collection of authentic beauty & wear essentials"
          badge="🛍️ Catalog"
          badgeBg="linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)"
          showCategoryBar={true}
          showPagination={true}
        />
      </section>
    </main>
  );
}