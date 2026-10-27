"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import { API_BASE_URL, getAuthHeaders } from "@/lib/api";
import { useCart } from "@/context/CartContext";
import { getIdToken, useAuth } from "@/components/AuthProvider";
import { BANGLADESH_DISTRICTS } from "@/lib/delivery";
import { getThanasForDistrict, isLocationInsideDhaka } from "@/lib/bdLocations";
import { normalizeBdPhone, isValidBdPhone } from "@/lib/validate";
import { useCampus } from "@/context/CampusContext";

export default function CheckoutPage() {
  const router = useRouter();
  const { cartItems, clearCart } = useCart();
  const { user, profile, role } = useAuth();
  const { activeCoupon, removeCampusCoupon } = useCampus();

  const [district, setDistrict] = useState("Dhaka");
  const [thana, setThana] = useState("");
  const [deliveryType, setDeliveryType] = useState("standard"); // "standard" or "urgent"
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [rates, setRates] = useState({
    freeDeliveryThreshold: 0,
  });

  // Admin Custom Controls State
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [customPrices, setCustomPrices] = useState({});
  const [customDeliveryCharge, setCustomDeliveryCharge] = useState("");
  const [adminDiscount, setAdminDiscount] = useState("");
  const [commission, setCommission] = useState("");
  const [commissionNote, setCommissionNote] = useState("");
  const [productDetailsMap, setProductDetailsMap] = useState({});

  useEffect(() => {
    const isAdm =
      profile?.role === "admin" ||
      role === "admin" ||
      (typeof window !== "undefined" &&
        (localStorage.getItem("jt_admin_logged_in") === "true" ||
          !!localStorage.getItem("jt_admin_token")));
    setIsAdminUser(!!isAdm);
  }, [profile, role]);

  // Fetch product purchase costs for Admin
  useEffect(() => {
    if (!isAdminUser || cartItems.length === 0) return;
    const fetchCosts = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/products?limit=100`, {
          headers: getAuthHeaders(),
        });
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : data.products || [];
          const map = {};
          list.forEach((p) => {
            map[p._id] = p;
          });
          setProductDetailsMap(map);
        }
      } catch (e) {
        console.error("Cost fetch error:", e);
      }
    };
    fetchCosts();
  }, [isAdminUser, cartItems.length]);

  const [formData, setFormData] = useState({
    customerName: "",
    customerEmail: "",
    phone: "",
    address: "",
    note: "",
  });

  useEffect(() => {
    if ((profile || user) && !isAdminUser) {
      setFormData((prev) => ({
        ...prev,
        customerName: prev.customerName || profile?.name || user?.displayName || "",
        customerEmail: prev.customerEmail || profile?.email || user?.email || "",
        phone: prev.phone || profile?.phone || "",
        address: prev.address || profile?.address || "",
      }));
    }
  }, [profile, user, isAdminUser]);

  const clearCustomerForm = () => {
    setFormData({
      customerName: "",
      customerEmail: "",
      phone: "",
      address: "",
      note: "",
    });
  };

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

  const unitPrice = (item) => {
    const base = Number(item.offerPrice ?? item.price ?? 0);
    if (item.isCampusSpecial) return base;
    if (activeCoupon) {
      const pct = Number(item.campusDiscountPct || 0) > 0 ? Number(item.campusDiscountPct) : 7;
      return Math.max(1, Math.round(base * (1 - pct / 100)));
    }
    return base;
  };

  const getItemPrice = (item) => {
    if (isAdminUser && customPrices[item._id] !== undefined && customPrices[item._id] !== "") {
      return Math.max(0, Number(customPrices[item._id]) || 0);
    }
    return unitPrice(item);
  };

  const handleCustomPriceChange = (id, val) => {
    setCustomPrices((prev) => ({
      ...prev,
      [id]: val === "" ? "" : Math.max(0, Number(val) || 0),
    }));
  };

  const subtotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + getItemPrice(item) * (item.quantity || 1), 0),
    [cartItems, customPrices, isAdminUser]
  );

  const isUrgent = isInsideDhaka && deliveryType === "urgent";
  const baseCharge = isUrgent ? 250 : isInsideDhaka ? 70 : 130;
  const freeApplied =
    !isUrgent &&
    rates.freeDeliveryThreshold > 0 &&
    subtotal >= rates.freeDeliveryThreshold;

  const defaultDeliveryCharge = freeApplied ? 0 : baseCharge;

  const deliveryCharge =
    isAdminUser && customDeliveryCharge !== "" && !isNaN(Number(customDeliveryCharge))
      ? Math.max(0, Number(customDeliveryCharge))
      : defaultDeliveryCharge;

  const discountVal = isAdminUser ? Math.max(0, Number(adminDiscount) || 0) : 0;
  const commissionVal = isAdminUser ? Math.max(0, Number(commission) || 0) : 0;

  const total = Math.max(0, subtotal + deliveryCharge - discountVal);

  const totalCost = useMemo(() => {
    return cartItems.reduce((sum, item) => {
      const cost = Number(
        productDetailsMap[item._id]?.purchasePrice ??
        item.purchasePrice ??
        item.costAtSale ??
        0
      );
      return sum + cost * (item.quantity || 1);
    }, 0);
  }, [cartItems, productDetailsMap]);

  const estimatedProfit = useMemo(() => {
    return subtotal - totalCost - discountVal - commissionVal;
  }, [subtotal, totalCost, discountVal, commissionVal]);

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
    if (!Number.isFinite(total) || total < 0) {
      setError("দামে সমস্যা হয়েছে, কার্ট রিফ্রেশ করুন");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const adminToken = typeof window !== "undefined" ? localStorage.getItem("jt_admin_token") : null;
      let firebaseToken = null;
      try {
        firebaseToken = await getIdToken();
      } catch (_) {}
      const token = adminToken || firebaseToken;

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
          discount: discountVal,
          commission: commissionVal,
          commissionNote: commissionNote.trim(),
          firebaseUid: user?.uid || null,
          couponCode: activeCoupon?.code || undefined,
          campusName: activeCoupon?.campus || undefined,
          items: cartItems.map((item) => ({
            productId: item._id,
            quantity: item.quantity || 1,
            price:
              isAdminUser && customPrices[item._id] !== undefined && customPrices[item._id] !== ""
                ? Number(customPrices[item._id])
                : undefined,
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
      const couponParam = activeCoupon?.code ? `&coupon=${encodeURIComponent(activeCoupon.code)}` : "";
      router.push(`/order/success?id=${orderId}&no=${orderNo}&total=${orderTotal}${couponParam}`);
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
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <h3 style={{ margin: 0 }}>Your Order ({cartItems.length} items)</h3>
                  {isAdminUser && (
                    <span style={{
                      background: "linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)",
                      color: "#fff",
                      fontSize: "11px",
                      fontWeight: "800",
                      padding: "3px 9px",
                      borderRadius: "6px",
                      boxShadow: "0 2px 6px rgba(225, 29, 72, 0.3)",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px"
                    }}>
                      👑 ADMIN CHECKOUT
                    </span>
                  )}
                </div>

                <p style={{ textAlign: "left", marginTop: 0, marginBottom: "16px", fontSize: "14px", color: "#64748b" }}>
                  {isAdminUser
                    ? "অ্যাডমিন প্যানেল থেকে অর্ডার কাটছেন। নিচে পণ্যের দাম, ডিসকাউন্ট ও কমিশন পরিবর্তন করতে পারেন।"
                    : "Review your selected products before placing the order."}
                </p>

                {/* Admin Mode Informational Banner */}
                {isAdminUser && (
                  <div style={{
                    background: "linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)",
                    border: "1.5px solid #fecdd3",
                    borderRadius: "10px",
                    padding: "10px 14px",
                    marginBottom: "16px",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "10px",
                    boxShadow: "0 2px 8px rgba(225, 29, 72, 0.08)"
                  }}>
                    <span style={{ fontSize: "20px", lineHeight: "1" }}>💡</span>
                    <div>
                      <strong style={{ fontSize: "13px", color: "#9f1239", display: "block" }}>
                        কাস্টম প্রাইস ও কমিশন মোড সক্রিয়
                      </strong>
                      <span style={{ fontSize: "11px", color: "#be123c", lineHeight: "1.5" }}>
                        ম্যাসেঞ্জার বা পরিচিত কাস্টমারদের স্পেশাল ছাড়ে পণ্য দিতে সরাসরি দাম এডিট করুন। অন্য কেউ বিক্রি করে দিলে কমিশন বসাতে পারেন (যা ইনভয়েসে প্রিন্ট হবে না)।
                      </span>
                    </div>
                  </div>
                )}

                {activeCoupon && (
                  <div style={{
                    background: "linear-gradient(135deg, #fff0f3, #ffe4e8)",
                    border: `1.5px solid ${activeCoupon.tagColor || "#f43f5e"}`,
                    borderRadius: "12px",
                    padding: "12px 16px",
                    marginBottom: "16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "10px"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ fontSize: "22px" }}>🎓</span>
                      <div>
                        <strong style={{ fontSize: "14px", color: "#0f172a", display: "block" }}>
                          {activeCoupon.campus} ({activeCoupon.short}) Privilege Applied!
                        </strong>
                        <span style={{ fontSize: "12px", color: "#e11d48", fontWeight: "700" }}>
                          ✓ Voucher {activeCoupon.code}: Special Campus Student Discount Active
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={removeCampusCoupon}
                      style={{ fontSize: "11px", color: "#64748b", background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "6px", padding: "4px 8px", cursor: "pointer", fontWeight: "700" }}
                    >
                      ✕ Remove
                    </button>
                  </div>
                )}

                <div className="jt-checkout-items-list">
                  {cartItems.map((item) => {
                    const itemRegularPrice = unitPrice(item);
                    const currentItemPrice = getItemPrice(item);
                    const itemCost = Number(
                      productDetailsMap[item._id]?.purchasePrice ??
                      item.purchasePrice ??
                      item.costAtSale ??
                      0
                    );
                    const unitProfit = currentItemPrice - itemCost;
                    const rowTotal = currentItemPrice * (item.quantity || 1);

                    return (
                      <div
                        key={item._id}
                        className="jt-checkout-item"
                        style={{
                          flexDirection: "column",
                          alignItems: "stretch",
                          gap: "8px",
                          padding: "12px 14px",
                          borderRadius: "10px",
                          border: "1px solid #e2e8f0",
                          marginBottom: "10px",
                          background: "#ffffff"
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
                          <div style={{ flex: 1 }}>
                            <strong style={{ fontSize: "14px", color: "#0f172a" }}>{item.name}</strong>
                            <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#64748b" }}>
                              {item.quantity || 1} পিস × {currentItemPrice} Tk
                              {currentItemPrice !== itemRegularPrice && (
                                <span style={{ textDecoration: "line-through", marginLeft: "6px", color: "#94a3b8" }}>
                                  ({itemRegularPrice} Tk)
                                </span>
                              )}
                            </p>
                          </div>
                          <strong style={{ fontSize: "14px", color: "#0f172a", whiteSpace: "nowrap" }}>
                            {rowTotal.toLocaleString()} Tk
                          </strong>
                        </div>

                        {/* Admin Inline Price Editor */}
                        {isAdminUser && (
                          <div
                            style={{
                              background: "#f8fafc",
                              border: "1px dashed #cbd5e1",
                              borderRadius: "8px",
                              padding: "8px 10px",
                              display: "flex",
                              flexWrap: "wrap",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: "8px",
                              marginTop: "4px"
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <label style={{ fontSize: "11px", fontWeight: "700", color: "#334155" }}>
                                🏷️ বিক্রয় মূল্য:
                              </label>
                              <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                                <span style={{ fontSize: "12px", fontWeight: "700", color: "#64748b" }}>Tk</span>
                                <input
                                  type="number"
                                  min="0"
                                  value={customPrices[item._id] !== undefined ? customPrices[item._id] : itemRegularPrice}
                                  onChange={(e) => handleCustomPriceChange(item._id, e.target.value)}
                                  placeholder={String(itemRegularPrice)}
                                  style={{
                                    width: "85px",
                                    padding: "4px 8px",
                                    borderRadius: "6px",
                                    border: itemCost > 0 && unitProfit < 0 ? "2px solid #ef4444" : "1.5px solid #cbd5e1",
                                    fontWeight: "800",
                                    fontSize: "13px",
                                    color: "#0f172a",
                                    background: "#ffffff"
                                  }}
                                />
                              </div>
                            </div>

                            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px", fontSize: "11px" }}>
                              {itemCost > 0 && (
                                <span style={{ background: "#dcfce7", color: "#15803d", fontWeight: "800", padding: "2px 6px", borderRadius: "4px", border: "1px solid #bbf7d0" }}>
                                  💰 কেনা: ৳{itemCost}
                                </span>
                              )}
                              {itemCost > 0 && (
                                <span
                                  style={{
                                    background: unitProfit >= 0 ? "#eff6ff" : "#fef2f2",
                                    color: unitProfit >= 0 ? "#1d4ed8" : "#dc2626",
                                    fontWeight: "800",
                                    padding: "2px 6px",
                                    borderRadius: "4px",
                                    border: unitProfit >= 0 ? "1px solid #bfdbfe" : "1px solid #fecaca"
                                  }}
                                >
                                  {unitProfit >= 0 ? `লাভ: +৳${unitProfit * (item.quantity || 1)}` : `⚠️ লস: -৳${Math.abs(unitProfit * (item.quantity || 1))}`}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Admin Delivery, Discount & Commission Box */}
                {isAdminUser && (
                  <div
                    style={{
                      marginTop: "16px",
                      marginBottom: "16px",
                      background: "#ffffff",
                      border: "1.5px solid #fed7aa",
                      borderRadius: "12px",
                      padding: "16px",
                      boxShadow: "0 2px 10px rgba(249, 115, 22, 0.08)"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px", borderBottom: "1px solid #fed7aa", paddingBottom: "8px" }}>
                      <h4 style={{ margin: 0, fontSize: "13px", color: "#9a3412", fontWeight: "800", display: "flex", alignItems: "center", gap: "6px" }}>
                        <span>⚡</span> ডেলিভারি চার্জ, স্পেশাল ডিসকাউন্ট ও কমিশন
                      </h4>
                      <span style={{ fontSize: "10px", fontWeight: "800", background: "#ffedd5", color: "#c2410c", padding: "2px 7px", borderRadius: "4px" }}>
                        ADMIN CONTROLS
                      </span>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "12px" }}>
                      {/* Delivery Charge */}
                      <div>
                        <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#475569", marginBottom: "4px" }}>
                          🚚 ডেলিভারি চার্জ (Tk):
                        </label>
                        <input
                          type="number"
                          min="0"
                          placeholder={String(defaultDeliveryCharge)}
                          value={customDeliveryCharge}
                          onChange={(e) => setCustomDeliveryCharge(e.target.value)}
                          style={{
                            width: "100%",
                            padding: "8px 10px",
                            borderRadius: "6px",
                            border: "1px solid #cbd5e1",
                            fontSize: "13px",
                            fontWeight: "700"
                          }}
                        />
                        <div style={{ display: "flex", gap: "4px", marginTop: "4px" }}>
                          <button
                            type="button"
                            onClick={() => setCustomDeliveryCharge("0")}
                            style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "4px", background: "#f1f5f9", border: "1px solid #cbd5e1", cursor: "pointer", fontWeight: "700", color: "#047857" }}
                          >
                            0 Tk (ফ্রি)
                          </button>
                          <button
                            type="button"
                            onClick={() => setCustomDeliveryCharge("70")}
                            style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "4px", background: "#f1f5f9", border: "1px solid #cbd5e1", cursor: "pointer", fontWeight: "600" }}
                          >
                            70 Tk
                          </button>
                          <button
                            type="button"
                            onClick={() => setCustomDeliveryCharge("130")}
                            style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "4px", background: "#f1f5f9", border: "1px solid #cbd5e1", cursor: "pointer", fontWeight: "600" }}
                          >
                            130 Tk
                          </button>
                        </div>
                      </div>

                      {/* Special Discount */}
                      <div>
                        <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#475569", marginBottom: "4px" }}>
                          🎁 বিশেষ ছাড় / ডিসকাউন্ট (Tk):
                        </label>
                        <input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={adminDiscount}
                          onChange={(e) => setAdminDiscount(e.target.value)}
                          style={{
                            width: "100%",
                            padding: "8px 10px",
                            borderRadius: "6px",
                            border: "1px solid #cbd5e1",
                            fontSize: "13px",
                            fontWeight: "700",
                            color: "#e11d48"
                          }}
                        />
                        <span style={{ fontSize: "10px", color: "#64748b", display: "block", marginTop: "4px" }}>
                          বিল থেকে এই টাকা সরাসরি বাদ যাবে
                        </span>
                      </div>

                      {/* Sales Commission */}
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                          <label style={{ fontSize: "11px", fontWeight: "700", color: "#b45309" }}>
                            🤝 বিক্রয় কমিশন (Tk):
                          </label>
                          <span style={{ fontSize: "9px", color: "#dc2626", fontWeight: "800", background: "#fef2f2", padding: "1px 5px", borderRadius: "4px", border: "1px solid #fecaca" }}>
                            🔒 ইনভয়েসে যাবে না
                          </span>
                        </div>
                        <input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={commission}
                          onChange={(e) => setCommission(e.target.value)}
                          style={{
                            width: "100%",
                            padding: "8px 10px",
                            borderRadius: "6px",
                            border: "1.5px solid #f59e0b",
                            background: "#fffbeb",
                            fontSize: "13px",
                            fontWeight: "700",
                            color: "#92400e"
                          }}
                        />
                        <input
                          type="text"
                          placeholder="কার কমিশন / এজেন্ট নাম / নোট"
                          value={commissionNote}
                          onChange={(e) => setCommissionNote(e.target.value)}
                          style={{
                            width: "100%",
                            marginTop: "6px",
                            padding: "6px 10px",
                            borderRadius: "6px",
                            border: "1px solid #cbd5e1",
                            fontSize: "11px"
                          }}
                        />
                      </div>
                    </div>

                    <p style={{ margin: "12px 0 0", fontSize: "11px", color: "#64748b", borderTop: "1px dashed #fed7aa", paddingTop: "8px" }}>
                      🔒 <strong>গোপনীয়তার নিশ্চয়তা:</strong> কমিশন শুধুমাত্র আপনার নিট লাভ হিসাব এবং অভ্যন্তরীণ খরচের রেকর্ডের জন্য সংরক্ষিত থাকবে। কাস্টমারের প্রিন্ট ইনভয়েস বা রসিদে এটি কখনো দৃশ্যমান বা প্রিন্ট হবে না।
                    </p>
                  </div>
                )}

                {/* Summary Box */}
                <div className="jt-summary-box">
                  <p>Subtotal: <strong>{subtotal} Tk</strong></p>
                  <p>
                    Delivery:{" "}
                    <strong>{deliveryCharge === 0 ? "Free 🎉 (0 Tk)" : `${deliveryCharge} Tk`}</strong>
                  </p>
                  {discountVal > 0 && (
                    <p style={{ color: "#e11d48" }}>
                      Discount: <strong>-৳{discountVal} Tk</strong>
                    </p>
                  )}
                  {isAdminUser && commissionVal > 0 && (
                    <p style={{ color: "#d97706", fontSize: "13px" }}>
                      কমিশন খরচ (গোপন): <strong>-৳{commissionVal} Tk</strong>
                    </p>
                  )}
                  <p className="jt-summary-total">Total: <strong>{total} Tk</strong></p>
                  {rates.freeDeliveryThreshold > 0 && !freeApplied && !isUrgent && !isAdminUser && (
                    <p style={{ fontSize: "13px", color: "#059669" }}>
                      আর {rates.freeDeliveryThreshold - subtotal} Tk কিনলেই ডেলিভারি ফ্রি!
                    </p>
                  )}

                  {/* Real-time Net Profit Estimation for Admin */}
                  {isAdminUser && (
                    <div
                      style={{
                        marginTop: "12px",
                        paddingTop: "10px",
                        borderTop: "1px dashed #cbd5e1",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                      }}
                    >
                      <span style={{ fontSize: "12px", fontWeight: "700", color: "#475569" }}>
                        ✨ এই অর্ডারে আনুমানিক নিট লাভ:
                      </span>
                      <strong
                        style={{
                          fontSize: "14px",
                          color: estimatedProfit >= 0 ? "#16a34a" : "#dc2626"
                        }}
                      >
                        {estimatedProfit >= 0 ? `+৳${estimatedProfit.toLocaleString()}` : `-৳${Math.abs(estimatedProfit).toLocaleString()} (লস)`}
                      </strong>
                    </div>
                  )}
                </div>
              </div>

              <div className="jt-checkout-right">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <h3 style={{ margin: 0 }}>Customer & Delivery Details</h3>
                  {isAdminUser && (
                    <button
                      type="button"
                      onClick={clearCustomerForm}
                      style={{
                        background: "#f1f5f9",
                        border: "1px solid #cbd5e1",
                        borderRadius: "6px",
                        padding: "4px 8px",
                        fontSize: "11px",
                        fontWeight: "700",
                        color: "#475569",
                        cursor: "pointer"
                      }}
                    >
                      🔄 ফর্ম ক্লিয়ার করুন
                    </button>
                  )}
                </div>
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