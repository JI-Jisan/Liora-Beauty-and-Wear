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

  // Filters & Subtabs
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [activeSubTab, setActiveSubTab] = useState("members"); // 'members' | 'squads' | 'brandMargins' | 'ledger'

  // Team Leader & Brand Margin States
  const [teamLeaders, setTeamLeaders] = useState([]);
  const [brands, setBrands] = useState([]);
  const [brandMargins, setBrandMargins] = useState({});
  const [selectedSquadResellers, setSelectedSquadResellers] = useState([]);
  const [targetTeamLeader, setTargetTeamLeader] = useState("");

  // Modal / Form States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedViewUser, setSelectedViewUser] = useState(null);

  // Add / Edit Form State
  const [formData, setFormData] = useState({
    email: "",
    name: "",
    phone: "",
    address: "",
    fbPageLink: "",
    tradeLicense: "",
    appliedRole: "",
    role: "wholesale",
    businessName: "",
    resellerStoreName: "",
    resellerStorePhone: "",
    teamLeaderEmail: "",
    teamLeaderName: "",
    teamLeaderId: "",
    isWeeklyStar: false,
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
      setTeamLeaders(data.teamLeaders || []);
      setBrands(data.brands || []);
      const margins = {};
      (data.brands || []).forEach((b) => {
        margins[b._id] = b.wholesaleMarginPct ?? 7;
      });
      setBrandMargins(margins);
      setStats(data.stats || {
        adminCount: 0,
        wholesaleCount: 0,
        resellerCount: 0,
        customerCount: 0,
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

  const handleToggleStar = async (user) => {
    try {
      setError("");
      setSuccess("");
      const res = await fetch("/api/admin/b2b-users", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getAdminToken()}`,
        },
        body: JSON.stringify({
          id: user._id,
          toggleWeeklyStar: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to toggle star");
      setSuccess(data.message);
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleBulkAssignSquad = async () => {
    if (!selectedSquadResellers.length || !targetTeamLeader) {
      alert("কমপক্ষে একজন রিসেলার এবং একজন টিম লিডার নির্বাচন করুন");
      return;
    }
    const leaderObj = teamLeaders.find((l) => l.email === targetTeamLeader);
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
          bulkAssignSquad: true,
          resellerIds: selectedSquadResellers,
          teamLeaderEmail: targetTeamLeader,
          teamLeaderName: leaderObj?.name || "",
          teamLeaderId: leaderObj?._id || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to assign squad");
      setSuccess(data.message);
      setSelectedSquadResellers([]);
      loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBrandMargins = async () => {
    try {
      setSaving(true);
      setError("");
      setSuccess("");
      const payload = Object.keys(brandMargins).map((id) => ({
        id,
        margin: Number(brandMargins[id]) || 0,
      }));
      const res = await fetch("/api/admin/b2b-users", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getAdminToken()}`,
        },
        body: JSON.stringify({ brandMargins: payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to save margins");
      setSuccess(data.message);
      loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
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
    } else if (roleFilter === "team_leader") {
      list = list.filter((u) => u.role === "team_leader");
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

  const handleOpenDetails = (user) => {
    setSelectedViewUser(user);
    setIsDetailsModalOpen(true);
  };

  const handleQuickApprove = async (user, targetRole) => {
    const roleToSet = targetRole || user.appliedRole || user.role || "reseller";
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
          id: user._id,
          role: roleToSet,
          status: "active",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to approve user");
      setSuccess(`${user.name || user.email} কে ${roleToSet === "reseller" ? "রিসেলার" : "হোলসেলার"} হিসেবে অনুমোদন করা হয়েছে!`);
      if (selectedViewUser?._id === user._id) {
        setSelectedViewUser({ ...selectedViewUser, role: roleToSet, status: "active" });
      }
      loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleOpenAdd = () => {
    setFormData({
      email: "",
      name: "",
      phone: "",
      address: "",
      fbPageLink: "",
      tradeLicense: "",
      appliedRole: "",
      role: "wholesale",
      businessName: "",
      resellerStoreName: "",
      resellerStorePhone: "",
      teamLeaderEmail: "",
      teamLeaderName: "",
      teamLeaderId: "",
      isWeeklyStar: false,
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
      address: user.address || "",
      fbPageLink: user.fbPageLink || "",
      tradeLicense: user.tradeLicense || "",
      appliedRole: user.appliedRole || "",
      role: user.role || "wholesale",
      businessName: user.businessName || "",
      resellerStoreName: user.resellerStoreName || "",
      resellerStorePhone: user.resellerStorePhone || "",
      teamLeaderEmail: user.teamLeaderEmail || "",
      teamLeaderName: user.teamLeaderName || "",
      teamLeaderId: user.teamLeader || "",
      isWeeklyStar: Boolean(user.isWeeklyStar),
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

      {/* Sub Tab Switcher: Members vs Squads vs Brand Margins vs Ledger */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, borderBottom: "1px solid #e2e8f0", paddingBottom: 10, overflowX: "auto" }}>
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
            whiteSpace: "nowrap",
          }}
        >
          👥 B2B Members ({filteredUsers.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("squads")}
          style={{
            background: activeSubTab === "squads" ? "#0f172a" : "#f1f5f9",
            color: activeSubTab === "squads" ? "#fff" : "#475569",
            border: "none",
            padding: "8px 16px",
            borderRadius: 8,
            fontSize: 12.5,
            fontWeight: 800,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          👑 Team Leaders & Squads ({teamLeaders.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("brandMargins")}
          style={{
            background: activeSubTab === "brandMargins" ? "#0f172a" : "#f1f5f9",
            color: activeSubTab === "brandMargins" ? "#fff" : "#475569",
            border: "none",
            padding: "8px 16px",
            borderRadius: 8,
            fontSize: 12.5,
            fontWeight: 800,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          🏷️ Brand Wholesale Margins ({brands.length})
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
            whiteSpace: "nowrap",
          }}
        >
          📜 Reseller Profit Ledger ({recentLedger.length})
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
                { key: "team_leader", label: `👑 Team Leaders (${teamLeaders.length})` },
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
                    <th style={{ padding: "12px 14px", fontWeight: 800, color: "#334155" }}>Squad & Margin</th>
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
                          <div
                            style={{ fontWeight: 800, color: "#0f172a", cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}
                            onClick={() => handleOpenDetails(u)}
                            title="বিস্তারিত প্রোফাইল ও ফেসবুক লিঙ্ক দেখতে ক্লিক করুন"
                          >
                            <span style={{ color: "#be123c", textDecoration: "underline" }}>{u.name || "Unnamed"}</span>
                            <span style={{ fontSize: 12 }}>👁️</span>
                          </div>
                          <div style={{ fontSize: 11.5, color: "#64748b" }}>{u.email}</div>
                          {u.phone && <div style={{ fontSize: 11, color: "#0284c7" }}>📞 {u.phone}</div>}
                          {u.address && <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>📍 {u.address}</div>}
                          {u.fbPageLink && (
                            <a
                              href={u.fbPageLink.startsWith("http") ? u.fbPageLink : `https://${u.fbPageLink}`}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 3,
                                fontSize: 11,
                                fontWeight: 800,
                                color: "#1877f2",
                                textDecoration: "underline",
                                marginTop: 3,
                              }}
                            >
                              🌐 FB Page ↗
                            </a>
                          )}
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <div style={{ fontWeight: 700, color: "#1e293b" }}>
                            {u.role === "reseller" ? u.resellerStoreName || "—" : u.businessName || "—"}
                          </div>
                          {u.tradeLicense && (
                            <div style={{ fontSize: 11, color: "#4f46e5", fontWeight: 600, marginTop: 2 }}>
                              📄 Trade/Doc: {u.tradeLicense}
                            </div>
                          )}
                          {u.appliedRole && (
                            <div style={{ fontSize: 10.5, color: "#b45309", fontWeight: 800, marginTop: 2 }}>
                              📝 Applied: {u.appliedRole === "reseller" ? "Reseller" : "Wholesale"}
                            </div>
                          )}
                          {u.note && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>📝 {u.note}</div>}
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
                          {u.role === "team_leader" && (
                            <span style={{ background: "#ede9fe", color: "#6d28d9", border: "1px solid #ddd6fe", padding: "4px 10px", borderRadius: 12, fontWeight: 900, fontSize: 11, display: "inline-flex", alignItems: "center", gap: 4 }}>
                              👑 Team Leader
                            </span>
                          )}
                          {(u.role === "user" || u.role === "customer" || !u.role) && (
                            <span style={{ background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0", padding: "4px 10px", borderRadius: 12, fontWeight: 800, fontSize: 11, display: "inline-flex", alignItems: "center", gap: 4 }}>
                              👤 Customer
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          {u.role === "reseller" ? (
                            <div>
                              <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>
                                👑 {u.teamLeaderName || u.teamLeaderEmail ? `${u.teamLeaderName || u.teamLeaderEmail}` : "Unassigned"}
                              </div>
                              <button
                                type="button"
                                onClick={() => handleToggleStar(u)}
                                style={{
                                  marginTop: 4,
                                  padding: "3px 8px",
                                  borderRadius: 12,
                                  fontSize: 10.5,
                                  fontWeight: 900,
                                  cursor: "pointer",
                                  border: u.isWeeklyStar ? "1px solid #f59e0b" : "1px solid #cbd5e1",
                                  background: u.isWeeklyStar ? "#fef3c7" : "#f8fafc",
                                  color: u.isWeeklyStar ? "#b45309" : "#64748b",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 3,
                                }}
                                title="ক্লিক করে ৮% থেকে ১০% স্টার ক্লাবে টগল করুন"
                              >
                                {u.isWeeklyStar ? "⭐ 10% Star Club" : "⚪ 8% Standard"}
                              </button>
                            </div>
                          ) : u.role === "team_leader" ? (
                            <span style={{ background: "#f5f3ff", color: "#7c3aed", border: "1px solid #ddd6fe", padding: "3px 8px", borderRadius: 8, fontSize: 10.5, fontWeight: 800 }}>
                              👑 Squad Leader
                            </span>
                          ) : (
                            <span style={{ color: "#94a3b8", fontSize: 11 }}>—</span>
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
                            {u.status === "pending" ? "⏳ Pending" : u.status || "active"}
                          </span>
                        </td>
                        <td style={{ padding: "12px 14px", textAlign: "center" }}>
                          <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
                            <button
                              type="button"
                              title="সম্পূর্ণ প্রোফাইল ও ফেসবুক লিঙ্ক দেখুন"
                              onClick={() => handleOpenDetails(u)}
                              style={{
                                background: "#eff6ff",
                                border: "1px solid #bfdbfe",
                                color: "#1d4ed8",
                                padding: "4px 8px",
                                borderRadius: 6,
                                fontSize: 11,
                                fontWeight: 800,
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 3,
                              }}
                            >
                              👁️ Details
                            </button>
                            {u.status === "pending" && (
                              <button
                                type="button"
                                title="১-ক্লিকে অনুমোদন করুন"
                                onClick={() => handleQuickApprove(u, u.appliedRole || u.role || "reseller")}
                                style={{
                                  background: "#ecfdf5",
                                  border: "1px solid #6ee7b7",
                                  color: "#047857",
                                  padding: "4px 8px",
                                  borderRadius: 6,
                                  fontSize: 11,
                                  fontWeight: 800,
                                  cursor: "pointer",
                                }}
                              >
                                ✓ Approve
                              </button>
                            )}
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

      {/* Squads & Team Leaders View */}
      {activeSubTab === "squads" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Top Banner */}
          <div style={{ background: "linear-gradient(135deg, #1e1b4b, #312e81)", color: "#fff", padding: "18px 20px", borderRadius: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, display: "flex", alignItems: "center", gap: 8 }}>
                  <span>👑</span> Team Leader Hierarchy & Reseller Squads
                </h3>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "#c7d2fe" }}>
                  টিম লিডারদের আন্ডারে রিসেলারদের অ্যাসাইন করুন। ভালো সেল করা রিসেলারদের ১-ক্লিকে &quot;⭐ 10% Star Club&quot; দিন এবং বাকিরা ৮% বেস রেট পাবে।
                </p>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <span style={{ background: "rgba(255,255,255,0.15)", padding: "6px 12px", borderRadius: 20, fontSize: 12, fontWeight: 800 }}>
                  👑 {teamLeaders.length} Team Leaders
                </span>
                <span style={{ background: "rgba(255,255,255,0.15)", padding: "6px 12px", borderRadius: 20, fontSize: 12, fontWeight: 800 }}>
                  🚀 {users.filter((u) => u.role === "reseller").length} Resellers
                </span>
                <span style={{ background: "#fef3c7", color: "#b45309", padding: "6px 12px", borderRadius: 20, fontSize: 12, fontWeight: 900 }}>
                  ⭐ {users.filter((u) => u.isWeeklyStar).length} Star Performers
                </span>
              </div>
            </div>
          </div>

          {/* Quick Bulk Squad Assignment Tool */}
          <div style={{ background: "#fff", padding: "18px 20px", borderRadius: 14, border: "1px solid #cbd5e1" }}>
            <h4 style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 800, color: "#0f172a", display: "flex", alignItems: "center", gap: 6 }}>
              <span>⚡</span> Quick Squad Assignment (বাল্ক টিম বণ্টন)
            </h4>
            <p style={{ margin: "0 0 14px", fontSize: 12, color: "#64748b" }}>
              নিচের তালিকা থেকে এক বা একাধিক রিসেলার নির্বাচন করে তাদের নির্দিষ্ট টিম লিডারের স্কোয়াডে যুক্ত করুন:
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "minmax(240px, 320px) 1fr auto", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
                  টার্গেট টিম লিডার নির্বাচন করুন:
                </label>
                <select
                  value={targetTeamLeader}
                  onChange={(e) => setTargetTeamLeader(e.target.value)}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 12.5, background: "#f8fafc" }}
                >
                  <option value="">-- টিম লিডার সিলেক্ট করুন --</option>
                  {teamLeaders.map((tl) => (
                    <option key={tl._id} value={tl.email}>
                      👑 {tl.name ? `${tl.name} (${tl.email})` : tl.email}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => {
                    const allResellers = users.filter((u) => u.role === "reseller").map((u) => u._id);
                    setSelectedSquadResellers(allResellers);
                  }}
                  style={{ background: "#f1f5f9", border: "1px solid #cbd5e1", padding: "6px 12px", borderRadius: 6, fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}
                >
                  Select All Resellers
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const unassigned = users.filter((u) => u.role === "reseller" && !u.teamLeaderEmail).map((u) => u._id);
                    setSelectedSquadResellers(unassigned);
                  }}
                  style={{ background: "#f1f5f9", border: "1px solid #cbd5e1", padding: "6px 12px", borderRadius: 6, fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}
                >
                  Select Unassigned Only
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSquadResellers([])}
                  style={{ background: "#fee2e2", border: "1px solid #fecaca", color: "#dc2626", padding: "6px 12px", borderRadius: 6, fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}
                >
                  Clear Selection
                </button>
              </div>

              <div>
                <button
                  type="button"
                  onClick={handleBulkAssignSquad}
                  disabled={saving || !selectedSquadResellers.length || !targetTeamLeader}
                  style={{
                    background: selectedSquadResellers.length && targetTeamLeader ? "linear-gradient(135deg, #4f46e5, #4338ca)" : "#94a3b8",
                    color: "#fff",
                    border: "none",
                    padding: "10px 20px",
                    borderRadius: 8,
                    fontSize: 12.5,
                    fontWeight: 800,
                    cursor: selectedSquadResellers.length && targetTeamLeader ? "pointer" : "not-allowed",
                  }}
                >
                  {saving ? "অ্যাসাইন হচ্ছে..." : `🤝 Assign (${selectedSquadResellers.length}) to Squad`}
                </button>
              </div>
            </div>

            {/* Checkbox grid of Resellers */}
            <div style={{ maxHeight: 220, overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: 8, padding: 8, background: "#fafafa" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 8 }}>
                {users.filter((u) => u.role === "reseller").length === 0 ? (
                  <div style={{ padding: 12, color: "#64748b", fontSize: 12 }}>কোনো রিসেলার নেই।</div>
                ) : (
                  users
                    .filter((u) => u.role === "reseller")
                    .map((r) => {
                      const isSelected = selectedSquadResellers.includes(r._id);
                      return (
                        <label
                          key={r._id}
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 8,
                            padding: "8px 10px",
                            borderRadius: 6,
                            background: isSelected ? "#e0e7ff" : "#fff",
                            border: isSelected ? "1px solid #6366f1" : "1px solid #e2e8f0",
                            cursor: "pointer",
                            fontSize: 12,
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedSquadResellers([...selectedSquadResellers, r._id]);
                              } else {
                                setSelectedSquadResellers(selectedSquadResellers.filter((id) => id !== r._id));
                              }
                            }}
                            style={{ marginTop: 2, accentColor: "#4f46e5" }}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 800, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {r.name || r.email}
                            </div>
                            <div style={{ fontSize: 11, color: "#64748b" }}>{r.email}</div>
                            <div style={{ fontSize: 10.5, color: r.teamLeaderEmail ? "#4338ca" : "#94a3b8", fontWeight: 700, marginTop: 2 }}>
                              {r.teamLeaderEmail ? `👑 ${r.teamLeaderName || r.teamLeaderEmail}` : "⚪ Unassigned"}
                              {r.isWeeklyStar && " • ⭐ 10% Star"}
                            </div>
                          </div>
                        </label>
                      );
                    })
                )}
              </div>
            </div>
          </div>

          {/* Squad Cards Breakdown */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 16 }}>
            {teamLeaders.map((leader) => {
              const squadMembers = users.filter(
                (u) => u.role === "reseller" && (u.teamLeaderEmail === leader.email || u.teamLeader === leader._id)
              );
              const starCount = squadMembers.filter((m) => m.isWeeklyStar).length;
              return (
                <div
                  key={leader._id}
                  style={{
                    background: "#fff",
                    borderRadius: 14,
                    border: "1px solid #cbd5e1",
                    overflow: "hidden",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                  }}
                >
                  <div style={{ background: "linear-gradient(135deg, #f8fafc, #ede9fe)", padding: "14px 16px", borderBottom: "1px solid #e2e8f0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 18 }}>👑</span>
                          <h4 style={{ margin: 0, fontSize: 15, fontWeight: 900, color: "#1e1b4b" }}>
                            {leader.name || leader.email}
                          </h4>
                        </div>
                        <div style={{ fontSize: 11.5, color: "#475569", marginTop: 2 }}>{leader.email}</div>
                        {leader.phone && <div style={{ fontSize: 11, color: "#6b21a8" }}>📞 {leader.phone}</div>}
                      </div>

                      <div style={{ textAlign: "right" }}>
                        <span style={{ background: "#4338ca", color: "#fff", padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 900 }}>
                          {squadMembers.length} Resellers
                        </span>
                        <div style={{ fontSize: 11, color: "#b45309", fontWeight: 800, marginTop: 4 }}>
                          ⭐ {starCount} Star Club
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ padding: 12 }}>
                    {squadMembers.length === 0 ? (
                      <div style={{ padding: "20px 10px", textAlign: "center", color: "#94a3b8", fontSize: 12 }}>
                        এই টিম লিডারের অধীনে এখনো কোনো রিসেলার যোগ করা হয়নি। উপরের টুল দিয়ে রিসেলার অ্যাসাইন করুন।
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {squadMembers.map((member) => (
                          <div
                            key={member._id}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              background: member.isWeeklyStar ? "#fefce8" : "#f8fafc",
                              border: member.isWeeklyStar ? "1px solid #fde047" : "1px solid #e2e8f0",
                              padding: "8px 12px",
                              borderRadius: 8,
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 800, color: "#0f172a", fontSize: 12.5 }}>
                                {member.name || member.email}
                              </div>
                              <div style={{ fontSize: 11, color: "#64748b" }}>
                                {member.resellerStoreName ? `🏪 ${member.resellerStoreName} • ` : ""}
                                ৳{member.walletBalance || 0} wallet
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleToggleStar(member)}
                              style={{
                                padding: "4px 10px",
                                borderRadius: 14,
                                fontSize: 11,
                                fontWeight: 900,
                                cursor: "pointer",
                                border: member.isWeeklyStar ? "1px solid #f59e0b" : "1px solid #cbd5e1",
                                background: member.isWeeklyStar ? "#fef3c7" : "#fff",
                                color: member.isWeeklyStar ? "#b45309" : "#64748b",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 3,
                              }}
                              title="ক্লিক করে ৮% এবং ১০% স্টার মার্জিনে টগল করুন"
                            >
                              {member.isWeeklyStar ? "⭐ 10% Star Club" : "⚪ 8% Standard"}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Unassigned Resellers Card */}
            {(() => {
              const unassignedMembers = users.filter((u) => u.role === "reseller" && !u.teamLeaderEmail);
              if (unassignedMembers.length === 0) return null;
              return (
                <div style={{ background: "#fff", borderRadius: 14, border: "1px dashed #cbd5e1", overflow: "hidden" }}>
                  <div style={{ background: "#f8fafc", padding: "14px 16px", borderBottom: "1px dashed #e2e8f0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <h4 style={{ margin: 0, fontSize: 14, fontWeight: 900, color: "#475569" }}>
                          ⚪ Unassigned Resellers (টিম ছাড়া রিসেলার)
                        </h4>
                        <div style={{ fontSize: 11.5, color: "#94a3b8" }}>এরা এখনো কোনো টিম লিডারের স্কোয়াডে যুক্ত হয়নি</div>
                      </div>
                      <span style={{ background: "#f1f5f9", color: "#64748b", padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 900 }}>
                        {unassignedMembers.length} Members
                      </span>
                    </div>
                  </div>
                  <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                    {unassignedMembers.map((member) => (
                      <div
                        key={member._id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          background: "#fafafa",
                          border: "1px solid #e2e8f0",
                          padding: "8px 12px",
                          borderRadius: 8,
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 800, color: "#0f172a", fontSize: 12 }}>{member.name || member.email}</div>
                          <div style={{ fontSize: 11, color: "#64748b" }}>{member.email}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleToggleStar(member)}
                          style={{
                            padding: "4px 8px",
                            borderRadius: 12,
                            fontSize: 10.5,
                            fontWeight: 800,
                            cursor: "pointer",
                            border: member.isWeeklyStar ? "1px solid #f59e0b" : "1px solid #cbd5e1",
                            background: member.isWeeklyStar ? "#fef3c7" : "#fff",
                            color: member.isWeeklyStar ? "#b45309" : "#64748b",
                          }}
                        >
                          {member.isWeeklyStar ? "⭐ 10% Star" : "⚪ 8% Std"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Brand Wholesale Margins View */}
      {activeSubTab === "brandMargins" && (
        <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #cbd5e1", overflow: "hidden" }}>
          <div style={{ padding: "18px 20px", background: "linear-gradient(135deg, #fff1f2, #ffe4e6)", borderBottom: "1px solid #fecdd3" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: "#9f1239", display: "flex", alignItems: "center", gap: 6 }}>
                  <span>🏷️</span> Brand Wholesale Profit Margins (ব্র্যান্ডভিত্তিক পাইকারি লাভের হার)
                </h3>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "#881337" }}>
                  অ্যাডমিন থেকে প্রতিটি ব্র্যান্ডের জন্য পাইকারি লাভের % সেট করুন (যেমন Anua 5%, Liora 20%, Cerave 7%)। হোলসেলাররা কেনা দামের সাথে এই মার্জিন অনুযায়ী অটোমেটিক পাইকারি দাম পাবে।
                </p>
              </div>

              <button
                type="button"
                onClick={handleSaveBrandMargins}
                disabled={saving}
                style={{
                  background: "linear-gradient(135deg, #e11d48, #be123c)",
                  color: "#fff",
                  border: "none",
                  padding: "10px 22px",
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 900,
                  cursor: saving ? "not-allowed" : "pointer",
                  boxShadow: "0 4px 12px rgba(225,29,72,0.3)",
                }}
              >
                {saving ? "সংরক্ষণ হচ্ছে..." : "💾 Save All Brand Margins"}
              </button>
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, textAlign: "left" }}>
              <thead style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                <tr>
                  <th style={{ padding: "12px 16px", fontWeight: 800, color: "#334155" }}>Brand Name</th>
                  <th style={{ padding: "12px 16px", fontWeight: 800, color: "#334155" }}>Slug</th>
                  <th style={{ padding: "12px 16px", fontWeight: 800, color: "#334155", textAlign: "center", width: 200 }}>Wholesale Margin %</th>
                  <th style={{ padding: "12px 16px", fontWeight: 800, color: "#334155" }}>Dynamic Price Preview (৳১,০০০ কেনা দামে)</th>
                </tr>
              </thead>
              <tbody>
                {brands.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: 30, textAlign: "center", color: "#64748b" }}>
                      কোনো ব্র্যান্ড পাওয়া যায়নি।
                    </td>
                  </tr>
                ) : (
                  brands.map((b, idx) => {
                    const currentMargin = Number(brandMargins[b._id] ?? b.wholesaleMarginPct ?? 7);
                    const sampleCost = 1000;
                    const sampleWholesalePrice = Math.round(sampleCost * (1 + currentMargin / 100));
                    const sampleProfit = sampleWholesalePrice - sampleCost;

                    return (
                      <tr key={b._id} style={{ borderBottom: "1px solid #f1f5f9", background: idx % 2 === 0 ? "#fff" : "#fafafa" }}>
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            {b.logo ? (
                              <img src={b.logo} alt={b.name} style={{ width: 28, height: 28, objectFit: "contain", borderRadius: 4 }} />
                            ) : (
                              <span style={{ fontSize: 20 }}>🏷️</span>
                            )}
                            <div style={{ fontWeight: 800, color: "#0f172a" }}>{b.name}</div>
                          </div>
                        </td>
                        <td style={{ padding: "12px 16px", color: "#64748b", fontFamily: "monospace", fontSize: 12 }}>
                          {b.slug}
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "center" }}>
                          <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={brandMargins[b._id] !== undefined ? brandMargins[b._id] : (b.wholesaleMarginPct ?? 7)}
                              onChange={(e) => setBrandMargins({ ...brandMargins, [b._id]: e.target.value })}
                              style={{
                                width: 70,
                                padding: "6px 8px",
                                borderRadius: 6,
                                border: "1px solid #cbd5e1",
                                textAlign: "center",
                                fontWeight: 800,
                                fontSize: 13,
                                outline: "none",
                              }}
                            />
                            <span style={{ fontWeight: 800, color: "#334155" }}>%</span>
                          </div>
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ fontSize: 12 }}>
                            কেনা খরচ <strong>৳{sampleCost}</strong> হলে পাইকারি দাম হবে{" "}
                            <strong style={{ color: "#be123c", fontSize: 13 }}>৳{sampleWholesalePrice}</strong>{" "}
                            <span style={{ color: "#059669", fontWeight: 700 }}>(লাভ +৳{sampleProfit})</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div style={{ padding: "14px 20px", background: "#f8fafc", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={handleSaveBrandMargins}
              disabled={saving}
              style={{
                background: "linear-gradient(135deg, #e11d48, #be123c)",
                color: "#fff",
                border: "none",
                padding: "10px 22px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 900,
                cursor: saving ? "not-allowed" : "pointer",
              }}
            >
              {saving ? "সংরক্ষণ হচ্ছে..." : "💾 Save All Brand Margins"}
            </button>
          </div>
        </div>
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
                    <option value="team_leader">👑 Team Leader (টিম লিডার / স্কোয়াড হেড)</option>
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
                <>
                  <div style={{ marginBottom: 12, background: "#f8fafc", padding: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
                      👑 অ্যাসাইনড টিম লিডার (Team Leader / Squad)
                    </label>
                    <select
                      value={formData.teamLeaderEmail}
                      onChange={(e) => {
                        const leader = teamLeaders.find((l) => l.email === e.target.value);
                        setFormData({
                          ...formData,
                          teamLeaderEmail: e.target.value,
                          teamLeaderName: leader?.name || "",
                          teamLeaderId: leader?._id || "",
                        });
                      }}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13, background: "#fff" }}
                    >
                      <option value="">— কোনো টিম লিডার নেই (Unassigned) —</option>
                      {teamLeaders.map((tl) => (
                        <option key={tl._id} value={tl.email}>
                          👑 {tl.name ? `${tl.name} (${tl.email})` : tl.email}
                        </option>
                      ))}
                    </select>

                    <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={formData.isWeeklyStar}
                        onChange={(e) => setFormData({ ...formData, isWeeklyStar: e.target.checked })}
                        style={{ width: 16, height: 16, accentColor: "#e11d48", cursor: "pointer" }}
                      />
                      <span style={{ fontSize: 12.5, fontWeight: 800, color: "#b45309" }}>
                        ⭐ Weekly Star Performer (10% Booster Margin)
                      </span>
                    </label>
                    <div style={{ fontSize: 11, color: "#64748b", marginTop: 2, paddingLeft: 24 }}>
                      টিক দিলে সে রিটেইল থেকে ১০% কমে প্রডাক্ট পাবে। আনচেক রাখলে ৮% স্ট্যান্ডার্ড রেট পাবে।
                    </div>
                  </div>

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
                </>
              )}

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
                  দোকান / গোডাউনের ঠিকানা (Address)
                </label>
                <input
                  type="text"
                  placeholder="মার্কেট, রাস্তা, জেলা..."
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13, boxSizing: "border-box" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
                    ফেসবুক পেজ লিঙ্ক (Facebook Link)
                  </label>
                  <input
                    type="text"
                    placeholder="https://facebook.com/page"
                    value={formData.fbPageLink}
                    onChange={(e) => setFormData({ ...formData, fbPageLink: e.target.value })}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13, boxSizing: "border-box" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
                    ট্রেড লাইসেন্স নম্বর (যদি থাকে)
                  </label>
                  <input
                    type="text"
                    placeholder="TR-XXXXXX"
                    value={formData.tradeLicense}
                    onChange={(e) => setFormData({ ...formData, tradeLicense: e.target.value })}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13, boxSizing: "border-box" }}
                  />
                </div>
              </div>

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
                    <option value="team_leader">👑 Team Leader (টিম লিডার / স্কোয়াড হেড)</option>
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

              {formData.role === "reseller" && (
                <div style={{ marginBottom: 12, background: "#f8fafc", padding: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
                    👑 অ্যাসাইনড টিম লিডার (Team Leader / Squad)
                  </label>
                  <select
                    value={formData.teamLeaderEmail}
                    onChange={(e) => {
                      const leader = teamLeaders.find((l) => l.email === e.target.value);
                      setFormData({
                        ...formData,
                        teamLeaderEmail: e.target.value,
                        teamLeaderName: leader?.name || "",
                        teamLeaderId: leader?._id || "",
                      });
                    }}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13, background: "#fff" }}
                  >
                    <option value="">— কোনো টিম লিডার নেই (Unassigned) —</option>
                    {teamLeaders.map((tl) => (
                      <option key={tl._id} value={tl.email}>
                        👑 {tl.name ? `${tl.name} (${tl.email})` : tl.email}
                      </option>
                    ))}
                  </select>

                  <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={formData.isWeeklyStar}
                      onChange={(e) => setFormData({ ...formData, isWeeklyStar: e.target.checked })}
                      style={{ width: 16, height: 16, accentColor: "#e11d48", cursor: "pointer" }}
                    />
                    <span style={{ fontSize: 12.5, fontWeight: 800, color: "#b45309" }}>
                      ⭐ Weekly Star Performer (10% Booster Margin)
                    </span>
                  </label>
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 2, paddingLeft: 24 }}>
                    টিক দিলে রিটেইল থেকে ১০% কমে প্রোডাক্ট পাবে। আনচেক রাখলে ৮% স্ট্যান্ডার্ড রেট পাবে।
                  </div>
                </div>
              )}

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

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 4 }}>Full Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13, boxSizing: "border-box" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 4 }}>Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13, boxSizing: "border-box" }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
                  দোকান / গোডাউনের ঠিকানা (Address)
                </label>
                <input
                  type="text"
                  placeholder="মার্কেট, রাস্তা, জেলা..."
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13, boxSizing: "border-box" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
                    ফেসবুক পেজ লিঙ্ক (Facebook Link)
                  </label>
                  <input
                    type="text"
                    placeholder="https://facebook.com/page"
                    value={formData.fbPageLink}
                    onChange={(e) => setFormData({ ...formData, fbPageLink: e.target.value })}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13, boxSizing: "border-box" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
                    ট্রেড লাইসেন্স বা ডকুমেন্ট
                  </label>
                  <input
                    type="text"
                    placeholder="TR-XXXXXX"
                    value={formData.tradeLicense}
                    onChange={(e) => setFormData({ ...formData, tradeLicense: e.target.value })}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13, boxSizing: "border-box" }}
                  />
                </div>
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

      {/* Modal: View Full Member / Applicant Profile & Facebook Link */}
      {isDetailsModalOpen && selectedViewUser && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            zIndex: 99999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
            overflowY: "auto",
          }}
          onClick={() => setIsDetailsModalOpen(false)}
        >
          <div
            style={{
              background: "#ffffff",
              width: "100%",
              maxWidth: 680,
              maxHeight: "92vh",
              overflowY: "auto",
              borderRadius: 20,
              padding: "24px",
              boxShadow: "0 25px 60px rgba(0,0,0,0.3)",
              border: "1px solid #fecdd3",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid #f1f5f9", paddingBottom: 16, marginBottom: 18 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 24 }}>👤</span>
                  <h3 style={{ margin: 0, fontSize: 19, fontWeight: 900, color: "#881337" }}>
                    {selectedViewUser.name || "Unnamed Applicant"}
                  </h3>
                  <span
                    style={{
                      padding: "3px 10px",
                      borderRadius: 12,
                      fontSize: 11,
                      fontWeight: 800,
                      background: selectedViewUser.status === "active" ? "#ecfdf5" : selectedViewUser.status === "pending" ? "#fef3c7" : "#fee2e2",
                      color: selectedViewUser.status === "active" ? "#047857" : selectedViewUser.status === "pending" ? "#b45309" : "#b91c1c",
                    }}
                  >
                    {selectedViewUser.status === "pending" ? "⏳ Pending Approval" : selectedViewUser.status === "active" ? "✓ Active Member" : "❌ Suspended"}
                  </span>
                  <span
                    style={{
                      padding: "3px 10px",
                      borderRadius: 12,
                      fontSize: 11,
                      fontWeight: 800,
                      background: selectedViewUser.role === "reseller" ? "#ffe4e6" : selectedViewUser.role === "wholesale" ? "#ede9fe" : "#f1f5f9",
                      color: selectedViewUser.role === "reseller" ? "#be123c" : selectedViewUser.role === "wholesale" ? "#6d28d9" : "#475569",
                    }}
                  >
                    Role: {selectedViewUser.role}
                  </span>
                </div>
                <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "#64748b" }}>
                  আবেদনকারীর বিস্তারিত প্রোফাইল, ফেসবুক পেজ লিঙ্ক, যোগাযোগের নম্বর ও ভেরিফিকেশন বিবরণ
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsDetailsModalOpen(false)}
                style={{
                  background: "#f1f5f9",
                  border: "none",
                  borderRadius: "50%",
                  width: 32,
                  height: 32,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 16,
                  color: "#64748b",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            {/* Profile Content */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Card 1: Shop & Facebook Verification */}
              <div style={{ background: "linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)", border: "1.5px solid #a7f3d0", borderRadius: 14, padding: "16px 18px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                  <span style={{ fontSize: 18 }}>🏬</span>
                  <h4 style={{ margin: 0, fontSize: 15, fontWeight: 900, color: "#065f46" }}>
                    দোকান ও সোশ্যাল মিডিয়া ভেরিফিকেশন
                  </h4>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
                  <div>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: "#047857", textTransform: "uppercase" }}>দোকান / ব্যবসার নাম:</span>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", marginTop: 2 }}>
                      {selectedViewUser.businessName || selectedViewUser.resellerStoreName || "দেওয়া হয়নি"}
                    </div>
                  </div>

                  {selectedViewUser.appliedRole && (
                    <div>
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: "#047857", textTransform: "uppercase" }}>আবেদনের ধরণ:</span>
                      <div style={{ fontSize: 14, fontWeight: 800, color: "#b45309", marginTop: 2 }}>
                        {selectedViewUser.appliedRole === "reseller" ? "🚀 Reseller (রিসেলার)" : "🏬 Wholesale (পাইকারি)"}
                      </div>
                    </div>
                  )}

                  <div style={{ gridColumn: "1 / -1" }}>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: "#047857", textTransform: "uppercase" }}>ফেসবুক পেজ / প্রোফাইল লিঙ্ক:</span>
                    <div style={{ marginTop: 4 }}>
                      {selectedViewUser.fbPageLink ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                          <a
                            href={selectedViewUser.fbPageLink.startsWith("http") ? selectedViewUser.fbPageLink : `https://${selectedViewUser.fbPageLink}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              background: "#1877f2",
                              color: "#ffffff",
                              padding: "8px 16px",
                              borderRadius: 8,
                              fontSize: 13,
                              fontWeight: 800,
                              textDecoration: "none",
                              boxShadow: "0 2px 8px rgba(24, 119, 242, 0.25)",
                            }}
                          >
                            🌐 ফেসবুক পেজ সরাসরি ওপেন করুন ↗
                          </a>
                          <span style={{ fontSize: 12, color: "#475569", wordBreak: "break-all" }}>
                            {selectedViewUser.fbPageLink}
                          </span>
                        </div>
                      ) : (
                        <span style={{ fontSize: 13, color: "#94a3b8", fontStyle: "italic" }}>
                          কোনো ফেসবুক লিঙ্ক জমা দেওয়া হয়নি
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: "#047857", textTransform: "uppercase" }}>ট্রেড লাইসেন্স নম্বর / লিঙ্ক:</span>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", marginTop: 2 }}>
                      {selectedViewUser.tradeLicense ? (
                        selectedViewUser.tradeLicense.startsWith("http") ? (
                          <a href={selectedViewUser.tradeLicense} target="_blank" rel="noreferrer" style={{ color: "#2563eb", textDecoration: "underline" }}>
                            📄 {selectedViewUser.tradeLicense} ↗
                          </a>
                        ) : (
                          `📄 ${selectedViewUser.tradeLicense}`
                        )
                      ) : (
                        "—"
                      )}
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: "#047857", textTransform: "uppercase" }}>দোকান / গোডাউনের ঠিকানা:</span>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", marginTop: 2 }}>
                      📍 {selectedViewUser.address || "ঠিকানা দেওয়া হয়নি"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Contact & Authentication Info */}
              <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "16px 18px", boxShadow: "0 2px 6px rgba(0,0,0,0.02)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                  <span style={{ fontSize: 18 }}>📞</span>
                  <h4 style={{ margin: 0, fontSize: 15, fontWeight: 900, color: "#1e293b" }}>
                    যোগাযোগ ও অ্যাকাউন্ট তথ্য
                  </h4>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
                  <div>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>মোবাইল নম্বর:</span>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", marginTop: 2, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span>{selectedViewUser.phone || "—"}</span>
                      {selectedViewUser.phone && (
                        <>
                          <a
                            href={`tel:${selectedViewUser.phone}`}
                            style={{
                              background: "#f1f5f9",
                              color: "#0369a1",
                              border: "1px solid #bae6fd",
                              padding: "2px 8px",
                              borderRadius: 6,
                              fontSize: 11,
                              fontWeight: 800,
                              textDecoration: "none",
                            }}
                          >
                            📞 Call
                          </a>
                          {(() => {
                            const raw = (selectedViewUser.phone || "").replace(/\D/g, "");
                            const clean = raw.startsWith("88") ? raw : raw.startsWith("0") ? "88" + raw : "880" + raw;
                            return (
                              <a
                                href={`https://wa.me/${clean}?text=${encodeURIComponent(`আসসালামু আলাইকুম ${selectedViewUser.name || ""}। LIORA Beauty & Wear থেকে যোগাযোগ করছি। আপনার রিসেলার/হোলসেল আবেদন সংক্রান্ত তথ্য:`)}`}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  background: "#25d366",
                                  color: "#ffffff",
                                  padding: "2px 8px",
                                  borderRadius: 6,
                                  fontSize: 11,
                                  fontWeight: 800,
                                  textDecoration: "none",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 3,
                                }}
                              >
                                💬 WhatsApp
                              </a>
                            );
                          })()}
                        </>
                      )}
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>ইমেইল অ্যাড্রেস:</span>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: "#0f172a", marginTop: 2 }}>
                      {selectedViewUser.email}
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>আবেদনের তারিখ ও সময়:</span>
                    <div style={{ fontSize: 13, color: "#334155", marginTop: 2 }}>
                      {selectedViewUser.appliedAt
                        ? new Date(selectedViewUser.appliedAt).toLocaleString()
                        : selectedViewUser.createdAt
                        ? new Date(selectedViewUser.createdAt).toLocaleString()
                        : "—"}
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Firebase UID:</span>
                    <div style={{ fontSize: 11.5, color: "#64748b", fontFamily: "monospace", marginTop: 2, wordBreak: "break-all" }}>
                      {selectedViewUser.firebaseUid || "Guest Applicant (Not linked yet)"}
                    </div>
                  </div>
                </div>

                {selectedViewUser.note && (
                  <div style={{ marginTop: 12, background: "#f8fafc", padding: "10px 12px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>আবেদন নোট / মন্তব্য:</span>
                    <div style={{ fontSize: 12.5, color: "#334155", marginTop: 3, whiteSpace: "pre-wrap" }}>
                      {selectedViewUser.note}
                    </div>
                  </div>
                )}
              </div>

              {/* Card 3: Performance, Wallet & Squad Status */}
              <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "16px 18px", boxShadow: "0 2px 6px rgba(0,0,0,0.02)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                  <span style={{ fontSize: 18 }}>💰</span>
                  <h4 style={{ margin: 0, fontSize: 15, fontWeight: 900, color: "#1e293b" }}>
                    ওয়ালেট ও সেলস পারফরম্যান্স
                  </h4>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                  <div style={{ background: "#f8fafc", padding: "10px 14px", borderRadius: 10 }}>
                    <span style={{ fontSize: 11, color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>বর্তমান ব্যালেন্স</span>
                    <div style={{ fontSize: 18, fontWeight: 900, color: "#059669", marginTop: 2 }}>
                      ৳{Number(selectedViewUser.walletBalance || 0).toLocaleString()}
                    </div>
                  </div>

                  <div style={{ background: "#f8fafc", padding: "10px 14px", borderRadius: 10 }}>
                    <span style={{ fontSize: 11, color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>মোট ড্রপশিপ / বাল্ক অর্ডার</span>
                    <div style={{ fontSize: 18, fontWeight: 900, color: "#0f172a", marginTop: 2 }}>
                      {selectedViewUser.orderCount || 0} Orders
                    </div>
                  </div>

                  <div style={{ background: "#f8fafc", padding: "10px 14px", borderRadius: 10 }}>
                    <span style={{ fontSize: 11, color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>লাইফটাইম কেনাকাটা</span>
                    <div style={{ fontSize: 18, fontWeight: 900, color: "#6366f1", marginTop: 2 }}>
                      ৳{Number(selectedViewUser.totalSpend || 0).toLocaleString()}
                    </div>
                  </div>

                  <div style={{ background: "#f8fafc", padding: "10px 14px", borderRadius: 10 }}>
                    <span style={{ fontSize: 11, color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>টিম লিডার / স্কোয়াড</span>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "#475569", marginTop: 2 }}>
                      {selectedViewUser.teamLeaderName || selectedViewUser.teamLeaderEmail || "Unassigned"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions Footer */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 10,
                marginTop: 22,
                paddingTop: 16,
                borderTop: "1px solid #f1f5f9",
              }}
            >
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {selectedViewUser.status === "pending" && (
                  <>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => handleQuickApprove(selectedViewUser, "reseller")}
                      style={{
                        background: "linear-gradient(135deg, #16a34a, #15803d)",
                        color: "#fff",
                        border: "none",
                        padding: "9px 18px",
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 900,
                        cursor: saving ? "not-allowed" : "pointer",
                        boxShadow: "0 2px 8px rgba(22, 163, 74, 0.25)",
                      }}
                    >
                      ✓ Approve as Reseller
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => handleQuickApprove(selectedViewUser, "wholesale")}
                      style={{
                        background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
                        color: "#fff",
                        border: "none",
                        padding: "9px 18px",
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 900,
                        cursor: saving ? "not-allowed" : "pointer",
                        boxShadow: "0 2px 8px rgba(124, 58, 237, 0.25)",
                      }}
                    >
                      🏬 Approve as Wholesaler
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => {
                    handleOpenEdit(selectedViewUser);
                    setIsDetailsModalOpen(false);
                  }}
                  style={{
                    background: "#0f172a",
                    color: "#fff",
                    border: "none",
                    padding: "9px 18px",
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  ✏️ Edit Profile Info
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsDetailsModalOpen(false)}
                style={{
                  background: "#f1f5f9",
                  border: "1px solid #cbd5e1",
                  padding: "9px 20px",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 800,
                  color: "#475569",
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
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
