"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import { API_BASE_URL } from "@/lib/api";
import { useCart } from "@/context/CartContext";

export default function CheckoutPage() {
  const router = useRouter();
  const { cartItems, clearCart } = useCart();
  const [deliveryCharge, setDeliveryCharge] = useState(65);
  const [message, setMessage] = useState("");

  const [formData, setFormData] = useState({
    customerName: "",
    phone: "",
    address: "",
    note: "",
  });

  const subtotal = useMemo(() => {
    return cartItems.reduce(
      (sum, item) => sum + item.offerPrice * item.quantity,
      0
    );
  }, [cartItems]);

  const total = subtotal + deliveryCharge;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const placeOrder = async (e) => {
    e.preventDefault();

    if (cartItems.length === 0) {
      setMessage("Cart is empty");
      return;
    }

    const orderData = {
      customerName: formData.customerName,
      phone: formData.phone,
      address: formData.address,
      note: formData.note,
      items: cartItems.map((item) => ({
        productName: item.name,
        quantity: item.quantity,
        price: item.offerPrice,
      })),
      deliveryCharge,
      subtotal,
      total,
      status: "Pending",
    };

    try {
      const res = await fetch(`${API_BASE_URL}/api/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderData),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.message || "Order failed");
      }

      clearCart();

      const redirectId = result.orderNumber || result._id;
      router.push(`/order-success/${redirectId}`);
    } catch (error) {
      console.error("Order submit error:", error);
      setMessage(error.message || "Something went wrong");
    }
  };

  return (
    <main className="jt-page">
      <Header />

      <section className="jt-checkout-page">
        <div className="jt-checkout-box">
          <h1>Quick Checkout</h1>
          <p>No login required. Place your order with Cash on Delivery nationwide.</p>

          {cartItems.length === 0 ? (
            <div className="jt-empty-checkout-card">
              <div className="jt-empty-icon">🛍️</div>
              <h2>Your Shopping Cart is Empty</h2>
              <p>Looks like you haven&apos;t added any products to your cart yet.</p>
              <Link href="/products" className="jt-browse-products-btn">
                Browse Products & Shop Now &rarr;
              </Link>
            </div>
          ) : (
            <div className="jt-checkout-layout">
              <div className="jt-checkout-left">
                <h3>Your Order ({cartItems.length} items)</h3>
                <p style={{ textAlign: "left", marginTop: "-8px", marginBottom: "16px", fontSize: "14px", color: "#64748b" }}>
                  Review your selected products before placing the order.
                </p>

                <div className="jt-checkout-items-list">
                  {cartItems.map((item) => (
                    <div key={item._id} className="jt-checkout-item">
                      <div>
                        <strong>{item.name}</strong>
                        <p>
                          {item.offerPrice} Tk × {item.quantity}
                        </p>
                      </div>
                      <strong>{item.offerPrice * item.quantity} Tk</strong>
                    </div>
                  ))}
                </div>

                <div className="jt-summary-box">
                  <p>Subtotal: <strong>{subtotal} Tk</strong></p>
                  <p>Delivery: <strong>{deliveryCharge} Tk</strong></p>
                  <p className="jt-summary-total">Total: <strong>{total} Tk</strong></p>
                </div>
              </div>

              <div className="jt-checkout-right">
                <h3>Customer Information</h3>
                <form className="jt-checkout-form" onSubmit={placeOrder}>
                  <input
                    type="text"
                    name="customerName"
                    placeholder="আপনার নাম (Your Name)"
                    value={formData.customerName}
                    onChange={handleChange}
                    required
                  />

                  <input
                    type="tel"
                    name="phone"
                    placeholder="ফোন নাম্বার (Phone Number e.g. 017...)"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                  />

                  <input
                    type="text"
                    name="address"
                    placeholder="সম্পূর্ণ ডেলিভারি এড্রেস (Full Address)"
                    value={formData.address}
                    onChange={handleChange}
                    required
                  />

                  <div className="jt-delivery-options">
                    <label className="jt-delivery-row">
                      <div className="jt-delivery-left">
                        <input
                          type="radio"
                          name="delivery"
                          checked={deliveryCharge === 65}
                          onChange={() => setDeliveryCharge(65)}
                        />
                        <span>ঢাকা সিটির মধ্যে (Inside Dhaka)</span>
                      </div>
                      <strong>65 Tk</strong>
                    </label>

                    <label className="jt-delivery-row">
                      <div className="jt-delivery-left">
                        <input
                          type="radio"
                          name="delivery"
                          checked={deliveryCharge === 110}
                          onChange={() => setDeliveryCharge(110)}
                        />
                        <span>ঢাকা সিটির বাইরে (Outside Dhaka)</span>
                      </div>
                      <strong>110 Tk</strong>
                    </label>
                  </div>

                  <textarea
                    name="note"
                    placeholder="কোনো বিশেষ নির্দেশনা থাকলে লিখুন (Special Notes - optional)"
                    value={formData.note}
                    onChange={handleChange}
                  ></textarea>

                  <button type="submit" className="jt-place-order-btn">
                    Place Cash on Delivery Order ({total} Tk)
                  </button>
                </form>

                {message && (
                  <div className="jt-order-message">
                    <strong>{message}</strong>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}