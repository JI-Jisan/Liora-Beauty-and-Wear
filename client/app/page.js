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
import CampusCouponBar from "../components/CampusCouponBar";
import ShopByBudget from "../components/ShopByBudget";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { API_BASE_URL } from "@/lib/api";
import { useCart } from "@/context/CartContext";
import { useCampus } from "@/context/CampusContext";

export default function HomePage() {
  const router = useRouter();
  const { user, isWholesale, isReseller, loading: authLoading } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const { addToCart } = useCart();
  const { activeCoupon } = useCampus();

  useEffect(() => {
    if (isWholesale) {
      router.replace("/wholesale");
    }
  }, [isWholesale, router]);

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
          heroImage: data.heroImage || "",
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

  if (isWholesale) {
    return (
      <main className="jt-page" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#fcfaf8" }}>
        <div style={{ textAlign: "center", padding: "40px 20px" }}>
          <div style={{ fontSize: "42px", marginBottom: "16px" }}>🏬</div>
          <h2 style={{ fontSize: "20px", fontWeight: "800", color: "#0f172a", marginBottom: "8px" }}>
            Wholesale B2B পোর্টালে নিয়ে যাওয়া হচ্ছে...
          </h2>
          <p style={{ color: "#64748b", fontSize: "14px" }}>অনুগ্রহ করে এক মুহূর্ত অপেক্ষা করুন...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="jt-page">
      <Header
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        brandName={siteSettings.brandName}
        brandSubtitle={siteSettings.brandSubtitle}
      />

      {searchTerm && searchTerm.trim() ? (
        <section style={{ maxWidth: "1440px", margin: "20px auto 40px", padding: "0 20px", width: "100%", boxSizing: "border-box" }}>
          <div style={{
            background: "linear-gradient(135deg, #fff1f2 0%, #fff7f8 50%, #fdf2f4 100%)",
            border: "1px solid #fecdd3",
            borderRadius: "20px",
            padding: "20px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
            marginBottom: "24px"
          }}>
            <div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#ffe4e6", color: "#e11d48", padding: "4px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: "700", marginBottom: "6px" }}>
                🔍 সার্চ ও স্ক্যান ফলাফল
              </div>
              <h2 style={{ fontSize: "22px", fontWeight: "800", color: "#1e293b", margin: "0 0 4px" }}>
                ফলাফল: <span style={{ color: "#ff4d6d" }}>“{searchTerm.trim()}”</span>
              </h2>
              <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>
                আপনার পছন্দের আসল কসমেটিক্স ও স্কিনকেয়ার পণ্যগুলো সরাসরি নিচে প্রদর্শিত হচ্ছে
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "9px 18px",
                background: "#fff",
                border: "1px solid #fecdd3",
                borderRadius: "20px",
                fontSize: "13px",
                fontWeight: "600",
                color: "#e11d48",
                cursor: "pointer",
                boxShadow: "0 2px 6px rgba(0,0,0,0.03)"
              }}
            >
              ✕ ক্লিয়ার করে হোমপেজে ফিরুন
            </button>
          </div>

          <ProductGrid
            searchTerm={searchTerm}
            onAddToCart={addToCart}
            title=""
            subtitle=""
            showCategoryBar={false}
            showPagination={true}
          />
        </section>
      ) : (
        <>
          {/* 1. CAMPAIGN PROMO SLIDER BANNER */}
          <PromoBanner promoSlides={siteSettings.promoSlides} />

      {/* 🎓 CAMPUS / STUDENT COUPON UNLOCK BAR */}
      <CampusCouponBar />

      {/* 2. 🛡️ 4-PILLAR TRUST BADGES (100% AUTHENTIC, COD, 24-48H, EASY RETURN) */}
      <TrustBadgesBar />

      {/* 3. FEATURED CIRCLE CATEGORIES SLIDER */}
      <FeaturedCategories />

      {/* 3.5 💳 SHOP BY BUDGET (UNDER 499, 500-999, 1000-1999, 2000+) */}
      <ShopByBudget />

      {/* 4. ⚡ FLASH SALE DEALS WITH LIVE COUNTDOWN TIMER */}
      <FlashSaleLive onAddToCart={addToCart} />

      {/* 5. 🔥 EXCLUSIVE 15% MAX STUDENT DISCOUNT DEALS */}
      <section id="view-offers" style={{ padding: "24px 0", background: "linear-gradient(180deg, #fff0f3 0%, #ffffff 100%)", borderRadius: "24px", margin: "14px auto 28px", maxWidth: "1440px" }}>
        <ProductGrid
          onAddToCart={addToCart}
          type="campus15"
          title={
            activeCoupon
              ? `🔥 ${activeCoupon.campus} স্পেশাল ছাড়ের ডিল (${activeCoupon.short} Deals)`
              : "🔥 11.11 মেগা বিউটি অফার (11.11 Mega Deals)"
          }
          subtitle={
            activeCoupon
              ? `${activeCoupon.campus} (${activeCoupon.short}) শিক্ষার্থীদের জন্য সর্বোচ্চ ১৫% স্পেশাল ফ্ল্যাট ছাড় — ট্রেন্ডিং মেকআপ, লিপস্টিক, সিরাম ও ভাইরাল স্কিনকেয়ার`
              : "সরাসরি বিশেষ ছাড় — কোনো কুপন কোডের ঝামেলা ছাড়াই সেরা ট্রেন্ডিং মেকআপ, লিপস্টিক, সিরাম ও ভাইরাল স্কিনকেয়ার কিনুন"
          }
          badge={
            activeCoupon
              ? `🎓 ${activeCoupon.short} স্পেশাল ১৫% ছাড়`
              : "🔥 11.11 MEGA OFFER"
          }
          badgeBg={activeCoupon?.tagColor || "linear-gradient(135deg, #e11d48 0%, #be123c 100%)"}
          limit={8}
          showCategoryBar={false}
          showPagination={false}
        />
      </section>

      {/* 6. 🎯 DUAL MINI PROMO BANNERS (KOREAN SKINCARE & LUXURY PERFUMES) */}
      <DualMiniBanners />

      {/* 7. 🌿 SHOP BY CONCERN (ACNE, GLOW, DARK SPOTS, SUN, DRY SKIN, HAIR) */}
      <ShopByConcern />

      {/* 8. 🌸 KOREAN GLASS SKIN & VIRAL SKINCARE COLLECTION */}
      <section id="korean-skincare" style={{ padding: "16px 0" }}>
        <ProductGrid
          onAddToCart={addToCart}
          type="featured"
          title="🌸 Korean Glass Skin & Viral Skincare"
          subtitle="100% authentic K-Beauty: COSRX Snail Mucin, Rice Toners, Centella, Beauty of Joseon & Anua"
          badge="✨ K-Beauty Viral Picks"
          badgeBg="linear-gradient(135deg, #ec4899 0%, #be185d 100%)"
          limit={8}
          showCategoryBar={false}
          showPagination={false}
        />
      </section>

      {/* 8. 🚚 MIDDLE STRIP CAMPAIGN BANNER (100% AUTHENTIC & FREE DELIVERY) */}
      <MiddleStripBanner />

      {/* 9. 💄 TRENDING LIPSTICKS & GLAM MAKEUP */}
      <section id="hot-items" style={{ padding: "24px 0", background: "linear-gradient(180deg, #fff0f3 0%, #ffffff 100%)", borderRadius: "24px", margin: "14px auto 28px", maxWidth: "1440px" }}>
        <ProductGrid
          onAddToCart={addToCart}
          type="hot"
          title="💄 Trending Lipsticks & Glam Makeup"
          subtitle="Velvet matte lipsticks, Korean lip tints, pigmented blushes & waterproof lipliners"
          badge="💋 Glam Makeup Hits"
          badgeBg="linear-gradient(135deg, #e11d48 0%, #9f1239 100%)"
          limit={8}
          showCategoryBar={false}
          showPagination={false}
        />
      </section>

      {/* 10. 🎁 CURATED COMBOS & STUDENT BUDGET BUNDLES */}
      <CuratedCombos onAddToCart={addToCart} />

      {/* 11. ❄️ WINTER GLOW & DEEP HYDRATION CARE */}
      <section id="new-arrivals" style={{ padding: "16px 0" }}>
        <ProductGrid
          onAddToCart={addToCart}
          type="new"
          title="❄️ Winter Glow & Deep Hydration Care"
          subtitle="Deep moisture body lotions, barrier repair creams, Vaseline Gluta-Hya & ceramide lip balms"
          badge="❄️ Winter Essentials"
          badgeBg="linear-gradient(135deg, #0284c7 0%, #0369a1 100%)"
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
        </>
      )}
    </main>
  );
}