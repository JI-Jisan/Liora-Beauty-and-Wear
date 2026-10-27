"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import CartDrawer from "@/components/CartDrawer";
import CartQuickBar from "@/components/CartQuickBar";
import { useAuth } from "@/components/AuthProvider";
import { getWholesalePrice } from "@/lib/price";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [recentlyAdded, setRecentlyAdded] = useState(null);
  const { isWholesale, isReseller } = useAuth();

  useEffect(() => {
    Promise.resolve().then(() => {
      try {
        const savedCart = localStorage.getItem("jt_cart");
        if (savedCart) {
          setCartItems(JSON.parse(savedCart));
        }
      } catch (e) {
        console.error("Failed to parse stored cart:", e);
      }
    });
  }, []);

  const saveCart = (updatedCart) => {
    setCartItems(updatedCart);
    try {
      localStorage.setItem("jt_cart", JSON.stringify(updatedCart));
    } catch (e) {
      console.error("Failed to save cart:", e);
    }
  };

  const addToCart = (product, customQty, customPrice) => {
    const isWs = isWholesale || product.orderType === "wholesale";
    const isRes = isReseller || product.orderType === "reseller";

    let unitPrice = Number(product.offerPrice ?? product.price ?? 0);
    let minMoq = 1;

    if (isWs) {
      minMoq = Math.max(1, product.wholesaleMinQty || 3);
      unitPrice = getWholesalePrice(product);
    } else if (isRes) {
      unitPrice = Number(product.resellerPrice > 0 ? product.resellerPrice : Math.round((product.offerPrice || 100) * 0.92));
    }

    if (customPrice !== undefined && Number.isFinite(Number(customPrice))) {
      unitPrice = Number(customPrice);
    }

    const initialQty = customQty !== undefined ? Number(customQty) : (isWs ? minMoq : 1);

    setCartItems((prev) => {
      const existing = prev.find((item) => item._id === product._id);
      let updated;
      if (existing) {
        const step = customQty !== undefined ? Number(customQty) : 1;
        updated = prev.map((item) =>
          item._id === product._id
            ? { ...item, quantity: item.quantity + step, price: unitPrice }
            : item
        );
      } else {
        updated = [
          ...prev,
          {
            ...product,
            price: unitPrice,
            offerPrice: isWs ? unitPrice : product.offerPrice,
            wholesalePrice: isWs ? unitPrice : product.wholesalePrice,
            quantity: initialQty,
            orderType: isWs ? "wholesale" : isRes ? "reseller" : "retail",
          },
        ];
      }
      try {
        localStorage.setItem("jt_cart", JSON.stringify(updated));
      } catch (err) {
        console.error("Cart save error:", err);
      }
      return updated;
    });

    setRecentlyAdded({
      product: { ...product, price: unitPrice },
      timestamp: Date.now(),
    });
  };

  const increaseQty = (id) => {
    setCartItems((prev) => {
      const updated = prev.map((item) =>
        item._id === id ? { ...item, quantity: Math.min(item.quantity + 1, item.stockQuantity || 20) } : item
      );
      try {
        localStorage.setItem("jt_cart", JSON.stringify(updated));
      } catch (err) {
        console.error("Cart save error:", err);
      }
      return updated;
    });
  };

  const decreaseQty = (id) => {
    setCartItems((prev) => {
      const target = prev.find((item) => item._id === id);
      if (!target) return prev;
      const isWs = isWholesale || target.orderType === "wholesale";
      const moq = isWs ? Math.max(1, target.wholesaleMinQty || 3) : 1;

      let updated;
      if (isWs && target.quantity <= moq) {
        updated = prev.filter((item) => item._id !== id);
      } else {
        updated = prev
          .map((item) => (item._id === id ? { ...item, quantity: item.quantity - 1 } : item))
          .filter((item) => item.quantity > 0);
      }
      try {
        localStorage.setItem("jt_cart", JSON.stringify(updated));
      } catch (err) {
        console.error("Cart save error:", err);
      }
      return updated;
    });
  };

  const updateItemQty = (product, qty, customPrice) => {
    const isWs = isWholesale || product.orderType === "wholesale";
    const minMoq = isWs ? Math.max(1, product.wholesaleMinQty || 3) : 1;
    if (qty <= 0) {
      removeItem(product._id);
      return;
    }
    const finalQty = isWs ? Math.max(minMoq, qty) : qty;
    setCartItems((prev) => {
      const existing = prev.find((item) => item._id === product._id);
      let updated;
      if (existing) {
        updated = prev.map((item) =>
          item._id === product._id
            ? { ...item, quantity: finalQty, ...(customPrice !== undefined ? { price: Number(customPrice) } : {}) }
            : item
        );
      } else {
        const unitPrice = customPrice !== undefined ? Number(customPrice) : (isWs ? getWholesalePrice(product) : Number(product.offerPrice || 0));
        updated = [
          ...prev,
          {
            ...product,
            price: unitPrice,
            quantity: finalQty,
            orderType: isWs ? "wholesale" : "retail",
          },
        ];
      }
      try {
        localStorage.setItem("jt_cart", JSON.stringify(updated));
      } catch (err) {
        console.error("Cart save error:", err);
      }
      return updated;
    });
  };

  const removeItem = (id) => {
    setCartItems((prev) => {
      const updated = prev.filter((item) => item._id !== id);
      try {
        localStorage.setItem("jt_cart", JSON.stringify(updated));
      } catch (err) {
        console.error("Cart save error:", err);
      }
      return updated;
    });
  };

  const clearCart = () => {
    saveCart([]);
  };

  const openCart = () => setIsCartOpen(true);
  const closeCart = () => setIsCartOpen(false);
  const toggleCart = () => setIsCartOpen((prev) => !prev);

  const cartCount = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.quantity, 0);
  }, [cartItems]);

  const subtotal = useMemo(() => {
    return cartItems.reduce(
      (sum, item) => sum + Number(item.price ?? item.offerPrice ?? 0) * (Number(item.quantity) || 1),
      0
    );
  }, [cartItems]);

  const value = {
    cartItems,
    cartCount,
    subtotal,
    isCartOpen,
    recentlyAdded,
    addToCart,
    updateItemQty,
    increaseQty,
    decreaseQty,
    removeItem,
    clearCart,
    openCart,
    closeCart,
    toggleCart,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
      <CartDrawer
        cartItems={cartItems}
        isOpen={isCartOpen}
        onClose={closeCart}
        onIncrease={increaseQty}
        onDecrease={decreaseQty}
        onRemove={removeItem}
      />
      <CartQuickBar />
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
