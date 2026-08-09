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
    <div className={`jt-cart-drawer ${isOpen ? "open" : ""}`}>
      <div className="jt-cart-header">
        <h3>Your Cart</h3>
        <button onClick={onClose}>✕</button>
      </div>

      <div className="jt-cart-body">
        {cartItems.length === 0 ? (
          <p className="jt-empty-cart">No items in cart</p>
        ) : (
          cartItems.map((item) => (
            <div key={item._id} className="jt-cart-item">
              <div className="jt-cart-item-info">
                <h4>{item.name}</h4>
                <p>{item.offerPrice} Tk</p>
                <p>Category: {typeof item.category === "object" ? item.category?.name : (item.category || "Beauty & Wear")}</p>
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
        <p className="jt-total">
          Total: <span>{total} Tk</span>
        </p>

        <button
          className="jt-checkout-btn"
          onClick={goToCheckout}
          disabled={cartItems.length === 0}
        >
          Proceed to Checkout
        </button>
      </div>
    </div>
  );
}