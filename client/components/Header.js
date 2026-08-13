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
  const [allProducts, setAllProducts] = useState([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCategoryDrawerOpen, setIsCategoryDrawerOpen] = useState(false);
  const searchWrapperRef = useRef(null);

  const cartCount =
    cartContext?.cartCount !== undefined ? cartContext.cartCount : propsCartCount || 0;

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/products`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setAllProducts(data);
        } else {
          setAllProducts(DEMO_LIVE_PRODUCTS);
        }
      })
      .catch((err) => {
        console.error("Live search product fetch error:", err);
        setAllProducts(DEMO_LIVE_PRODUCTS);
      });
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
    <header className="jt-header-new">
      {/* Category Drawer Component */}
      <CategoryDrawer
        isOpen={isCategoryDrawerOpen}
        onClose={() => setIsCategoryDrawerOpen(false)}
      />

      {/* TOP ANNOUNCEMENT BAR */}
      <div className="jt-top-announcement-bar">
        <div className="jt-announcement-content">
          <span>🚚 Free Delivery on orders above ৳999</span>
          <span className="jt-announcement-divider">|</span>
          <span>🛡️ 100% Authentic Products</span>
        </div>
      </div>

      {/* MAIN LOGO & HEADER ROW */}
      <div className="jt-header-logo-row">
        <div className="jt-header-logo-container">
          <button
            type="button"
            className="jt-hamburger-btn"
            onClick={() => setIsCategoryDrawerOpen(true)}
            title="Open Menu"
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

      {/* SEARCH BAR ROW */}
      <div className="jt-header-search-container">
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
          <button type="button" className="jt-filter-icon-btn" onClick={() => setIsCategoryDrawerOpen(true)}>
            🎛️
          </button>

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

      {/* HORIZONTAL PILL NAV TABS STRIP */}
      <div className="jt-header-tabs-strip">
        <div className="jt-tabs-strip-inner">
          <Link href="/" className="jt-tab-pill active">
            <span className="jt-tab-icon">🏠</span> Home
          </Link>
          <button
            type="button"
            className="jt-tab-pill"
            onClick={() => setIsCategoryDrawerOpen(true)}
          >
            <span className="jt-tab-icon">🔲</span> Categories
          </button>
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