"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";

export default function ResellerPayoutManager() {
  const [payouts, setPayouts] = useState([]);
  const [stats, setStats] = useState({
    pendingCount: 0,
    pendingAmount: 0,
    completedCount: 0,
    completedAmount: 0,
    cancelledCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Filters
  const [statusFilter, setStatusFilter] = useState("pending"); // default to pending
  const [search, setSearch] = useState("");

  // Modals
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedPayout, setSelectedPayout] = useState(null);
  const [payForm, setPayForm] = useState({
    adminSenderAccount: "",
    transactionId: "",
    adminNote: "",
  });

  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [receiptData, setReceiptData] = useState(null);

  const [processing, setProcessing] = useState(false);
  const [copiedId, setCopiedId] = useState("");

  const receiptRef = useRef(null);

  const getAdminToken = () =>
    typeof window !== "undefined" ? localStorage.getItem("jt_admin_token") || "" : "";

  const loadPayouts = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`/api/admin/payouts?status=${statusFilter}&search=${encodeURIComponent(search)}`, {
        headers: { Authorization: `Bearer ${getAdminToken()}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "পে-আউট ডাটা লোড ব্যর্থ");
      setPayouts(data.payouts || []);
      if (data.stats) setStats(data.stats);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayouts();
  }, [statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadPayouts();
  };

  const copyToClipboard = (text, id) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(""), 2000);
  };

  // Open Pay Modal
  const handleOpenPay = (payout) => {
    setSelectedPayout(payout);
    setPayForm({
      adminSenderAccount: localStorage.getItem("jt_admin_bkash") || "",
      transactionId: "",
      adminNote: "",
    });
    setIsPayModalOpen(true);
  };

  // Submit Payment (Mark Paid)
  const handleSubmitPay = async (e) => {
    e.preventDefault();
    if (!payForm.transactionId.trim()) {
      alert("বিকাশ/নগদ Transaction ID (TrxID) দেওয়া আবশ্যক!");
      return;
    }

    try {
      setProcessing(true);
      setError("");
      setSuccess("");

      if (payForm.adminSenderAccount) {
        localStorage.setItem("jt_admin_bkash", payForm.adminSenderAccount);
      }

      const res = await fetch("/api/admin/payouts", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getAdminToken()}`,
        },
        body: JSON.stringify({
          action: "mark_paid",
          ledgerId: selectedPayout._id,
          adminSenderAccount: payForm.adminSenderAccount,
          transactionId: payForm.transactionId,
          adminNote: payForm.adminNote,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "পেমেন্ট আপডেট ব্যর্থ");

      setSuccess(data.message || "পেমেন্ট সফলভাবে সম্পন্ন হিসেবে চিহ্নিত করা হয়েছে!");
      setIsPayModalOpen(false);

      // Open receipt automatically
      if (data.payout) {
        setReceiptData({
          ...selectedPayout,
          ...data.payout,
        });
        setIsReceiptModalOpen(true);
      }

      loadPayouts();
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  // Open Reject Modal
  const handleOpenReject = (payout) => {
    setSelectedPayout(payout);
    setRejectReason("");
    setIsRejectModalOpen(true);
  };

  // Submit Reject & Refund
  const handleSubmitReject = async (e) => {
    e.preventDefault();
    if (!confirm(`আপনি কি নিশ্চিত যে এই রিকোয়েস্টটি বাতিল করে ৳${Math.abs(selectedPayout.amount)} টাকা রিসেলারের ওয়ালেটে ফেরত দেবেন?`)) {
      return;
    }

    try {
      setProcessing(true);
      setError("");
      setSuccess("");

      const res = await fetch("/api/admin/payouts", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getAdminToken()}`,
        },
        body: JSON.stringify({
          action: "reject",
          ledgerId: selectedPayout._id,
          reason: rejectReason,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "বাতিল ব্যর্থ");

      setSuccess(data.message || "রিকোয়েস্ট বাতিল ও রিফান্ড সফল হয়েছে");
      setIsRejectModalOpen(false);
      loadPayouts();
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  // Delete Record
  const handleDelete = async (payout) => {
    if (!confirm(`আপনি কি এই পে-আউট রেকর্ডটি (${payout.payoutAccount} - ৳${Math.abs(payout.amount)}) ডিলিট করতে চান?`)) {
      return;
    }

    try {
      setProcessing(true);
      setError("");
      setSuccess("");

      const res = await fetch("/api/admin/payouts", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getAdminToken()}`,
        },
        body: JSON.stringify({
          action: "delete",
          ledgerId: payout._id,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "ডিলিট ব্যর্থ");

      setSuccess(data.message || "রেকর্ড ডিলিট সম্পন্ন");
      loadPayouts();
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  // Print Receipt
  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Alert Notices */}
      {error && (
        <div style={{ padding: "10px 16px", background: "#fef2f2", color: "#b91c1c", borderRadius: 8, fontSize: 13, fontWeight: 700, border: "1px solid #fecaca" }}>
          ⚠️ {error}
        </div>
      )}
      {success && (
        <div style={{ padding: "10px 16px", background: "#f0fdf4", color: "#15803d", borderRadius: 8, fontSize: 13, fontWeight: 700, border: "1px solid #bbf7d0" }}>
          ✓ {success}
        </div>
      )}

      {/* Summary KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
        <div style={{ background: "#fff", border: "1.5px solid #fde68a", borderRadius: 12, padding: "14px 18px", boxShadow: "0 2px 6px rgba(0,0,0,0.03)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: "#b45309", textTransform: "uppercase" }}>⏳ অপেক্ষমাণ পে-আউট</span>
            <span style={{ background: "#fef3c7", color: "#b45309", padding: "2px 8px", borderRadius: 12, fontSize: 11, fontWeight: 900 }}>{stats.pendingCount} টি</span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 900, color: "#d97706", marginTop: 6 }}>
            ৳{stats.pendingAmount.toLocaleString()}
          </div>
          <div style={{ fontSize: 11, color: "#78350f", marginTop: 2 }}>রিসেলাররা ক্যাশআউট রিকোয়েস্ট পাঠিয়েছে</div>
        </div>

        <div style={{ background: "#fff", border: "1.5px solid #bbf7d0", borderRadius: 12, padding: "14px 18px", boxShadow: "0 2px 6px rgba(0,0,0,0.03)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: "#15803d", textTransform: "uppercase" }}>✅ মোট পরিশোধিত (Paid)</span>
            <span style={{ background: "#dcfce7", color: "#15803d", padding: "2px 8px", borderRadius: 12, fontSize: 11, fontWeight: 900 }}>{stats.completedCount} টি</span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 900, color: "#16a34a", marginTop: 6 }}>
            ৳{stats.completedAmount.toLocaleString()}
          </div>
          <div style={{ fontSize: 11, color: "#14532d", marginTop: 2 }}>সফলভাবে TrxID সহ পরিশোধ করা হয়েছে</div>
        </div>

        <div style={{ background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 12, padding: "14px 18px", boxShadow: "0 2px 6px rgba(0,0,0,0.03)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>❌ বাতিল ও রিফান্ডকৃত</span>
            <span style={{ background: "#f1f5f9", color: "#475569", padding: "2px 8px", borderRadius: 12, fontSize: 11, fontWeight: 900 }}>{stats.cancelledCount} টি</span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 900, color: "#475569", marginTop: 6 }}>
            {stats.cancelledCount} রিকোয়েস্ট
          </div>
          <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>ভুল নম্বরের কারণে ওয়ালেটে ফেরত দেওয়া হয়েছে</div>
        </div>
      </div>

      {/* Control Bar: Status Filter Buttons & Search */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", background: "#fff", padding: "12px 16px", borderRadius: 12, border: "1px solid #e2e8f0" }}>
        {/* Status Tabs */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {[
            { id: "pending", label: "⏳ অপেক্ষমাণ (Pending)", count: stats.pendingCount, color: "#d97706", bg: "#fef3c7" },
            { id: "completed", label: "✅ পরিশোধিত (Paid)", count: stats.completedCount, color: "#16a34a", bg: "#dcfce7" },
            { id: "cancelled", label: "❌ বাতিলকৃত (Cancelled)", count: stats.cancelledCount, color: "#64748b", bg: "#f1f5f9" },
            { id: "all", label: "🔘 সকল রিকোয়েস্ট", count: stats.pendingCount + stats.completedCount + stats.cancelledCount, color: "#0f172a", bg: "#e2e8f0" },
          ].map((tab) => {
            const active = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                style={{
                  background: active ? tab.color : "#f8fafc",
                  color: active ? "#ffffff" : "#334155",
                  border: active ? `1px solid ${tab.color}` : "1px solid #cbd5e1",
                  padding: "6px 14px",
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  transition: "all 0.15s ease",
                }}
              >
                <span>{tab.label}</span>
                <span style={{
                  background: active ? "rgba(255,255,255,0.25)" : tab.bg,
                  color: active ? "#ffffff" : tab.color,
                  padding: "1px 6px",
                  borderRadius: 10,
                  fontSize: 10.5,
                  fontWeight: 900,
                }}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input & Refresh */}
        <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: 8, flex: "1 1 280px", maxWidth: 420 }}>
          <input
            type="text"
            placeholder="রিসেলার ইমেইল, বিকাশ নম্বর বা TrxID খুঁজুন..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: 1,
              padding: "7px 12px",
              borderRadius: 8,
              border: "1px solid #cbd5e1",
              fontSize: 12.5,
              outline: "none",
            }}
          />
          <button
            type="submit"
            style={{
              background: "#0f172a",
              color: "#fff",
              border: "none",
              padding: "7px 14px",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            সার্চ
          </button>
          <button
            type="button"
            onClick={loadPayouts}
            title="রিফ্রেশ করুন"
            style={{
              background: "#f1f5f9",
              border: "1px solid #cbd5e1",
              padding: "7px 12px",
              borderRadius: 8,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            🔄
          </button>
        </form>
      </div>

      {/* Payouts Table */}
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #cbd5e1", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
        <div style={{ padding: "12px 16px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 900, color: "#0f172a" }}>
              💳 Reseller Payout Requests & Payment Vouchers
            </h3>
            <p style={{ margin: "2px 0 0", fontSize: 11.5, color: "#64748b" }}>
              বিকাশ/নগদ নম্বর দেখে টাকা পাঠান, TrxID লিখে 'Mark Paid' করুন এবং মানি রিসিট প্রিন্ট করুন
            </p>
          </div>
          <span style={{ fontSize: 12, fontWeight: 800, color: "#475569" }}>
            মোট রেকর্ড: {payouts.length} টি
          </span>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, textAlign: "left" }}>
            <thead style={{ background: "#f1f5f9", borderBottom: "1px solid #e2e8f0" }}>
              <tr>
                <th style={{ padding: "10px 14px", fontWeight: 800 }}>তারিখ ও সময়</th>
                <th style={{ padding: "10px 14px", fontWeight: 800 }}>রিসেলার তথ্য</th>
                <th style={{ padding: "10px 14px", fontWeight: 800, textAlign: "right" }}>টাকার পরিমাণ</th>
                <th style={{ padding: "10px 14px", fontWeight: 800 }}>প্রাপক নম্বর (পাঠানোর ঠিকানা)</th>
                <th style={{ padding: "10px 14px", fontWeight: 800 }}>পেমেন্ট প্রমাণ (TrxID)</th>
                <th style={{ padding: "10px 14px", fontWeight: 800 }}>স্ট্যাটাস</th>
                <th style={{ padding: "10px 14px", fontWeight: 800, textAlign: "center" }}>অ্যাকশন</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: 30, textAlign: "center", color: "#64748b" }}>
                    🔄 লোড হচ্ছে...
                  </td>
                </tr>
              ) : payouts.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: 36, textAlign: "center", color: "#64748b" }}>
                    কোনো পে-আউট রিকোয়েস্ট পাওয়া যায়নি।
                  </td>
                </tr>
              ) : (
                payouts.map((p) => {
                  const reqAmount = Math.abs(p.amount);
                  const isBkash = (p.payoutMethod || "").toLowerCase().includes("bkash");
                  const isNagad = (p.payoutMethod || "").toLowerCase().includes("nagad");

                  return (
                    <tr key={p._id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      {/* Date */}
                      <td style={{ padding: "12px 14px", color: "#64748b", whiteSpace: "nowrap" }}>
                        <div style={{ fontWeight: 700, color: "#334155" }}>
                          {new Date(p.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        </div>
                        <div style={{ fontSize: 10.5, color: "#94a3b8" }}>
                          {new Date(p.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </td>

                      {/* Reseller Info */}
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ fontWeight: 800, color: "#0f172a" }}>
                          {p.resellerStoreName || p.resellerName || "রিসেলার"}
                        </div>
                        <div style={{ fontSize: 11, color: "#475569" }}>
                          {p.resellerEmail}
                        </div>
                        {p.resellerPhone && (
                          <div style={{ fontSize: 10.5, color: "#64748b" }}>
                            ফোন: {p.resellerPhone}
                          </div>
                        )}
                        <div style={{ fontSize: 10, color: "#0284c7", marginTop: 2, fontWeight: 700 }}>
                          বর্তমান ওয়ালেট: ৳{p.currentWalletBalance}
                        </div>
                      </td>

                      {/* Amount */}
                      <td style={{ padding: "12px 14px", textAlign: "right" }}>
                        <div style={{ fontSize: 15, fontWeight: 900, color: "#be123c" }}>
                          ৳{reqAmount.toLocaleString()}
                        </div>
                        <div style={{ fontSize: 10, color: "#94a3b8" }}>
                          অবশিষ্ট: ৳{p.balanceAfter}
                        </div>
                      </td>

                      {/* Recipient Account */}
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                          <span style={{
                            padding: "2px 8px",
                            borderRadius: 10,
                            fontSize: 10.5,
                            fontWeight: 900,
                            background: isBkash ? "#fce7f3" : isNagad ? "#ffedd5" : "#f1f5f9",
                            color: isBkash ? "#be185d" : isNagad ? "#c2410c" : "#334155",
                          }}>
                            {p.payoutMethod || "bKash"}
                          </span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontWeight: 800, fontSize: 13, color: "#0f172a", fontFamily: "monospace" }}>
                            {p.payoutAccount}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(p.payoutAccount, p._id + "_acc")}
                            title="নম্বর কপি করুন"
                            style={{
                              background: copiedId === p._id + "_acc" ? "#16a34a" : "#f1f5f9",
                              color: copiedId === p._id + "_acc" ? "#fff" : "#475569",
                              border: "1px solid #cbd5e1",
                              borderRadius: 6,
                              padding: "2px 6px",
                              fontSize: 10.5,
                              fontWeight: 700,
                              cursor: "pointer",
                            }}
                          >
                            {copiedId === p._id + "_acc" ? "✓ Copied" : "📋 Copy"}
                          </button>
                        </div>
                        {p.note && (
                          <div style={{ fontSize: 10.5, color: "#64748b", marginTop: 2, fontStyle: "italic" }}>
                            "{p.note}"
                          </div>
                        )}
                      </td>

                      {/* Payment Proof / TrxID */}
                      <td style={{ padding: "12px 14px" }}>
                        {p.status === "completed" ? (
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span style={{ fontWeight: 900, color: "#15803d", fontFamily: "monospace", fontSize: 12 }}>
                                {p.transactionId || "—"}
                              </span>
                              {p.transactionId && (
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(p.transactionId, p._id + "_trx")}
                                  style={{
                                    background: "none",
                                    border: "none",
                                    fontSize: 10,
                                    cursor: "pointer",
                                    color: "#64748b",
                                  }}
                                >
                                  {copiedId === p._id + "_trx" ? "✓" : "📋"}
                                </button>
                              )}
                            </div>
                            {p.adminSenderAccount && (
                              <div style={{ fontSize: 10.5, color: "#64748b" }}>
                                প্রেরক: {p.adminSenderAccount}
                              </div>
                            )}
                            {p.receiptNumber && (
                              <div style={{ fontSize: 10, color: "#9333ea", fontWeight: 700, marginTop: 2 }}>
                                রিসিট: {p.receiptNumber}
                              </div>
                            )}
                          </div>
                        ) : p.status === "cancelled" ? (
                          <div style={{ fontSize: 11, color: "#b91c1c" }}>
                            {p.adminNote || "বাতিলকৃত"}
                          </div>
                        ) : (
                          <span style={{ fontSize: 11, color: "#d97706", fontWeight: 700 }}>
                            পেমেন্ট বাকি
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td style={{ padding: "12px 14px" }}>
                        <span style={{
                          padding: "3px 10px",
                          borderRadius: 20,
                          fontSize: 11,
                          fontWeight: 800,
                          background:
                            p.status === "completed"
                              ? "#dcfce7"
                              : p.status === "pending"
                              ? "#fef3c7"
                              : "#fee2e2",
                          color:
                            p.status === "completed"
                              ? "#15803d"
                              : p.status === "pending"
                              ? "#b45309"
                              : "#b91c1c",
                        }}>
                          {p.status === "completed"
                            ? "✓ Paid"
                            : p.status === "pending"
                            ? "⏳ Pending"
                            : "✕ Cancelled"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: "12px 14px", textAlign: "center" }}>
                        <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
                          {p.status === "pending" && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenPay(p)}
                                style={{
                                  background: "#16a34a",
                                  color: "#fff",
                                  border: "none",
                                  padding: "6px 12px",
                                  borderRadius: 8,
                                  fontSize: 11.5,
                                  fontWeight: 800,
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 4,
                                }}
                              >
                                💸 টাকা পাঠান ও Mark Paid
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenReject(p)}
                                style={{
                                  background: "#fee2e2",
                                  color: "#b91c1c",
                                  border: "1px solid #fca5a5",
                                  padding: "6px 10px",
                                  borderRadius: 8,
                                  fontSize: 11,
                                  fontWeight: 700,
                                  cursor: "pointer",
                                }}
                              >
                                ✕ বাতিল ও রিফান্ড
                              </button>
                            </>
                          )}

                          {p.status === "completed" && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setReceiptData(p);
                                  setIsReceiptModalOpen(true);
                                }}
                                style={{
                                  background: "#fdf2f8",
                                  color: "#be185d",
                                  border: "1.5px solid #fbcfe8",
                                  padding: "5px 12px",
                                  borderRadius: 8,
                                  fontSize: 11.5,
                                  fontWeight: 800,
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 4,
                                }}
                              >
                                🧾 রিসিট ভাউচার
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(p)}
                                style={{
                                  background: "#f8fafc",
                                  color: "#94a3b8",
                                  border: "1px solid #e2e8f0",
                                  padding: "5px 8px",
                                  borderRadius: 8,
                                  fontSize: 11,
                                  cursor: "pointer",
                                }}
                                title="রেকর্ড ডিলিট করুন"
                              >
                                🗑️
                              </button>
                            </>
                          )}

                          {p.status === "cancelled" && (
                            <button
                              type="button"
                              onClick={() => handleDelete(p)}
                              style={{
                                background: "#f8fafc",
                                color: "#94a3b8",
                                border: "1px solid #e2e8f0",
                                padding: "5px 8px",
                                borderRadius: 8,
                                fontSize: 11,
                                cursor: "pointer",
                              }}
                              title="রেকর্ড ডিলিট করুন"
                            >
                              🗑️ Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Mark as Paid Form */}
      {isPayModalOpen && selectedPayout && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 14 }}>
          <div style={{ background: "#fff", width: "100%", maxWidth: 500, borderRadius: 16, padding: 24, boxShadow: "0 25px 50px rgba(0,0,0,0.25)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, borderBottom: "1px solid #f1f5f9", paddingBottom: 10 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: "#0f172a" }}>
                  💸 পে-আউট কনফার্মেশন ও TrxID এন্ট্রি
                </h3>
                <p style={{ margin: "2px 0 0", fontSize: 11.5, color: "#64748b" }}>
                  টাকা পাঠিয়ে নিচে আপনার প্রেরক নম্বর ও TrxID বসিয়ে কনফার্ম করুন
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPayModalOpen(false)}
                style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#64748b" }}
              >
                ✕
              </button>
            </div>

            {/* Recipient Details Highlight Box */}
            <div style={{ background: "#fdf2f8", border: "1.5px solid #fbcfe8", borderRadius: 12, padding: 14, marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 11.5, fontWeight: 800, color: "#9d174d", textTransform: "uppercase" }}>
                  টাকা পাঠানোর ঠিকানা ({selectedPayout.payoutMethod || "bKash"})
                </span>
                <span style={{ fontSize: 16, fontWeight: 900, color: "#be123c" }}>
                  ৳{Math.abs(selectedPayout.amount).toLocaleString()}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff", padding: "8px 12px", borderRadius: 8, border: "1px solid #f9a8d4" }}>
                <div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>প্রাপক নম্বর ({selectedPayout.payoutMethod}):</div>
                  <div style={{ fontSize: 15, fontWeight: 900, color: "#0f172a", fontFamily: "monospace" }}>
                    {selectedPayout.payoutAccount}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(selectedPayout.payoutAccount, "modal_acc")}
                  style={{
                    background: copiedId === "modal_acc" ? "#16a34a" : "#ec4899",
                    color: "#fff",
                    border: "none",
                    padding: "6px 12px",
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  {copiedId === "modal_acc" ? "✓ Copied" : "📋 Copy Number"}
                </button>
              </div>
              <div style={{ fontSize: 11, color: "#475569", marginTop: 8 }}>
                রিসেলার: <b>{selectedPayout.resellerStoreName || selectedPayout.resellerName}</b> ({selectedPayout.resellerEmail})
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitPay}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 800, color: "#334155", marginBottom: 4 }}>
                  আপনার প্রেরক বিকাশ/নগদ নম্বর (যেখান থেকে পাঠালেন)
                </label>
                <input
                  type="text"
                  placeholder="যেমন: 018XXXXXXXX"
                  value={payForm.adminSenderAccount}
                  onChange={(e) => setPayForm({ ...payForm, adminSenderAccount: e.target.value })}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13, boxSizing: "border-box" }}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 800, color: "#334155", marginBottom: 4 }}>
                  বিকাশ/নগদ Transaction ID (TrxID) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="যেমন: BL89K29AL9"
                  value={payForm.transactionId}
                  onChange={(e) => setPayForm({ ...payForm, transactionId: e.target.value })}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1.5px solid #0f172a", fontSize: 14, fontWeight: 800, fontFamily: "monospace", boxSizing: "border-box" }}
                />
                <span style={{ fontSize: 11, color: "#64748b", marginTop: 2, display: "block" }}>
                  পেমেন্ট সফল হওয়ার পর বিকাশের দেওয়া ট্রানজ্যাকশন আইডি
                </span>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
                  অ্যাডমিন নোট (ঐচ্ছিক)
                </label>
                <input
                  type="text"
                  placeholder="যেমন: Weekly payout cleared"
                  value={payForm.adminNote}
                  onChange={(e) => setPayForm({ ...payForm, adminNote: e.target.value })}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 12.5, boxSizing: "border-box" }}
                />
              </div>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", borderTop: "1px solid #f1f5f9", paddingTop: 14 }}>
                <button
                  type="button"
                  onClick={() => setIsPayModalOpen(false)}
                  style={{ background: "#f1f5f9", border: "1px solid #cbd5e1", padding: "8px 16px", borderRadius: 8, fontWeight: 700, cursor: "pointer" }}
                >
                  ক্যানসেল
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  style={{
                    background: "#16a34a",
                    color: "#fff",
                    border: "none",
                    padding: "9px 20px",
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 900,
                    cursor: processing ? "not-allowed" : "pointer",
                  }}
                >
                  {processing ? "প্রসেসিং হচ্ছে..." : "✓ পেমেন্ট কনফার্ম ও রিসিট জেনারেট করুন"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Reject & Refund Form */}
      {isRejectModalOpen && selectedPayout && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 14 }}>
          <div style={{ background: "#fff", width: "100%", maxWidth: 460, borderRadius: 16, padding: 22, boxShadow: "0 25px 50px rgba(0,0,0,0.25)" }}>
            <h3 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 900, color: "#b91c1c" }}>
              ❌ পে-আউট রিকোয়েস্ট বাতিল ও রিফান্ড
            </h3>
            <p style={{ margin: "0 0 14px", fontSize: 12, color: "#64748b" }}>
              রিকোয়েস্ট বাতিল করলে <b>৳{Math.abs(selectedPayout.amount)}</b> টাকা সরাসরি রিসেলারের ওয়ালেটে ফেরত চলে যাবে।
            </p>

            <form onSubmit={handleSubmitReject}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
                  বাতিলের কারণ (রিসেলার দেখতে পাবে) *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="যেমন: আপনার দেওয়া বিকাশ নম্বরটি বন্ধ বা ভুল ছিল। অনুগ্রহ করে সঠিক নম্বর দিয়ে পুনরায় ক্যাশআউট রিকোয়েস্ট করুন।"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 12.5, boxSizing: "border-box" }}
                />
              </div>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setIsRejectModalOpen(false)}
                  style={{ background: "#f1f5f9", border: "1px solid #cbd5e1", padding: "8px 16px", borderRadius: 8, fontWeight: 700, cursor: "pointer" }}
                >
                  ফিরে যান
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  style={{
                    background: "#dc2626",
                    color: "#fff",
                    border: "none",
                    padding: "8px 18px",
                    borderRadius: 8,
                    fontSize: 12.5,
                    fontWeight: 800,
                    cursor: processing ? "not-allowed" : "pointer",
                  }}
                >
                  {processing ? "বাতিল হচ্ছে..." : "নিশ্চিত বাতিল ও রিফান্ড"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Printable Digital Receipt / Voucher */}
      {isReceiptModalOpen && receiptData && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 14, overflowY: "auto" }}>
          <div style={{ background: "#fff", width: "100%", maxWidth: 580, borderRadius: 16, padding: 26, boxShadow: "0 25px 60px rgba(0,0,0,0.3)", position: "relative" }}>
            {/* Top Bar for Modal Actions (hidden during print) */}
            <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, borderBottom: "1px solid #f1f5f9", paddingBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: "#16a34a" }}>
                ✓ Official Money Receipt Voucher
              </span>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  onClick={handlePrintReceipt}
                  style={{
                    background: "#0f172a",
                    color: "#fff",
                    border: "none",
                    padding: "6px 14px",
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 800,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  🖨️ Print / Download
                </button>
                <button
                  type="button"
                  onClick={() => setIsReceiptModalOpen(false)}
                  style={{ background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: 8, padding: "6px 12px", fontSize: 13, cursor: "pointer" }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Printable Receipt Body */}
            <div ref={receiptRef} style={{ border: "2px solid #fecdd3", borderRadius: 14, padding: 22, background: "linear-gradient(180deg, #fff5f5 0%, #ffffff 100%)" }}>
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px dashed #f43f5e", paddingBottom: 14, marginBottom: 16 }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 19, fontWeight: 900, color: "#be123c", letterSpacing: 0.5 }}>
                    LIORA BEAUTY & WEAR
                  </h2>
                  <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>
                    Official Reseller Payout Voucher & Money Receipt
                  </div>
                  <div style={{ fontSize: 10.5, color: "#64748b" }}>
                    www.liorabeautyandwear.com | Support: 01837223147
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ background: "#f43f5e", color: "#fff", padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 900, display: "inline-block" }}>
                    PAID VOUCHER
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#0f172a", marginTop: 4 }}>
                    {receiptData.receiptNumber || `RCP-${Date.now().toString().slice(-6)}`}
                  </div>
                </div>
              </div>

              {/* Grid Details */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16, fontSize: 12 }}>
                <div>
                  <div style={{ fontSize: 10.5, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase" }}>প্রাপক রিসেলার (Beneficiary):</div>
                  <div style={{ fontWeight: 800, color: "#0f172a", fontSize: 13, marginTop: 2 }}>
                    {receiptData.resellerStoreName || receiptData.resellerName || "রিসেলার"}
                  </div>
                  <div style={{ color: "#475569", fontSize: 11 }}>{receiptData.resellerEmail}</div>
                  {receiptData.resellerPhone && (
                    <div style={{ color: "#64748b", fontSize: 11 }}>ফোন: {receiptData.resellerPhone}</div>
                  )}
                </div>

                <div>
                  <div style={{ fontSize: 10.5, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase" }}>পেমেন্ট বিবরণ (Disbursement):</div>
                  <div style={{ color: "#0f172a", fontSize: 11, marginTop: 2 }}>
                    তারিখ: <b>{new Date(receiptData.paidAt || receiptData.updatedAt || Date.now()).toLocaleString()}</b>
                  </div>
                  <div style={{ color: "#0f172a", fontSize: 11 }}>
                    মেথড: <b>{receiptData.payoutMethod || "bKash"}</b>
                  </div>
                  <div style={{ color: "#0f172a", fontSize: 11 }}>
                    প্রাপক নম্বর: <b>{receiptData.payoutAccount}</b>
                  </div>
                </div>
              </div>

              {/* Amount & TrxID Banner */}
              <div style={{ background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 10, padding: 14, marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f1f5f9", paddingBottom: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: "#334155" }}>পরিশোধকৃত টাকার পরিমাণ (Net Paid):</span>
                  <span style={{ fontSize: 20, fontWeight: 900, color: "#16a34a" }}>
                    ৳{Math.abs(receiptData.amount).toLocaleString()}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
                  <span style={{ color: "#64748b" }}>Transaction ID (TrxID):</span>
                  <span style={{ fontWeight: 900, color: "#0f172a", fontFamily: "monospace", fontSize: 13, background: "#f1f5f9", padding: "2px 8px", borderRadius: 6 }}>
                    {receiptData.transactionId || "—"}
                  </span>
                </div>
                {receiptData.adminSenderAccount && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11.5, marginTop: 4 }}>
                    <span style={{ color: "#64748b" }}>প্রেরক বিকাশ অ্যাকাউন্ট:</span>
                    <span style={{ fontWeight: 700, color: "#334155", fontFamily: "monospace" }}>
                      {receiptData.adminSenderAccount}
                    </span>
                  </div>
                )}
              </div>

              {/* Footer Stamp */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 20, paddingTop: 12, borderTop: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: 10, color: "#94a3b8" }}>
                  <div>এটি একটি ইলেকট্রনিক পেমেন্ট রিসিট। কোনো সই প্রয়োজন নেই।</div>
                  <div>Processed by: {receiptData.processedBy || "LIORA Accounts"}</div>
                </div>
                <div style={{ textAlign: "center", border: "1.5px solid #16a34a", padding: "4px 12px", borderRadius: 8, color: "#16a34a", fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  ✓ LIORA VERIFIED
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
