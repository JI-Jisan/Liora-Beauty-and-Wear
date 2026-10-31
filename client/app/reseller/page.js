"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MobileBottomNav from "@/components/MobileBottomNav";
import { useAuth, getIdToken } from "@/components/AuthProvider";
import { API_BASE_URL, getImageUrl } from "@/lib/api";

export default function ResellerPage() {
  const { user, role, isReseller, isAdmin, profile } = useAuth();

  const [walletData, setWalletData] = useState({
    walletBalance: 0,
    resellerStoreName: "",
    resellerStorePhone: "",
    ordersCount: 0,
    pendingProfit: 0,
    totalEarned: 0,
    orders: [],
    ledger: [],
  });
  const [loadingWallet, setLoadingWallet] = useState(true);

  // Products for dropship order builder
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productSearch, setProductSearch] = useState("");

  // Dropship Order Form State
  const [dropshipForm, setDropshipForm] = useState({
    customerName: "",
    phone: "",
    district: "Dhaka",
    address: "",
    note: "",
    customerCodAmount: "",
    qty: 1,
  });
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderMessage, setOrderMessage] = useState("");
  const [orderError, setOrderError] = useState("");

  // Payout Request Modal State
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [payoutForm, setPayoutForm] = useState({
    amount: "",
    payoutMethod: "bKash",
    payoutAccount: "",
    note: "",
  });
  const [submittingPayout, setSubmittingPayout] = useState(false);
  const [payoutSuccess, setPayoutSuccess] = useState("");
  const [payoutError, setPayoutError] = useState("");

  // Application Form for Non-Resellers
  const [applyForm, setApplyForm] = useState({
    storeName: "",
    name: "",
    email: "",
    phone: "",
    fbPageLink: "",
    note: "",
  });
  const [applying, setApplying] = useState(false);
  const [applyDone, setApplyDone] = useState(false);
  const [applyErr, setApplyErr] = useState("");

  const isApproved = isReseller || isAdmin;

  // Load Reseller Wallet & Orders
  const loadWallet = async () => {
    try {
      setLoadingWallet(true);
      const token = await getIdToken();
      if (!token) return;

      const res = await fetch("/api/reseller/wallet", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setWalletData(data);
      }
    } catch (e) {
      console.error("Wallet load error:", e);
    } finally {
      setLoadingWallet(false);
    }
  };

  useEffect(() => {
    if (user && isApproved) {
      loadWallet();
    }
  }, [user, isApproved]);

  useEffect(() => {
    if (profile) {
      setApplyForm((prev) => ({
        ...prev,
        name: profile.name || prev.name || "",
        email: profile.email || user?.email || prev.email || "",
        phone: profile.phone || prev.phone || "",
        storeName: profile.resellerStoreName || profile.businessName || prev.storeName || "",
      }));
    } else if (user) {
      setApplyForm((prev) => ({
        ...prev,
        email: user.email || prev.email || "",
        name: user.displayName || prev.name || "",
      }));
    }
  }, [profile, user]);

  // Reseller dynamic margin rates: Standard 8% vs Weekly Star 10%
  const isWeeklyStar = Boolean(walletData?.isWeeklyStar || profile?.isWeeklyStar);
  const currentMarginDiscountPct = isWeeklyStar ? 10 : 8;
  const discountMultiplier = isWeeklyStar ? 0.90 : 0.92;

  // Load Products
  useEffect(() => {
    async function fetchProducts() {
      try {
        setLoadingProducts(true);
        const res = await fetch(`${API_BASE_URL}/api/products?limit=100`);
        const data = await res.json();
        const list = Array.isArray(data?.products) ? data.products : Array.isArray(data) ? data : [];
        setProducts(list);
        if (list.length > 0) {
          setSelectedProduct(list[0]);
          const ret = Number(list[0].offerPrice || list[0].originalPrice || 200);
          setDropshipForm((prev) => ({
            ...prev,
            customerCodAmount: ret + (prev.district === "Dhaka" ? 80 : 130),
          }));
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingProducts(false);
      }
    }
    fetchProducts();
  }, []);

  // Filtered Products for picker
  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products.slice(0, 30);
    const q = productSearch.trim().toLowerCase();
    return products.filter(
      (p) =>
        (p.name || "").toLowerCase().includes(q) ||
        (p.brand?.name || "").toLowerCase().includes(q)
    );
  }, [products, productSearch]);

  // Live profit calculation
  const deliveryCharge = dropshipForm.district === "Dhaka" ? 80 : 130;
  const unitResellerCost = selectedProduct
    ? Number(
        selectedProduct.resellerPrice > 0
          ? selectedProduct.resellerPrice
          : Math.round(Number(selectedProduct.offerPrice || selectedProduct.originalPrice || 100) * discountMultiplier)
      )
    : 0;
  const totalCost = unitResellerCost * (Number(dropshipForm.qty) || 1);
  const codAmount = Number(dropshipForm.customerCodAmount) || 0;
  const netProfit = Math.max(0, codAmount - totalCost - deliveryCharge);

  const handleSelectProduct = (p) => {
    setSelectedProduct(p);
    const ret = Number(p.offerPrice || p.originalPrice || 200);
    setDropshipForm((prev) => ({
      ...prev,
      customerCodAmount: ret * prev.qty + (prev.district === "Dhaka" ? 80 : 130),
    }));
  };

  const handlePlaceDropshipOrder = async (e) => {
    e.preventDefault();
    if (!selectedProduct) return;

    if (codAmount < totalCost + deliveryCharge) {
      alert("⚠️ কাস্টমার কালেকশন (COD) অ্যামাউন্ট অবশ্যই প্রডাক্টের দাম ও কুরিয়ার চার্জের চেয়ে বেশি হতে হবে।");
      return;
    }

    try {
      setPlacingOrder(true);
      setOrderMessage("");
      setOrderError("");

      const token = await getIdToken();
      const payload = {
        orderType: "reseller",
        isReseller: true,
        customerName: dropshipForm.customerName,
        phone: dropshipForm.phone,
        district: dropshipForm.district,
        address: dropshipForm.address,
        note: dropshipForm.note,
        customerCodAmount: codAmount,
        storeName: walletData.resellerStoreName || profile?.resellerStoreName || "Official Reseller",
        storePhone: walletData.resellerStorePhone || profile?.resellerStorePhone || profile?.phone || "",
        items: [
          {
            productId: selectedProduct._id,
            quantity: Number(dropshipForm.qty) || 1,
            price: unitResellerCost,
          },
        ],
        deliveryCharge,
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "অর্ডার প্লেস করা যায়নি");

      setOrderMessage(`🎉 ড্রপশিপ অর্ডার #${data.orderNumber} সফলভাবে গ্রহণ করা হয়েছে! পার্সেলটি ডেলিভারি হলে ৳${netProfit} সরাসরি আপনার ওয়ালেটে জমা হবে।`);
      setDropshipForm({
        customerName: "",
        phone: "",
        district: "Dhaka",
        address: "",
        note: "",
        customerCodAmount: "",
        qty: 1,
      });
      loadWallet();
    } catch (err) {
      setOrderError(err.message);
    } finally {
      setPlacingOrder(false);
    }
  };

  const handlePayoutSubmit = async (e) => {
    e.preventDefault();
    const amt = Number(payoutForm.amount);
    if (!amt || amt < 300) {
      setPayoutError("নূন্যতম ৩০০ টাকা ক্যাশআউট রিকোয়েস্ট করতে হবে");
      return;
    }

    try {
      setSubmittingPayout(true);
      setPayoutError("");
      setPayoutSuccess("");

      const token = await getIdToken();
      const res = await fetch("/api/reseller/wallet", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payoutForm),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "ক্যাশআউট রিকোয়েস্ট ব্যর্থ হয়েছে");

      setPayoutSuccess(data.message);
      setIsPayoutModalOpen(false);
      loadWallet();
    } catch (err) {
      setPayoutError(err.message);
    } finally {
      setSubmittingPayout(false);
    }
  };

  const handleApplyReseller = async (e) => {
    e.preventDefault();
    try {
      setApplying(true);
      setApplyErr("");
      let token = null;
      try {
        token = await getIdToken();
      } catch {}

      const res = await fetch("/api/wholesale/apply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          ...applyForm,
          businessName: applyForm.storeName,
          role: "reseller",
          ...(user?.uid ? { firebaseUid: user.uid } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "আবেদন ব্যর্থ হয়েছে");
      setApplyDone(true);
    } catch (err) {
      setApplyErr(err.message);
    } finally {
      setApplying(false);
    }
  };

  return (
    <div style={{ background: "#fcf8f9", minHeight: "100vh", paddingBottom: 80 }}>
      <Header />

      {/* Hero Section */}
      <section
        style={{
          background: "linear-gradient(135deg, #fff1f2 0%, #fecdd3 50%, #fda4af 100%)",
          borderBottom: "1px solid #fecdd3",
          padding: "clamp(26px, 5vw, 44px) 16px",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 880, margin: "0 auto" }}>
          <span
            style={{
              background: "#9f1239",
              color: "#fff",
              padding: "4px 14px",
              borderRadius: 50,
              fontSize: 11.5,
              fontWeight: 800,
              letterSpacing: 0.5,
              textTransform: "uppercase",
              display: "inline-block",
              marginBottom: 10,
            }}
          >
            LIORA Reseller Network (50+ Program)
          </span>
          <h1
            style={{
              margin: 0,
              fontSize: "clamp(24px, 5vw, 36px)",
              fontWeight: 900,
              color: "#881337",
              lineHeight: 1.25,
            }}
          >
            শূন্য পুঁজিতে আপনার নিজস্ব বিউটি বিজনেস
          </h1>
          <p style={{ margin: "10px auto 0", fontSize: 14, color: "#4c0519", maxWidth: 640, lineHeight: 1.6 }}>
            আপনি বিক্রি করবেন আপনার নামে ও ফেসবুক পেজে, প্যাকিং ও ডেলিভারি করবে LIORA! কোনো স্টক রাখতে হবে না। প্রতিটি ডেলিভারিতে
            কমিশন সরাসরি আপনার ওয়ালেটে জমা হবে।
          </p>
        </div>
      </section>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "20px 14px" }}>
        {/* If Logged in and Approved as Reseller */}
        {isApproved ? (
          <>
            {/* VIP Star Club & Squad Leader Status Banner */}
            <div
              style={{
                background: isWeeklyStar
                  ? "linear-gradient(135deg, #78350f 0%, #b45309 50%, #d97706 100%)"
                  : "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
                color: "#fff",
                borderRadius: 16,
                padding: "20px 24px",
                marginBottom: 20,
                boxShadow: isWeeklyStar ? "0 8px 24px rgba(217, 119, 6, 0.25)" : "0 4px 14px rgba(0,0,0,0.06)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 16,
              }}
            >
              <div style={{ flex: 1, minWidth: 260 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 24 }}>{isWeeklyStar ? "⭐" : "🚀"}</span>
                  <h2 style={{ margin: 0, fontSize: "clamp(17px, 3.5vw, 20px)", fontWeight: 900 }}>
                    {isWeeklyStar ? "VIP Star Performer of the Week" : "Standard Reseller Tier"}
                  </h2>
                  <span
                    style={{
                      background: isWeeklyStar ? "#fef3c7" : "#334155",
                      color: isWeeklyStar ? "#b45309" : "#e2e8f0",
                      fontSize: 11.5,
                      fontWeight: 900,
                      padding: "4px 12px",
                      borderRadius: 20,
                      letterSpacing: 0.3,
                    }}
                  >
                    {isWeeklyStar ? "⭐ 10% OFF RETAIL ACTIVE" : "⚪ 8% BASE MARGIN"}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: 13, color: isWeeklyStar ? "#fef3c7" : "#94a3b8", lineHeight: 1.5 }}>
                  {isWeeklyStar
                    ? "অভিনন্দন! আপনার সেলস পারফরম্যান্সের কারণে আপনি এই সপ্তাহের Star Club-এ অন্তর্ভুক্ত হয়েছেন। রিটেইল থেকে ১০% কমে প্রোডাক্ট কিনে অধিক প্রফিট উপভোগ করুন!"
                    : "আপনার বর্তমান বেস মার্জিন ৮%। চলতি সপ্তাহে বেশি সেল দিলে অথবা টিম লিডারের রিকমেন্ডেশনে আপনি পাবেন '⭐ 10% Star Club' বুস্টার সুযোগ!"}
                </p>
              </div>

              <div
                style={{
                  background: "rgba(255,255,255,0.12)",
                  backdropFilter: "blur(4px)",
                  padding: "12px 18px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.2)",
                  minWidth: 200,
                }}
              >
                <div style={{ fontSize: 11, color: isWeeklyStar ? "#fde68a" : "#cbd5e1", fontWeight: 700 }}>
                  👑 অ্যাসাইনড টিম লিডার (Squad)
                </div>
                <div style={{ fontSize: 14, fontWeight: 900, color: "#fff", marginTop: 2 }}>
                  {walletData.teamLeaderName || walletData.teamLeaderEmail ? `${walletData.teamLeaderName || walletData.teamLeaderEmail}` : "Liora Headquarter"}
                </div>
                <div style={{ fontSize: 10.5, color: isWeeklyStar ? "#fed7aa" : "#94a3b8", marginTop: 2 }}>
                  {isWeeklyStar ? "Star Performer Marked" : "Standard Squad"}
                </div>
              </div>
            </div>

            {/* Reseller KPI Bar */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
                gap: 14,
                marginBottom: 24,
              }}
            >
              <div
                style={{
                  background: "linear-gradient(135deg, #ffffff, #fff1f2)",
                  padding: "16px 18px",
                  borderRadius: 14,
                  border: "1.5px solid #fecdd3",
                  boxShadow: "0 4px 12px rgba(190, 18, 60, 0.05)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#9f1239" }}>Available Wallet Balance</span>
                  <span style={{ fontSize: 20 }}>💰</span>
                </div>
                <div style={{ fontSize: 28, fontWeight: 900, color: "#881337", marginTop: 4 }}>
                  ৳{Number(walletData.walletBalance || 0).toLocaleString()}
                </div>
                <button
                  type="button"
                  onClick={() => setIsPayoutModalOpen(true)}
                  style={{
                    marginTop: 8,
                    background: "#be123c",
                    color: "#fff",
                    border: "none",
                    padding: "6px 14px",
                    borderRadius: 6,
                    fontSize: 11.5,
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  💸 Request Payout (বিকাশ/নগদ)
                </button>
              </div>

              <div
                style={{
                  background: "#ffffff",
                  padding: "16px 18px",
                  borderRadius: 14,
                  border: "1px solid #e2e8f0",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#64748b" }}>Pending Delivery Profit</span>
                  <span style={{ fontSize: 20 }}>⏳</span>
                </div>
                <div style={{ fontSize: 28, fontWeight: 900, color: "#d97706", marginTop: 4 }}>
                  ৳{Number(walletData.pendingProfit || 0).toLocaleString()}
                </div>
                <span style={{ fontSize: 11, color: "#b45309" }}>পার্সেল ডেলিভারি হলেই ব্যালেন্সে যোগ হবে</span>
              </div>

              <div
                style={{
                  background: "#ffffff",
                  padding: "16px 18px",
                  borderRadius: 14,
                  border: "1px solid #e2e8f0",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#64748b" }}>Total Dropship Orders</span>
                  <span style={{ fontSize: 20 }}>📦</span>
                </div>
                <div style={{ fontSize: 28, fontWeight: 900, color: "#0f172a", marginTop: 4 }}>
                  {walletData.ordersCount || 0}
                </div>
                <span style={{ fontSize: 11, color: "#059669", fontWeight: 700 }}>
                  মোট আয়: ৳{Number(walletData.totalEarned || 0).toLocaleString()}
                </span>
              </div>

              <div
                style={{
                  background: "#ffffff",
                  padding: "16px 18px",
                  borderRadius: 14,
                  border: "1px solid #e2e8f0",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#64748b" }}>Your Store Name on Label</span>
                  <span style={{ fontSize: 20 }}>🏷️</span>
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", marginTop: 8 }}>
                  {walletData.resellerStoreName || profile?.resellerStoreName || "Official Reseller"}
                </div>
                <span style={{ fontSize: 11, color: "#64748b" }}>হোয়াইট-লেবেল চালানে এই নাম থাকবে</span>
              </div>
            </div>

            {/* Dropship Order Generator */}
            <div
              style={{
                background: "#ffffff",
                borderRadius: 16,
                border: "1.5px solid #fecdd3",
                padding: "22px 20px",
                marginBottom: 28,
                boxShadow: "0 6px 20px rgba(190, 18, 60, 0.04)",
              }}
            >
              <div style={{ marginBottom: 16 }}>
                <span style={{ background: "#be123c", color: "#fff", padding: "3px 10px", borderRadius: 4, fontSize: 11, fontWeight: 800 }}>
                  STEP 1
                </span>
                <h2 style={{ margin: "6px 0 2px", fontSize: 18, fontWeight: 900, color: "#881337" }}>
                  🚀 গ্রাহকের জন্য নতুন ড্রপশিপ পার্সেল বুকিং করুন
                </h2>
                <p style={{ margin: 0, fontSize: 12.5, color: "#64748b" }}>
                  প্রোডাক্ট সিলেক্ট করুন, আপনার কাঙ্ক্ষিত বিক্রয়মূল্য (COD) দিন এবং কাস্টমারের ঠিকানা প্রদান করুন।
                </p>
              </div>

              {orderMessage && (
                <div style={{ background: "#ecfdf5", border: "1px solid #10b981", color: "#065f46", padding: "12px 14px", borderRadius: 8, fontSize: 13, marginBottom: 14 }}>
                  {orderMessage}
                </div>
              )}
              {orderError && (
                <div style={{ background: "#fee2e2", border: "1px solid #f87171", color: "#b91c1c", padding: "12px 14px", borderRadius: 8, fontSize: 13, marginBottom: 14 }}>
                  ⚠️ {orderError}
                </div>
              )}

              <form onSubmit={handlePlaceDropshipOrder}>
                {/* Product Selection */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                    প্রোডাক্ট নির্বাচন করুন *
                  </label>
                  <input
                    type="text"
                    placeholder="পণ্য সার্চ করুন..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: "1px solid #cbd5e1",
                      fontSize: 12.5,
                      marginBottom: 8,
                      boxSizing: "border-box",
                    }}
                  />
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      overflowX: "auto",
                      paddingBottom: 8,
                    }}
                  >
                    {filteredProducts.slice(0, 15).map((p) => {
                      const isSel = selectedProduct?._id === p._id;
                      const resCost = Number(
                        p.resellerPrice > 0
                          ? p.resellerPrice
                          : Math.round((p.offerPrice || p.originalPrice || 100) * discountMultiplier)
                      );
                      return (
                        <div
                          key={p._id}
                          onClick={() => handleSelectProduct(p)}
                          style={{
                            minWidth: 160,
                            maxWidth: 160,
                            padding: 8,
                            borderRadius: 10,
                            border: isSel ? "2px solid #be123c" : "1px solid #e2e8f0",
                            background: isSel ? "#fff1f2" : "#fff",
                            cursor: "pointer",
                            flexShrink: 0,
                          }}
                        >
                          <img
                            src={getImageUrl(p.image)}
                            alt=""
                            style={{ width: "100%", height: 90, objectFit: "cover", borderRadius: 6, marginBottom: 4 }}
                          />
                          <div style={{ fontSize: 11.5, fontWeight: 700, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {p.name}
                          </div>
                          <div style={{ fontSize: 11, color: "#be123c", fontWeight: 800 }}>
                            Buy Rate: ৳{resCost} <span style={{ fontSize: 9.5, color: "#64748b" }}>({currentMarginDiscountPct}%)</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Live Profit Preview Card */}
                {selectedProduct && (
                  <div
                    style={{
                      background: "linear-gradient(135deg, #f8fafc, #fff1f2)",
                      border: "1.5px solid #fecdd3",
                      borderRadius: 12,
                      padding: "14px 18px",
                      marginBottom: 16,
                    }}
                  >
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, textAlign: "center" }}>
                      <div>
                        <span style={{ fontSize: 11, color: "#64748b" }}>
                          Liora Buy Rate ({currentMarginDiscountPct}% Off)
                        </span>
                        <div style={{ fontSize: 16, fontWeight: 900, color: "#be123c" }}>৳{unitResellerCost}</div>
                      </div>
                      <div>
                        <span style={{ fontSize: 11, color: "#64748b" }}>Recommended Retail</span>
                        <div style={{ fontSize: 16, fontWeight: 800, color: "#64748b" }}>
                          ৳{selectedProduct.offerPrice || selectedProduct.originalPrice}
                        </div>
                      </div>
                      <div>
                        <span style={{ fontSize: 11, color: "#64748b" }}>Courier Fee ({dropshipForm.district})</span>
                        <div style={{ fontSize: 16, fontWeight: 800, color: "#ea580c" }}>৳{deliveryCharge}</div>
                      </div>
                      <div style={{ background: "#dcfce7", padding: "6px 10px", borderRadius: 8 }}>
                        <span style={{ fontSize: 11, color: "#166534", fontWeight: 700 }}>Your Net Profit</span>
                        <div style={{ fontSize: 20, fontWeight: 900, color: "#15803d" }}>৳{netProfit}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Form Fields: COD Price & Customer Info */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
                      কাস্টমারের কাছে কালেকশন অ্যামাউন্ট (COD Price) *
                    </label>
                    <input
                      type="number"
                      required
                      placeholder="যেমন: 750"
                      value={dropshipForm.customerCodAmount}
                      onChange={(e) => setDropshipForm({ ...dropshipForm, customerCodAmount: e.target.value })}
                      style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 14, fontWeight: 800, color: "#be123c", boxSizing: "border-box" }}
                    />
                    <span style={{ fontSize: 11, color: "#64748b" }}>কুরিয়ার ম্যান কাস্টমার থেকে মোট এই টাকা কালেকশন করবে</span>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
                      পরিমাণ (Quantity)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={dropshipForm.qty}
                      onChange={(e) => setDropshipForm({ ...dropshipForm, qty: Math.max(1, Number(e.target.value)) })}
                      style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13, boxSizing: "border-box" }}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
                      কাস্টমারের নাম *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="ক্রেতার নাম"
                      value={dropshipForm.customerName}
                      onChange={(e) => setDropshipForm({ ...dropshipForm, customerName: e.target.value })}
                      style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13, boxSizing: "border-box" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
                      কাস্টমারের মোবাইল নম্বর *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="017XXXXXXXX"
                      value={dropshipForm.phone}
                      onChange={(e) => setDropshipForm({ ...dropshipForm, phone: e.target.value })}
                      style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13, boxSizing: "border-box" }}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
                      জেলা *
                    </label>
                    <select
                      value={dropshipForm.district}
                      onChange={(e) => setDropshipForm({ ...dropshipForm, district: e.target.value })}
                      style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13, background: "#f8fafc" }}
                    >
                      <option value="Dhaka">Dhaka (ঢাকা সিটি - কুরিয়ার ৳৮০)</option>
                      <option value="Outside Dhaka">Outside Dhaka (ঢাকার বাইরে - কুরিয়ার ৳১৩০)</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
                      অর্ডার নোট (ঐচ্ছিক)
                    </label>
                    <input
                      type="text"
                      placeholder="যেমন: বিকেলে ডেলিভারি করতে হবে"
                      value={dropshipForm.note}
                      onChange={(e) => setDropshipForm({ ...dropshipForm, note: e.target.value })}
                      style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13, boxSizing: "border-box" }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: 18 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
                    কাস্টমারের সম্পূর্ণ ডেলিভারি ঠিকানা *
                  </label>
                  <textarea
                    required
                    rows={2}
                    placeholder="বাড়ি, রাস্তা, এলাকা..."
                    value={dropshipForm.address}
                    onChange={(e) => setDropshipForm({ ...dropshipForm, address: e.target.value })}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13, boxSizing: "border-box" }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={placingOrder}
                  style={{
                    background: "linear-gradient(135deg, #be123c, #9f1239)",
                    color: "#fff",
                    border: "none",
                    padding: "13px 26px",
                    borderRadius: 10,
                    fontSize: 14,
                    fontWeight: 900,
                    cursor: placingOrder ? "not-allowed" : "pointer",
                    boxShadow: "0 4px 14px rgba(190, 18, 60, 0.25)",
                  }}
                >
                  {placingOrder ? "Booking Parcel..." : `🚀 Place Dropship Order (Earn ৳${netProfit})`}
                </button>
              </form>
            </div>

            {/* Orders & Ledger Tabs */}
            <div style={{ background: "#ffffff", borderRadius: 16, border: "1px solid #cbd5e1", overflow: "hidden" }}>
              <div style={{ padding: "14px 18px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "#0f172a" }}>
                  📦 আপনার ড্রপশিপ অর্ডার ও কমিশন হিস্ট্রি ({walletData.orders?.length || 0})
                </h3>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, textAlign: "left" }}>
                  <thead style={{ background: "#f1f5f9", borderBottom: "1px solid #e2e8f0" }}>
                    <tr>
                      <th style={{ padding: "10px 14px", fontWeight: 800 }}>Order #</th>
                      <th style={{ padding: "10px 14px", fontWeight: 800 }}>Customer Info</th>
                      <th style={{ padding: "10px 14px", fontWeight: 800 }}>Product</th>
                      <th style={{ padding: "10px 14px", fontWeight: 800, textAlign: "right" }}>Customer COD</th>
                      <th style={{ padding: "10px 14px", fontWeight: 800, textAlign: "right" }}>Your Profit</th>
                      <th style={{ padding: "10px 14px", fontWeight: 800, textAlign: "center" }}>Delivery Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingWallet ? (
                      <tr>
                        <td colSpan={6} style={{ padding: 24, textAlign: "center", color: "#64748b" }}>
                          লোড হচ্ছে...
                        </td>
                      </tr>
                    ) : walletData.orders?.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: 24, textAlign: "center", color: "#64748b" }}>
                          এখনো কোনো ড্রপশিপ অর্ডার নেই। উপরের ফর্ম দিয়ে প্রথম অর্ডার বুকিং করুন।
                        </td>
                      </tr>
                    ) : (
                      walletData.orders.map((ord) => (
                        <tr key={ord._id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "12px 14px", fontWeight: 800, color: "#0284c7" }}>
                            {ord.orderNumber}
                          </td>
                          <td style={{ padding: "12px 14px" }}>
                            <div style={{ fontWeight: 700, color: "#0f172a" }}>{ord.customerName}</div>
                            <div style={{ fontSize: 11, color: "#64748b" }}>📞 {ord.phone}</div>
                          </td>
                          <td style={{ padding: "12px 14px" }}>
                            {ord.items?.[0]?.productName || "Product"} (x{ord.items?.[0]?.quantity || 1})
                          </td>
                          <td style={{ padding: "12px 14px", textAlign: "right", fontWeight: 800 }}>
                            ৳{ord.resellerDetails?.customerCodAmount || ord.total}
                          </td>
                          <td style={{ padding: "12px 14px", textAlign: "right", fontWeight: 900, color: "#16a34a" }}>
                            ৳{ord.resellerDetails?.resellerProfit || 0}
                          </td>
                          <td style={{ padding: "12px 14px", textAlign: "center" }}>
                            <span
                              style={{
                                padding: "3px 8px",
                                borderRadius: 8,
                                fontSize: 10.5,
                                fontWeight: 800,
                                background:
                                  ord.status === "Delivered"
                                    ? "#dcfce7"
                                    : ord.status === "Shipped"
                                    ? "#ede9fe"
                                    : ord.status === "Cancelled"
                                    ? "#fee2e2"
                                    : "#fef3c7",
                                color:
                                  ord.status === "Delivered"
                                    ? "#15803d"
                                    : ord.status === "Shipped"
                                    ? "#6d28d9"
                                    : ord.status === "Cancelled"
                                    ? "#b91c1c"
                                    : "#b45309",
                              }}
                            >
                              {ord.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          /* Application Form for Visitors */
          <div
            style={{
              background: "#ffffff",
              borderRadius: 18,
              border: "1.5px solid #fecdd3",
              padding: "clamp(20px, 4vw, 36px)",
              maxWidth: 650,
              margin: "0 auto",
              boxShadow: "0 10px 30px rgba(190, 18, 60, 0.05)",
            }}
          >
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <span style={{ fontSize: 32 }}>🚀</span>
              <h2 style={{ margin: "6px 0 4px", fontSize: 22, fontWeight: 900, color: "#881337" }}>
                LIORA অফিসিয়াল রিসেলার হতে আবেদন করুন
              </h2>
              <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
                আমাদের রিসেলার নেটওয়ার্কে যুক্ত হয়ে নিজের পেজে প্রোডাক্ট সেল শুরু করুন।
              </p>
            </div>

            {applyDone ? (
              <div style={{ background: "#ecfdf5", border: "1px solid #34d399", borderRadius: 12, padding: 24, textAlign: "center" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
                <h3 style={{ margin: 0, color: "#065f46", fontSize: 18, fontWeight: 900 }}>
                  আপনার রিসেলার আবেদন সফলভাবে গৃহীত হয়েছে!
                </h3>
                <p style={{ margin: "6px 0 0", color: "#047857", fontSize: 13 }}>
                  আমাদের টিম দ্রুত আপনার তথ্য যাচাই করে অ্যাকাউন্ট অ্যাক্টিভ করে দেবে।
                </p>
              </div>
            ) : (
              <form onSubmit={handleApplyReseller}>
                {applyErr && (
                  <div style={{ background: "#fee2e2", color: "#b91c1c", padding: "10px", borderRadius: 8, fontSize: 13, marginBottom: 12 }}>
                    ⚠️ {applyErr}
                  </div>
                )}
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
                    আপনার ফেসবুক পেজ / অনলাইন স্টোরের নাম *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="যেমন: Glow Up BD"
                    value={applyForm.storeName}
                    onChange={(e) => setApplyForm({ ...applyForm, storeName: e.target.value })}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13, boxSizing: "border-box" }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
                      আপনার নাম *
                    </label>
                    <input
                      type="text"
                      required
                      value={applyForm.name}
                      onChange={(e) => setApplyForm({ ...applyForm, name: e.target.value })}
                      style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13, boxSizing: "border-box" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
                      মোবাইল নম্বর *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="017XXXXXXXX"
                      value={applyForm.phone}
                      onChange={(e) => setApplyForm({ ...applyForm, phone: e.target.value })}
                      style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13, boxSizing: "border-box" }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
                    ইমেইল অ্যাড্রেস * (লগইন ইমেইল)
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="yourname@gmail.com"
                    value={applyForm.email}
                    onChange={(e) => setApplyForm({ ...applyForm, email: e.target.value })}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13, boxSizing: "border-box" }}
                  />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
                    ফেসবুক পেজ বা প্রোফাইল লিঙ্ক
                  </label>
                  <input
                    type="text"
                    placeholder="https://facebook.com/yourpage"
                    value={applyForm.fbPageLink}
                    onChange={(e) => setApplyForm({ ...applyForm, fbPageLink: e.target.value })}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13, boxSizing: "border-box" }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={applying}
                  style={{
                    width: "100%",
                    background: "linear-gradient(135deg, #be123c, #9f1239)",
                    color: "#fff",
                    border: "none",
                    padding: "13px",
                    borderRadius: 10,
                    fontSize: 14,
                    fontWeight: 900,
                    cursor: applying ? "not-allowed" : "pointer",
                  }}
                >
                  {applying ? "পাঠানো হচ্ছে..." : "✓ Submit Reseller Application"}
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Payout Request Modal */}
      {isPayoutModalOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 14 }}>
          <div style={{ background: "#fff", width: "100%", maxWidth: 440, borderRadius: 16, padding: 22 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: "#881337" }}>
                💸 Request Wallet Payout
              </h3>
              <button type="button" onClick={() => setIsPayoutModalOpen(false)} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer" }}>✕</button>
            </div>

            <p style={{ margin: "0 0 14px", fontSize: 12.5, color: "#64748b" }}>
              বর্তমান ওয়ালেট ব্যালেন্স: <strong>৳{walletData.walletBalance || 0}</strong><br />
              (নূন্যতম ৩০০ টাকা ক্যাশআউট করা যাবে)
            </p>

            {payoutError && (
              <div style={{ background: "#fee2e2", color: "#b91c1c", padding: "8px 12px", borderRadius: 6, fontSize: 12, marginBottom: 10 }}>
                ⚠️ {payoutError}
              </div>
            )}

            <form onSubmit={handlePayoutSubmit}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
                  পেমেন্ট মেথড
                </label>
                <select
                  value={payoutForm.payoutMethod}
                  onChange={(e) => setPayoutForm({ ...payoutForm, payoutMethod: e.target.value })}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13 }}
                >
                  <option value="bKash">bKash (বিকাশ পার্সোনাল)</option>
                  <option value="Nagad">Nagad (নগদ পার্সোনাল)</option>
                  <option value="Rocket">Rocket (রকেট)</option>
                  <option value="Bank">Bank Account (ব্যাংক অ্যাকাউন্ট)</option>
                </select>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
                  টাকার পরিমাণ (Tk) *
                </label>
                <input
                  type="number"
                  required
                  placeholder="যেমন: 500"
                  max={walletData.walletBalance || 0}
                  value={payoutForm.amount}
                  onChange={(e) => setPayoutForm({ ...payoutForm, amount: e.target.value })}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13, boxSizing: "border-box" }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
                  বিকাশ/নগদ নম্বর বা ব্যাংক বিবরণী *
                </label>
                <input
                  type="text"
                  required
                  placeholder="017XXXXXXXX"
                  value={payoutForm.payoutAccount}
                  onChange={(e) => setPayoutForm({ ...payoutForm, payoutAccount: e.target.value })}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13, boxSizing: "border-box" }}
                />
              </div>

              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setIsPayoutModalOpen(false)}
                  style={{ background: "#f1f5f9", border: "1px solid #cbd5e1", padding: "8px 14px", borderRadius: 8, fontWeight: 700, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPayout}
                  style={{
                    background: "#be123c",
                    color: "#fff",
                    border: "none",
                    padding: "8px 18px",
                    borderRadius: 8,
                    fontWeight: 800,
                    cursor: submittingPayout ? "not-allowed" : "pointer",
                  }}
                >
                  {submittingPayout ? "Submitting..." : "✓ Submit Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
      <MobileBottomNav />
    </div>
  );
}
