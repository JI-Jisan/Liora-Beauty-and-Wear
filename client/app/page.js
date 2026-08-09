"use client";

import { useEffect, useState } from "react";
import Header from "../components/Header";
import MarqueeBar from "../components/MarqueeBar";
import Hero from "../components/Hero";
import FeaturedCategories from "../components/FeaturedCategories";
import ProductGrid from "../components/ProductGrid";
import CartDrawer from "../components/CartDrawer";
import WhatsAppButton from "../components/WhatsAppButton";
import PromoBanner from "../components/PromoBanner";
import FlashSale from "../components/FlashSale";
import { API_BASE_URL } from "@/lib/api";

export default function HomePage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [cartItems, setCartItems] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

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

  useEffect(() => {
    Promise.resolve().then(() => {
      const savedCart = localStorage.getItem("jt_cart");
      if (savedCart) {
        try {
          setCartItems(JSON.parse(savedCart));
        } catch (e) {}
      }
    });
  }, []);

  const addToCart = (product) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item._id === product._id);
      if (existing) {
        return prev.map((item) =>
          item._id === product._id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const increaseQty = (id) => {
    setCartItems((prev) =>
      prev.map((item) =>
        item._id === id ? { ...item, quantity: item.quantity + 1 } : item
      )
    );
  };

  const decreaseQty = (id) => {
    setCartItems((prev) =>
      prev
        .map((item) =>
          item._id === id ? { ...item, quantity: item.quantity - 1 } : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeItem = (id) => {
    setCartItems((prev) => prev.filter((item) => item._id !== id));
  };

  useEffect(() => {
    localStorage.setItem("jt_cart", JSON.stringify(cartItems));
  }, [cartItems]);

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <main className="jt-page">
      <Header
        cartCount={cartCount}
        onOpenCart={() => setIsCartOpen(true)}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        brandName={siteSettings.brandName}
        brandSubtitle={siteSettings.brandSubtitle}
      />

      <CartDrawer
        cartItems={cartItems}
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onIncrease={increaseQty}
        onDecrease={decreaseQty}
        onRemove={removeItem}
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