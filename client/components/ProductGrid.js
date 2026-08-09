"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import CategoryBar from "./CategoryBar";
import { API_BASE_URL } from "@/lib/api";

const DEMO_PRODUCTS = [
  {
    _id: "demo-1",
    name: "Royal Oud Perfume 100ml",
    description: "Premium long-lasting royal oud fragrance perfume for men and women. Made with authentic oriental woody notes.",
    image: "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=600&auto=format&fit=crop&q=80",
    originalPrice: 2500,
    offerPrice: 1850,
    discountBadge: "26% OFF",
    stockStatus: "In Stock",
    category: { _id: "cat-1", name: "Perfume" },
    isFeatured: true,
    isTrending: true,
    isNewArrival: true
  },
  {
    _id: "demo-2",
    name: "Luxury Gold Chronograph Watch",
    description: "Premium stainless steel quartz chronograph watch with water resistance and luxury design.",
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80",
    originalPrice: 3200,
    offerPrice: 2400,
    discountBadge: "25% OFF",
    stockStatus: "In Stock",
    category: { _id: "cat-2", name: "Watches" },
    isFeatured: true,
    isTrending: true
  },
  {
    _id: "demo-3",
    name: "Smart RGB LED Fan Light 30W",
    description: "Multi-color remote control LED ceiling fan light with low power consumption and super silent operation.",
    image: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600&auto=format&fit=crop&q=80",
    originalPrice: 1800,
    offerPrice: 1350,
    discountBadge: "25% OFF",
    stockStatus: "In Stock",
    category: { _id: "cat-3", name: "Fan Light" },
    isFeatured: true,
    isNewArrival: true
  },
  {
    _id: "demo-4",
    name: "Vitamin C Brightening Serum 30ml",
    description: "Natural organic vitamin C serum for glowing, smooth skin and reducing dark spots.",
    image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&auto=format&fit=crop&q=80",
    originalPrice: 1200,
    offerPrice: 850,
    discountBadge: "29% OFF",
    stockStatus: "In Stock",
    category: { _id: "cat-4", name: "Beauty & Wear" },
    isTrending: true,
    isNewArrival: true
  },
  {
    _id: "demo-5",
    name: "French Vanilla Body Mist 250ml",
    description: "Refreshing vanilla scent body mist for daily freshness and long lasting aroma.",
    image: "https://images.unsplash.com/photo-1541643600914-78b084683601?w=600&auto=format&fit=crop&q=80",
    originalPrice: 1500,
    offerPrice: 990,
    discountBadge: "34% OFF",
    stockStatus: "In Stock",
    category: { _id: "cat-1", name: "Perfume" },
    isFeatured: true
  }
];

const getCategoryName = (category) => {
  if (!category) return "Beauty & Wear";
  if (typeof category === "object" && category.name) return category.name;
  if (typeof category === "string" && category.trim()) return category;
  return "Beauty & Wear";
};

function ProductGridContent({
  onAddToCart,
  searchTerm = "",
  type = "all",
  title = "Products"
}) {
  const searchParams = useSearchParams();
  const urlSearchTerm = searchParams ? searchParams.get("search") || "" : "";
  const activeSearchTerm = searchTerm || urlSearchTerm;

  const [products, setProducts] = useState(DEMO_PRODUCTS);
  const [categories, setCategories] = useState([
    { _id: "cat-1", name: "Perfume" },
    { _id: "cat-2", name: "Watches" },
    { _id: "cat-3", name: "Fan Light" },
    { _id: "cat-4", name: "Beauty & Wear" },
  ]);
  const [selectedCategory, setSelectedCategory] = useState("all");

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/products`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setProducts(data);
        }
      })
      .catch((err) => console.error(err));

    fetch(`${API_BASE_URL}/api/categories`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setCategories(data);
        }
      })
      .catch((err) => console.error(err));
  }, []);

  const filteredProducts = useMemo(() => {
    let result = [...products];

    if (type === "featured") {
      result = result.filter((p) => p.isFeatured);
    }

    if (type === "trending") {
      result = result.filter((p) => p.isTrending);
    }

    if (type === "new") {
      result = result.filter((p) => p.isNewArrival);
    }

    if (selectedCategory !== "all") {
      result = result.filter(
        (product) =>
          product.category?.name === selectedCategory ||
          product.category?._id === selectedCategory ||
          product.category === selectedCategory
      );
    }

    if (activeSearchTerm.trim()) {
      const keyword = activeSearchTerm.toLowerCase();
      result = result.filter(
        (product) =>
          product.name.toLowerCase().includes(keyword) ||
          product.category?.name?.toLowerCase().includes(keyword)
      );
    }

    return result;
  }, [products, selectedCategory, activeSearchTerm, type]);

  return (
    <section className="jt-product-section" style={{ maxWidth: "1400px", margin: "0 auto", padding: "30px 20px 60px" }}>
      {type === "all" && (
        <CategoryBar
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
        />
      )}

      <div className="jt-section-head" style={{ textAlign: "center", marginBottom: "32px" }}>
        <h3 style={{ fontSize: "38px", color: "#0F172A", fontFamily: "Georgia, serif", margin: "0 0 8px", fontWeight: "900" }}>{title}</h3>
        <p style={{ color: "#64748B", fontSize: "16px", margin: 0 }}>Explore authentic cosmetics, skincare, luxury watches & trendy fashion wear</p>
      </div>

      <div className="jt-product-grid">
        {filteredProducts.map((product) => {
          const imageSrc = product.image
            ? product.image.startsWith("http") || product.image.startsWith("/uploads")
              ? product.image
              : `/images/${product.image}`
            : null;

          const catName = getCategoryName(product.category);

          return (
            <div
              key={product._id}
              className="jt-product-card"
              style={{
                background: "#FFFFFF",
                border: "1px solid #F1F5F9",
                borderRadius: "20px",
                padding: "16px",
                position: "relative",
                boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
                display: "flex",
                flexDirection: "column",
                justify: "space-between",
                transition: "all 0.2s ease",
              }}
            >
              {product.discountBadge && (
                <div
                  className="jt-discount-badge"
                  style={{
                    position: "absolute",
                    top: "24px",
                    right: "24px",
                    background: "#FF4D6D",
                    color: "#FFFFFF",
                    fontSize: "11px",
                    fontWeight: "800",
                    padding: "6px 12px",
                    borderRadius: "999px",
                    boxShadow: "0 4px 12px rgba(255, 77, 109, 0.3)",
                    zIndex: 5,
                    letterSpacing: "0.5px",
                  }}
                >
                  {product.discountBadge}
                </div>
              )}

              <Link href={`/products/${product._id}`} className="jt-product-link" style={{ textDecoration: "none" }}>
                <div
                  className="jt-product-image-wrap"
                  style={{
                    width: "100%",
                    height: "240px",
                    borderRadius: "16px",
                    overflow: "hidden",
                    background: "#F8FAFC",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {imageSrc ? (
                    <img
                      src={imageSrc}
                      alt={product.name}
                      className="jt-product-real-image"
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                        const fallback =
                          e.currentTarget.parentElement.querySelector(
                            ".jt-image-fallback"
                          );
                        if (fallback) fallback.style.display = "flex";
                      }}
                    />
                  ) : null}

                  <div
                    className="jt-image-fallback"
                    style={{
                      display: imageSrc ? "none" : "flex",
                      width: "100%",
                      height: "100%",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#64748B",
                      fontWeight: "700",
                      padding: "16px",
                      textAlign: "center",
                    }}
                  >
                    <span>{product.name}</span>
                  </div>
                </div>
              </Link>

              <div className="jt-product-content" style={{ marginTop: "16px", display: "flex", flexDirection: "column", flex: 1, justifyContent: "space-between" }}>
                <div>
                  <Link href={`/products/${product._id}`} className="jt-product-link" style={{ textDecoration: "none" }}>
                    <h4 style={{ color: "#0F172A", margin: "0 0 6px", fontSize: "18px", fontWeight: "800", lineHeight: "1.3", minHeight: "48px" }}>
                      {product.name}
                    </h4>
                  </Link>

                  <p style={{ color: "#64748B", fontSize: "13px", margin: "0 0 10px", fontWeight: "600" }}>
                    {catName}
                  </p>
                </div>

                <div>
                  <p className="jt-price" style={{ color: "#FF4D6D", fontSize: "22px", fontWeight: "900", margin: "0 0 14px", display: "flex", alignItems: "baseline", gap: "8px" }}>
                    {product.offerPrice} Tk
                    <span style={{ fontSize: "14px", color: "#94A3B8", textDecoration: "line-through", fontWeight: "500" }}>
                      {product.originalPrice} Tk
                    </span>
                  </p>

                  <button
                    type="button"
                    onClick={() => onAddToCart(product)}
                    disabled={product.stockStatus === "Out of Stock"}
                    style={{
                      width: "100%",
                      border: "none",
                      background:
                        product.stockStatus === "Out of Stock"
                          ? "#94A3B8"
                          : "linear-gradient(135deg, #FF4D6D 0%, #E84A5F 100%)",
                      color: "#FFFFFF",
                      padding: "14px 18px",
                      borderRadius: "12px",
                      fontWeight: "800",
                      fontSize: "15px",
                      cursor:
                        product.stockStatus === "Out of Stock"
                          ? "not-allowed"
                          : "pointer",
                      boxShadow:
                        product.stockStatus === "Out of Stock"
                          ? "none"
                          : "0 6px 18px rgba(255, 77, 109, 0.25)",
                      transition: "all 0.2s ease",
                    }}
                  >
                    {product.stockStatus === "Out of Stock"
                      ? "Out of Stock"
                      : "Add to Cart"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredProducts.length === 0 && (
        <div
          style={{
            textAlign: "center",
            marginTop: "40px",
            color: "#64748B",
            fontWeight: "700",
          }}
        >
          No products match your search or filter.
        </div>
      )}
    </section>
  );
}

export default function ProductGrid(props) {
  return (
    <Suspense fallback={<div style={{ textAlign: "center", padding: "60px", color: "#64748B" }}>Loading products...</div>}>
      <ProductGridContent {...props} />
    </Suspense>
  );
}