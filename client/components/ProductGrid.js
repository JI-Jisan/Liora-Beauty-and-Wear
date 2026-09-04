"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import CategoryBar from "./CategoryBar";
import { API_BASE_URL, getImageUrl } from "@/lib/api";
import { cld } from "@/lib/cloudinary";
import { getDiscount, getSaved } from "@/lib/price";

function getPaginationItems(current, total) {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  if (current <= 4) {
    return [1, 2, 3, 4, 5, "...", total];
  }
  if (current >= total - 3) {
    return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
  }
  return [1, "...", current - 1, current, current + 1, "...", total];
}

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
  title = "Products",
  brand = ""
}) {
  const gridRef = useRef(null);
  const searchParams = useSearchParams();
  const urlSearchTerm = searchParams ? searchParams.get("search") || "" : "";
  const activeSearchTerm = searchTerm || urlSearchTerm;

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [loading, setLoading] = useState(false);
  const PAGE_SIZE = 24;

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== currentPage) {
      setCurrentPage(newPage);
      if (gridRef.current) {
        const top = gridRef.current.getBoundingClientRect().top + window.scrollY - 80;
        window.scrollTo({ top, behavior: "smooth" });
      }
    }
  };

  const urlCategoryParam = searchParams ? searchParams.get("category") || "" : "";
  const [selectedCategoryState, setSelectedCategoryState] = useState("all");
  const activeCategory = urlCategoryParam || selectedCategoryState;
  
  const activeBrand = brand || (searchParams ? searchParams.get("brand") || "" : "");

  const handleSelectCategory = (cat) => {
    setSelectedCategoryState(cat);
    setCurrentPage(1);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [activeCategory, activeBrand, activeSearchTerm, type]);

  useEffect(() => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (activeCategory && activeCategory !== "all") qs.set('category', activeCategory);
    if (activeBrand) qs.set('brand', activeBrand);
    if (type && type !== "all") qs.set('type', type);
    if (activeSearchTerm.trim()) qs.set('search', activeSearchTerm.trim());
    
    // Use pagination for main catalog or when type is all
    qs.set('paginate', '1');
    qs.set('page', String(currentPage));
    qs.set('limit', String(PAGE_SIZE));

    fetch(`${API_BASE_URL}/api/products?${qs.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.products)) {
          setProducts(data.products);
          setTotalPages(data.totalPages || 1);
          setTotalProducts(data.total || 0);
        } else if (Array.isArray(data)) {
          setProducts(data);
          setTotalPages(1);
          setTotalProducts(data.length);
        } else {
          setProducts([]);
          setTotalPages(1);
          setTotalProducts(0);
        }
      })
      .catch((err) => {
        console.error("Products fetch error, using fallback:", err);
        setProducts([]);
      })
      .finally(() => {
        setLoading(false);
      });

    fetch(`${API_BASE_URL}/api/categories`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setCategories(data);
        }
      })
      .catch((err) => console.error(err));
  }, [activeCategory, activeBrand, type, activeSearchTerm, currentPage]);

  const filteredProducts = useMemo(() => {
    let result = [...products];



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
    <section ref={gridRef} className="jt-product-section" style={{ maxWidth: "1400px", margin: "0 auto", padding: "30px 20px 60px" }}>
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


              <Link href={`/products/${product._id}`} className="jt-product-link">
                <div style={{ position: "relative", width: "100%", aspectRatio: "1 / 1", overflow: "hidden", borderRadius: 10, background: "#f8fafc" }}>
                  {getDiscount(product) > 0 && (
                    <div style={{
                      position: 'absolute', top: 10, left: 10, zIndex: 2,
                      background: 'linear-gradient(135deg,#ff3b6b,#e11d48)',
                      color: '#fff', borderRadius: 10, padding: '5px 9px',
                      lineHeight: 1, textAlign: 'center',
                      boxShadow: '0 4px 12px rgba(225,29,72,.35)'
                    }}>
                      <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-.3px' }}>
                        {getDiscount(product)}%
                      </div>
                      <div style={{ fontSize: 9, fontWeight: 700, opacity: .95, marginTop: 2 }}>
                        OFF
                      </div>
                    </div>
                  )}
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
                  <Link href={`/products/${product._id}`} className="jt-product-link" style={{ textDecoration: "none" }}>
                    <h3 style={{ fontSize: 14, margin: "8px 0 4px", lineHeight: 1.35, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", minHeight: 38, color: "inherit" }}>
                      {product.name}
                    </h3>
                  </Link>

                  <p className="jt-card-cat-subtitle">
                    {catName}
                  </p>
                </div>

                <div>
                  <p className="jt-price" style={{ margin: "0 0 4px" }}>
                    {product.offerPrice} Tk
                    {product.originalPrice && (
                      <span>{product.originalPrice} Tk</span>
                    )}
                  </p>
                  {getSaved(product) > 0 && (
                    <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 700, marginBottom: 8 }}>
                      ৳{getSaved(product)} সাশ্রয়
                    </div>
                  )}

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

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "16px",
            marginTop: "50px",
            padding: "20px 0",
          }}
        >
          {totalProducts > 0 && (
            <div style={{ fontSize: "14px", color: "#64748B", fontWeight: "600" }}>
              Showing {((currentPage - 1) * PAGE_SIZE) + 1}–{Math.min(currentPage * PAGE_SIZE, totalProducts)} of {totalProducts.toLocaleString()} products
            </div>
          )}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexWrap: "wrap",
              gap: "8px",
            }}
          >
            {/* Prev Button */}
            <button
              type="button"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1 || loading}
              style={{
                padding: "8px 16px",
                fontSize: "14px",
                fontWeight: "700",
                color: currentPage <= 1 ? "#94a3b8" : "#1e293b",
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                cursor: currentPage <= 1 ? "not-allowed" : "pointer",
                transition: "all 0.2s",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
              }}
            >
              ← Prev
            </button>

            {/* Page Number Buttons */}
            {getPaginationItems(currentPage, totalPages).map((item, idx) => {
              if (item === "...") {
                return (
                  <span
                    key={`ellipsis-${idx}`}
                    style={{ padding: "0 6px", color: "#94a3b8", fontWeight: "700", userSelect: "none" }}
                  >
                    ...
                  </span>
                );
              }

              const isCurrent = item === currentPage;
              return (
                <button
                  key={`page-${item}`}
                  type="button"
                  onClick={() => handlePageChange(item)}
                  disabled={loading}
                  style={{
                    minWidth: "40px",
                    height: "40px",
                    padding: "0 10px",
                    fontSize: "14px",
                    fontWeight: isCurrent ? "800" : "600",
                    color: isCurrent ? "#ffffff" : "#334155",
                    background: isCurrent ? "linear-gradient(135deg, #be185d 0%, #9d174d 100%)" : "#ffffff",
                    border: isCurrent ? "none" : "1px solid #e2e8f0",
                    borderRadius: "8px",
                    cursor: "pointer",
                    boxShadow: isCurrent ? "0 4px 10px rgba(190, 24, 93, 0.3)" : "0 1px 2px rgba(0,0,0,0.05)",
                    transition: "all 0.2s ease",
                  }}
                >
                  {item}
                </button>
              );
            })}

            {/* Next Button */}
            <button
              type="button"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages || loading}
              style={{
                padding: "8px 16px",
                fontSize: "14px",
                fontWeight: "700",
                color: currentPage >= totalPages ? "#94a3b8" : "#1e293b",
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                cursor: currentPage >= totalPages ? "not-allowed" : "pointer",
                transition: "all 0.2s",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
              }}
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {filteredProducts.length === 0 && !loading && (
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