"use client";

import { useEffect, useState } from "react";
import Header from "../components/Header";
import MarqueeBar from "../components/MarqueeBar";
import Hero from "../components/Hero";
import ProductGrid from "../components/ProductGrid";
import CartDrawer from "../components/CartDrawer";
import WhatsAppButton from "../components/WhatsAppButton";
import PromoBanner from "../components/PromoBanner";
import FlashSale from "../components/FlashSale";

export default function HomePage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [cartItems, setCartItems] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const [siteSettings, setSiteSettings] = useState({
    brandName: "Jisan Trends",
    brandSubtitle:
      "Trusted store for perfume, watches, fan light and trendy products",
    heroTitle: "Big Deals, Trendy Products, Easy Order",
    heroText:
      "Shop perfumes, ghori, fan light, beauty items and more without any login.",
    offerText:
      "🔥 Eid Offer 20% OFF on selected perfumes   🚚 Cash on Delivery Available   🎁 Free delivery on orders above 1500 Tk   ⭐ New Arrival now live at Jisan Trends",
    promoSlides: [],

    flashTitle: "Limited Time Special Offer",
flashSubtitle:
  "Grab selected trending products before the timer runs out.",
flashButtonText: "Shop Flash Sale",
flashButtonLink: "/products",
flashDurationHours: 6,
  });

  useEffect(() => {
    fetch("http://localhost:5001/api/settings")
      .then((res) => res.json())
      .then((data) =>
        setSiteSettings({
          brandName: data.brandName || "Jisan Trends",
          brandSubtitle:
            data.brandSubtitle ||
            "Trusted store for perfume, watches, fan light and trendy products",
          heroTitle: data.heroTitle || "Big Deals, Trendy Products, Easy Order",
          heroText:
            data.heroText ||
            "Shop perfumes, ghori, fan light, beauty items and more without any login.",
          offerText:
            data.offerText ||
            "🔥 Eid Offer 20% OFF on selected perfumes   🚚 Cash on Delivery Available   🎁 Free delivery on orders above 1500 Tk   ⭐ New Arrival now live at Jisan Trends",
          promoSlides: data.promoSlides || [],

          flashTitle: data.flashTitle || "Limited Time Special Offer",
flashSubtitle:
  data.flashSubtitle ||
  "Grab selected trending products before the timer runs out.",
flashButtonText: data.flashButtonText || "Shop Flash Sale",
flashButtonLink: data.flashButtonLink || "/products",
flashDurationHours: data.flashDurationHours || 6,
        })
      )
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    const savedCart = localStorage.getItem("jt_cart");
    if (savedCart) {
      setCartItems(JSON.parse(savedCart));
    }
  }, []);

  const addToCart = (product) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item._id === product._id);

      let updatedCart;

      if (existing) {
        updatedCart = prev.map((item) =>
          item._id === product._id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        updatedCart = [...prev, { ...product, quantity: 1 }];
      }

      localStorage.setItem("jt_cart", JSON.stringify(updatedCart));
      return updatedCart;
    });

    setIsCartOpen(true);
  };

  const increaseQty = (id) => {
    setCartItems((prev) => {
      const updatedCart = prev.map((item) =>
        item._id === id ? { ...item, quantity: item.quantity + 1 } : item
      );

      localStorage.setItem("jt_cart", JSON.stringify(updatedCart));
      return updatedCart;
    });
  };

  const decreaseQty = (id) => {
    setCartItems((prev) => {
      const updatedCart = prev
        .map((item) =>
          item._id === id ? { ...item, quantity: item.quantity - 1 } : item
        )
        .filter((item) => item.quantity > 0);

      localStorage.setItem("jt_cart", JSON.stringify(updatedCart));
      return updatedCart;
    });
  };

  const removeItem = (id) => {
    setCartItems((prev) => {
      const updatedCart = prev.filter((item) => item._id !== id);

      localStorage.setItem("jt_cart", JSON.stringify(updatedCart));
      return updatedCart;
    });
  };

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