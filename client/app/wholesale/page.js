"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MobileBottomNav from "@/components/MobileBottomNav";
import { useAuth, getIdToken } from "@/components/AuthProvider";
import { API_BASE_URL, getImageUrl } from "@/lib/api";
import { useCart } from "@/context/CartContext";

export default function WholesalePage() {
  const router = useRouter();
  const { user, role, isWholesale, isAdmin, profile, loading: authLoading } = useAuth();
  const { updateItemQty } = useCart();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Filter States
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Wholesale Cart: { [productId]: { product, qty, price } }
  const [wholesaleCart, setWholesaleCart] = useState({});
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null);

  // Application Form State (for guests / non-wholesale users)
  const [appForm, setAppForm] = useState({
    businessName: "",
    name: "",
    phone: "",
    email: "",
    address: "",
    tradeLicense: "",
    note: "",
  });
  const [applying, setApplying] = useState(false);
  const [appSubmitted, setAppSubmitted] = useState(false);
  const [appError, setAppError] = useState("");

  // Wholesale Checkout Form
  const [checkoutForm, setCheckoutForm] = useState({
    businessName: "",
    customerName: "",
    phone: "",
    district: "Dhaka",
    address: "",
    note: "",
  });

  const isApproved = isWholesale || isAdmin;

  // Fetch products and categories
  useEffect(() => {
    async function loadData() {
      try {
        setLoadingProducts(true);
        const [prodRes, catRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/products?limit=150`),
          fetch(`${API_BASE_URL}/api/categories`),
        ]);
        const prodData = await prodRes.json();
        const catData = await catRes.json();

        const pList = Array.isArray(prodData?.products) ? prodData.products : Array.isArray(prodData) ? prodData : [];
        setProducts(pList);
        if (Array.isArray(catData)) setCategories(catData);
      } catch (e) {
        console.error("Wholesale data load error:", e);
      } finally {
        setLoadingProducts(false);
      }
    }
    loadData();
  }, []);

  // Pre-fill forms
  useEffect(() => {
    if (profile) {
      setCheckoutForm((prev) => ({
        ...prev,
        businessName: profile.businessName || prev.businessName || "",
        customerName: profile.name || prev.customerName || "",
        phone: profile.phone || prev.phone || "",
        address: profile.address || prev.address || "",
      }));
      setAppForm((prev) => ({
        ...prev,
        name: profile.name || prev.name || "",
        phone: profile.phone || prev.phone || "",
        email: profile.email || user?.email || prev.email || "",
      }));
    } else if (user) {
      setAppForm((prev) => ({
        ...prev,
        email: user.email || prev.email || "",
        name: user.displayName || prev.name || "",
      }));
    }
  }, [profile, user]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat =
        selectedCategory === "all" ||
        String(p.category?._id || p.category) === String(selectedCategory);
      const matchSearch =
        !search.trim() ||
        (p.name || "").toLowerCase().includes(search.trim().toLowerCase()) ||
        (p.brand?.name || "").toLowerCase().includes(search.trim().toLowerCase());
      return matchCat && matchSearch;
    });
  }, [products, selectedCategory, search]);

  // Cart Calculations
  const cartItems = Object.values(wholesaleCart);
  const totalItemsCount = cartItems.reduce((acc, it) => acc + it.qty, 0);
  const subtotalWholesale = cartItems.reduce((acc, it) => acc + it.price * it.qty, 0);
  const totalMarketValue = cartItems.reduce(
    (acc, it) => acc + Number(it.product.originalPrice || it.product.offerPrice || it.price) * it.qty,
    0
  );
  const totalSavings = Math.max(0, totalMarketValue - subtotalWholesale);

  const handleUpdateQty = (p, qty) => {
    const minMoq = Math.max(1, p.wholesaleMinQty || 3);
    if (qty <= 0) {
      setWholesaleCart((prev) => {
        const copy = { ...prev };
        delete copy[p._id];
        return copy;
      });
      if (typeof updateItemQty === "function") {
        updateItemQty(p, 0);
      }
      return;
    }

    const finalQty = Math.max(minMoq, qty);
    const regularMrp = Number(p.originalPrice || p.offerPrice || 0);
    const brandMargin = Number(p.brand?.wholesaleMarginPct ?? 7);
    const baseCost = Number(p.purchasePrice || p.costPrice || (regularMrp ? regularMrp * 0.70 : 100));
    const dynamicRate = Math.round(baseCost * (1 + brandMargin / 100));
    const hasValidMarkup = Number(p.wholesalePrice) > baseCost;
    const wholesaleRate = Number(hasValidMarkup ? p.wholesalePrice : dynamicRate);

    setWholesaleCart((prev) => ({
      ...prev,
      [p._id]: {
        product: p,
        qty: finalQty,
        price: wholesaleRate,
      },
    }));

    if (typeof updateItemQty === "function") {
      updateItemQty(p, finalQty, wholesaleRate);
    }
  };

  const handleApply = async (e) => {
    e.preventDefault();
    if (!appForm.email || !appForm.phone) {
      setAppError("ইমেইল ও মোবাইল নম্বর পূরণ করুন");
      return;
    }

    try {
      setApplying(true);
      setAppError("");
      const res = await fetch("/api/wholesale/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(appForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "আবেদন গ্রহণ করা যায়নি");
      setAppSubmitted(true);
    } catch (err) {
      setAppError(err.message);
    } finally {
      setApplying(false);
    }
  };

  const handlePlaceWholesaleOrder = async (e) => {
    e.preventDefault();
    if (cartItems.length === 0) {
      alert("কার্টে কোনো পাইকারি পণ্য যোগ করা হয়নি");
      return;
    }

    if (subtotalWholesale < 3000) {
      alert("পাইকারি অর্ডারের জন্য নূন্যতম ৩,০০০ টাকার পণ্য কার্টে যোগ করতে হবে");
      return;
    }

    try {
      setPlacingOrder(true);
      const token = await getIdToken();
      const orderPayload = {
        orderType: "wholesale",
        isWholesale: true,
        businessName: checkoutForm.businessName || profile?.businessName || "Wholesale Partner",
        customerName: checkoutForm.customerName,
        phone: checkoutForm.phone,
        district: checkoutForm.district || "Dhaka",
        address: checkoutForm.address,
        note: checkoutForm.note,
        items: cartItems.map((it) => ({
          productId: it.product._id,
          quantity: it.qty,
          price: it.price,
        })),
        deliveryCharge: checkoutForm.district === "Dhaka" ? 80 : 150,
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(orderPayload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "অর্ডার সম্পন্ন করা যায়নি");

      setOrderSuccess(data);
      setWholesaleCart({});
      setIsCheckoutOpen(false);
    } catch (err) {
      alert("⚠️ এরর: " + err.message);
    } finally {
      setPlacingOrder(false);
    }
  };

  return (
    <div style={{ background: "#fcf8f9", minHeight: "100vh", paddingBottom: 90 }}>
      <Header />

      {/* Hero Banner */}
      <section
        style={{
          background: "linear-gradient(135deg, #fff1f2 0%, #ffe4e6 50%, #fecdd3 100%)",
          borderBottom: "1px solid #fecdd3",
          padding: "clamp(28px, 6vw, 48px) 16px",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <span
            style={{
              background: "#be123c",
              color: "#fff",
              padding: "4px 12px",
              borderRadius: 50,
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: 0.5,
              textTransform: "uppercase",
              display: "inline-block",
              marginBottom: 12,
            }}
          >
            LIORA B2B Wholesale Portal
          </span>
          <h1
            style={{
              margin: 0,
              fontSize: "clamp(24px, 5vw, 38px)",
              fontWeight: 900,
              color: "#881337",
              lineHeight: 1.25,
            }}
          >
            অফিসিয়াল পাইকারি ক্যাটালগ ও বাল্ক সাপ্লাই
          </h1>
          <p
            style={{
              margin: "12px auto 0",
              fontSize: "clamp(13px, 3.5vw, 16px)",
              color: "#4c0519",
              maxWidth: 620,
              lineHeight: 1.6,
            }}
          >
            সরাসরি আমদানিকৃত ১০০% জেনুইন বিউটি ও স্কিনকেয়ার পণ্যের পাইকারি রেট। শোরুম, অনলাইন বুটিক ও পাইকারি
            ব্যবসায়ীদের জন্য সর্বনিম্ন মার্কেট রেট ও দ্রুততম শিপমেন্ট।
          </p>

          {isApproved ? (
            <div
              style={{
                marginTop: 18,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "#ecfdf5",
                border: "1.5px solid #10b981",
                padding: "8px 18px",
                borderRadius: 50,
                color: "#065f46",
                fontWeight: 800,
                fontSize: 13,
              }}
            >
              ✓ আপনার পাইকারি একাউন্ট অনুমোদিত ({profile?.businessName || user?.email})
            </div>
          ) : (
            <div style={{ marginTop: 20, display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById("apply-section");
                  el?.scrollIntoView({ behavior: "smooth" });
                }}
                style={{
                  background: "#be123c",
                  color: "#fff",
                  border: "none",
                  padding: "12px 24px",
                  borderRadius: 50,
                  fontSize: 14,
                  fontWeight: 800,
                  cursor: "pointer",
                  boxShadow: "0 6px 16px rgba(190, 18, 60, 0.3)",
                }}
              >
                📝 Apply for Wholesale Access
              </button>
              {!user && (
                <Link
                  href="/login?redirect=/wholesale"
                  style={{
                    background: "#ffffff",
                    color: "#be123c",
                    border: "1.5px solid #be123c",
                    padding: "12px 24px",
                    borderRadius: 50,
                    fontSize: 14,
                    fontWeight: 800,
                    textDecoration: "none",
                    display: "inline-block",
                  }}
                >
                  🔑 Login with Approved Email
                </Link>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Main Content Area */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "20px 14px" }}>
        {/* Success Modal / Banner */}
        {orderSuccess && (
          <div
            style={{
              background: "#ecfdf5",
              border: "1.5px solid #10b981",
              borderRadius: 16,
              padding: 24,
              textAlign: "center",
              marginBottom: 24,
            }}
          >
            <div style={{ fontSize: 40, marginBottom: 8 }}>🎉</div>
            <h2 style={{ margin: 0, color: "#065f46", fontSize: 22, fontWeight: 900 }}>
              পাইকারি অর্ডার সফলভাবে সম্পন্ন হয়েছে!
            </h2>
            <p style={{ margin: "6px 0 16px", color: "#047857", fontSize: 14 }}>
              Order ID: <strong>{orderSuccess.orderNumber}</strong> | আমাদের B2B টিম শীঘ্রই পার্সেল প্যাকিং ও কনফার্মেশনের জন্য কল করবে।
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <Link
                href="/account"
                style={{
                  background: "#059669",
                  color: "#fff",
                  padding: "10px 20px",
                  borderRadius: 8,
                  textDecoration: "none",
                  fontWeight: 800,
                  fontSize: 13,
                }}
              >
                📦 View Order in Dashboard
              </Link>
              <button
                type="button"
                onClick={() => setOrderSuccess(null)}
                style={{
                  background: "#fff",
                  border: "1px solid #cbd5e1",
                  padding: "10px 18px",
                  borderRadius: 8,
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Wholesale Benefits Bar */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
            marginBottom: 24,
          }}
        >
          <div style={{ background: "#fff", padding: "14px 16px", borderRadius: 12, border: "1px solid #fecdd3" }}>
            <span style={{ fontSize: 20 }}>📦</span>
            <h4 style={{ margin: "4px 0 2px", fontSize: 14, fontWeight: 800, color: "#881337" }}>নূন্যতম MOQ</h4>
            <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>প্রতি আইটেম মাত্র ৩ পিস বা মোট ৳৩,০০০ থেকে শুরু</p>
          </div>
          <div style={{ background: "#fff", padding: "14px 16px", borderRadius: 12, border: "1px solid #fecdd3" }}>
            <span style={{ fontSize: 20 }}>🏷️</span>
            <h4 style={{ margin: "4px 0 2px", fontSize: 14, fontWeight: 800, color: "#881337" }}>সর্বোচ্চ মার্জিন</h4>
            <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>খুচরা মূল্যের চেয়ে ২০% থেকে ৪০% পর্যন্ত ছাড়</p>
          </div>
          <div style={{ background: "#fff", padding: "14px 16px", borderRadius: 12, border: "1px solid #fecdd3" }}>
            <span style={{ fontSize: 20 }}>🚚</span>
            <h4 style={{ margin: "4px 0 2px", fontSize: 14, fontWeight: 800, color: "#881337" }}>দ্রুত শিপমেন্ট</h4>
            <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>সারা দেশে ২৪-৪৮ ঘণ্টায় নিরাপদ কন্ডিশন ডেলিভারি</p>
          </div>
          <div style={{ background: "#fff", padding: "14px 16px", borderRadius: 12, border: "1px solid #fecdd3" }}>
            <span style={{ fontSize: 20 }}>💯</span>
            <h4 style={{ margin: "4px 0 2px", fontSize: 14, fontWeight: 800, color: "#881337" }}>১০০% অথেনটিক</h4>
            <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>অরিজিনাল ব্র্যান্ড ও বারকোড ভেরিফাইড প্রডাক্ট</p>
          </div>
        </div>

        {/* If user is NOT wholesale approved, show gating alert */}
        {!isApproved && (
          <div
            style={{
              background: "linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)",
              border: "1.5px solid #fdba74",
              borderRadius: 14,
              padding: "16px 20px",
              marginBottom: 24,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div>
              <h3 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 800, color: "#9a3412" }}>
                🔒 পাইকারি রেট দেখার জন্য অনুমোদিত অ্যাকাউন্ট প্রয়োজন
              </h3>
              <p style={{ margin: 0, fontSize: 12.5, color: "#c2410c" }}>
                আমাদের বিটুবি পাইকারি ডিসকাউন্ট সাধারণ রিটেইল গ্রাহকদের থেকে সুরক্ষিত রাখা হয়। নিচের ফর্মের মাধ্যমে এক্সেস
                রিকোয়েস্ট করুন অথবা অ্যাডমিনের সাথে যোগাযোগ করুন।
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById("apply-section");
                el?.scrollIntoView({ behavior: "smooth" });
              }}
              style={{
                background: "#ea580c",
                color: "#fff",
                border: "none",
                padding: "9px 18px",
                borderRadius: 8,
                fontSize: 12.5,
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              আবেদন করুন &darr;
            </button>
          </div>
        )}

        {/* Search & Category Filter Toolbar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
            marginBottom: 20,
          }}
        >
          <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4, maxWidth: "100%" }}>
            <button
              type="button"
              onClick={() => setSelectedCategory("all")}
              style={{
                padding: "8px 16px",
                borderRadius: 50,
                fontSize: 12.5,
                fontWeight: 700,
                border: "none",
                cursor: "pointer",
                background: selectedCategory === "all" ? "#be123c" : "#fff",
                color: selectedCategory === "all" ? "#fff" : "#475569",
                border: "1px solid #cbd5e1",
                whiteSpace: "nowrap",
              }}
            >
              All Categories
            </button>
            {categories.slice(0, 8).map((cat) => (
              <button
                key={cat._id}
                type="button"
                onClick={() => setSelectedCategory(cat._id)}
                style={{
                  padding: "8px 16px",
                  borderRadius: 50,
                  fontSize: 12.5,
                  fontWeight: 700,
                  border: "none",
                  cursor: "pointer",
                  background: selectedCategory === cat._id ? "#be123c" : "#fff",
                  color: selectedCategory === cat._id ? "#fff" : "#475569",
                  border: "1px solid #cbd5e1",
                  whiteSpace: "nowrap",
                }}
              >
                {cat.name}
              </button>
            ))}
          </div>

          <input
            type="text"
            placeholder="🔍 Search wholesale products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              padding: "9px 16px",
              borderRadius: 50,
              border: "1px solid #cbd5e1",
              fontSize: 13,
              minWidth: 260,
              outline: "none",
              background: "#fff",
            }}
          />
        </div>

        {/* Product Grid */}
        {loadingProducts ? (
          <div style={{ textAlign: "center", padding: 60, color: "#64748b" }}>
            পাইকারি ক্যাটালগ লোড হচ্ছে...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60, color: "#64748b", background: "#fff", borderRadius: 14 }}>
            কোনো প্রোডাক্ট পাওয়া যায়নি।
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: 16,
              marginBottom: 40,
            }}
          >
            {filteredProducts.map((p) => {
              const moq = p.wholesaleMinQty || 3;
              const regularMrp = Number(p.originalPrice || p.offerPrice || 0);
              const retailOffer = Number(p.offerPrice || p.originalPrice || 0);
              const brandMargin = Number(p.brand?.wholesaleMarginPct ?? 7);
              const baseCost = Number(p.purchasePrice || p.costPrice || (regularMrp ? regularMrp * 0.70 : 100));
              const dynamicRate = Math.round(baseCost * (1 + brandMargin / 100));
              const hasValidMarkup = Number(p.wholesalePrice) > baseCost;
              const wholesaleRate = Number(hasValidMarkup ? p.wholesalePrice : dynamicRate);
              const savingsPerPiece = Math.max(0, regularMrp - wholesaleRate);
              const marginPct = regularMrp > 0 ? Math.round((savingsPerPiece / regularMrp) * 100) : 0;
              const cartItem = wholesaleCart[p._id];
              const currentQty = cartItem?.qty || 0;

              return (
                <div
                  key={p._id}
                  style={{
                    background: "#ffffff",
                    borderRadius: 16,
                    border: "1px solid #fecdd3",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                    boxShadow: "0 2px 10px rgba(190, 18, 60, 0.04)",
                  }}
                >
                  <div style={{ position: "relative", width: "100%", height: 200, background: "#f8fafc" }}>
                    <img
                      src={getImageUrl(p.image)}
                      alt={p.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      onError={(e) => {
                        e.currentTarget.src =
                          "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=300&auto=format&fit=crop&q=80";
                      }}
                    />
                    <span
                      style={{
                        position: "absolute",
                        top: 10,
                        left: 10,
                        background: "#881337",
                        color: "#fff",
                        padding: "3px 8px",
                        borderRadius: 6,
                        fontSize: 10.5,
                        fontWeight: 800,
                      }}
                    >
                      MOQ: {moq} Pcs
                    </span>
                    {p.stockQuantity <= 5 && (
                      <span
                        style={{
                          position: "absolute",
                          bottom: 10,
                          left: 10,
                          background: "rgba(220, 38, 38, 0.9)",
                          color: "#fff",
                          padding: "2px 8px",
                          borderRadius: 6,
                          fontSize: 10,
                          fontWeight: 700,
                        }}
                      >
                        Low Stock ({p.stockQuantity})
                      </span>
                    )}
                  </div>

                  <div style={{ padding: 14, flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                    <div>
                      {p.brand?.name && (
                        <div style={{ fontSize: 11, fontWeight: 700, color: "#e11d48", textTransform: "uppercase" }}>
                          {p.brand.name}
                        </div>
                      )}
                      <h3
                        style={{
                          margin: "4px 0 8px",
                          fontSize: 14,
                          fontWeight: 800,
                          color: "#0f172a",
                          lineHeight: 1.35,
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {p.name}
                      </h3>

                      {/* Pricing Box */}
                      <div
                        style={{
                          background: "#fff1f2",
                          padding: "10px 12px",
                          borderRadius: 10,
                          marginBottom: 12,
                          border: "1px solid #ffe4e6",
                        }}
                      >
                        {isApproved ? (
                          <>
                            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 4 }}>
                              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                                <span style={{ fontSize: 11, color: "#9f1239", fontWeight: 700 }}>পাইকারি:</span>
                                <span style={{ fontSize: 20, fontWeight: 900, color: "#be123c" }}>
                                  ৳{wholesaleRate}
                                </span>
                              </div>
                              <span style={{ fontSize: 11, fontWeight: 800, color: "#059669", background: "#d1fae5", padding: "2px 7px", borderRadius: 4 }}>
                                লাভ ৳{savingsPerPiece}/pc ({marginPct}%)
                              </span>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 5, flexWrap: "wrap", fontSize: 11.5 }}>
                              <span style={{ color: "#334155", fontWeight: 700 }}>
                                রেগুলার MRP: <strong style={{ color: "#0f172a" }}>৳{regularMrp}</strong>
                              </span>
                              {retailOffer < regularMrp && (
                                <span style={{ color: "#64748b", fontSize: 10.5 }}>
                                  (অনলাইন অফার: ৳{retailOffer})
                                </span>
                              )}
                            </div>

                            <div style={{ fontSize: 10.5, color: "#881337", fontWeight: 700, marginTop: 4 }}>
                              ✓ নূন্যতম {moq} পিস (এরপর ১ পিস করে বাড়ানো যাবে)
                            </div>
                          </>
                        ) : (
                          <div>
                            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                              <span style={{ fontSize: 11, color: "#64748b", fontWeight: 700 }}>রেগুলার MRP:</span>
                              <span style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>
                                ৳{regularMrp}
                              </span>
                              {retailOffer < regularMrp && (
                                <span style={{ fontSize: 12, color: "#059669", fontWeight: 700 }}>
                                  (অফার ৳{retailOffer})
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: 11, color: "#e11d48", fontWeight: 700, marginTop: 4 }}>
                              🔒 পাইকারি রেট আনলক করতে অনুমোদন প্রয়োজন
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    {isApproved ? (
                      <div>
                        {currentQty === 0 ? (
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(p, moq)}
                            style={{
                              width: "100%",
                              background: "#be123c",
                              color: "#fff",
                              border: "none",
                              padding: "10px",
                              borderRadius: 8,
                              fontSize: 13,
                              fontWeight: 800,
                              cursor: "pointer",
                              transition: "all 0.2s ease",
                            }}
                          >
                            + Add MOQ ({moq} pcs) = ৳{wholesaleRate * moq}
                          </button>
                        ) : (
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <button
                              type="button"
                              onClick={() => {
                                if (currentQty <= moq) {
                                  handleUpdateQty(p, 0);
                                } else {
                                  handleUpdateQty(p, currentQty - 1);
                                }
                              }}
                              style={{
                                width: 34,
                                height: 36,
                                background: "#f1f5f9",
                                border: "1px solid #cbd5e1",
                                borderRadius: 6,
                                fontWeight: 900,
                                fontSize: 16,
                                cursor: "pointer",
                                color: currentQty <= moq ? "#e11d48" : "#0f172a",
                              }}
                              title={currentQty <= moq ? "কার্ট থেকে সরান" : "১ পিস কমান"}
                            >
                              {currentQty <= moq ? "✕" : "−"}
                            </button>

                            <div
                              style={{
                                flex: 1,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 3,
                                background: "#f8fafc",
                                border: "1px solid #e2e8f0",
                                borderRadius: 6,
                                padding: "2px 4px",
                                height: 36,
                              }}
                            >
                              <input
                                type="number"
                                min={moq}
                                value={currentQty}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value, 10);
                                  if (isNaN(val)) return;
                                  if (val <= 0) {
                                    handleUpdateQty(p, 0);
                                  } else {
                                    handleUpdateQty(p, Math.max(moq, val));
                                  }
                                }}
                                style={{
                                  width: 40,
                                  border: "none",
                                  background: "transparent",
                                  textAlign: "center",
                                  fontWeight: 900,
                                  fontSize: 13.5,
                                  color: "#0f172a",
                                  outline: "none",
                                }}
                              />
                              <span style={{ fontSize: 10.5, fontWeight: 700, color: "#64748b" }}>পিস</span>
                              <span style={{ fontSize: 11, fontWeight: 800, color: "#059669" }}>
                                • ৳{currentQty * wholesaleRate}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleUpdateQty(p, currentQty + 1)}
                              style={{
                                width: 34,
                                height: 36,
                                background: "#be123c",
                                color: "#fff",
                                border: "none",
                                borderRadius: 6,
                                fontWeight: 900,
                                fontSize: 18,
                                cursor: "pointer",
                              }}
                              title="১ পিস বাড়ান (+1)"
                            >
                              +
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          const el = document.getElementById("apply-section");
                          el?.scrollIntoView({ behavior: "smooth" });
                        }}
                        style={{
                          width: "100%",
                          background: "#f1f5f9",
                          color: "#64748b",
                          border: "1px solid #cbd5e1",
                          padding: "9px",
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        🔒 Request Access
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Application Form Section for Non-Wholesale Users */}
        <section
          id="apply-section"
          style={{
            background: "#ffffff",
            borderRadius: 18,
            border: "1.5px solid #fecdd3",
            padding: "clamp(20px, 4vw, 36px)",
            maxWidth: 700,
            margin: "0 auto 40px",
            boxShadow: "0 10px 30px rgba(190, 18, 60, 0.05)",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <span style={{ fontSize: 28 }}>📝</span>
            <h2 style={{ margin: "4px 0 6px", fontSize: 22, fontWeight: 900, color: "#881337" }}>
              পাইকারি অ্যাকাউন্টের জন্য আবেদন করুন
            </h2>
            <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
              আপনার ব্যবসায়িক তথ্য প্রদান করুন। আমাদের টিম দ্রুত যাচাই করে আপনার ইমেইলে পাইকারি এক্সেস প্রদান করবে।
            </p>
          </div>

          {appSubmitted ? (
            <div
              style={{
                background: "#ecfdf5",
                border: "1px solid #34d399",
                borderRadius: 12,
                padding: 24,
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
              <h3 style={{ margin: 0, color: "#065f46", fontSize: 18, fontWeight: 900 }}>
                আপনার আবেদনটি সফলভাবে গৃহীত হয়েছে!
              </h3>
              <p style={{ margin: "6px 0 0", color: "#047857", fontSize: 13 }}>
                অ্যাডমিন ভেরিফিকেশন সম্পন্ন হলেই আপনার একাউন্টে পাইকারি প্রাইস সক্রিয় হয়ে যাবে।
              </p>
            </div>
          ) : (
            <form onSubmit={handleApply}>
              {appError && (
                <div style={{ background: "#fee2e2", color: "#b91c1c", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 14 }}>
                  ⚠️ {appError}
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
                    দোকান / ব্যবসার নাম *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="যেমন: ফ্যাশন অ্যান্ড বিউটি"
                    value={appForm.businessName}
                    onChange={(e) => setAppForm({ ...appForm, businessName: e.target.value })}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13, boxSizing: "border-box" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
                    আপনার নাম *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="আপনার পূর্ণ নাম"
                    value={appForm.name}
                    onChange={(e) => setAppForm({ ...appForm, name: e.target.value })}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13, boxSizing: "border-box" }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
                    ইমেইল অ্যাড্রেস * (লগইন একাউন্ট)
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="partner@gmail.com"
                    value={appForm.email}
                    onChange={(e) => setAppForm({ ...appForm, email: e.target.value })}
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
                    value={appForm.phone}
                    onChange={(e) => setAppForm({ ...appForm, phone: e.target.value })}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13, boxSizing: "border-box" }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
                  দোকান / গোডাউনের ঠিকানা
                </label>
                <input
                  type="text"
                  placeholder="মার্কেট, রাস্তা, জেলা..."
                  value={appForm.address}
                  onChange={(e) => setAppForm({ ...appForm, address: e.target.value })}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13, boxSizing: "border-box" }}
                />
              </div>

              <div style={{ marginBottom: 18 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
                  ট্রেড লাইসেন্স নম্বর বা ফেসবুক পেজের লিঙ্ক (যদি থাকে)
                </label>
                <input
                  type="text"
                  placeholder="https://facebook.com/yourpage"
                  value={appForm.tradeLicense}
                  onChange={(e) => setAppForm({ ...appForm, tradeLicense: e.target.value })}
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
                  boxShadow: "0 4px 14px rgba(190, 18, 60, 0.25)",
                }}
              >
                {applying ? "পাঠানো হচ্ছে..." : "✓ Submit Wholesale Application"}
              </button>
            </form>
          )}
        </section>
      </div>

      {/* Floating Bottom Wholesale Cart Sticky Bar */}
      {cartItems.length > 0 && (
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            background: "#ffffff",
            borderTop: "2px solid #be123c",
            boxShadow: "0 -8px 25px rgba(0,0,0,0.12)",
            padding: "12px 18px",
            zIndex: 999,
          }}
        >
          <div
            style={{
              maxWidth: 1200,
              margin: "0 auto",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                <span style={{ fontSize: 18, fontWeight: 900, color: "#881337" }}>
                  ৳{subtotalWholesale.toLocaleString()}
                </span>
                <span style={{ fontSize: 12, color: "#059669", fontWeight: 700 }}>
                  (মোট সাশ্রয়: ৳{totalSavings.toLocaleString()})
                </span>
              </div>
              <div style={{ fontSize: 12, color: "#64748b" }}>
                নির্বাচিত পণ্য: <strong>{cartItems.length} আইটেম</strong> ({totalItemsCount} পিস)
              </div>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={() => setWholesaleCart({})}
                style={{
                  background: "#f1f5f9",
                  border: "1px solid #cbd5e1",
                  padding: "10px 14px",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => setIsCheckoutOpen(true)}
                style={{
                  background: "linear-gradient(135deg, #be123c, #9f1239)",
                  color: "#fff",
                  border: "none",
                  padding: "10px 24px",
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 900,
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(190, 18, 60, 0.3)",
                }}
              >
                🛒 Proceed to Wholesale Checkout &rarr;
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {isCheckoutOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 14,
          }}
        >
          <div
            style={{
              background: "#fff",
              width: "100%",
              maxWidth: 550,
              borderRadius: 18,
              padding: 22,
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 900, color: "#881337" }}>
                🛒 Confirm Wholesale Order
              </h3>
              <button type="button" onClick={() => setIsCheckoutOpen(false)} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer" }}>✕</button>
            </div>

            {/* Cart Summary */}
            <div style={{ background: "#f8fafc", padding: "10px 14px", borderRadius: 10, marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                <span>Subtotal ({totalItemsCount} pcs):</span>
                <strong>৳{subtotalWholesale.toLocaleString()}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                <span>Estimated Delivery Charge:</span>
                <strong>৳{checkoutForm.district === "Dhaka" ? "80" : "150"}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 900, color: "#be123c", borderTop: "1px dashed #cbd5e1", paddingTop: 6 }}>
                <span>Total Amount:</span>
                <span>৳{(subtotalWholesale + (checkoutForm.district === "Dhaka" ? 80 : 150)).toLocaleString()}</span>
              </div>
            </div>

            <form onSubmit={handlePlaceWholesaleOrder}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
                  দোকান / ব্যবসার নাম
                </label>
                <input
                  type="text"
                  placeholder="যেমন: Dhaka Fashion Corner"
                  value={checkoutForm.businessName}
                  onChange={(e) => setCheckoutForm({ ...checkoutForm, businessName: e.target.value })}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13, boxSizing: "border-box" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
                    গ্রাহকের নাম *
                  </label>
                  <input
                    type="text"
                    required
                    value={checkoutForm.customerName}
                    onChange={(e) => setCheckoutForm({ ...checkoutForm, customerName: e.target.value })}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13, boxSizing: "border-box" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
                    মোবাইল নম্বর *
                  </label>
                  <input
                    type="text"
                    required
                    value={checkoutForm.phone}
                    onChange={(e) => setCheckoutForm({ ...checkoutForm, phone: e.target.value })}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13, boxSizing: "border-box" }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
                  জেলা (District) *
                </label>
                <select
                  value={checkoutForm.district}
                  onChange={(e) => setCheckoutForm({ ...checkoutForm, district: e.target.value })}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13, background: "#f8fafc" }}
                >
                  <option value="Dhaka">Dhaka (ঢাকার ভিতরে - ডেলিভারি ৳৮০)</option>
                  <option value="Outside Dhaka">Outside Dhaka (ঢাকার বাইরে কুরিয়ার - ডেলিভারি ৳১৫০)</option>
                </select>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
                  ডেলিভারি ঠিকানা *
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="দোকান বা বাড়ির সম্পূর্ণ ঠিকানা..."
                  value={checkoutForm.address}
                  onChange={(e) => setCheckoutForm({ ...checkoutForm, address: e.target.value })}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13, boxSizing: "border-box" }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
                  অর্ডার নোট (ঐচ্ছিক)
                </label>
                <input
                  type="text"
                  placeholder="যেমন: দ্রুত ডেলিভারি প্রয়োজন"
                  value={checkoutForm.note}
                  onChange={(e) => setCheckoutForm({ ...checkoutForm, note: e.target.value })}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13, boxSizing: "border-box" }}
                />
              </div>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setIsCheckoutOpen(false)}
                  style={{ background: "#f1f5f9", border: "1px solid #cbd5e1", padding: "10px 16px", borderRadius: 8, fontWeight: 700, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={placingOrder}
                  style={{
                    background: "linear-gradient(135deg, #be123c, #9f1239)",
                    color: "#fff",
                    border: "none",
                    padding: "10px 24px",
                    borderRadius: 8,
                    fontWeight: 900,
                    cursor: placingOrder ? "not-allowed" : "pointer",
                  }}
                >
                  {placingOrder ? "Placing Order..." : "✓ Confirm Order"}
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
