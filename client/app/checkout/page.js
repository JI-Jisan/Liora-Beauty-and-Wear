"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import { API_BASE_URL } from "@/lib/api";
import { useCart } from "@/context/CartContext";

export default function CheckoutPage() {
  const router = useRouter();
  const { cartItems, clearCart } = useCart();

  const [deliveryZone, setDeliveryZone] = useState("inside");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [rates, setRates] = useState({
    deliveryInside: 65,
    deliveryOutside: 110,
    freeDeliveryThreshold: 0,
  });

  const [formData, setFormData] = useState({
    customerName: "",
    phone: "",
    address: "",
    note: "",
  });

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/settings`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        setRates({
          deliveryInside: Number(d.deliveryInside ?? 65),
          deliveryOutside: Number(d.deliveryOutside ?? 110),
          freeDeliveryThreshold: Number(d.freeDeliveryThreshold ?? 0),
        });
      })
      .catch(() => {});
  }, []);

  const unitPrice = (item) => Number(item.offerPrice ?? item.price ?? 0);

  const subtotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + unitPrice(item) * (item.quantity || 1), 0),
    [cartItems]
  );

  const baseCharge =
    deliveryZone === "outside" ? rates.deliveryOutside : rates.deliveryInside;
  const freeApplied =
    rates.freeDeliveryThreshold > 0 && subtotal >= rates.freeDeliveryThreshold;
  const deliveryCharge = freeApplied ? 0 : baseCharge;
  const total = subtotal + deliveryCharge;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const placeOrder = async (e) => {
    e.preventDefault();
    if (submitting) return;

    if (cartItems.length === 0) {
      setMessage("কার্ট খালি");
      return;
    }
    if (!/^01[3-9]\d{8}$/.test(formData.phone.trim())) {
      setMessage("সঠিক ফোন নাম্বার দিন (যেমন 017XXXXXXXX)");
      return;
    }
    if (!Number.isFinite(total) || total <= 0) {
      setError("দামে সমস্যা হয়েছে, কার্ট রিফ্রেশ করুন");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(`${API_BASE_URL}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: formData.customerName,
          phone: formData.phone,
          address: formData.address,
          note: formData.note,
          deliveryZone,
          items: cartItems.map((item) => ({
            productId: item._id,
            quantity: item.quantity || 1,
          })),
        }),
      });

      let result = null;
      try {
        result = await res.json();
      } catch {
        // সার্ভার HTML error page পাঠালে
      }

      if (!res.ok) {
        throw new Error(result?.message || "অর্ডার সম্পন্ন হয়নি");
      }

      setSuccess("অর্ডার সফলভাবে জমা হয়েছে! আমরা শীঘ্রই কল করব।");
      clearCart();
      router.push(`/order/success?id=${result._id}&no=${result.orderNumber}`);
    } catch (err) {
      console.error("Order submit error:", err);
      setError(err.message || "কিছু একটা সমস্যা হয়েছে");
    } finally {
      setSubmitting(false);
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
                Browse Products &amp; Shop Now &rarr;
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
                          {unitPrice(item)} Tk × {item.quantity || 1}
                        </p>
                      </div>
                      <strong>{unitPrice(item) * (item.quantity || 1)} Tk</strong>
                    </div>
                  ))}
                </div>

                <div className="jt-summary-box">
                  <p>Subtotal: <strong>{subtotal} Tk</strong></p>
                  <p>
                    Delivery:{" "}
                    <strong>{freeApplied ? "Free 🎉" : `${deliveryCharge} Tk`}</strong>
                  </p>
                  <p className="jt-summary-total">Total: <strong>{total} Tk</strong></p>
                  {rates.freeDeliveryThreshold > 0 && !freeApplied && (
                    <p style={{ fontSize: "13px", color: "#059669" }}>
                      আর {rates.freeDeliveryThreshold - subtotal} Tk কিনলেই ডেলিভারি ফ্রি!
                    </p>
                  )}
                </div>
              </div>

              <div className="jt-checkout-right">
                <h3>Customer Information</h3>
                <form className="jt-checkout-form" onSubmit={placeOrder}>
                  <input
                    type="text"
                    name="customerName"
                    autoComplete="name"
                    placeholder="আপনার নাম (Your Name)"
                    value={formData.customerName}
                    onChange={handleChange}
                    minLength={2}
                    required
                  />

                  <input
                    type="tel"
                    name="phone"
                    autoComplete="tel"
                    inputMode="numeric"
                    maxLength={11}
                    pattern="01[3-9][0-9]{8}"
                    title="১১ ডিজিটের নাম্বার দিন, যেমন 017XXXXXXXX"
                    placeholder="ফোন নাম্বার (Phone Number e.g. 017...)"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                  />

                  <input
                    type="text"
                    name="address"
                    autoComplete="street-address"
                    minLength={10}
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
                          checked={deliveryZone === "inside"}
                          onChange={() => setDeliveryZone("inside")}
                        />
                        <span>ঢাকা সিটির মধ্যে (Inside Dhaka)</span>
                      </div>
                      <strong>{rates.deliveryInside} Tk</strong>
                    </label>

                    <label className="jt-delivery-row">
                      <div className="jt-delivery-left">
                        <input
                          type="radio"
                          name="delivery"
                          checked={deliveryZone === "outside"}
                          onChange={() => setDeliveryZone("outside")}
                        />
                        <span>ঢাকা সিটির বাইরে (Outside Dhaka)</span>
                      </div>
                      <strong>{rates.deliveryOutside} Tk</strong>
                    </label>
                  </div>

                  <textarea
                    name="note"
                    maxLength={300}
                    placeholder="কোনো বিশেষ নির্দেশনা থাকলে লিখুন (Special Notes - optional)"
                    value={formData.note}
                    onChange={handleChange}
                  ></textarea>

                  {error && <div style={{background:'#fdecec', color:'#c0392b', padding:12, borderRadius:8, marginBottom: "10px"}}>{error}</div>}
                  {success && <div style={{background:'#eafaf1', color:'#1e8449', padding:12, borderRadius:8, marginBottom: "10px"}}>{success}</div>}

                  <button type="submit" className="jt-place-order-btn" disabled={submitting}>
                    {submitting
                      ? "অর্ডার হচ্ছে, অপেক্ষা করুন..."
                      : `Place Cash on Delivery Order (${total} Tk)`}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}