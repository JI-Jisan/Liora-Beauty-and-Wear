"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useState } from "react";
import LioraLogo from "./LioraLogo";

export default function Header({
  cartCount: propsCartCount,
  onOpenCart: propsOnOpenCart,
  searchTerm: propsSearchTerm,
  onSearchChange,
}) {
  const router = useRouter();
  const cartContext = useCart();

  const [localSearch, setLocalSearch] = useState("");

  const cartCount =
    cartContext?.cartCount !== undefined ? cartContext.cartCount : propsCartCount || 0;

  const handleOpenCart = () => {
    if (cartContext?.openCart) {
      cartContext.openCart();
    } else if (propsOnOpenCart) {
      propsOnOpenCart();
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const query = (propsSearchTerm !== undefined ? propsSearchTerm : localSearch).trim();
    if (query) {
      router.push(`/products?search=${encodeURIComponent(query)}`);
    } else {
      router.push("/products");
    }
  };

  const currentSearchValue =
    propsSearchTerm !== undefined ? propsSearchTerm : localSearch;

  return (
    <header className="jt-header">
      {/* ROW 1: Top Bar (Logo Left, Cart Button Right) */}
      <div className="jt-header-main-row">
        <div className="jt-header-container">
          <Link href="/" style={{ textDecoration: "none" }} className="jt-logo-corner">
            <LioraLogo />
          </Link>

          <nav className="jt-nav jt-desktop-nav">
            <Link href="/">Home</Link>
            <Link href="/products">Products</Link>
            <Link href="/checkout">Checkout</Link>
            <Link href="/order-tracking">Track Order</Link>
            <Link href="/admin">Admin</Link>
          </nav>

          <button type="button" className="jt-cart-top-btn" onClick={handleOpenCart}>
            🛒 Cart ({cartCount})
          </button>
        </div>
      </div>

      {/* ROW 2: Search Bar Below Top Bar */}
      <div className="jt-header-search-row">
        <div className="jt-header-container">
          <form className="jt-search-box-row" onSubmit={handleSearchSubmit}>
            <div className="jt-search-input-wrapper">
              <span className="jt-search-icon">🔍</span>
              <input
                type="text"
                placeholder="Search cosmetics, perfumes, watches & fashion..."
                value={currentSearchValue}
                onChange={(e) => {
                  const val = e.target.value;
                  setLocalSearch(val);
                  onSearchChange?.(val);
                }}
              />
              <button type="submit" className="jt-search-submit-btn">
                Search
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ROW 3: Sleek Mobile Quick Nav Strip */}
      <div className="jt-mobile-nav-strip">
        <div className="jt-mobile-nav-inner">
          <Link href="/" className="jt-mobile-nav-item">Home</Link>
          <Link href="/products" className="jt-mobile-nav-item">Products</Link>
          <Link href="/checkout" className="jt-mobile-nav-item">Checkout</Link>
          <Link href="/order-tracking" className="jt-mobile-nav-item">Track Order</Link>
          <Link href="/admin" className="jt-mobile-nav-item">Admin</Link>
        </div>
      </div>
    </header>
  );
}