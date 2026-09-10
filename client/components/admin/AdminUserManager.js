"use client";
import React, { useEffect, useState, useMemo } from "react";

export default function AdminUserManager() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all"); // 'all' | 'admin' | 'user'
  const [busyEmail, setBusyEmail] = useState(null);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [addingNew, setAddingNew] = useState(false);

  // Current logged in user info
  const [currentAdminEmail, setCurrentAdminEmail] = useState("");

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("jt_admin_user");
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        if (parsed?.email) setCurrentAdminEmail(parsed.email.toLowerCase());
      }
    } catch {}
  }, []);

  const token = () => (typeof window !== "undefined" ? localStorage.getItem("jt_admin_token") : "");

  const loadUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/users", {
        headers: {
          Authorization: `Bearer ${token()}`,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "ইউজারদের লোড করতে ব্যর্থ হয়েছে");
      setUsers(data.users || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleToggleRole = async (targetEmail, currentIsAdmin) => {
    const nextRole = currentIsAdmin ? "user" : "admin";
    const confirmMsg = currentIsAdmin
      ? `আপনি কি নিশ্চিতভাবে ${targetEmail}-এর অ্যাডমিন এক্সেস বাতিল করতে চান?`
      : `আপনি কি নিশ্চিতভাবে ${targetEmail} কে অ্যাডমিন পারমিশন দিতে চান?`;

    if (!window.confirm(confirmMsg)) return;

    setBusyEmail(targetEmail);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token()}`,
        },
        body: JSON.stringify({
          email: targetEmail,
          role: nextRole,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "রোল পরিবর্তন করা যায়নি");

      setSuccess(data.message || "সফলভাবে আপডেট হয়েছে!");
      await loadUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyEmail(null);
    }
  };

  const handleAddNewAdmin = async (e) => {
    e.preventDefault();
    const cleanEmail = newAdminEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setError("অনুগ্রহ করে একটি সঠিক ইমেইল অ্যাড্রেস লিখুন");
      return;
    }

    setAddingNew(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token()}`,
        },
        body: JSON.stringify({
          email: cleanEmail,
          role: "admin",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "অ্যাডমিন যুক্ত করা যায়নি");

      setSuccess(data.message || "অ্যাডমিন সফলভাবে যুক্ত হয়েছে!");
      setNewAdminEmail("");
      await loadUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setAddingNew(false);
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const query = search.toLowerCase().trim();
      const matchSearch =
        !query ||
        u.email.toLowerCase().includes(query) ||
        (u.displayName && u.displayName.toLowerCase().includes(query));

      const matchRole =
        filterRole === "all" ||
        (filterRole === "admin" && u.isAdmin) ||
        (filterRole === "user" && !u.isAdmin);

      return matchSearch && matchRole;
    });
  }, [users, search, filterRole]);

  const totalUsers = users.length;
  const totalAdmins = users.filter((u) => u.isAdmin).length;
  const totalCustomers = totalUsers - totalAdmins;

  return (
    <div style={{ padding: "8px 0 32px 0", maxWidth: 1100, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 8 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0, marginTop: 2 }}>
            👥
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", margin: "0 0 6px 0", lineHeight: 1.3 }}>
              অ্যাডমিন ও ইউজার পারমিশন কন্ট্রোল
            </h2>
            <p style={{ margin: 0, color: "#64748b", fontSize: 13, lineHeight: 1.5 }}>
              Firebase-এ যুক্ত ইউজারদের তালিকা দেখুন এবং যেকোনো ইমেইলকে এক ক্লিকে অ্যাডমিন অনুমোদন বা বাতিল করুন।
            </p>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, padding: "12px 16px", color: "#dc2626", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 14 }}>
          <span>⚠️ {error}</span>
          <button onClick={() => setError("")} style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontWeight: "bold" }}>✕</button>
        </div>
      )}
      {success && (
        <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, padding: "12px 16px", color: "#16a34a", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 14 }}>
          <span>✅ {success}</span>
          <button onClick={() => setSuccess("")} style={{ background: "none", border: "none", color: "#16a34a", cursor: "pointer", fontWeight: "bold" }}>✕</button>
        </div>
      )}

      {/* Quick Stats Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 24 }}>
        <div style={{ background: "#ffffff", padding: "18px 20px", borderRadius: 14, border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div style={{ color: "#64748b", fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>মোট রেজিস্টার্ড ইউজার</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#0f172a", marginTop: 4 }}>{totalUsers}</div>
        </div>

        <div style={{ background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)", padding: "18px 20px", borderRadius: 14, border: "1px solid #bbf7d0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div style={{ color: "#15803d", fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>👑 সক্রিয় অ্যাডমিন</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#166534", marginTop: 4 }}>{totalAdmins} জন</div>
        </div>

        <div style={{ background: "#ffffff", padding: "18px 20px", borderRadius: 14, border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div style={{ color: "#64748b", fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>👤 সাধারণ কাস্টমার</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#0f172a", marginTop: 4 }}>{totalCustomers} জন</div>
        </div>
      </div>

      {/* Direct Add New Admin Section */}
      <div style={{ background: "#ffffff", padding: 20, borderRadius: 16, border: "1px solid #e2e8f0", marginBottom: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        <h3 style={{ margin: "0 0 8px 0", fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
          ➕ সরাসরি নতুন অ্যাডমিন ইমেইল যুক্ত করুন
        </h3>
        <p style={{ margin: "0 0 16px 0", fontSize: 13, color: "#64748b" }}>
          কোনো ইমেইল এখনও ওয়েবসাইটে প্রথমবার সাইন-ইন না করে থাকলেও আপনি তাকে আগেই অ্যাডমিন হিসেবে তালিকাভুক্ত করতে পারবেন।
        </p>

        <form onSubmit={handleAddNewAdmin} style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <input
            type="email"
            value={newAdminEmail}
            onChange={(e) => setNewAdminEmail(e.target.value)}
            placeholder="e.g. manager@gmail.com"
            required
            style={{
              flex: "1 1 300px",
              padding: "11px 16px",
              borderRadius: 10,
              border: "1px solid #cbd5e1",
              fontSize: 14,
              outline: "none",
            }}
          />
          <button
            type="submit"
            disabled={addingNew}
            style={{
              padding: "11px 22px",
              background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
              color: "#ffffff",
              border: "none",
              borderRadius: 10,
              fontWeight: 700,
              fontSize: 14,
              cursor: addingNew ? "not-allowed" : "pointer",
              boxShadow: "0 2px 4px rgba(5,150,105,0.25)",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {addingNew ? "যোগ হচ্ছে..." : "👑 অ্যাডমিন হিসেবে যুক্ত করুন"}
          </button>
        </form>
      </div>

      {/* Filters and Search */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 6, background: "#f1f5f9", padding: 4, borderRadius: 10 }}>
          <button
            onClick={() => setFilterRole("all")}
            style={{
              padding: "7px 16px",
              borderRadius: 8,
              border: "none",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              background: filterRole === "all" ? "#ffffff" : "transparent",
              color: filterRole === "all" ? "#0f172a" : "#64748b",
              boxShadow: filterRole === "all" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
            }}
          >
            সব ({totalUsers})
          </button>
          <button
            onClick={() => setFilterRole("admin")}
            style={{
              padding: "7px 16px",
              borderRadius: 8,
              border: "none",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              background: filterRole === "admin" ? "#ffffff" : "transparent",
              color: filterRole === "admin" ? "#059669" : "#64748b",
              boxShadow: filterRole === "admin" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
            }}
          >
            👑 শুধু অ্যাডমিন ({totalAdmins})
          </button>
          <button
            onClick={() => setFilterRole("user")}
            style={{
              padding: "7px 16px",
              borderRadius: 8,
              border: "none",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              background: filterRole === "user" ? "#ffffff" : "transparent",
              color: filterRole === "user" ? "#0f172a" : "#64748b",
              boxShadow: filterRole === "user" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
            }}
          >
            👤 শুধু কাস্টমার ({totalCustomers})
          </button>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flex: "1 1 260px", maxWidth: 360 }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ইমেইল বা নাম দিয়ে খুঁজুন..."
            style={{
              width: "100%",
              padding: "9px 14px",
              borderRadius: 10,
              border: "1px solid #cbd5e1",
              fontSize: 13,
              outline: "none",
            }}
          />
          <button
            onClick={loadUsers}
            title="রিফ্রেশ করুন"
            style={{
              padding: "9px 12px",
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              borderRadius: 10,
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            🔄
          </button>
        </div>
      </div>

      {/* User Table */}
      <div style={{ background: "#ffffff", borderRadius: 16, border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: "center", color: "#64748b" }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>⏳</div>
            ইউজারদের তালিকা লোড হচ্ছে...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center", color: "#64748b" }}>
            কোনো ইউজার পাওয়া যায়নি।
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 14 }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#475569", fontWeight: 700, fontSize: 13 }}>
                  <th style={{ padding: "14px 18px" }}>ইউজার / ইমেইল</th>
                  <th style={{ padding: "14px 18px" }}>রোল স্ট্যাটাস</th>
                  <th style={{ padding: "14px 18px" }}>যোগদানের তারিখ</th>
                  <th style={{ padding: "14px 18px", textAlign: "right" }}>অ্যাকশন</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => {
                  const isCurrentLoggedAdmin =
                    currentAdminEmail && u.email.toLowerCase() === currentAdminEmail;
                  const isBusy = busyEmail === u.email;

                  return (
                    <tr
                      key={u.uid || u.email}
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                        transition: "background 0.15s",
                        background: u.isAdmin ? "#fcfdfc" : "#ffffff",
                      }}
                    >
                      <td style={{ padding: "14px 18px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div
                            style={{
                              width: 38,
                              height: 38,
                              borderRadius: "50%",
                              background: u.isAdmin
                                ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                                : "linear-gradient(135deg, #64748b 0%, #475569 100%)",
                              color: "#fff",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: 700,
                              fontSize: 15,
                              flexShrink: 0,
                            }}
                          >
                            {(u.displayName || u.email || "U").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: "#0f172a", display: "flex", alignItems: "center", gap: 6 }}>
                              {u.displayName || "Liora User"}
                              {isCurrentLoggedAdmin && (
                                <span style={{ background: "#dbeafe", color: "#1e40af", fontSize: 11, padding: "2px 6px", borderRadius: 6, fontWeight: 700 }}>
                                  (আপনি)
                                </span>
                              )}
                            </div>
                            <div style={{ color: "#64748b", fontSize: 13 }}>{u.email}</div>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: "14px 18px" }}>
                        {u.isAdmin ? (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              padding: "4px 12px",
                              borderRadius: 20,
                              background: "#ecfdf5",
                              color: "#059669",
                              border: "1px solid #a7f3d0",
                              fontSize: 12,
                              fontWeight: 700,
                            }}
                          >
                            👑 Admin
                          </span>
                        ) : (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              padding: "4px 12px",
                              borderRadius: 20,
                              background: "#f1f5f9",
                              color: "#475569",
                              border: "1px solid #e2e8f0",
                              fontSize: 12,
                              fontWeight: 600,
                            }}
                          >
                            👤 Customer
                          </span>
                        )}
                      </td>

                      <td style={{ padding: "14px 18px", color: "#64748b", fontSize: 13 }}>
                        {u.creationTime ? new Date(u.creationTime).toLocaleDateString("bn-BD", { year: "numeric", month: "short", day: "numeric" }) : "—"}
                      </td>

                      <td style={{ padding: "14px 18px", textAlign: "right" }}>
                        {u.isAdmin ? (
                          <button
                            onClick={() => handleToggleRole(u.email, true)}
                            disabled={isBusy || isCurrentLoggedAdmin}
                            title={isCurrentLoggedAdmin ? "আপনি নিজের অ্যাডমিন এক্সেস বাতিল করতে পারবেন না" : "অ্যাডমিন এক্সেস বাতিল করুন"}
                            style={{
                              padding: "7px 14px",
                              borderRadius: 8,
                              border: "1px solid #fecaca",
                              background: isCurrentLoggedAdmin ? "#f8fafc" : "#fef2f2",
                              color: isCurrentLoggedAdmin ? "#94a3b8" : "#dc2626",
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: isCurrentLoggedAdmin || isBusy ? "not-allowed" : "pointer",
                              transition: "all 0.15s",
                            }}
                          >
                            {isBusy ? "আপডেট হচ্ছে..." : "🚫 অ্যাডমিন বাতিল"}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleToggleRole(u.email, false)}
                            disabled={isBusy}
                            style={{
                              padding: "7px 14px",
                              borderRadius: 8,
                              border: "none",
                              background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
                              color: "#ffffff",
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: isBusy ? "not-allowed" : "pointer",
                              boxShadow: "0 1px 3px rgba(5,150,105,0.2)",
                            }}
                          >
                            {isBusy ? "আপডেট হচ্ছে..." : "👑 অ্যাডমিন বানান"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
