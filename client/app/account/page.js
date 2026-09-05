"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import MobileBottomNav from "@/components/MobileBottomNav";
import { useAuth, getIdToken } from "@/components/AuthProvider";
import { getImageUrl } from "@/lib/api";

const STATUS_STEPS = ["Pending", "Confirmed", "Shipped", "Delivered"];

const STATUS_LABELS = {
  Pending: { text: "অর্ডার গৃহীত (Pending)", color: "#d97706", bg: "#fef3c7", icon: "⏳" },
  Confirmed: { text: "নিশ্চিত করা হয়েছে (Confirmed)", color: "#2563eb", bg: "#dbeafe", icon: "✔️" },
  Shipped: { text: "শিপমেন্টে আছে (Shipped)", color: "#7c3aed", bg: "#ede9fe", icon: "🚚" },
  Delivered: { text: "ডেলিভারি সম্পন্ন (Delivered)", color: "#059669", bg: "#d1fae5", icon: "✅" },
  Cancelled: { text: "বাতিল করা হয়েছে (Cancelled)", color: "#dc2626", bg: "#fee2e2", icon: "❌" },
};

export default function AccountDashboardPage() {
  const router = useRouter();
  const { user, role, isAdmin, profile, loading, logout, refreshProfile } = useAuth();

  const [activeTab, setActiveTab] = useState("orders"); // 'orders' | 'track' | 'profile'
  const [orders, setOrders] = useState(null);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  // Manual Tracking search
  const [trackQuery, setTrackQuery] = useState("");
  const [trackResult, setTrackResult] = useState(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackError, setTrackError] = useState("");

  // Profile Form
  const [profileForm, setProfileForm] = useState({
    name: "",
    phone: "",
    address: "",
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState("");
  const [profileErr, setProfileErr] = useState("");

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login?redirect=/account");
    }
  }, [user, loading, router]);

  // Load orders
  const fetchOrders = async () => {
    try {
      setLoadingOrders(true);
      const token = await getIdToken();
      if (!token) return;

      const res = await fetch("/api/my-orders", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.orders)) {
        setOrders(data.orders);
      } else {
        setOrders([]);
      }
    } catch (err) {
      console.error("Order fetch error:", err);
      setOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  };

  // Sync profile form
  useEffect(() => {
    if (profile) {
      setProfileForm({
        name: profile.name || user?.displayName || "",
        phone: profile.phone || "",
        address: profile.address || "",
      });
    } else if (user) {
      setProfileForm((prev) => ({
        ...prev,
        name: prev.name || user.displayName || "",
      }));
    }
  }, [profile, user]);

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user]);

  // Order stats
  const stats = useMemo(() => {
    if (!orders || orders.length === 0) {
      return { total: 0, pending: 0, shipped: 0, delivered: 0 };
    }
    return {
      total: orders.length,
      pending: orders.filter((o) => o.status === "Pending" || o.status === "Confirmed").length,
      shipped: orders.filter((o) => o.status === "Shipped").length,
      delivered: orders.filter((o) => o.status === "Delivered").length,
    };
  }, [orders]);

  // Manual Tracking search
  const handleManualTrack = async (e) => {
    e.preventDefault();
    if (!trackQuery.trim()) return;

    setTrackingLoading(true);
    setTrackError("");
    setTrackResult(null);

    try {
      const res = await fetch(`/api/orders/track?query=${encodeURIComponent(trackQuery.trim())}`);
      const data = await res.json();
      if (res.ok && Array.isArray(data) && data.length > 0) {
        setTrackResult(data);
      } else {
        setTrackError("এই নম্বরে কোনো অর্ডার খুঁজে পাওয়া যায়নি।");
      }
    } catch (err) {
      setTrackError("অর্ডার খুঁজতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।");
    } finally {
      setTrackingLoading(false);
    }
  };

  // Save profile
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg("");
    setProfileErr("");

    try {
      const token = await getIdToken();
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(profileForm),
      });

      const data = await res.json();
      if (res.ok) {
        setProfileMsg("প্রোফাইল সফলভাবে আপডেট হয়েছে!");
        await refreshProfile();
        // re-fetch orders so if phone changed, any new orders link up
        fetchOrders();
      } else {
        setProfileErr(data.message || "প্রোফাইল সংরক্ষণ ব্যর্থ হয়েছে");
      }
    } catch (err) {
      setProfileErr("নেটওয়ার্ক সমস্যা, অনুগ্রহ করে পুনরায় চেষ্টা করুন");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  if (loading || !user) {
    return (
      <main style={{ minHeight: "80vh", background: "#f8fafc" }}>
        <Header />
        <div style={{ maxWidth: 800, margin: "60px auto", padding: 20, textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🌸</div>
          <p style={{ color: "#64748b", fontWeight: 600 }}>অ্যাকাউন্ট লোড হচ্ছে, অনুগ্রহ করে অপেক্ষা করুন...</p>
        </div>
      </main>
    );
  }

  const userDisplayName = profile?.name || user?.displayName || user?.email?.split("@")[0] || "সম্মানিত গ্রাহক";

  return (
    <main style={{ minHeight: "100vh", background: "#f8fafc", paddingBottom: 80 }}>
      <Header />

      <div style={{ maxWidth: 960, margin: "24px auto", padding: "0 16px" }}>
        {/* Top User Banner Card */}
        <div
          style={{
            background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
            borderRadius: 20,
            padding: "24px 28px",
            color: "#fff",
            boxShadow: "0 10px 25px -5px rgba(15, 23, 42, 0.15)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #e91e63, #f43f5e)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 26,
                fontWeight: "bold",
                color: "#fff",
                boxShadow: "0 4px 14px rgba(233, 30, 99, 0.4)",
              }}
            >
              {userDisplayName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#fff" }}>
                  {userDisplayName}
                </h1>
                {isAdmin ? (
                  <span
                    style={{
                      background: "#f59e0b",
                      color: "#000",
                      fontSize: 11,
                      fontWeight: 800,
                      padding: "3px 8px",
                      borderRadius: 12,
                      letterSpacing: 0.5,
                    }}
                  >
                    👑 ADMIN
                  </span>
                ) : (
                  <span
                    style={{
                      background: "rgba(255,255,255,0.15)",
                      color: "#f8fafc",
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "3px 8px",
                      borderRadius: 12,
                    }}
                  >
                    CUSTOMER
                  </span>
                )}
              </div>
              <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: 13 }}>
                {user.email || profile?.phone || "Liora Verified User"}
              </p>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {isAdmin && (
              <Link
                href="/admin"
                style={{
                  padding: "9px 16px",
                  borderRadius: 10,
                  background: "#e91e63",
                  color: "#fff",
                  textDecoration: "none",
                  fontWeight: 700,
                  fontSize: 13,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                ⚙️ Admin Dashboard
              </Link>
            )}
            <button
              onClick={handleLogout}
              style={{
                padding: "9px 16px",
                borderRadius: 10,
                background: "rgba(255, 255, 255, 0.12)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                color: "#f1f5f9",
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              🚪 লগআউট (Logout)
            </button>
          </div>
        </div>

        {/* Quick KPI Stats */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
            gap: 12,
            marginTop: 16,
          }}
        >
          <div style={statCardStyle}>
            <span style={{ fontSize: 20 }}>📦</span>
            <strong style={{ fontSize: 20, color: "#0f172a" }}>{stats.total}</strong>
            <span style={{ fontSize: 12, color: "#64748b" }}>মোট অর্ডার</span>
          </div>
          <div style={statCardStyle}>
            <span style={{ fontSize: 20 }}>⏳</span>
            <strong style={{ fontSize: 20, color: "#d97706" }}>{stats.pending}</strong>
            <span style={{ fontSize: 12, color: "#64748b" }}>অপেক্ষমান (Pending)</span>
          </div>
          <div style={statCardStyle}>
            <span style={{ fontSize: 20 }}>🚚</span>
            <strong style={{ fontSize: 20, color: "#7c3aed" }}>{stats.shipped}</strong>
            <span style={{ fontSize: 12, color: "#64748b" }}>শিপমেন্টে (Shipped)</span>
          </div>
          <div style={statCardStyle}>
            <span style={{ fontSize: 20 }}>✅</span>
            <strong style={{ fontSize: 20, color: "#059669" }}>{stats.delivered}</strong>
            <span style={{ fontSize: 12, color: "#64748b" }}>ডেলিভার্ড (Delivered)</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div
          style={{
            display: "flex",
            gap: 8,
            marginTop: 24,
            marginBottom: 16,
            borderBottom: "1px solid #e2e8f0",
            paddingBottom: 4,
          }}
        >
          <button
            onClick={() => setActiveTab("orders")}
            style={{
              padding: "10px 18px",
              borderRadius: "8px 8px 0 0",
              border: "none",
              borderBottom: activeTab === "orders" ? "3px solid #e91e63" : "3px solid transparent",
              background: activeTab === "orders" ? "#fff" : "transparent",
              fontWeight: activeTab === "orders" ? 800 : 600,
              color: activeTab === "orders" ? "#e91e63" : "#64748b",
              cursor: "pointer",
              fontSize: 14,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            📦 আমার অর্ডারসমূহ ({orders?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab("track")}
            style={{
              padding: "10px 18px",
              borderRadius: "8px 8px 0 0",
              border: "none",
              borderBottom: activeTab === "track" ? "3px solid #e91e63" : "3px solid transparent",
              background: activeTab === "track" ? "#fff" : "transparent",
              fontWeight: activeTab === "track" ? 800 : 600,
              color: activeTab === "track" ? "#e91e63" : "#64748b",
              cursor: "pointer",
              fontSize: 14,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            🔍 অর্ডার ট্র্যাকিং (Track)
          </button>
          <button
            onClick={() => setActiveTab("profile")}
            style={{
              padding: "10px 18px",
              borderRadius: "8px 8px 0 0",
              border: "none",
              borderBottom: activeTab === "profile" ? "3px solid #e91e63" : "3px solid transparent",
              background: activeTab === "profile" ? "#fff" : "transparent",
              fontWeight: activeTab === "profile" ? 800 : 600,
              color: activeTab === "profile" ? "#e91e63" : "#64748b",
              cursor: "pointer",
              fontSize: 14,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            👤 প্রোফাইল ও ঠিকানা
          </button>
        </div>

        {/* TAB 1: ORDERS LIST */}
        {activeTab === "orders" && (
          <div>
            {loadingOrders ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "#64748b" }}>
                অর্ডার লোড হচ্ছে...
              </div>
            ) : !orders || orders.length === 0 ? (
              <div
                style={{
                  background: "#fff",
                  borderRadius: 16,
                  padding: "48px 20px",
                  textAlign: "center",
                  border: "1px solid #e2e8f0",
                }}
              >
                <div style={{ fontSize: 44, marginBottom: 12 }}>🛍️</div>
                <h3 style={{ margin: "0 0 8px", color: "#0f172a" }}>এখনো কোনো অর্ডার করা হয়নি</h3>
                <p style={{ color: "#64748b", fontSize: 14, maxWidth: 360, margin: "0 auto 20px" }}>
                  আপনার পছন্দের পণ্যগুলো কার্টে যোগ করে অর্ডার সম্পন্ন করুন এবং এখানে রিয়েল-টাইম ট্র্যাক করুন।
                </p>
                <Link
                  href="/products"
                  style={{
                    display: "inline-block",
                    padding: "12px 24px",
                    background: "#e91e63",
                    color: "#fff",
                    textDecoration: "none",
                    fontWeight: 700,
                    borderRadius: 10,
                  }}
                >
                  শপিং শুরু করুন ➔
                </Link>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {orders.map((o) => {
                  const statusMeta = STATUS_LABELS[o.status] || {
                    text: o.status,
                    color: "#64748b",
                    bg: "#f1f5f9",
                    icon: "📦",
                  };
                  const isExpanded = expandedOrderId === o.orderNumber;
                  const currentStepIdx = STATUS_STEPS.indexOf(o.status);

                  return (
                    <div
                      key={o.orderNumber || o._id}
                      style={{
                        background: "#fff",
                        borderRadius: 16,
                        border: "1px solid #e2e8f0",
                        padding: "20px",
                        boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
                      }}
                    >
                      {/* Order Header */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          flexWrap: "wrap",
                          gap: 10,
                          paddingBottom: 14,
                          borderBottom: "1px solid #f1f5f9",
                        }}
                      >
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <strong style={{ fontSize: 16, color: "#0f172a" }}>
                              #{o.orderNumber || o._id}
                            </strong>
                            <span
                              style={{
                                background: statusMeta.bg,
                                color: statusMeta.color,
                                padding: "4px 10px",
                                borderRadius: 12,
                                fontSize: 12,
                                fontWeight: 700,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                              }}
                            >
                              {statusMeta.icon} {statusMeta.text}
                            </span>
                          </div>
                          <span style={{ color: "#64748b", fontSize: 13, marginTop: 4, display: "block" }}>
                            তারিখ: {new Date(o.createdAt).toLocaleString("bn-BD", { dateStyle: "medium", timeStyle: "short" })}
                          </span>
                        </div>

                        <div style={{ textAlign: "right" }}>
                          <span style={{ fontSize: 12, color: "#64748b" }}>সর্বমোট (COD):</span>
                          <div style={{ fontSize: 18, fontWeight: 900, color: "#e11d48" }}>
                            ৳{o.total}
                          </div>
                        </div>
                      </div>

                      {/* Items Preview */}
                      <div style={{ marginTop: 14 }}>
                        {o.items?.map((item, idx) => (
                          <div
                            key={idx}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 12,
                              padding: "8px 0",
                              borderBottom: idx < o.items.length - 1 ? "1px dashed #f1f5f9" : "none",
                            }}
                          >
                            <img
                              src={getImageUrl(item.image) || "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=100&auto=format&fit=crop&q=80"}
                              alt={item.productName}
                              style={{
                                width: 44,
                                height: 44,
                                borderRadius: 8,
                                objectFit: "cover",
                                border: "1px solid #e2e8f0",
                              }}
                              onError={(e) => {
                                e.currentTarget.src = "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=100&auto=format&fit=crop&q=80";
                              }}
                            />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {item.productName}
                              </p>
                              <p style={{ margin: "2px 0 0", fontSize: 12, color: "#64748b" }}>
                                {item.quantity} পিস × ৳{item.price}
                              </p>
                            </div>
                            <strong style={{ fontSize: 14, color: "#334155" }}>
                              ৳{item.quantity * item.price}
                            </strong>
                          </div>
                        ))}
                      </div>

                      {/* Visual Timeline Tracking (collapsible) */}
                      {isExpanded && (
                        <div
                          style={{
                            marginTop: 16,
                            padding: 16,
                            background: "#f8fafc",
                            borderRadius: 12,
                            border: "1px solid #e2e8f0",
                          }}
                        >
                          <h4 style={{ margin: "0 0 14px", fontSize: 14, color: "#0f172a" }}>
                            🚚 লাইভ ডেলিভারি স্ট্যাটাস ট্র্যাকিং
                          </h4>

                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "repeat(4, 1fr)",
                              gap: 6,
                              textAlign: "center",
                              position: "relative",
                            }}
                          >
                            {STATUS_STEPS.map((step, sIdx) => {
                              const isCompleted = sIdx <= currentStepIdx && o.status !== "Cancelled";
                              const isCurrent = sIdx === currentStepIdx;

                              return (
                                <div key={step} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                                  <div
                                    style={{
                                      width: 32,
                                      height: 32,
                                      borderRadius: "50%",
                                      background: isCurrent
                                        ? "#e91e63"
                                        : isCompleted
                                        ? "#059669"
                                        : "#e2e8f0",
                                      color: isCompleted || isCurrent ? "#fff" : "#64748b",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      fontSize: 13,
                                      fontWeight: "bold",
                                      marginBottom: 6,
                                      boxShadow: isCurrent ? "0 0 0 4px rgba(233,30,99,0.2)" : "none",
                                    }}
                                  >
                                    {isCompleted && !isCurrent ? "✓" : sIdx + 1}
                                  </div>
                                  <span
                                    style={{
                                      fontSize: 11,
                                      fontWeight: isCurrent ? 800 : 600,
                                      color: isCurrent ? "#e91e63" : isCompleted ? "#059669" : "#94a3b8",
                                    }}
                                  >
                                    {step === "Pending" && "অর্ডার প্লেস"}
                                    {step === "Confirmed" && "কনফার্মড"}
                                    {step === "Shipped" && "শিপমেন্টে"}
                                    {step === "Delivered" && "ডেলিভার্ড"}
                                  </span>
                                </div>
                              );
                            })}
                          </div>

                          <div style={{ marginTop: 14, fontSize: 12, color: "#64748b", background: "#fff", padding: 10, borderRadius: 8, border: "1px solid #edf2f7" }}>
                            <p style={{ margin: "2px 0" }}><strong>ঠিকানা:</strong> {o.address}</p>
                            <p style={{ margin: "2px 0" }}><strong>ফোন:</strong> {o.phone}</p>
                            <p style={{ margin: "2px 0" }}><strong>ডেলিভারি চার্জ:</strong> ৳{o.deliveryCharge}</p>
                          </div>
                        </div>
                      )}

                      {/* Card Footer Actions */}
                      <div
                        style={{
                          marginTop: 14,
                          paddingTop: 10,
                          borderTop: "1px solid #f1f5f9",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          flexWrap: "wrap",
                          gap: 8,
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => setExpandedOrderId(isExpanded ? null : o.orderNumber)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#e91e63",
                            fontWeight: 700,
                            fontSize: 13,
                            cursor: "pointer",
                            padding: 0,
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          {isExpanded ? "▲ ট্র্যাকিং লুকান" : "▼ লাইভ ট্র্যাকিং দেখুন"}
                        </button>

                        <div style={{ display: "flex", gap: 10 }}>
                          {o.accessToken && (
                            <Link
                              href={`/order/verify?no=${o.orderNumber}&k=${o.accessToken}`}
                              target="_blank"
                              style={{
                                fontSize: 13,
                                color: "#0f172a",
                                textDecoration: "none",
                                fontWeight: 600,
                                background: "#f1f5f9",
                                padding: "6px 12px",
                                borderRadius: 8,
                              }}
                            >
                              📄 চালান / রসিদ ↗
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: LIVE ORDER TRACKING SEARCH */}
        {activeTab === "track" && (
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: "24px",
              border: "1px solid #e2e8f0",
            }}
          >
            <h3 style={{ margin: "0 0 8px", fontSize: 18, color: "#0f172a" }}>
              🔍 যেকোনো অর্ডার ট্র্যাক করুন (Track Any Order)
            </h3>
            <p style={{ margin: "0 0 16px", color: "#64748b", fontSize: 13 }}>
              আপনার মোবাইল নম্বর অথবা অর্ডার নাম্বার লিখে সার্চ করে অর্ডারের বর্তমান অবস্থা জানুন।
            </p>

            <form onSubmit={handleManualTrack} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input
                type="text"
                placeholder="ফোন নম্বর (যেমন 017...) অথবা অর্ডার নম্বর"
                value={trackQuery}
                onChange={(e) => setTrackQuery(e.target.value)}
                required
                style={{
                  flex: 1,
                  minWidth: 200,
                  padding: "12px 16px",
                  borderRadius: 10,
                  border: "1px solid #cbd5e1",
                  fontSize: 14,
                }}
              />
              <button
                type="submit"
                disabled={trackingLoading}
                style={{
                  padding: "12px 24px",
                  borderRadius: 10,
                  border: "none",
                  background: "#e91e63",
                  color: "#fff",
                  fontWeight: 700,
                  cursor: "pointer",
                  fontSize: 14,
                }}
              >
                {trackingLoading ? "খোঁজা হচ্ছে..." : "ট্র্যাক করুন"}
              </button>
            </form>

            {trackError && (
              <div
                style={{
                  marginTop: 16,
                  padding: 12,
                  borderRadius: 8,
                  background: "#fee2e2",
                  color: "#dc2626",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                {trackError}
              </div>
            )}

            {trackResult && (
              <div style={{ marginTop: 24 }}>
                <h4 style={{ margin: "0 0 14px", color: "#0f172a" }}>
                  পাওয়া গেছে ({trackResult.length} টি অর্ডার):
                </h4>
                {trackResult.map((order) => {
                  const stepIdx = STATUS_STEPS.indexOf(order.status);
                  const statusMeta = STATUS_LABELS[order.status] || { text: order.status, color: "#64748b", bg: "#f1f5f9" };

                  return (
                    <div
                      key={order._id}
                      style={{
                        background: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        borderRadius: 14,
                        padding: 16,
                        marginBottom: 12,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                        <div>
                          <strong>#{order.orderNumber || order._id}</strong>
                          <span style={{ display: "block", fontSize: 12, color: "#64748b" }}>
                            {new Date(order.createdAt).toLocaleDateString("bn-BD")}
                          </span>
                        </div>
                        <span
                          style={{
                            background: statusMeta.bg,
                            color: statusMeta.color,
                            fontWeight: 700,
                            fontSize: 12,
                            padding: "4px 10px",
                            borderRadius: 10,
                          }}
                        >
                          {statusMeta.text}
                        </span>
                      </div>

                      {/* Tracker Steps */}
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(4, 1fr)",
                          gap: 6,
                          textAlign: "center",
                          margin: "16px 0",
                        }}
                      >
                        {STATUS_STEPS.map((s, idx) => {
                          const isComp = idx <= stepIdx;
                          return (
                            <div key={s}>
                              <div
                                style={{
                                  width: 28,
                                  height: 28,
                                  borderRadius: "50%",
                                  background: idx === stepIdx ? "#e91e63" : isComp ? "#059669" : "#cbd5e1",
                                  color: "#fff",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: 12,
                                  fontWeight: "bold",
                                  marginBottom: 4,
                                }}
                              >
                                {isComp ? "✓" : idx + 1}
                              </div>
                              <div style={{ fontSize: 11, fontWeight: idx === stepIdx ? 800 : 500 }}>
                                {s}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div style={{ fontSize: 13, color: "#475569" }}>
                        <p style={{ margin: "2px 0" }}><strong>গ্রাহক:</strong> {order.customerName} ({order.phone})</p>
                        <p style={{ margin: "2px 0" }}><strong>ঠিকানা:</strong> {order.address}</p>
                        <p style={{ margin: "4px 0", fontWeight: "bold", color: "#e11d48" }}>
                          মোট বিল: ৳{order.total} (ক্যাশ অন ডেলিভারি)
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: PROFILE SETTINGS */}
        {activeTab === "profile" && (
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: "24px",
              border: "1px solid #e2e8f0",
              maxWidth: 600,
            }}
          >
            <h3 style={{ margin: "0 0 8px", fontSize: 18, color: "#0f172a" }}>
              👤 প্রোফাইল ও ডেলিভারি তথ্য
            </h3>
            <p style={{ margin: "0 0 18px", color: "#64748b", fontSize: 13 }}>
              আপনার নাম, ফোন নম্বর ও ডেলিভারি ঠিকানা সেভ রাখুন যাতে ভবিষ্যতে দ্রুত ১-ক্লিকে অর্ডার করতে পারেন।
            </p>

            <form onSubmit={handleSaveProfile} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                  আপনার নাম (Full Name)
                </label>
                <input
                  type="text"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  placeholder="আপনার নাম লিখুন"
                  style={inputStyle}
                  required
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                  ইমেইল অ্যাড্রেস (Email - View Only)
                </label>
                <input
                  type="email"
                  value={user.email || ""}
                  disabled
                  style={{ ...inputStyle, background: "#f1f5f9", color: "#64748b", cursor: "not-allowed" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                  মোবাইল নম্বর (Phone Number)
                </label>
                <input
                  type="tel"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  placeholder="017XXXXXXXX"
                  maxLength={11}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                  ডিফল্ট ডেলিভারি ঠিকানা (Default Delivery Address)
                </label>
                <textarea
                  rows={3}
                  value={profileForm.address}
                  onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                  placeholder="বাড়ি নং, রোড নং, এলাকা, থানা ও জেলা"
                  style={{ ...inputStyle, resize: "vertical" }}
                ></textarea>
              </div>

              {profileMsg && (
                <div style={{ background: "#d1fae5", color: "#065f46", padding: 12, borderRadius: 8, fontSize: 13, fontWeight: 600 }}>
                  {profileMsg}
                </div>
              )}

              {profileErr && (
                <div style={{ background: "#fee2e2", color: "#b91c1c", padding: 12, borderRadius: 8, fontSize: 13, fontWeight: 600 }}>
                  {profileErr}
                </div>
              )}

              <button
                type="submit"
                disabled={savingProfile}
                style={{
                  padding: "13px 20px",
                  borderRadius: 10,
                  border: "none",
                  background: "#0f172a",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                {savingProfile ? "সংরক্ষণ হচ্ছে..." : "তথ্য আপডেট করুন"}
              </button>
            </form>
          </div>
        )}
      </div>

      <MobileBottomNav />
    </main>
  );
}

const statCardStyle = {
  background: "#fff",
  borderRadius: 14,
  padding: "14px 16px",
  border: "1px solid #e2e8f0",
  display: "flex",
  flexDirection: "column",
  gap: 4,
  boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
};

const inputStyle = {
  width: "100%",
  padding: "11px 14px",
  borderRadius: 8,
  border: "1px solid #cbd5e1",
  fontSize: 14,
  boxSizing: "border-box",
};
