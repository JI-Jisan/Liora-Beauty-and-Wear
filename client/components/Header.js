"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useState, useEffect, useRef, useMemo } from "react";
import LioraLogo from "./LioraLogo";
import CategoryDrawer from "./CategoryDrawer";
import { API_BASE_URL, getImageUrl } from "@/lib/api";

const DEMO_LIVE_PRODUCTS = [
  {
    _id: "demo-1",
    name: "Royal Oud Perfume 100ml",
    image: "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=200&auto=format&fit=crop&q=80",
    offerPrice: 1850,
    originalPrice: 2500,
    category: { name: "Perfume" },
  },
  {
    _id: "demo-2",
    name: "Luxury Gold Chronograph Watch",
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&auto=format&fit=crop&q=80",
    offerPrice: 2400,
    originalPrice: 3200,
    category: { name: "Watches" },
  },
  {
    _id: "demo-3",
    name: "Smart RGB LED Fan Light 30W",
    image: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=200&auto=format&fit=crop&q=80",
    offerPrice: 1350,
    originalPrice: 1800,
    category: { name: "Fan Light" },
  },
  {
    _id: "demo-4",
    name: "Vitamin C Brightening Serum 30ml",
    image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=200&auto=format&fit=crop&q=80",
    offerPrice: 850,
    originalPrice: 1200,
    category: { name: "Beauty & Wear" },
  },
  {
    _id: "demo-5",
    name: "French Vanilla Body Mist 250ml",
    image: "https://images.unsplash.com/photo-1541643600914-78b084683601?w=200&auto=format&fit=crop&q=80",
    offerPrice: 990,
    originalPrice: 1500,
    category: { name: "Perfume" },
  },
];

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
  const [allProducts, setAllProducts] = useState(DEMO_LIVE_PRODUCTS);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCategoryDrawerOpen, setIsCategoryDrawerOpen] = useState(false);
  const searchWrapperRef = useRef(null);

  const [categories, setCategories] = useState([]);
  const [activeHoverCategory, setActiveHoverCategory] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/categories`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setCategories(data);
        }
      })
      .catch((err) => console.error("Header category fetch error:", err));
  }, []);

  const categoryTree = useMemo(() => {
    if (!categories || categories.length === 0) return [];
    const map = {};
    const roots = [];

    categories.forEach((cat) => {
      map[cat._id] = { ...cat, children: [] };
    });

    categories.forEach((cat) => {
      const parentId = typeof cat.parentCategory === "object" ? cat.parentCategory?._id : cat.parentCategory;
      if (parentId && map[parentId]) {
        map[parentId].children.push(map[cat._id]);
      } else {
        roots.push(map[cat._id]);
      }
    });

    return roots;
  }, [categories]);

  const cartCount =
    cartContext?.cartCount !== undefined ? cartContext.cartCount : propsCartCount || 0;

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/products`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setAllProducts(data);
        }
      })
      .catch((err) => console.error("Live search product fetch error:", err));
  }, []);

  const handleOpenCart = () => {
    if (cartContext?.openCart) {
      cartContext.openCart();
    } else if (propsOnOpenCart) {
      propsOnOpenCart();
    }
  };

  const currentSearchValue =
    propsSearchTerm !== undefined ? propsSearchTerm : localSearch;

  const liveSearchResults = useMemo(() => {
    const query = currentSearchValue.trim().toLowerCase();
    if (!query) return [];
    return allProducts.filter((product) => {
      const catName =
        typeof product.category === "object"
          ? product.category?.name
          : product.category || "";
      return (
        product.name?.toLowerCase().includes(query) ||
        catName?.toLowerCase().includes(query) ||
        product.description?.toLowerCase().includes(query)
      );
    });
  }, [allProducts, currentSearchValue]);

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

  return (
    <header className="jt-header">
      {/* Category Drawer Component */}
      <CategoryDrawer
        isOpen={isCategoryDrawerOpen}
        onClose={() => setIsCategoryDrawerOpen(false)}
      />

      {/* ROW 1: Top Bar (Hamburger + Logo Left, Cart Right) */}
      <div className="jt-header-main-row">
        <div className="jt-header-container">
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button
              type="button"
              className="jt-hamburger-drawer-btn"
              onClick={() => setIsCategoryDrawerOpen(true)}
              title="Open Categories Drawer"
              style={{
                background: "none",
                border: "none",
                fontSize: "24px",
                cursor: "pointer",
                color: "#0f172a",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "4px",
              }}
            >
              ☰
            </button>

            <Link href="/" style={{ textDecoration: "none" }} className="jt-logo-corner">
              <LioraLogo />
            </Link>
          </div>

          <nav className="jt-nav jt-desktop-nav">
            <Link href="/">Home</Link>

            {/* Clean Single Dropdown: All Categories */}
            <div
              className="jt-nav-dropdown-item"
              onMouseEnter={() => setActiveHoverCategory("all-categories")}
              onMouseLeave={() => setActiveHoverCategory(null)}
              style={{ position: "relative", display: "inline-block" }}
            >
              <button
                type="button"
                className="jt-nav-dropdown-link"
                onClick={() => setIsCategoryDrawerOpen(true)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "14px",
                  fontWeight: "700",
                  color: "#0f172a",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "0",
                }}
              >
                📁 Categories <span style={{ fontSize: "10px" }}>▼</span>
              </button>

              {/* Single Hover Dropdown Menu for Categories */}
              {activeHoverCategory === "all-categories" && categoryTree.length > 0 && (
                <div className="jt-nav-sub-menu open" style={{ width: "320px" }}>
                  <div className="jt-sub-menu-inner">
                    <Link href="/products" className="jt-sub-menu-header-link">
                      🛍️ Browse All Products &rarr;
                    </Link>

                    <div className="jt-sub-menu-grid" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {categoryTree.map((mother) => (
                        <div key={mother._id} className="jt-sub-menu-col">
                          <Link
                            href={`/products?category=${encodeURIComponent(mother._id)}`}
                            className="jt-sub-menu-child-title"
                          >
                            📁 {mother.name}
                          </Link>

                          {mother.children && mother.children.length > 0 && (
                            <div className="jt-sub-menu-grandchild-list" style={{ paddingLeft: "16px", marginTop: "4px" }}>
                              {mother.children.map((child) => (
                                <Link
                                  key={child._id}
                                  href={`/products?category=${encodeURIComponent(child._id)}`}
                                  className="jt-sub-menu-grandchild-item"
                                >
                                  📂 {child.name}
                                </Link>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Link href="/products">All Products</Link>
            <Link href="/checkout">Checkout</Link>
            <Link href="/order-tracking">Track Order</Link>
          </nav>

          <button type="button" className="jt-cart-top-btn" onClick={handleOpenCart}>
            🛒 Cart ({cartCount})
          </button>
        </div>
      </div>

      {/* ROW 2: Mobile Nav Strip */}
      <div className="jt-mobile-nav-strip">
        <div className="jt-mobile-nav-inner">
          <Link href="/" className="jt-mobile-nav-item">Home</Link>
          <button
            type="button"
            className="jt-mobile-nav-item"
            onClick={() => setIsCategoryDrawerOpen(true)}
            style={{ background: "none", border: "none", cursor: "pointer", fontWeight: "700" }}
          >
            📁 Categories (☰)
          </button>
          <Link href="/products" className="jt-mobile-nav-item">Products</Link>
          <Link href="/checkout" className="jt-mobile-nav-item">Checkout</Link>
          <Link href="/order-tracking" className="jt-mobile-nav-item">Track Order</Link>
        </div>
      </div>

      {/* ROW 3: Sticky Live Search Bar Below Mobile Nav */}
      <div className="jt-header-search-row">
        <div className="jt-header-container">
          <form
            className="jt-search-box-row"
            onSubmit={handleSearchSubmit}
            ref={searchWrapperRef}
            style={{ position: "relative" }}
          >
            <div className="jt-search-input-wrapper">
              <span className="jt-search-icon">🔍</span>
              <input
                type="text"
                placeholder="Search products, perfumes, watches..."
                value={currentSearchValue}
                onFocus={() => setIsSearchOpen(true)}
                onChange={(e) => {
                  const val = e.target.value;
                  setLocalSearch(val);
                  onSearchChange?.(val);
                  setIsSearchOpen(true);
                }}
              />
              <button type="submit" className="jt-search-submit-btn">
                Search
              </button>
            </div>

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
        </div>
      </div>

      {/* ROW 4: Dedicated Sticky Product Details Navigation Tabs Row (Overview, Ratings, Product Details, Recommendations) */}
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