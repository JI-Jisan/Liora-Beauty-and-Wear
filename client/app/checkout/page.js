"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import { API_BASE_URL } from "@/lib/api";
import { useCart } from "@/context/CartContext";
import { getIdToken, useAuth } from "@/components/AuthProvider";
import { ZONES, BANGLADESH_DISTRICTS, getCharge } from "@/lib/delivery";
import { normalizeBdPhone, isValidBdPhone } from "@/lib/validate";

export default function CheckoutPage() {
  const router = useRouter();
  const { cartItems, clearCart } = useCart();
  const { user, profile } = useAuth();

  const [district, setDistrict] = useState("Dhaka");
  const [deliveryZone, setDeliveryZone] = useState("inside_dhaka");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [rates, setRates] = useState({
    freeDeliveryThreshold: 0,
  });

  const [formData, setFormData] = useState({
    customerName: "",
    customerEmail: "",
    phone: "",
    address: "",
    note: "",
  });

  useEffect(() => {
    if (profile || user) {
      setFormData((prev) => ({
        ...prev,
        customerName: prev.customerName || profile?.name || user?.displayName || "",
        customerEmail: prev.customerEmail || profile?.email || user?.email || "",
        phone: prev.phone || profile?.phone || "",
        address: prev.address || profile?.address || "",
      }));
    }
  }, [profile, user]);

  const handleDistrictChange = (selectedDistrict) => {
    setDistrict(selectedDistrict);
    if (selectedDistrict === "Dhaka") {
      setDeliveryZone("inside_dhaka");
    } else {
      setDeliveryZone("outside_dhaka");
    }
  };

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/settings`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        setRates({
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

  const baseCharge = getCharge(deliveryZone);
  const freeApplied =
    rates.freeDeliveryThreshold > 0 && subtotal >= rates.freeDeliveryThreshold;
  const deliveryCharge = freeApplied ? 0 : baseCharge;
  const total = subtotal + deliveryCharge;

  const normalizedPhone = normalizeBdPhone(formData.phone);
  const isPhoneValid = !formData.phone || isValidBdPhone(normalizedPhone);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const placeOrder = async (e) => {
    e.preventDefault();
    if (submitting) return;

    if (cartItems.length === 0) {
      setError("কার্ট খালি");
      return;
    }
    const cleanPhone = normalizeBdPhone(formData.phone);
    if (!isValidBdPhone(cleanPhone)) {
      setError("সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন (যেমন 01712345678)");
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
      const token = await getIdToken();
      const res = await fetch(`${API_BASE_URL}/api/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          customerName: formData.customerName,
          customerEmail: formData.customerEmail || profile?.email || user?.email || "",
          phone: cleanPhone,
          district: district || "Dhaka",
          address: formData.address,
          note: formData.note,
          zone: deliveryZone,
          deliveryZone,
          firebaseUid: user?.uid || null,
          items: cartItems.map((item) => ({
            productId: item._id,
            quantity: item.quantity || 1,
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "অর্ডার সম্পন্ন হয়নি");
      }

      clearCart();
      const orderId = data._id || data.orderNumber;
      const orderNo = data.orderNumber || data._id;
      const orderTotal = data.total || total;
      router.push(`/order/success?id=${orderId}&no=${orderNo}&total=${orderTotal}`);
    } catch (err) {
      setError(err.message || "অর্ডার সম্পন্ন করতে সমস্যা হয়েছে");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main>
      <Header />

      <section className="jt-checkout-page">
        <div className="jt-container">
          <div className="jt-checkout-head">
            <h2>Checkout</h2>
            <p>আপনার নাম, মোবাইল নাম্বার এবং ডেলিভারি ঠিকানা দিন</p>
          </div>

          {cartItems.length === 0 ? (
            <div className="jt-empty-checkout">
              <h3>আপনার কার্ট খালি</h3>
              <p>অর্ডার করার জন্য প্রথমে কিছু প্রোডাক্ট কার্টে যোগ করুন।</p>
              <Link href="/products" className="jt-primary-btn">
                শপিং চালিয়ে যান
              </Link>
            </div>
          ) : (
            <div className="jt-checkout-grid">
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
                    placeholder="ফোন নম্বর (যেমন 017XXXXXXXX)"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                  />
                  {!isPhoneValid && (
                    <p style={{ color: "#dc2626", fontSize: "12px", marginTop: "-6px", marginBottom: "8px", fontWeight: "600" }}>
                      ⚠️ সঠিক ১১ ডিজিটের বাংলাদেশি নম্বর দিন (013-019)
                    </p>
                  )}

                  <input
                    type="email"
                    name="customerEmail"
                    autoComplete="email"
                    placeholder="ইমেইল অ্যাড্রেস (Email - অর্ডার নোটিফিকেশনের জন্য)"
                    value={formData.customerEmail}
                    onChange={handleChange}
                  />

                  <div style={{ marginBottom: "12px" }}>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: "700", color: "#334155", marginBottom: "6px" }}>
                      📍 ডেলিভারি জেলা (Select District) *
                    </label>
                    <select
                      value={district}
                      onChange={(e) => handleDistrictChange(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "12px 14px",
                        borderRadius: "10px",
                        border: "1.5px solid #cbd5e1",
                        fontSize: "14.5px",
                        fontWeight: "600",
                        color: "#0f172a",
                        backgroundColor: "#ffffff",
                        outline: "none",
                        cursor: "pointer",
                      }}
                      required
                    >
                      {BANGLADESH_DISTRICTS.map((d) => (
                        <option key={d.id} value={d.nameEn}>
                          {d.nameBn} ({d.nameEn}) {d.isInsideDhaka ? "— ঢাকা সিটি (৳৭০)" : "— ঢাকার বাইরে (৳১৩০)"}
                        </option>
                      ))}
                    </select>
                  </div>

                  <input
                    type="text"
                    name="address"
                    autoComplete="street-address"
                    minLength={8}
                    placeholder="সম্পূর্ণ ডেলিভারি ঠিকানা (বাসা নং, রোড, এরিয়া/থানা)"
                    value={formData.address}
                    onChange={handleChange}
                    required
                  />

                  <div className="jt-delivery-options" style={{ marginTop: "12px", marginBottom: "14px" }}>
                    <label
                      className="jt-delivery-row"
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "12px 14px",
                        border: deliveryZone === "inside_dhaka" ? "2px solid #e11d48" : "1px solid #cbd5e1",
                        borderRadius: "10px",
                        marginBottom: "10px",
                        cursor: "pointer",
                        backgroundColor: deliveryZone === "inside_dhaka" ? "#fff1f2" : "#ffffff",
                      }}
                    >
                      <div className="jt-delivery-left" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <input
                          type="radio"
                          name="delivery"
                          checked={deliveryZone === "inside_dhaka"}
                          onChange={() => {
                            setDeliveryZone("inside_dhaka");
                            setDistrict("Dhaka");
                          }}
                        />
                        <span style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a" }}>
                          ঢাকা সিটির ভিতরে (Inside Dhaka)
                        </span>
                      </div>
                      <strong style={{ color: "#e11d48", fontSize: "15px" }}>70 Tk</strong>
                    </label>

                    <label
                      className="jt-delivery-row"
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "12px 14px",
                        border: deliveryZone === "outside_dhaka" ? "2px solid #e11d48" : "1px solid #cbd5e1",
                        borderRadius: "10px",
                        cursor: "pointer",
                        backgroundColor: deliveryZone === "outside_dhaka" ? "#fff1f2" : "#ffffff",
                      }}
                    >
                      <div className="jt-delivery-left" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <input
                          type="radio"
                          name="delivery"
                          checked={deliveryZone === "outside_dhaka"}
                          onChange={() => {
                            setDeliveryZone("outside_dhaka");
                            if (district === "Dhaka") setDistrict("Gazipur");
                          }}
                        />
                        <span style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a" }}>
                          ঢাকার বাইরে - সারা দেশ (Outside Dhaka)
                        </span>
                      </div>
                      <strong style={{ color: "#e11d48", fontSize: "15px" }}>130 Tk</strong>
                    </label>
                  </div>

                  <p style={{ fontSize: "12px", color: "#64748b", margin: "-4px 0 10px", textAlign: "left" }}>
                    💡 ঠিকানা ঢাকা সিটির বাইরে হলে ডেলিভারি চার্জ সমন্বয় করা হতে পারে।
                  </p>

                  <textarea
                    name="note"
                    maxLength={300}
                    placeholder="কোনো বিশেষ নির্দেশনা থাকলে লিখুন (Special Notes - optional)"
                    value={formData.note}
                    onChange={handleChange}
                  ></textarea>

                  {error && <div style={{background:'#fdecec', color:'#c0392b', padding:12, borderRadius:8, marginBottom: "10px"}}>{error}</div>}
                  {success && <div style={{background:'#eafaf1', color:'#1e8449', padding:12, borderRadius:8, marginBottom: "10px"}}>{success}</div>}

                  <button type="submit" className="jt-place-order-btn" disabled={submitting || (formData.phone && !isPhoneValid)}>
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