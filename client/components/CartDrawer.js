"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CartDrawer({
  cartItems = [],
  isOpen,
  onClose,
  onIncrease,
  onDecrease,
  onRemove,
}) {
  const router = useRouter();

  // Android Hardware Back Button Handling
  useEffect(() => {
    if (!isOpen) return;

    window.history.pushState({ cartOpen: true }, "");

    const handlePopState = () => {
      onClose();
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [isOpen, onClose]);

  const total = cartItems.reduce(
    (sum, item) => sum + item.offerPrice * item.quantity,
    0
  );

  const goToCheckout = () => {
    if (cartItems.length === 0) return;
    localStorage.setItem("jt_cart", JSON.stringify(cartItems));
    onClose();
    router.push("/checkout");
  };

  return (
    <>
      <div
        className={`jt-cart-overlay ${isOpen ? "open" : ""}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div className={`jt-cart-drawer ${isOpen ? "open" : ""}`}>
        <div className="jt-cart-header">
          <h3>Your Cart ({cartItems.reduce((acc, item) => acc + item.quantity, 0)})</h3>
          <button onClick={onClose} aria-label="Close cart">✕</button>
        </div>

        <div className="jt-cart-body">
          {cartItems.length === 0 ? (
            <div className="jt-empty-cart-view">
              <p className="jt-empty-cart">Your cart is empty</p>
              <button className="jt-continue-shopping-btn" onClick={onClose}>
                Start Shopping
              </button>
            </div>
          ) : (
            cartItems.map((item) => (
              <div key={item._id} className="jt-cart-item">
                <div className="jt-cart-item-info">
                  <h4>{item.name}</h4>
                  <p className="jt-cart-price">{item.offerPrice} Tk</p>
                  <p className="jt-cart-cat">Category: {typeof item.category === "object" ? item.category?.name : (item.category || "Beauty & Wear")}</p>
                </div>

                <div className="jt-cart-actions">
                  <div className="jt-qty-box">
                    <button onClick={() => onDecrease(item._id)}>-</button>
                    <span>{item.quantity}</span>
                    <button onClick={() => onIncrease(item._id)}>+</button>
                  </div>

                  <button
                    className="jt-remove-btn"
                    onClick={() => onRemove(item._id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="jt-cart-footer">
          <div className="jt-cart-subtotal-row">
            <span>Subtotal</span>
            <strong>{total} Tk</strong>
          </div>

          <button
            className="jt-checkout-btn"
            onClick={goToCheckout}
            disabled={cartItems.length === 0}
          >
            Proceed to Checkout
          </button>
        </div>
      </div>
    </>
  );
}