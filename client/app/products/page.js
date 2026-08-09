"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import ProductGrid from "@/components/ProductGrid";
import CartDrawer from "@/components/CartDrawer";
import { API_BASE_URL } from "@/lib/api";

export default function ProductsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [cartItems, setCartItems] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const [siteSettings, setSiteSettings] = useState({
    brandName: "LIORA Beauty & Wear",
    brandSubtitle: "Beauty. Style. You.",
  });

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/settings`)
      .then((res) => res.json())
      .then((data) =>
        setSiteSettings({
          brandName: data.brandName || "LIORA Beauty & Wear",
          brandSubtitle: data.brandSubtitle || "Beauty. Style. You.",
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

      <section style={{ padding: "30px 20px 10px" }}>
  <div
    style={{
      maxWidth: "1400px",
      margin: "0 auto",
    }}
  >
    <h1
      style={{
        margin: "0 0 10px",
        fontSize: "42px",
        color: "#223a67",
      }}
    >
      All Products
    </h1>

    <p
      style={{
        margin: "0 0 10px",
        color: "#5d6574",
        fontSize: "16px",
      }}
    >
      Browse all available products, filter by category, and add your favorite
      items to cart.
    </p>
  </div>
</section>

<div style={{ paddingTop: "0" }}>
  <ProductGrid searchTerm={searchTerm} onAddToCart={addToCart} />
</div>
    </main>
  );
}