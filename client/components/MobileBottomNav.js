"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import CategoryDrawer from "./CategoryDrawer";

export default function MobileBottomNav() {
  const pathname = usePathname();
  const [isCategoryDrawerOpen, setIsCategoryDrawerOpen] = useState(false);

  return (
    <>
      <CategoryDrawer
        isOpen={isCategoryDrawerOpen}
        onClose={() => setIsCategoryDrawerOpen(false)}
      />

      <nav className="jt-mobile-bottom-nav">
        <Link
          href="/"
          className={`jt-bottom-nav-item ${pathname === "/" ? "active" : ""}`}
        >
          <span className="jt-bottom-nav-icon">🏠</span>
          <span className="jt-bottom-nav-label">Home</span>
        </Link>

        <button
          type="button"
          className="jt-bottom-nav-item"
          onClick={() => setIsCategoryDrawerOpen(true)}
        >
          <span className="jt-bottom-nav-icon">㗊</span>
          <span className="jt-bottom-nav-label">Categories</span>
        </button>

        <Link
          href="/order-tracking"
          className={`jt-bottom-nav-item ${pathname === "/order-tracking" ? "active" : ""}`}
        >
          <span className="jt-bottom-nav-icon">📦</span>
          <span className="jt-bottom-nav-label">Orders</span>
        </Link>

        <Link
          href="/products"
          className={`jt-bottom-nav-item ${pathname === "/products" ? "active" : ""}`}
        >
          <span className="jt-bottom-nav-icon">🤍</span>
          <span className="jt-bottom-nav-label">Wishlist</span>
        </Link>

        <Link
          href="/admin/login"
          className={`jt-bottom-nav-item ${pathname?.startsWith("/admin") ? "active" : ""}`}
        >
          <span className="jt-bottom-nav-icon">👤</span>
          <span className="jt-bottom-nav-label">Account</span>
        </Link>
      </nav>
    </>
  );
}
