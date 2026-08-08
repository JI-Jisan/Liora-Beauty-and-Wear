"use client";

import Link from "next/link";

export default function Header({
  cartCount = 0,
  onOpenCart,
  searchTerm,
  onSearchChange,
  brandName = "Jisan Trends",
  brandSubtitle = "Trusted store for perfume, watches, fan light and trendy products",
}) {
  return (
    <header className="jt-header">
      <div className="jt-header-inner">
        <div className="jt-logo-wrap">
          <div className="jt-logo-image">JT</div>

          <div className="jt-brand-text">
            <h1 className="jt-logo-text">{brandName}</h1>
            <p className="jt-subtitle">{brandSubtitle}</p>
          </div>
        </div>

        <div className="jt-header-right">
          <div className="jt-search-box">
           <input
             type="text"
             placeholder="Search products..."
             value={searchTerm || ""}
            onChange={(e) => onSearchChange?.(e.target.value)}
          />
          </div>

          <nav className="jt-nav">
            <Link href="/">Home</Link>
            <Link href="/products">Products</Link>
            <Link href="/checkout">Checkout</Link>
            <Link href="/admin">Admin</Link>

            <button className="jt-cart-top-btn" onClick={onOpenCart}>
              Cart ({cartCount})
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
}