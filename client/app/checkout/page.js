"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import { API_BASE_URL } from "@/lib/api";
import { useCart } from "@/context/CartContext";
import { getIdToken, useAuth } from "@/components/AuthProvider";
import { BANGLADESH_DISTRICTS } from "@/lib/delivery";
import { getThanasForDistrict, isLocationInsideDhaka } from "@/lib/bdLocations";
import { normalizeBdPhone, isValidBdPhone } from "@/lib/validate";

export default function CheckoutPage() {
  const router = useRouter();
  const { cartItems, clearCart } = useCart();
  const { user, profile } = useAuth();

  const [district, setDistrict] = useState("Dhaka");
  const [thana, setThana] = useState("");
  const [deliveryType, setDeliveryType] = useState("standard"); // "standard" or "urgent"
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

  const availableThanas = useMemo(() => getThanasForDistrict(district), [district]);
  const isInsideDhaka = useMemo(() => isLocationInsideDhaka(district, thana), [district, thana]);
  const deliveryZone = isInsideDhaka ? "inside_dhaka" : "outside_dhaka";

  const handleDistrictChange = (selectedDistrict) => {
    setDistrict(selectedDistrict);
    const nextThanas = getThanasForDistrict(selectedDistrict);
    if (!nextThanas.includes(thana)) {
      setThana("");
    }
    if (!isLocationInsideDhaka(selectedDistrict, "")) {
      setDeliveryType("standard");
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

  const isUrgent = isInsideDhaka && deliveryType === "urgent";
  const baseCharge = isUrgent ? 250 : isInsideDhaka ? 70 : 130;
  const freeApplied =
    !isUrgent &&
    rates.freeDeliveryThreshold > 0 &&
    subtotal >= rates.freeDeliveryThreshold;
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
          thana: thana || "",
          address: formData.address,
          note: formData.note,
          zone: deliveryZone,
          deliveryZone,
          deliveryType: isUrgent ? "urgent" : "standard",
          deliveryCharge,
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
                  {rates.freeDeliveryThreshold > 0 && !freeApplied && !isUrgent && (
                    <p style={{ fontSize: "13px", color: "#059669" }}>
                      আর {rates.freeDeliveryThreshold - subtotal} Tk কিনলেই ডেলিভারি ফ্রি!
                    </p>
                  )}
                </div>
              </div>

              <div className="jt-checkout-right">
                <h3>Customer & Delivery Details</h3>
                <form className="jt-checkout-form" onSubmit={placeOrder}>
                  {/* Name */}
                  <div style={{ marginBottom: "12px" }}>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: "700", color: "#334155", marginBottom: "6px" }}>
                      👤 আপনার নাম (Full Name) *
                    </label>
                    <input
                      type="text"
                      name="customerName"
                      autoComplete="name"
                      placeholder="আপনার সম্পূর্ণ নাম লিখুন"
                      value={formData.customerName}
                      onChange={handleChange}
                      minLength={2}
                      style={{ width: "100%", padding: "12px 14px", borderRadius: "8px", border: "1.5px solid #cbd5e1", fontSize: "14px" }}
                      required
                    />
                  </div>

                  {/* Phone */}
                  <div style={{ marginBottom: "12px" }}>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: "700", color: "#334155", marginBottom: "6px" }}>
                      📱 মোবাইল নম্বর (Mobile Number) *
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      autoComplete="tel"
                      inputMode="numeric"
                      maxLength={11}
                      placeholder="১১ ডিজিটের মোবাইল নম্বর (যেমন 017XXXXXXXX)"
                      value={formData.phone}
                      onChange={handleChange}
                      style={{ width: "100%", padding: "12px 14px", borderRadius: "8px", border: "1.5px solid #cbd5e1", fontSize: "14px" }}
                      required
                    />
                    {!isPhoneValid && (
                      <p style={{ color: "#dc2626", fontSize: "12px", marginTop: "4px", marginBottom: "0", fontWeight: "600" }}>
                        ⚠️ সঠিক ১১ ডিজিটের বাংলাদেশি নম্বর দিন (013-019)
                      </p>
                    )}
                  </div>

                  {/* Email (Optional) */}
                  <div style={{ marginBottom: "12px" }}>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: "700", color: "#334155", marginBottom: "6px" }}>
                      ✉️ ইমেইল (Email - ঐচ্ছিক)
                    </label>
                    <input
                      type="email"
                      name="customerEmail"
                      autoComplete="email"
                      placeholder="অর্ডার নোটিফিকেশন পাওয়ার জন্য (optional)"
                      value={formData.customerEmail}
                      onChange={handleChange}
                      style={{ width: "100%", padding: "12px 14px", borderRadius: "8px", border: "1.5px solid #cbd5e1", fontSize: "14px" }}
                    />
                  </div>

                  {/* Country (Fixed / Ogerio Style) */}
                  <div style={{ marginBottom: "12px" }}>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: "700", color: "#334155", marginBottom: "6px" }}>
                      🇧🇩 দেশ / অঞ্চল (Country / Region)
                    </label>
                    <div style={{
                      padding: "10px 14px",
                      background: "#f8fafc",
                      border: "1.5px solid #e2e8f0",
                      borderRadius: "8px",
                      fontSize: "14px",
                      fontWeight: "700",
                      color: "#1e293b",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px"
                    }}>
                      <span>🇧🇩</span> Bangladesh (বাংলাদেশ)
                    </div>
                  </div>

                  {/* District & Thana Row (Ogerio Style Location Selection) */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "13px", fontWeight: "700", color: "#334155", marginBottom: "6px" }}>
                        📍 জেলা (District) *
                      </label>
                      <select
                        value={district}
                        onChange={(e) => handleDistrictChange(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "12px 10px",
                          borderRadius: "8px",
                          border: "1.5px solid #cbd5e1",
                          fontSize: "14px",
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
                            {d.nameBn} ({d.nameEn})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "13px", fontWeight: "700", color: "#334155", marginBottom: "6px" }}>
                        🏘️ থানা / এলাকা (Thana / Area) *
                      </label>
                      {availableThanas.length > 0 ? (
                        <select
                          value={thana}
                          onChange={(e) => setThana(e.target.value)}
                          style={{
                            width: "100%",
                            padding: "12px 10px",
                            borderRadius: "8px",
                            border: "1.5px solid #cbd5e1",
                            fontSize: "14px",
                            fontWeight: "600",
                            color: "#0f172a",
                            backgroundColor: "#ffffff",
                            outline: "none",
                            cursor: "pointer",
                          }}
                          required
                        >
                          <option value="">-- থানা নির্বাচন করুন --</option>
                          {availableThanas.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          placeholder="আপনার থানা বা এলাকা লিখুন"
                          value={thana}
                          onChange={(e) => setThana(e.target.value)}
                          style={{
                            width: "100%",
                            padding: "12px 10px",
                            borderRadius: "8px",
                            border: "1.5px solid #cbd5e1",
                            fontSize: "14px",
                          }}
                          required
                        />
                      )}
                    </div>
                  </div>

                  {/* Detailed Address (Ogerio Style Hint & Placeholder) */}
                  <div style={{ marginBottom: "14px" }}>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: "700", color: "#334155", marginBottom: "6px" }}>
                      🏠 সম্পূর্ণ ঠিকানা (Full Delivery Address) *
                    </label>
                    <input
                      type="text"
                      name="address"
                      autoComplete="street-address"
                      minLength={6}
                      placeholder="House/Village/Road ,Thana, District"
                      value={formData.address}
                      onChange={handleChange}
                      style={{ width: "100%", padding: "12px 14px", borderRadius: "8px", border: "1.5px solid #cbd5e1", fontSize: "14px" }}
                      required
                    />
                    <p style={{ fontSize: "12px", color: "#64748b", margin: "5px 0 0", textAlign: "left" }}>
                      💡 উদাহরণ: বাড়ি ১২, রোড ৩, মোহাম্মদপুর, ঢাকা - ১২০৭
                    </p>
                  </div>

                  {/* Delivery Options (Ogerio Style Pathao Standard vs Urgent) */}
                  <div style={{ marginBottom: "16px" }}>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: "700", color: "#334155", marginBottom: "8px" }}>
                      🚚 ডেলিভারি পদ্ধতি নির্বাচন করুন (Shipping Method)
                    </label>

                    {isInsideDhaka ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        {/* Standard Delivery */}
                        <label
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "12px 14px",
                            border: deliveryType === "standard" ? "2px solid #e11d48" : "1.5px solid #cbd5e1",
                            borderRadius: "10px",
                            backgroundColor: deliveryType === "standard" ? "#fff1f2" : "#ffffff",
                            cursor: "pointer",
                            transition: "all 0.2s"
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <input
                              type="radio"
                              name="deliveryType"
                              value="standard"
                              checked={deliveryType === "standard"}
                              onChange={() => setDeliveryType("standard")}
                            />
                            <div>
                              <div style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a" }}>
                                🚚 রেগুলার ডেলিভারি (Regular / Standard)
                              </div>
                              <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                                ঢাকা সিটির ভিতরে ২-৩ কার্যদিবসের মধ্যে ডেলিভারি
                              </div>
                            </div>
                          </div>
                          <strong style={{ color: freeApplied ? "#059669" : "#e11d48", fontSize: "15px" }}>
                            {freeApplied ? "Free 🎉" : "70 Tk"}
                          </strong>
                        </label>

                        {/* Urgent Delivery (Ogerio 250 Tk Style) */}
                        <label
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "12px 14px",
                            border: deliveryType === "urgent" ? "2px solid #e11d48" : "1.5px solid #cbd5e1",
                            borderRadius: "10px",
                            backgroundColor: deliveryType === "urgent" ? "#fff1f2" : "#ffffff",
                            cursor: "pointer",
                            transition: "all 0.2s"
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <input
                              type="radio"
                              name="deliveryType"
                              value="urgent"
                              checked={deliveryType === "urgent"}
                              onChange={() => setDeliveryType("urgent")}
                            />
                            <div>
                              <div style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a" }}>
                                ⚡ জরুরী ডেলিভারি (Urgent Delivery)
                              </div>
                              <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                                ঢাকা সিটিতে জরুরি ভিত্তিতে দ্রুততম সময়ে হোম ডেলিভারি
                              </div>
                            </div>
                          </div>
                          <strong style={{ color: "#e11d48", fontSize: "15px" }}>250 Tk</strong>
                        </label>
                      </div>
                    ) : (
                      /* Outside Dhaka Delivery */
                      <label
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "12px 14px",
                          border: "2px solid #e11d48",
                          borderRadius: "10px",
                          backgroundColor: "#fff1f2",
                          cursor: "default"
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <input
                            type="radio"
                            name="deliveryType"
                            value="standard"
                            checked={true}
                            readOnly
                          />
                          <div>
                            <div style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a" }}>
                              🚚 সারা বাংলাদেশ ডেলিভারি (Outside Dhaka Courier)
                            </div>
                            <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                              ঢাকার বাইরে ৩-৫ কার্যদিবসের মধ্যে কুরিয়ার হোম ডেলিভারি
                            </div>
                          </div>
                        </div>
                        <strong style={{ color: freeApplied ? "#059669" : "#e11d48", fontSize: "15px" }}>
                          {freeApplied ? "Free 🎉" : "130 Tk"}
                        </strong>
                      </label>
                    )}
                  </div>

                  {/* Special Note */}
                  <div style={{ marginBottom: "16px" }}>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: "700", color: "#334155", marginBottom: "6px" }}>
                      📝 বিশেষ কোনো নির্দেশনা (Special Notes - ঐচ্ছিক)
                    </label>
                    <textarea
                      name="note"
                      maxLength={300}
                      placeholder="অর্ডার বা ডেলিভারি সম্পর্কিত কোনো বিশেষ রিকুয়েস্ট থাকলে লিখতে পারেন"
                      value={formData.note}
                      onChange={handleChange}
                      style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1.5px solid #cbd5e1", fontSize: "13.5px" }}
                    ></textarea>
                  </div>

                  {error && <div style={{background:'#fdecec', color:'#c0392b', padding:12, borderRadius:8, marginBottom: "12px", fontSize: "14px"}}>{error}</div>}
                  {success && <div style={{background:'#eafaf1', color:'#1e8449', padding:12, borderRadius:8, marginBottom: "12px", fontSize: "14px"}}>{success}</div>}

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