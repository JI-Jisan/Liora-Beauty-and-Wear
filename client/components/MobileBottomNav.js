"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import CategoryDrawer from "./CategoryDrawer";

import { useAuth } from "./AuthProvider";
import { useCart } from "@/context/CartContext";

// High-End Luxury Line SVG Icons
function HomeIcon({ active }) {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill={active ? "rgba(225, 29, 72, 0.12)" : "none"} stroke="currentColor" strokeWidth={active ? "2.2" : "1.8"} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function CategoriesIcon({ active }) {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill={active ? "rgba(225, 29, 72, 0.12)" : "none"} stroke="currentColor" strokeWidth={active ? "2.2" : "1.8"} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="2" />
      <rect x="14" y="3" width="7" height="7" rx="2" />
      <rect x="14" y="14" width="7" height="7" rx="2" />
      <rect x="3" y="14" width="7" height="7" rx="2" />
    </svg>
  );
}

function OrdersIcon({ active }) {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill={active ? "rgba(225, 29, 72, 0.12)" : "none"} stroke="currentColor" strokeWidth={active ? "2.2" : "1.8"} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}

function CartBagIcon({ active }) {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill={active ? "rgba(225, 29, 72, 0.12)" : "none"} stroke="currentColor" strokeWidth={active ? "2.2" : "1.8"} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}

function UserIcon({ active }) {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill={active ? "rgba(225, 29, 72, 0.12)" : "none"} stroke="currentColor" strokeWidth={active ? "2.2" : "1.8"} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export default function MobileBottomNav() {
  const pathname = usePathname();
  const [isCategoryDrawerOpen, setIsCategoryDrawerOpen] = useState(false);
  const { user, isAdmin, isWholesale, isReseller } = useAuth();
  const { cartCount, openCart } = useCart();

  const homeHref = isWholesale ? "/wholesale" : "/";
  const homeLabel = isWholesale ? "Wholesale" : "Home";
  const isHomeActive = pathname === "/" || (isWholesale && pathname === "/wholesale");

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
          <span className="jt-bottom-nav-icon">
            <HomeIcon active={isHomeActive} />
          </span>
          <span className="jt-bottom-nav-label">{homeLabel}</span>
          {isHomeActive && <span className="jt-bottom-nav-dot" />}
        </Link>

        <button
          type="button"
          className="jt-bottom-nav-item"
          onClick={() => setIsCategoryDrawerOpen(true)}
        >
          <span className="jt-bottom-nav-icon">
            <CategoriesIcon active={isCategoryDrawerOpen} />
          </span>
          <span className="jt-bottom-nav-label">Categories</span>
          {isCategoryDrawerOpen && <span className="jt-bottom-nav-dot" />}
        </button>

        <Link
          href="/order-tracking"
          className={`jt-bottom-nav-item ${pathname === "/order-tracking" ? "active" : ""}`}
        >
          <span className="jt-bottom-nav-icon">
            <OrdersIcon active={pathname === "/order-tracking"} />
          </span>
          <span className="jt-bottom-nav-label">Orders</span>
          {pathname === "/order-tracking" && <span className="jt-bottom-nav-dot" />}
        </Link>

        <button
          type="button"
          className="jt-bottom-nav-item"
          onClick={openCart}
          style={{ position: "relative" }}
        >
          <span className="jt-bottom-nav-icon">
            <CartBagIcon active={false} />
          </span>
          {cartCount > 0 && (
            <span
              style={{
                position: "absolute",
                top: 4,
                right: "calc(50% - 18px)",
                background: "linear-gradient(135deg, #e11d48, #be123c)",
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
                boxShadow: "0 2px 6px rgba(225, 29, 72, 0.4)",
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
          <span className="jt-bottom-nav-icon">
            <UserIcon active={isAccountActive} />
          </span>
          <span className="jt-bottom-nav-label">
            {user ? (isAdmin ? "Admin" : "Account") : "Login"}
          </span>
          {isAccountActive && <span className="jt-bottom-nav-dot" />}
        </Link>
      </nav>
    </>
  );
}
