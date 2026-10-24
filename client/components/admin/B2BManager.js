"use client";

import React, { useState, useEffect, useMemo } from "react";

export default function B2BManager() {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({
    adminCount: 0,
    wholesaleCount: 0,
    resellerCount: 0,
    customerCount: 0,
    pendingCount: 0,
    totalWalletLiability: 0,
  });
  const [recentLedger, setRecentLedger] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Filters
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all"); // 'all' | 'wholesale' | 'reseller' | 'pending'
  const [activeSubTab, setActiveSubTab] = useState("members"); // 'members' | 'ledger'

  // Modal / Form States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Add / Edit Form State
  const [formData, setFormData] = useState({
    email: "",
    name: "",
    phone: "",
    role: "wholesale",
    businessName: "",
    resellerStoreName: "",
    resellerStorePhone: "",
    note: "",
    wholesaleDiscountPct: 0,
    minWholesaleOrderAmount: 5000,
    initialWalletBalance: 0,
    status: "active",
  });

  // Wallet Adjustment Form State
  const [walletForm, setWalletForm] = useState({
    amount: "",
    type: "credit", // 'credit' | 'debit'
    note: "",
  });

  const [saving, setSaving] = useState(false);

  const getAdminToken = () =>
    typeof window !== "undefined" ? localStorage.getItem("jt_admin_token") || "" : "";

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch("/api/admin/b2b-users?role=all", {
        headers: { Authorization: `Bearer ${getAdminToken()}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load data");
      setUsers(data.users || []);
      setStats(data.stats || {
        wholesaleCount: 0,
        resellerCount: 0,
        pendingCount: 0,
        totalWalletLiability: 0,
      });
      setRecentLedger(data.recentLedger || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered Users
  const filteredUsers = useMemo(() => {
    let list = [...users];
    if (roleFilter === "admin") {
      list = list.filter((u) => u.role === "admin");
    } else if (roleFilter === "wholesale") {
      list = list.filter((u) => u.role === "wholesale");
    } else if (roleFilter === "reseller") {
      list = list.filter((u) => u.role === "reseller");
    } else if (roleFilter === "customer" || roleFilter === "user") {
      list = list.filter((u) => u.role === "user" || u.role === "customer" || !u.role);
    } else if (roleFilter === "pending") {
      list = list.filter((u) => u.status === "pending");
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (u) =>
          (u.email || "").toLowerCase().includes(q) ||
          (u.name || "").toLowerCase().includes(q) ||
          (u.phone || "").includes(q) ||
          (u.businessName || "").toLowerCase().includes(q) ||
          (u.resellerStoreName || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [users, roleFilter, search]);

  const handleOpenAdd = () => {
    setFormData({
      email: "",
      name: "",
      phone: "",
      role: "wholesale",
      businessName: "",
      resellerStoreName: "",
      resellerStorePhone: "",
      note: "",
      wholesaleDiscountPct: 0,
      minWholesaleOrderAmount: 5000,
      initialWalletBalance: 0,
      status: "active",
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (user) => {
    setSelectedUser(user);
    setFormData({
      email: user.email || "",
      name: user.name || "",
      phone: user.phone || "",
      role: user.role || "wholesale",
      businessName: user.businessName || "",
      resellerStoreName: user.resellerStoreName || "",
      resellerStorePhone: user.resellerStorePhone || "",
      note: user.note || "",
      wholesaleDiscountPct: user.wholesaleDiscountPct || 0,
      minWholesaleOrderAmount: user.minWholesaleOrderAmount || 5000,
      status: user.status || "active",
    });
    setIsEditModalOpen(true);
  };

  const handleOpenWallet = (user) => {
    setSelectedUser(user);
    setWalletForm({ amount: "", type: "credit", note: "" });
    setIsWalletModalOpen(true);
  };

  const handleSaveAdd = async (e) => {
    e.preventDefault();
    if (!formData.email.trim() || !formData.email.includes("@")) {
      alert("সঠিক ইমেইল এড্রেস লিখুন");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const res = await fetch("/api/admin/b2b-users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getAdminToken()}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to add B2B member");

      setSuccess(data.message);
      setIsAddModalOpen(false);
      loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const res = await fetch("/api/admin/b2b-users", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getAdminToken()}`,
        },
        body: JSON.stringify({
          id: selectedUser._id,
          ...formData,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update member");

      setSuccess(data.message);
      setIsEditModalOpen(false);
      loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveWalletAdjustment = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    const val = Number(walletForm.amount);
    if (!val || isNaN(val) || val <= 0) {
      alert("সঠিক টাকার পরিমাণ লিখুন");
      return;
    }

    const adjustment = walletForm.type === "credit" ? val : -val;

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const res = await fetch("/api/admin/b2b-users", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getAdminToken()}`,
        },
        body: JSON.stringify({
          id: selectedUser._id,
          walletAdjustment: adjustment,
          adjustmentNote: walletForm.note || `Admin manual ${walletForm.type}`,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Wallet adjustment failed");

      setSuccess(data.message);
      setIsWalletModalOpen(false);
      loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRevoke = async (user) => {
    if (!confirm(`আপনি কি নিশ্চিতভাবে ${user.email}-এর রোল পরিবর্তন করে সাধারণ কাস্টমার (Customer) করতে চান?`)) {
      return;
    }

    try {
      setError("");
      const res = await fetch(`/api/admin/b2b-users?id=${user._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getAdminToken()}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to revoke access");
      setSuccess(data.message);
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={{ padding: "8px 0" }}>
      {/* Header Title */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 28 }}>🤝</span>
            <h2 style={{ margin: 0, fontSize: "clamp(20px, 4vw, 24px)", fontWeight: 900, color: "#0f172a" }}>
              B2B Wholesale & Resellers Network
            </h2>
          </div>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>
            ইমেইল অনুমোদনের মাধ্যমে হোলসেলার ও ৫০+ রিসেলার অ্যাকাউন্ট নিয়ন্ত্রণ এবং ওয়ালেট মার্জিন হিসাব
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          style={{
            background: "linear-gradient(135deg, #e11d48, #be123c)",
            color: "#fff",
            border: "none",
            padding: "10px 20px",
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 800,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            boxShadow: "0 4px 12px rgba(225,29,72,0.25)",
          }}
        >
          ➕ Whitelist New B2B Member
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div style={{ background: "#fee2e2", border: "1px solid #f87171", color: "#b91c1c", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 14 }}>
          ⚠️ {error}
        </div>
      )}
      {success && (
        <div style={{ background: "#dcfce7", border: "1px solid #4ade80", color: "#15803d", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 14 }}>
          ✓ {success}
        </div>
      )}

      {/* 5 Executive KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 22 }}>
        <div style={{ background: "#ffffff", padding: "16px 18px", borderRadius: 14, border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>System Admins</span>
            <span style={{ fontSize: 20 }}>🛡️</span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 900, color: "#065f46", marginTop: 6 }}>
            {stats.adminCount || 0} <span style={{ fontSize: 13, fontWeight: 600, color: "#64748b" }}>Admins</span>
          </div>
          <span style={{ fontSize: 11, color: "#059669", fontWeight: 700 }}>Full system control</span>
        </div>

        <div style={{ background: "#ffffff", padding: "16px 18px", borderRadius: 14, border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Wholesale Buyers</span>
            <span style={{ fontSize: 20 }}>🏬</span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 900, color: "#6d28d9", marginTop: 6 }}>
            {stats.wholesaleCount || 0} <span style={{ fontSize: 13, fontWeight: 600, color: "#64748b" }}>Accounts</span>
          </div>
          <span style={{ fontSize: 11, color: "#7c3aed", fontWeight: 700 }}>Bulk order & MOQ access</span>
        </div>

        <div style={{ background: "#ffffff", padding: "16px 18px", borderRadius: 14, border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Active Resellers</span>
            <span style={{ fontSize: 20 }}>🚀</span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 900, color: "#be123c", marginTop: 6 }}>
            {stats.resellerCount || 0} <span style={{ fontSize: 13, fontWeight: 600, color: "#64748b" }}>/ 50+ Target</span>
          </div>
          <div style={{ height: 6, background: "#f1f5f9", borderRadius: 3, marginTop: 6, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${Math.min(100, (((stats.resellerCount || 0) / 50) * 100))}%`, background: "#e11d48", borderRadius: 3 }} />
          </div>
        </div>

        <div style={{ background: "#ffffff", padding: "16px 18px", borderRadius: 14, border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Retail Customers</span>
            <span style={{ fontSize: 20 }}>👤</span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 900, color: "#334155", marginTop: 6 }}>
            {stats.customerCount || 0} <span style={{ fontSize: 13, fontWeight: 600, color: "#64748b" }}>Users</span>
          </div>
          <span style={{ fontSize: 11, color: "#64748b", fontWeight: 700 }}>Standard retail accounts</span>
        </div>

        <div style={{ background: "#ffffff", padding: "16px 18px", borderRadius: 14, border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Wallet Liability</span>
            <span style={{ fontSize: 20 }}>💰</span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 900, color: "#047857", marginTop: 6 }}>
            ৳{Number(stats.totalWalletLiability || 0).toLocaleString()}
          </div>
          <span style={{ fontSize: 11, color: "#059669", fontWeight: 700 }}>Reseller pending payout</span>
        </div>
      </div>

      {/* Sub Tab Switcher: Members vs Ledger */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, borderBottom: "1px solid #e2e8f0", paddingBottom: 10 }}>
        <button
          type="button"
          onClick={() => setActiveSubTab("members")}
          style={{
            background: activeSubTab === "members" ? "#0f172a" : "#f1f5f9",
            color: activeSubTab === "members" ? "#fff" : "#475569",
            border: "none",
            padding: "8px 16px",
            borderRadius: 8,
            fontSize: 12.5,
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          👥 B2B Members ({filteredUsers.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("ledger")}
          style={{
            background: activeSubTab === "ledger" ? "#0f172a" : "#f1f5f9",
            color: activeSubTab === "ledger" ? "#fff" : "#475569",
            border: "none",
            padding: "8px 16px",
            borderRadius: 8,
            fontSize: 12.5,
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          📜 Reseller Profit & Payout Ledger ({recentLedger.length})
        </button>
      </div>

      {activeSubTab === "members" && (
        <>
          {/* Controls Bar: Search & Role Filters */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {[
                { key: "all", label: `👥 All (${users.length})` },
                { key: "admin", label: `🛡️ Admins (${stats.adminCount || 0})` },
                { key: "wholesale", label: `🏬 Wholesalers (${stats.wholesaleCount || 0})` },
                { key: "reseller", label: `🚀 Resellers (${stats.resellerCount || 0})` },
                { key: "customer", label: `👤 Customers (${stats.customerCount || 0})` },
                { key: "pending", label: `⏳ Pending (${stats.pendingCount || 0})` },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setRoleFilter(tab.key)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 700,
                    border: "none",
                    cursor: "pointer",
                    background: roleFilter === tab.key ? "#e11d48" : "#f1f5f9",
                    color: roleFilter === tab.key ? "#fff" : "#475569",
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <input
              type="text"
              placeholder="🔍 Search name, email, phone, store..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                border: "1px solid #cbd5e1",
                fontSize: 12.5,
                minWidth: 260,
                outline: "none",
              }}
            />
          </div>

          {/* Members Table */}
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #cbd5e1", overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, textAlign: "left" }}>
                <thead style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                  <tr>
                    <th style={{ padding: "12px 14px", fontWeight: 800, color: "#334155" }}>Member Info</th>
                    <th style={{ padding: "12px 14px", fontWeight: 800, color: "#334155" }}>Business / Store</th>
                    <th style={{ padding: "12px 14px", fontWeight: 800, color: "#334155" }}>Role</th>
                    <th style={{ padding: "12px 14px", fontWeight: 800, color: "#334155", textAlign: "right" }}>Orders / Volume</th>
                    <th style={{ padding: "12px 14px", fontWeight: 800, color: "#334155", textAlign: "right" }}>Wallet Balance</th>
                    <th style={{ padding: "12px 14px", fontWeight: 800, color: "#334155", textAlign: "center" }}>Status</th>
                    <th style={{ padding: "12px 14px", fontWeight: 800, color: "#334155", textAlign: "center" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} style={{ padding: 30, textAlign: "center", color: "#64748b" }}>
                        লোড হচ্ছে...
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: 30, textAlign: "center", color: "#64748b" }}>
                        কোনো B2B ইউজার পাওয়া যায়নি। উপরে <strong>&quot;+ Whitelist New B2B Member&quot;</strong> দিয়ে নতুন ইউজার যুক্ত করুন।
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u, idx) => (
                      <tr key={u._id || idx} style={{ borderBottom: "1px solid #f1f5f9", background: idx % 2 === 0 ? "#fff" : "#fafafa" }}>
                        <td style={{ padding: "12px 14px" }}>
                          <div style={{ fontWeight: 800, color: "#0f172a" }}>{u.name || "Unnamed"}</div>
                          <div style={{ fontSize: 11.5, color: "#64748b" }}>{u.email}</div>
                          {u.phone && <div style={{ fontSize: 11, color: "#0284c7" }}>📞 {u.phone}</div>}
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <div style={{ fontWeight: 700, color: "#1e293b" }}>
                            {u.role === "reseller" ? u.resellerStoreName || "—" : u.businessName || "—"}
                          </div>
                          {u.note && <div style={{ fontSize: 11, color: "#94a3b8" }}>📝 {u.note}</div>}
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          {u.role === "admin" && (
                            <span style={{ background: "#ecfdf5", color: "#065f46", border: "1px solid #a7f3d0", padding: "4px 10px", borderRadius: 12, fontWeight: 900, fontSize: 11, display: "inline-flex", alignItems: "center", gap: 4 }}>
                              🛡️ Admin
                            </span>
                          )}
                          {u.role === "wholesale" && (
                            <span style={{ background: "#ede9fe", color: "#6d28d9", border: "1px solid #ddd6fe", padding: "4px 10px", borderRadius: 12, fontWeight: 900, fontSize: 11, display: "inline-flex", alignItems: "center", gap: 4 }}>
                              🏬 Wholesaler
                            </span>
                          )}
                          {u.role === "reseller" && (
                            <span style={{ background: "#ffe4e6", color: "#be123c", border: "1px solid #fecdd3", padding: "4px 10px", borderRadius: 12, fontWeight: 900, fontSize: 11, display: "inline-flex", alignItems: "center", gap: 4 }}>
                              🚀 Reseller
                            </span>
                          )}
                          {(u.role === "user" || u.role === "customer" || !u.role) && (
                            <span style={{ background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0", padding: "4px 10px", borderRadius: 12, fontWeight: 800, fontSize: 11, display: "inline-flex", alignItems: "center", gap: 4 }}>
                              👤 Customer
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "12px 14px", textAlign: "right" }}>
                          <div style={{ fontWeight: 800, color: "#0f172a" }}>{u.orderCount || 0} Orders</div>
                          <div style={{ fontSize: 11.5, color: "#64748b" }}>৳{Number(u.totalSpend || 0).toLocaleString()}</div>
                        </td>
                        <td style={{ padding: "12px 14px", textAlign: "right" }}>
                          <div style={{ fontWeight: 900, color: u.walletBalance > 0 ? "#059669" : "#64748b", fontSize: 13 }}>
                            ৳{Number(u.walletBalance || 0).toLocaleString()}
                          </div>
                          {u.role === "reseller" && (
                            <button
                              type="button"
                              onClick={() => handleOpenWallet(u)}
                              style={{
                                background: "none",
                                border: "none",
                                color: "#2563eb",
                                fontSize: 11,
                                fontWeight: 700,
                                cursor: "pointer",
                                textDecoration: "underline",
                                padding: 0,
                                marginTop: 2,
                              }}
                            >
                              ± Adjust
                            </button>
                          )}
                        </td>
                        <td style={{ padding: "12px 14px", textAlign: "center" }}>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "3px 8px",
                              borderRadius: 10,
                              fontSize: 10.5,
                              fontWeight: 800,
                              background: u.status === "active" ? "#ecfdf5" : u.status === "pending" ? "#fef3c7" : "#fee2e2",
                              color: u.status === "active" ? "#047857" : u.status === "pending" ? "#b45309" : "#b91c1c",
                            }}
                          >
                            {u.status || "active"}
                          </span>
                        </td>
                        <td style={{ padding: "12px 14px", textAlign: "center" }}>
                          <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                            <button
                              type="button"
                              title="Edit Member"
                              onClick={() => handleOpenEdit(u)}
                              style={{
                                background: "#f1f5f9",
                                border: "1px solid #cbd5e1",
                                padding: "4px 8px",
                                borderRadius: 6,
                                fontSize: 11,
                                fontWeight: 700,
                                cursor: "pointer",
                              }}
                            >
                              ✏️ Edit
                            </button>
                            {(u.role !== "user" && u.role !== "customer") && (
                              <button
                                type="button"
                                title="Reset to Customer"
                                onClick={() => handleRevoke(u)}
                                style={{
                                  background: "#fee2e2",
                                  border: "1px solid #fecaca",
                                  color: "#dc2626",
                                  padding: "4px 8px",
                                  borderRadius: 6,
                                  fontSize: 11,
                                  fontWeight: 700,
                                  cursor: "pointer",
                                }}
                              >
                                ↺ Reset
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Ledger View */}
      {activeSubTab === "ledger" && (
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #cbd5e1", overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "#0f172a" }}>
              📜 Real-Time Reseller Commission & Payout Ledger
            </h3>
            <p style={{ margin: "2px 0 0", fontSize: 11.5, color: "#64748b" }}>
              অর্ডার ডেলিভারির অটোমেটিক প্রফিট ক্রেডিট, কুরিয়ার চার্জ সমন্বয় এবং পে-আউট হিস্ট্রি
            </p>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, textAlign: "left" }}>
              <thead style={{ background: "#f1f5f9", borderBottom: "1px solid #e2e8f0" }}>
                <tr>
                  <th style={{ padding: "10px 14px", fontWeight: 800 }}>Date & Time</th>
                  <th style={{ padding: "10px 14px", fontWeight: 800 }}>Reseller Email</th>
                  <th style={{ padding: "10px 14px", fontWeight: 800 }}>Type</th>
                  <th style={{ padding: "10px 14px", fontWeight: 800 }}>Order #</th>
                  <th style={{ padding: "10px 14px", fontWeight: 800, textAlign: "right" }}>Amount</th>
                  <th style={{ padding: "10px 14px", fontWeight: 800, textAlign: "right" }}>Balance After</th>
                  <th style={{ padding: "10px 14px", fontWeight: 800 }}>Note / Details</th>
                </tr>
              </thead>
              <tbody>
                {recentLedger.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: 24, textAlign: "center", color: "#64748b" }}>
                      কোনো লেনদেন রেকর্ড পাওয়া যায়নি।
                    </td>
                  </tr>
                ) : (
                  recentLedger.map((tr) => (
                    <tr key={tr._id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "10px 14px", color: "#64748b", whiteSpace: "nowrap" }}>
                        {new Date(tr.createdAt).toLocaleString()}
                      </td>
                      <td style={{ padding: "10px 14px", fontWeight: 700, color: "#0f172a" }}>{tr.resellerEmail}</td>
                      <td style={{ padding: "10px 14px" }}>
                        <span
                          style={{
                            padding: "3px 8px",
                            borderRadius: 10,
                            fontSize: 10.5,
                            fontWeight: 800,
                            background:
                              tr.type === "profit_credit"
                                ? "#dcfce7"
                                : tr.type === "payout_withdrawal"
                                ? "#fef3c7"
                                : "#fee2e2",
                            color:
                              tr.type === "profit_credit"
                                ? "#15803d"
                                : tr.type === "payout_withdrawal"
                                ? "#b45309"
                                : "#b91c1c",
                          }}
                        >
                          {tr.type}
                        </span>
                      </td>
                      <td style={{ padding: "10px 14px", color: "#0284c7", fontWeight: 700 }}>{tr.orderNumber || "—"}</td>
                      <td
                        style={{
                          padding: "10px 14px",
                          textAlign: "right",
                          fontWeight: 900,
                          color: tr.amount >= 0 ? "#15803d" : "#b91c1c",
                        }}
                      >
                        {tr.amount >= 0 ? `+৳${tr.amount}` : `-৳${Math.abs(tr.amount)}`}
                      </td>
                      <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 800, color: "#0f172a" }}>
                        ৳{tr.balanceAfter}
                      </td>
                      <td style={{ padding: "10px 14px", color: "#64748b" }}>{tr.note || tr.payoutAccount || "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Whitelist New Member */}
      {isAddModalOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 14 }}>
          <div style={{ background: "#fff", width: "100%", maxWidth: 520, borderRadius: 16, padding: 22, boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 900, color: "#0f172a" }}>
                ➕ Whitelist New B2B Member
              </h3>
              <button type="button" onClick={() => setIsAddModalOpen(false)} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer" }}>✕</button>
            </div>

            <form onSubmit={handleSaveAdd}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
                  ইমেইল অ্যাড্রেস * (বাধ্যতামূলক)
                </label>
                <input
                  type="email"
                  required
                  placeholder="partner@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13, outline: "none", boxSizing: "border-box" }}
                />
                <span style={{ fontSize: 11, color: "#64748b" }}>
                  এই ইমেইল দিয়ে ইউজার লগইন করলেই সরাসরি নির্বাচিত পারমিশন ও দাম দেখতে পাবে।
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
                    অ্যাকাউন্ট টাইপ (Role) *
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13, background: "#f8fafc" }}
                  >
                    <option value="wholesale">🏬 Wholesaler (পাইকারি বাল্ক ক্রেতা)</option>
                    <option value="reseller">🚀 Reseller (৫০+ রিসেলার / ড্রপশিপার)</option>
                    <option value="admin">🛡️ Admin (সিস্টেম অ্যাডমিন)</option>
                    <option value="user">👤 Customer (সাধারণ রিটেইল কাস্টমার)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
                    স্ট্যাটাস
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13, background: "#f8fafc" }}
                  >
                    <option value="active">Active (সক্রিয়)</option>
                    <option value="pending">Pending Approval</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>

              {formData.role === "wholesale" ? (
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
                    ব্যবসার / শোরুমের নাম (Business Name)
                  </label>
                  <input
                    type="text"
                    placeholder="যেমন: New Market Beauty Corner"
                    value={formData.businessName}
                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13, boxSizing: "border-box" }}
                  />
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
                      রিসেলার পেজ / স্টোরের নাম
                    </label>
                    <input
                      type="text"
                      placeholder="যেমন: Glow Up BD"
                      value={formData.resellerStoreName}
                      onChange={(e) => setFormData({ ...formData, resellerStoreName: e.target.value })}
                      style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13, boxSizing: "border-box" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
                      স্টোরের অফিসিয়াল ফোন
                    </label>
                    <input
                      type="text"
                      placeholder="017XXXXXXXX"
                      value={formData.resellerStorePhone}
                      onChange={(e) => setFormData({ ...formData, resellerStorePhone: e.target.value })}
                      style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13, boxSizing: "border-box" }}
                    />
                  </div>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
                    মেম্বারের নাম
                  </label>
                  <input
                    type="text"
                    placeholder="নাম"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13, boxSizing: "border-box" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
                    ব্যক্তিগত মোবাইল
                  </label>
                  <input
                    type="text"
                    placeholder="018XXXXXXXX"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13, boxSizing: "border-box" }}
                  />
                </div>
              </div>

              {formData.role === "reseller" && (
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
                    প্রাথমিক ওয়ালেট ব্যালেন্স (ঐচ্ছিক ক্রেডিট / সিকিউরিটি ডিপোজিট)
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    value={formData.initialWalletBalance}
                    onChange={(e) => setFormData({ ...formData, initialWalletBalance: e.target.value })}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13, boxSizing: "border-box" }}
                  />
                </div>
              )}

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
                  অ্যাডমিন নোট / মন্তব্য
                </label>
                <input
                  type="text"
                  placeholder="যেমন: ফেসবুক গ্রুপ মডারেটর / চিটাগং ডিলার"
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13, boxSizing: "border-box" }}
                />
              </div>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  style={{ background: "#f1f5f9", border: "1px solid #cbd5e1", padding: "10px 16px", borderRadius: 8, fontWeight: 700, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    background: "linear-gradient(135deg, #e11d48, #be123c)",
                    color: "#fff",
                    border: "none",
                    padding: "10px 22px",
                    borderRadius: 8,
                    fontWeight: 800,
                    cursor: saving ? "not-allowed" : "pointer",
                  }}
                >
                  {saving ? "Saving..." : "✓ Grant Access & Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Member */}
      {isEditModalOpen && selectedUser && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 14 }}>
          <div style={{ background: "#fff", width: "100%", maxWidth: 500, borderRadius: 16, padding: 22 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: "#0f172a" }}>
                ✏️ Edit Member: {selectedUser.email}
              </h3>
              <button type="button" onClick={() => setIsEditModalOpen(false)} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer" }}>✕</button>
            </div>

            <form onSubmit={handleSaveEdit}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 4 }}>Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13 }}
                  >
                    <option value="admin">🛡️ Admin (সিস্টেম অ্যাডমিন)</option>
                    <option value="wholesale">🏬 Wholesaler (পাইকারি ক্রেতা)</option>
                    <option value="reseller">🚀 Reseller (৫০+ ড্রপশিপার)</option>
                    <option value="user">👤 Customer (সাধারণ রিটেইল কাস্টমার)</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 4 }}>Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13 }}
                  >
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
                  {formData.role === "reseller" ? "Reseller Store Name" : "Business / Shop Name"}
                </label>
                <input
                  type="text"
                  value={formData.role === "reseller" ? formData.resellerStoreName : formData.businessName}
                  onChange={(e) =>
                    formData.role === "reseller"
                      ? setFormData({ ...formData, resellerStoreName: e.target.value })
                      : setFormData({ ...formData, businessName: e.target.value })
                  }
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13, boxSizing: "border-box" }}
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 4 }}>Phone</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13, boxSizing: "border-box" }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 4 }}>Admin Note</label>
                <input
                  type="text"
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13, boxSizing: "border-box" }}
                />
              </div>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  style={{ background: "#f1f5f9", border: "1px solid #cbd5e1", padding: "8px 16px", borderRadius: 8, fontWeight: 700, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{ background: "#0f172a", color: "#fff", border: "none", padding: "8px 20px", borderRadius: 8, fontWeight: 800, cursor: "pointer" }}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Adjust Wallet Balance */}
      {isWalletModalOpen && selectedUser && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 14 }}>
          <div style={{ background: "#fff", width: "100%", maxWidth: 420, borderRadius: 16, padding: 22 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: "#0f172a" }}>
                💳 Adjust Reseller Wallet
              </h3>
              <button type="button" onClick={() => setIsWalletModalOpen(false)} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer" }}>✕</button>
            </div>

            <p style={{ margin: "0 0 12px", fontSize: 12.5, color: "#64748b" }}>
              Reseller: <strong>{selectedUser.email}</strong><br />
              বর্তমান ব্যালেন্স: <strong>৳{selectedUser.walletBalance || 0}</strong>
            </p>

            <form onSubmit={handleSaveWalletAdjustment}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 4 }}>ধরণ (Type)</label>
                <select
                  value={walletForm.type}
                  onChange={(e) => setWalletForm({ ...walletForm, type: e.target.value })}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13 }}
                >
                  <option value="credit">➕ Credit (ব্যালেন্স যোগ করুন - টাকা দিচ্ছেন)</option>
                  <option value="debit">➖ Debit (ব্যালেন্স কাটুন - ক্যাশআউট বা ফাইন)</option>
                </select>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 4 }}>টাকার পরিমাণ (Tk) *</label>
                <input
                  type="number"
                  required
                  placeholder="যেমন: 500"
                  value={walletForm.amount}
                  onChange={(e) => setWalletForm({ ...walletForm, amount: e.target.value })}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13, boxSizing: "border-box" }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 4 }}>অ্যাডমিন নোট / ট্রানজ্যাকশন কারণ</label>
                <input
                  type="text"
                  placeholder="যেমন: bKash payout TrxID #8271612"
                  value={walletForm.note}
                  onChange={(e) => setWalletForm({ ...walletForm, note: e.target.value })}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13, boxSizing: "border-box" }}
                />
              </div>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setIsWalletModalOpen(false)}
                  style={{ background: "#f1f5f9", border: "1px solid #cbd5e1", padding: "8px 16px", borderRadius: 8, fontWeight: 700, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    background: walletForm.type === "credit" ? "#16a34a" : "#dc2626",
                    color: "#fff",
                    border: "none",
                    padding: "8px 20px",
                    borderRadius: 8,
                    fontWeight: 800,
                    cursor: saving ? "not-allowed" : "pointer",
                  }}
                >
                  {saving ? "Saving..." : walletForm.type === "credit" ? "✓ Credit Balance" : "✓ Deduct Balance"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
