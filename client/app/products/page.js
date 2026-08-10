"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import ProductGrid from "@/components/ProductGrid";
import { API_BASE_URL } from "@/lib/api";
import { useCart } from "@/context/CartContext";

export default function ProductsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const { addToCart } = useCart();

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

  return (
    <main className="jt-page">
      <Header
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        brandName={siteSettings.brandName}
        brandSubtitle={siteSettings.brandSubtitle}
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