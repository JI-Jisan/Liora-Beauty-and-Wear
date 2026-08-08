"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import CategoryBar from "./CategoryBar";

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
    category: { _id: "cat-4", name: "Beauty Items" },
    isTrending: true,
    isNewArrival: true
  },
  {
    _id: "demo-5",
    name: "French Vanilla Long-Lasting Body Mist",
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

export default function ProductGrid({
  searchTerm = "",
  onAddToCart,
  type = "all",
  title = "Products"
}) {
  const [products, setProducts] = useState(DEMO_PRODUCTS);
  const [categories, setCategories] = useState([
    { _id: "cat-1", name: "Perfume" },
    { _id: "cat-2", name: "Watches" },
    { _id: "cat-3", name: "Fan Light" },
    { _id: "cat-4", name: "Beauty Items" }
  ]);
  const [selectedCategory, setSelectedCategory] = useState("all");

  useEffect(() => {
    fetch("http://localhost:5001/api/products")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setProducts(data);
        }
      })
      .catch((err) => console.error("Using demo products:", err));

    fetch("http://localhost:5001/api/categories")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      })
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
        (product) => product.category?.name === selectedCategory
      );
    }

    if (searchTerm.trim()) {
      result = result.filter((product) =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return result;
  }, [products, selectedCategory, searchTerm]);

  return (
    <section className="jt-product-section">
      {type === "all" && (
  <CategoryBar
    categories={categories}
    selectedCategory={selectedCategory}
    onSelectCategory={setSelectedCategory}
  />
)}

      <div className="jt-section-head">
        <h3>{title}</h3>
        <p>Real products from database</p>
      </div>

      <div className="jt-product-grid">
        {filteredProducts.map((product) => {
          const imageSrc = product.image
            ? product.image.startsWith("http")
              ? product.image
              : product.image.startsWith("/uploads")
              ? `http://localhost:5001${product.image}`
              : `/images/${product.image}`
            : null;

          return (
            <div key={product._id} className="jt-product-card">
              {product.discountBadge && (
                <div className="jt-discount-badge">{product.discountBadge}</div>
              )}

              <Link href={`/products/${product._id}`} className="jt-product-link">
                <div className="jt-product-image-wrap">
                  {imageSrc ? (
                    <img
                      src={imageSrc}
                      alt={product.name}
                      className="jt-product-real-image"
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
                    style={{ display: imageSrc ? "none" : "flex" }}
                  >
                    <span>{product.name}</span>
                  </div>
                </div>
              </Link>

              <div className="jt-product-content">
                <Link href={`/products/${product._id}`} className="jt-product-link">
                  <h4>{product.name}</h4>
                </Link>

                <p className="jt-product-desc">
                  {product.category?.name || "Product"}
                </p>

                <p className="jt-price">
                  {product.offerPrice} Tk
                  <span>{product.originalPrice} Tk</span>
                </p>

                <p className="jt-stock">{product.stockStatus}</p>

                <p className="jt-category-name">
                  {product.category?.name || "No Category"}
                </p>

                <button
  onClick={() => onAddToCart(product)}
  disabled={product.stockStatus === "Out of Stock"}
  style={{
    opacity: product.stockStatus === "Out of Stock" ? 0.6 : 1,
    cursor:
      product.stockStatus === "Out of Stock" ? "not-allowed" : "pointer",
  }}
>
  {product.stockStatus === "Out of Stock" ? "Out of Stock" : "Add to Cart"}
</button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredProducts.length === 0 && (
  <div
    style={{
      textAlign: "center",
      padding: "60px 20px",
      color: "#5d6574",
    }}
  >
    <h3 style={{ marginBottom: "10px" }}>No products found</h3>
    <p>
      Try changing the category or search keyword to find what you are looking
      for.
    </p>
  </div>
)}
    </section>
  );
}