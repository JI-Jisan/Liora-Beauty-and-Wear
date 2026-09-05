"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import CategoryDrawer from "./CategoryDrawer";

import { useAuth } from "./AuthProvider";

export default function MobileBottomNav() {
  const pathname = usePathname();
  const [isCategoryDrawerOpen, setIsCategoryDrawerOpen] = useState(false);
  const { user, isAdmin } = useAuth();

  const accountHref = user ? (isAdmin ? "/admin" : "/account") : "/login";
  const isAccountActive = pathname?.startsWith("/admin") || pathname?.startsWith("/account") || pathname === "/login";

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
          href={accountHref}
          className={`jt-bottom-nav-item ${isAccountActive ? "active" : ""}`}
        >
          <span className="jt-bottom-nav-icon">👤</span>
          <span className="jt-bottom-nav-label">
            {user ? (isAdmin ? "Admin" : "Account") : "Login"}
          </span>
        </Link>
      </nav>
    </>
  );
}
