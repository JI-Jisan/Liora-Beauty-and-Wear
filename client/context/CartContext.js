"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import CartDrawer from "@/components/CartDrawer";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

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

  const addToCart = (product) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item._id === product._id);
      let updated;
      if (existing) {
        updated = prev.map((item) =>
          item._id === product._id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        updated = [...prev, { ...product, quantity: 1 }];
      }
      try {
        localStorage.setItem("jt_cart", JSON.stringify(updated));
      } catch (err) {
        console.error("Cart save error:", err);
      }
      return updated;
    });
    setIsCartOpen(true);
  };

  const increaseQty = (id) => {
    setCartItems((prev) => {
      const updated = prev.map((item) =>
        item._id === id ? { ...item, quantity: item.quantity + 1 } : item
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
      const updated = prev
        .map((item) =>
          item._id === id ? { ...item, quantity: item.quantity - 1 } : item
        )
        .filter((item) => item.quantity > 0);
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

  const value = {
    cartItems,
    cartCount,
    isCartOpen,
    addToCart,
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
