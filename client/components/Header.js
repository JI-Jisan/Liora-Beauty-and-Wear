"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useState, useEffect, useRef, useMemo } from "react";
import LioraLogo from "./LioraLogo";
import CategoryDrawer from "./CategoryDrawer";
import { API_BASE_URL, getImageUrl } from "@/lib/api";
import { buildTree } from "@/lib/categoryTree";
import useHideOnScroll from "@/lib/useHideOnScroll";

export default function Header({
  cartCount: propsCartCount,
  onOpenCart: propsOnOpenCart,
  searchTerm: propsSearchTerm,
  onSearchChange,
  showProductTabs = false,
  activeProductTab = "overview",
  onProductTabClick,
}) {
  const router = useRouter();
  const cartContext = useCart();

  const [localSearch, setLocalSearch] = useState("");
  const [liveSearchResults, setLiveSearchResults] = useState([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCategoryDrawerOpen, setIsCategoryDrawerOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const [hoveredCategory, setHoveredCategory] = useState(null);
  const searchWrapperRef = useRef(null);

  const cartCount =
    cartContext?.cartCount !== undefined ? cartContext.cartCount : propsCartCount || 0;

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/categories`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setCategories(data);
      })
      .catch((err) => console.error(err));
  }, []);

  const categoryTree = useMemo(() => buildTree(categories), [categories]);

  const handleOpenCart = () => {
    if (cartContext?.openCart) {
      cartContext.openCart();
    } else if (propsOnOpenCart) {
      propsOnOpenCart();
    }
  };

  const currentSearchValue =
    propsSearchTerm !== undefined ? propsSearchTerm : localSearch;

  useEffect(() => {
    const q = currentSearchValue.trim();
    if (!q) {
      setLiveSearchResults([]);
      return;
    }

    const timer = setTimeout(() => {
      fetch(`${API_BASE_URL}/api/products?search=${encodeURIComponent(q)}&limit=8`)
        .then((res) => res.json())
        .then((data) => {
          const items = Array.isArray(data?.products) ? data.products : (Array.isArray(data) ? data : []);
          setLiveSearchResults(items);
        })
        .catch(() => setLiveSearchResults([]));
    }, 200);

    return () => clearTimeout(timer);
  }, [currentSearchValue]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        searchWrapperRef.current &&
        !searchWrapperRef.current.contains(event.target)
      ) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setIsSearchOpen(false);
    const query = currentSearchValue.trim();
    onSearchChange?.(query);
    if (query) {
      router.push(`/products?search=${encodeURIComponent(query)}`);
    } else {
      router.push("/products");
    }
  };

  const handleSelectProduct = (productId) => {
    setIsSearchOpen(false);
    router.push(`/products/${productId}`);
  };

  const collapsed = useHideOnScroll();

  return (
    <header className={`jt-header-new ${collapsed ? 'is-scrolled' : ''}`}>
      {/* Category Drawer Component */}
      <CategoryDrawer
        isOpen={isCategoryDrawerOpen}
        onClose={() => setIsCategoryDrawerOpen(false)}
      />

      {/* TOP ANNOUNCEMENT BAR */}
      <div className={`jt-top-announcement-bar hdr-row ${collapsed ? 'hide' : ''}`}>
        <div className="jt-announcement-content">
          <span>🚚 Free Delivery on orders above ৳999</span>
          <span className="jt-announcement-divider">|</span>
          <span>🛡️ 100% Authentic Products</span>
        </div>
      </div>

      {/* MAIN LOGO & HEADER ROW */}
      <div className={`jt-header-logo-row hdr-row ${collapsed ? 'hide' : ''}`}>
        <div className="jt-header-logo-container">
          <button
            type="button"
            className="jt-hamburger-btn"
            onClick={() => setIsCategoryDrawerOpen(true)}
            title="Open Menu"
            aria-label="Open Navigation Menu"
          >
            ☰
          </button>

          <Link href="/" className="jt-logo-center-link">
            <LioraLogo />
          </Link>

          <button type="button" className="jt-cart-pill-btn" onClick={handleOpenCart}>
            <span className="jt-cart-icon">🛍️</span> Cart ({cartCount})
          </button>
        </div>
      </div>

      {/* SEARCH BAR ROW (STAYS STICKY WITH SMOOTH COMPACT ANIMATION ON SCROLL) */}
      <div className={`jt-header-search-container ${collapsed ? 'collapsed' : ''}`}>
        <button
          type="button"
          className="jt-sticky-hamburger-btn"
          onClick={() => setIsCategoryDrawerOpen(true)}
          title="Open Menu"
          aria-label="Open Navigation Menu"
          tabIndex={collapsed ? 0 : -1}
        >
          ☰
        </button>

        <form
          className="jt-pill-search-form"
          onSubmit={handleSearchSubmit}
          ref={searchWrapperRef}
        >
          <span className="jt-pill-search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search for products..."
            value={currentSearchValue}
            onFocus={() => setIsSearchOpen(true)}
            onChange={(e) => {
              const val = e.target.value;
              setLocalSearch(val);
              onSearchChange?.(val);
              setIsSearchOpen(true);
            }}
          />
          {currentSearchValue.trim().length > 0 && (
            <button
              type="button"
              className="jt-clear-search-btn"
              onClick={(e) => {
                e.stopPropagation();
                setLocalSearch("");
                onSearchChange?.("");
                setIsSearchOpen(false);
              }}
              title="Clear search"
              aria-label="Clear search"
            >
              ✕
            </button>
          )}

          {/* INSTANT LIVE SEARCH POPUP DROPDOWN */}
          {isSearchOpen && currentSearchValue.trim().length > 0 && (
            <div className="jt-live-search-dropdown">
              {liveSearchResults.length > 0 ? (
                <>
                  <div className="jt-live-search-header">
                    <span>Matching Products ({liveSearchResults.length})</span>
                  </div>

                  <div className="jt-live-search-list">
                    {liveSearchResults.map((product) => {
                      const imageSrc =
                        getImageUrl(product.image) ||
                        "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=200&auto=format&fit=crop&q=80";

                      const catName =
                        typeof product.category === "object"
                          ? product.category?.name
                          : product.category || "Beauty & Wear";

                      return (
                        <div
                          key={product._id}
                          className="jt-live-search-item"
                          onClick={() => handleSelectProduct(product._id)}
                        >
                          <img
                            src={imageSrc}
                            alt={product.name}
                            className="jt-live-search-thumb"
                            onError={(e) => {
                              e.currentTarget.src =
                                "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=200&auto=format&fit=crop&q=80";
                            }}
                          />

                          <div className="jt-live-search-info">
                            <h5 className="jt-live-search-title">{product.name}</h5>
                            <span className="jt-live-search-cat">{catName}</span>
                            <p className="jt-live-search-price">
                              {product.offerPrice} Tk
                              {product.originalPrice && (
                                <span>{product.originalPrice} Tk</span>
                              )}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div
                    className="jt-live-search-footer"
                    onClick={handleSearchSubmit}
                  >
                    View all results for &quot;{currentSearchValue}&quot; &rarr;
                  </div>
                </>
              ) : (
                <div className="jt-live-search-empty">
                  No products found for &quot;{currentSearchValue}&quot;
                </div>
              )}
            </div>
          )}
        </form>

        <button
          type="button"
          className="jt-sticky-cart-pill"
          onClick={handleOpenCart}
          title="Open Shopping Cart"
          aria-label={`Open Cart (${cartCount})`}
          tabIndex={collapsed ? 0 : -1}
        >
          <span className="jt-sticky-cart-icon">🛍️</span>
          <span className="jt-sticky-cart-text">Cart</span>
          <span className="jt-sticky-cart-badge">{cartCount}</span>
        </button>
      </div>

      {/* HORIZONTAL PILL NAV TABS STRIP */}
      <div className={`jt-header-tabs-strip hdr-row ${collapsed ? 'hide' : ''}`}>
        <div className="jt-tabs-strip-inner" style={{
          display: 'flex', gap: 8, flexWrap: 'nowrap',
          overflowX: 'auto', WebkitOverflowScrolling: 'touch',
          width: '100%', minWidth: 0,
          padding: '8px 12px', scrollbarWidth: 'none'
        }}>
          <Link href="/" className="jt-tab-pill active">
            <span className="jt-tab-icon">🏠</span> Home
          </Link>
          <div
            className="jt-tab-pill-dropdown-wrapper"
            style={{ position: "relative" }}
            onMouseEnter={() => setHoveredCategory("root")}
            onMouseLeave={() => setHoveredCategory(null)}
          >
            <button
              type="button"
              className="jt-tab-pill"
              onClick={() => setIsCategoryDrawerOpen(true)}
            >
              <span className="jt-tab-icon">🔲</span> Categories
            </button>
            {hoveredCategory === "root" && categoryTree.length > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  width: 260,
                  background: "#fff",
                  boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                  borderRadius: 12,
                  padding: "8px 0",
                  zIndex: 9999,
                  border: "1px solid #e2e8f0",
                }}
              >
                {categoryTree.map((cat) => (
                  <div
                    key={cat._id}
                    style={{ position: "relative" }}
                    onMouseEnter={() => setHoveredCategory(cat._id)}
                    onMouseLeave={() => setHoveredCategory("root")}
                  >
                    <div
                      onClick={() => router.push(`/products?category=${cat._id}`)}
                      style={{
                        padding: "10px 16px",
                        cursor: "pointer",
                        fontWeight: 600,
                        fontSize: 14,
                        color: "#334155",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        background: hoveredCategory === cat._id ? "#f1f5f9" : "#fff",
                      }}
                    >
                      {cat.name}
                      {cat.children?.length > 0 && <span>▶</span>}
                    </div>
                    {hoveredCategory === cat._id && cat.children?.length > 0 && (
                      <div
                        style={{
                          position: "absolute",
                          top: 0,
                          left: "100%",
                          width: 240,
                          background: "#fff",
                          boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                          borderRadius: 12,
                          padding: "8px 0",
                          border: "1px solid #e2e8f0",
                        }}
                      >
                        {cat.children.map((child) => (
                          <div
                            key={child._id}
                            style={{ position: "relative" }}
                          >
                            <div
                              onClick={() => router.push(`/products?category=${child._id}`)}
                              style={{
                                padding: "8px 16px",
                                cursor: "pointer",
                                fontWeight: 500,
                                fontSize: 13,
                                color: "#475569",
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = "#f8fafc"}
                              onMouseLeave={(e) => e.currentTarget.style.background = "#fff"}
                            >
                              {child.name}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          <Link href="/products" className="jt-tab-pill">
            <span className="jt-tab-icon">🛍️</span> Products
          </Link>
          <Link href="/products?filter=offers" className="jt-tab-pill">
            <span className="jt-tab-icon">🏷️</span> Offers
          </Link>
        </div>
      </div>

      {/* Dedicated Sticky Product Details Navigation Tabs Row (Overview, Ratings, Product Details, Recommendations) */}
      {showProductTabs && (
        <div className="jt-header-tabs-row">
          <div className="jt-product-tabs-inner">
            <button
              type="button"
              className={`jt-product-tab-item ${activeProductTab === 'overview' ? 'active' : ''}`}
              onClick={() => onProductTabClick?.('overview')}
            >
              Overview
            </button>
            <button
              type="button"
              className={`jt-product-tab-item ${activeProductTab === 'ratings' ? 'active' : ''}`}
              onClick={() => onProductTabClick?.('ratings')}
            >
              Ratings
            </button>
            <button
              type="button"
              className={`jt-product-tab-item ${activeProductTab === 'details' ? 'active' : ''}`}
              onClick={() => onProductTabClick?.('details')}
            >
              Product Details
            </button>
            <button
              type="button"
              className={`jt-product-tab-item ${activeProductTab === 'recommendations' ? 'active' : ''}`}
              onClick={() => onProductTabClick?.('recommendations')}
            >
              Recommendations
            </button>
          </div>
        </div>
      )}
    </header>
  );
}