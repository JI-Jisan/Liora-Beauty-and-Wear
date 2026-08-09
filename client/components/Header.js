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
      <div className="jt-header-inner">
        <Link href="/" style={{ textDecoration: "none" }}>
          <LioraLogo />
        </Link>

        <div className="jt-header-right">
          <form className="jt-search-box" onSubmit={handleSearchSubmit}>
            <input
              type="text"
              placeholder="Search products..."
              value={currentSearchValue}
              onChange={(e) => {
                const val = e.target.value;
                setLocalSearch(val);
                onSearchChange?.(val);
              }}
            />
          </form>

          <nav className="jt-nav">
            <Link href="/">Home</Link>
            <Link href="/products">Products</Link>
            <Link href="/checkout">Checkout</Link>
            <Link href="/order-tracking">Track Order</Link>
            <Link href="/admin">Admin</Link>

            <button type="button" className="jt-cart-top-btn" onClick={handleOpenCart}>
              Cart ({cartCount})
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
}