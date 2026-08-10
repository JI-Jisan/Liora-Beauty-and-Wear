"use client";

import { useEffect, useState } from "react";
import Header from "../components/Header";
import MarqueeBar from "../components/MarqueeBar";
import Hero from "../components/Hero";
import FeaturedCategories from "../components/FeaturedCategories";
import ProductGrid from "../components/ProductGrid";
import WhatsAppButton from "../components/WhatsAppButton";
import PromoBanner from "../components/PromoBanner";
import FlashSale from "../components/FlashSale";
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
      "💖 Welcome to LIORA Beauty & Wear   🚚 Cash on Delivery Available   🎁 Free delivery on orders above 1500 Tk   ✨ 100% Authentic Products",
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
      .then((data) =>
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
          flashTitle: data.flashTitle || "Limited Time Special Offer",
          flashSubtitle:
            data.flashSubtitle ||
            "Grab selected trending beauty & wear items before the timer runs out.",
          flashButtonText: data.flashButtonText || "Shop Flash Sale",
          flashButtonLink: data.flashButtonLink || "/products",
          flashDurationHours: data.flashDurationHours || 6,
        })
      )
      .catch((err) => console.error(err));
  }, []);

  return (
    <main className="jt-page">
      <Header
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        brandName={siteSettings.brandName}
        brandSubtitle={siteSettings.brandSubtitle}
      />

      <MarqueeBar offerText={siteSettings.offerText} />

      <Hero
        heroTitle={siteSettings.heroTitle}
        heroText={siteSettings.heroText}
      />

      <PromoBanner promoSlides={siteSettings.promoSlides} />
      
      <FlashSale
        flashTitle={siteSettings.flashTitle}
        flashSubtitle={siteSettings.flashSubtitle}
        flashButtonText={siteSettings.flashButtonText}
        flashButtonLink={siteSettings.flashButtonLink}
        flashDurationHours={siteSettings.flashDurationHours}
      />

      {/* Featured Circle Category Showcase (Nirnita Style) */}
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
  );
}