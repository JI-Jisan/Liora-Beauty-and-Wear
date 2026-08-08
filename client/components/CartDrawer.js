"use client";

export default function CartDrawer({
  cartItems,
  isOpen,
  onClose,
  onIncrease,
  onDecrease,
  onRemove,
}) {
  const total = cartItems.reduce(
    (sum, item) => sum + item.offerPrice * item.quantity,
    0
  );

  const goToCheckout = () => {
    localStorage.setItem("jt_cart", JSON.stringify(cartItems));
    window.location.href = "/checkout";
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
                <p>Category: {item.category?.name || "No Category"}</p>
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
        <h4>Total: {total} Tk</h4>
        <button className="jt-checkout-btn" onClick={goToCheckout}>
          Go to Checkout
        </button>
      </div>
    </div>
  );
}