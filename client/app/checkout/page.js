"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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

    console.log("Sending order:", orderData);

    try {
      const res = await fetch(`${API_BASE_URL}/api/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderData),
      });

      const result = await res.json();
      console.log("Order response:", result);

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
    <main className="jt-checkout-page">
      <section className="jt-checkout-box">
        <h1>Quick Checkout</h1>
        <p>No login required. Customer can place order directly.</p>

        <div className="jt-checkout-layout">
          <div className="jt-checkout-left">
            <h3>Your Order</h3>

            <p style={{ textAlign: "left", marginTop: "-8px", marginBottom: "16px" }}>
                Review your selected products before placing the order.
            </p>
          {cartItems.length === 0 ? (
  <div
    style={{
      background: "white",
      border: "1px solid #e5eaf1",
      borderRadius: "12px",
      padding: "20px",
      textAlign: "center",
      color: "#5d6574",
    }}
  >
    Your cart is empty. Please add a product before checkout.
  </div>
) : (
              cartItems.map((item) => (
                <div key={item._id} className="jt-checkout-item">
                  <div>
                    <strong>{item.name}</strong>
                    <p>
                      {item.offerPrice} Tk × {item.quantity}
                    </p>
                  </div>
                  <strong>{item.offerPrice * item.quantity} Tk</strong>
                </div>
              ))
            )}

            <div className="jt-summary-box">
              <p>Subtotal: <strong>{subtotal} Tk</strong></p>
              <p>Delivery: <strong>{deliveryCharge} Tk</strong></p>
              <p>Total: <strong>{total} Tk</strong></p>
            </div>
          </div>

          <div className="jt-checkout-right">
            <h3>Customer Information</h3>
            <form className="jt-checkout-form" onSubmit={placeOrder}>
              <input
                type="text"
                name="customerName"
                placeholder="আপনার নাম"
                value={formData.customerName}
                onChange={handleChange}
                required
              />

              <input
                type="text"
                name="phone"
                placeholder="ফোন নাম্বার"
                value={formData.phone}
                onChange={handleChange}
                required
              />

              <input
                type="text"
                name="address"
                placeholder="এড্রেস"
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
                    <span>ঢাকা সিটির মধ্যে</span>
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
                    <span>ঢাকা সিটির বাইরে</span>
                  </div>
                  <strong>110 Tk</strong>
                </label>
              </div>

              <textarea
                name="note"
                placeholder="কোনো note থাকলে লিখুন"
                value={formData.note}
                onChange={handleChange}
              ></textarea>

              <button type="submit">
                    Cash on Delivery Order
                  </button>
            </form>

            {message && (
  <div className="jt-order-message">
    <strong>{message}</strong>

    {message === "Order placed successfully" && (
      <p style={{ marginTop: "8px", marginBottom: 0 }}>
        Thank you for your order. We will contact you soon to confirm delivery.
      </p>
    )}
  </div>
)}
          </div>
        </div>
      </section>
    </main>
  );
}