"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import CategoryBar from "./CategoryBar";
import { API_BASE_URL, getImageUrl } from "@/lib/api";
import { cld } from "@/lib/cloudinary";


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

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const urlCategoryParam = searchParams ? searchParams.get("category") || "" : "";
  const [selectedCategoryState, setSelectedCategoryState] = useState("all");
  const activeCategory = urlCategoryParam || selectedCategoryState;

  const handleSelectCategory = (cat) => {
    setSelectedCategoryState(cat);
  };

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/products`)
      .then((res) => res.json())
      .then((data) => {
        setProducts(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.error("Products fetch error, using fallback:", err);
        setProducts([]);
      });

    fetch(`${API_BASE_URL}/api/categories`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setCategories(data);
        }
      })
      .catch((err) => console.error(err));
  }, []);

  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Build category map by _id and by lowercase name for fast parent lookup
    const catMap = {};
    if (Array.isArray(categories)) {
      categories.forEach((c) => {
        if (c && c._id) catMap[c._id] = c;
        if (c && c.name) catMap[c.name.trim().toLowerCase()] = c;
      });
    }

    if (type === "featured") {
      result = result.filter((p) => p.isFeatured);
    }

    if (type === "trending") {
      result = result.filter((p) => p.isTrending);
    }

    if (type === "new") {
      result = result.filter((p) => p.isNewArrival);
    }

    if (activeCategory && activeCategory !== "all") {
      const targetStr = String(activeCategory).trim().toLowerCase();

      result = result.filter((product) => {
        if (!product.category) return false;

        let current = typeof product.category === "object"
          ? product.category
          : catMap[product.category] || catMap[String(product.category).trim().toLowerCase()];

        const visited = new Set();

        while (current && typeof current === "object") {
          const cId = String(current._id || "").toLowerCase();
          const cName = String(current.name || "").trim().toLowerCase();

          if (cId === targetStr || cName === targetStr) {
            return true;
          }

          if (cId && visited.has(cId)) break;
          if (cId) visited.add(cId);

          // Move up to parent category
          const parent = current.parentCategory;
          if (parent && typeof parent === "object" && parent.name) {
            current = parent;
          } else if (parent && catMap[parent]) {
            current = catMap[parent];
          } else if (parent && catMap[String(parent).trim().toLowerCase()]) {
            current = catMap[String(parent).trim().toLowerCase()];
          } else {
            current = null;
          }
        }

        return false;
      });
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
  }, [products, categories, activeCategory, activeSearchTerm, type]);

  return (
    <section className="jt-product-section" style={{ maxWidth: "1400px", margin: "0 auto", padding: "30px 20px 60px" }}>
      {type === "all" && (
        <CategoryBar
          categories={categories}
          selectedCategory={activeCategory}
          onSelectCategory={handleSelectCategory}
        />
      )}

      <div className="jt-section-head" style={{ textAlign: "center", marginBottom: "32px" }}>
        <h3 style={{ fontSize: "38px", color: "#0F172A", fontFamily: "Georgia, serif", margin: "0 0 8px", fontWeight: "900" }}>{title}</h3>
        <p style={{ color: "#64748B", fontSize: "16px", margin: 0 }}>Explore authentic cosmetics, skincare, luxury watches & trendy fashion wear</p>
      </div>

      <div className="jt-product-grid">
        {filteredProducts.map((product) => {
          const catName = getCategoryName(product.category);

          // Pick a unique fallback based on product name + category keywords
          const getSmartFallback = (cName, pName, id) => {
            const text = `${cName || ""} ${pName || ""}`.toLowerCase();
            // Specific product name matches first
            if (text.includes("oud")) return "https://images.unsplash.com/photo-1590156562745-5a03c5a2e21b?w=600&auto=format&fit=crop&q=80";
            if (text.includes("chanel") || text.includes("coco")) return "https://images.unsplash.com/photo-1557053910-d9eadeed1c58?w=600&auto=format&fit=crop&q=80";
            if (text.includes("vanilla") || text.includes("mist")) return "https://images.unsplash.com/photo-1541643600914-78b084683601?w=600&auto=format&fit=crop&q=80";
            if (text.includes("royal")) return "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=600&auto=format&fit=crop&q=80";
            if (text.includes("green") || text.includes("pakhor") || text.includes("attar")) return "https://images.unsplash.com/photo-1563170351-be82bc888aa4?w=600&auto=format&fit=crop&q=80";
            // Category matches
            if (text.includes("perfume") || text.includes("fragrance")) {
              const perfumePool = [
                "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=600&auto=format&fit=crop&q=80",
                "https://images.unsplash.com/photo-1557053910-d9eadeed1c58?w=600&auto=format&fit=crop&q=80",
                "https://images.unsplash.com/photo-1541643600914-78b084683601?w=600&auto=format&fit=crop&q=80",
                "https://images.unsplash.com/photo-1590156562745-5a03c5a2e21b?w=600&auto=format&fit=crop&q=80",
                "https://images.unsplash.com/photo-1563170351-be82bc888aa4?w=600&auto=format&fit=crop&q=80",
              ];
              // Use last char of product ID to pick different images
              const seed = id ? id.charCodeAt(id.length - 1) % perfumePool.length : 0;
              return perfumePool[seed];
            }
            if (text.includes("watch") || text.includes("clock")) return "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80";
            if (text.includes("fan") || text.includes("light") || text.includes("led")) return "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600&auto=format&fit=crop&q=80";
            if (text.includes("serum") || text.includes("vitamin") || text.includes("skin")) return "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&auto=format&fit=crop&q=80";
            if (text.includes("lipstick") || text.includes("makeup") || text.includes("cosmetic")) return "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=600&auto=format&fit=crop&q=80";
            return "https://images.unsplash.com/photo-1607522370275-f6fd2c0c6b8d?w=600&auto=format&fit=crop&q=80";
          };

          const fallbackUrl = getSmartFallback(catName, product.name, product._id);
          const imageSrc = getImageUrl(product.image) || fallbackUrl;

          return (
            <div
              key={product._id}
              className="jt-product-card"
            >
              {product.discountBadge && (
                <div className="jt-discount-badge">
                  {product.discountBadge}
                </div>
              )}

              <Link href={`/products/${product._id}`} className="jt-product-link">
                <div style={{ width: "100%", aspectRatio: "1 / 1", overflow: "hidden", borderRadius: 12, background: "#f1f5f9" }}>
                  <img
                    src={cld(imageSrc, 500, 500)}
                    alt={product.name}
                    loading="lazy"
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    onError={(e) => {
                      e.currentTarget.src = fallbackUrl;
                    }}
                  />
                </div>
              </Link>

              <div className="jt-product-content">
                <div>
                  <Link href={`/products/${product._id}`} className="jt-product-link">
                    <h4>{product.name}</h4>
                  </Link>

                  <p className="jt-card-cat-subtitle">
                    {catName}
                  </p>
                </div>

                <div>
                  <p className="jt-price">
                    {product.offerPrice} Tk
                    {product.originalPrice && (
                      <span>{product.originalPrice} Tk</span>
                    )}
                  </p>

                  <button
                    type="button"
                    onClick={() => onAddToCart(product)}
                    disabled={product.stockStatus === "Out of Stock"}
                    className={`jt-add-to-cart-btn ${
                      product.stockStatus === "Out of Stock" ? "disabled" : ""
                    }`}
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