"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import CategoryDrawer from "./CategoryDrawer";

import { useAuth } from "./AuthProvider";
import { useCart } from "@/context/CartContext";

export default function MobileBottomNav() {
  const pathname = usePathname();
  const [isCategoryDrawerOpen, setIsCategoryDrawerOpen] = useState(false);
  const { user, isAdmin, isWholesale, isReseller } = useAuth();
  const { cartCount, openCart } = useCart();

  const homeHref = isWholesale ? "/wholesale" : isReseller ? "/reseller" : "/";
  const homeLabel = isWholesale ? "Wholesale" : isReseller ? "Reseller" : "Home";
  const homeIcon = isWholesale ? "🏬" : isReseller ? "🚀" : "🏠";
  const isHomeActive = pathname === "/" || (isWholesale && pathname === "/wholesale") || (isReseller && pathname === "/reseller");

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
          href={homeHref}
          className={`jt-bottom-nav-item ${isHomeActive ? "active" : ""}`}
        >
          <span className="jt-bottom-nav-icon">{homeIcon}</span>
          <span className="jt-bottom-nav-label">{homeLabel}</span>
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

        <button
          type="button"
          className="jt-bottom-nav-item"
          onClick={openCart}
          style={{ position: "relative" }}
        >
          <span className="jt-bottom-nav-icon">🛍️</span>
          {cartCount > 0 && (
            <span
              style={{
                position: "absolute",
                top: 4,
                right: "calc(50% - 18px)",
                background: "#e11d48",
                color: "#fff",
                borderRadius: "999px",
                fontSize: 10,
                fontWeight: 900,
                padding: "0 4px",
                minWidth: 16,
                height: 16,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                lineHeight: 1,
              }}
            >
              {cartCount}
            </span>
          )}
          <span className="jt-bottom-nav-label">Cart</span>
        </button>

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
