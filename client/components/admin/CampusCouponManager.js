"use client";

import React, { useState, useEffect } from "react";
import { API_BASE_URL, getAuthHeaders } from "@/lib/api";

const PRESET_UNIVERSITIES = [
  { code: "DIU15", name: "Daffodil International University", short: "DIU", color: "#e11d48" },
  { code: "DU15", name: "University of Dhaka", short: "DU", color: "#1e3a8a" },
  { code: "BRAC15", name: "BRAC University", short: "BRACU", color: "#2563eb" },
  { code: "NSU15", name: "North South University", short: "NSU", color: "#7c3aed" },
  { code: "AIUB15", name: "American International University-Bangladesh", short: "AIUB", color: "#0284c7" },
  { code: "EWU15", name: "East West University", short: "EWU", color: "#c026d3" },
  { code: "IUB15", name: "Independent University, Bangladesh", short: "IUB", color: "#d97706" },
  { code: "AUST15", name: "Ahsanullah University of Science and Technology", short: "AUST", color: "#059669" },
  { code: "UIU15", name: "United International University", short: "UIU", color: "#ea580c" },
  { code: "BUET15", name: "BUET", short: "BUET", color: "#4f46e5" },
  { code: "CAMPUS15", name: "All Colleges & Universities", short: "Campus", color: "#be185d" },
];

export default function CampusCouponManager() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Modal / Form state
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    code: "",
    universityName: "",
    shortName: "",
    tagColor: "#e11d48",
    maxDiscount: 15,
    minProfitPct: 12,
    welcomeTitle: "",
    welcomeSubtitle: "",
    isActive: true,
  });

  const fetchCoupons = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/campus-coupons`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setCoupons(data.coupons || []);
      } else {
        setErrorMsg(data.message || "Failed to load campus coupons.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Network error fetching coupons.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const handleSelectPreset = (p) => {
    setFormData((prev) => ({
      ...prev,
      code: p.code,
      universityName: p.name,
      shortName: p.short,
      tagColor: p.color,
      welcomeTitle: `🎓 Welcome ${p.name} Students!`,
      welcomeSubtitle: `${p.name}-এর শিক্ষার্থীদের জন্য সর্বোচ্চ ১৫% স্পেশাল ছাড় সক্রিয় হয়েছে! ✨`,
    }));
  };

  const handleCreateCoupon = async (e) => {
    e.preventDefault();
    if (!formData.code || !formData.universityName || !formData.shortName) {
      alert("অনুগ্রহ করে কুপন কোড, বিশ্ববিদ্যালয়ের নাম এবং শর্ট নাম পূরণ করুন।");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/campus-coupons`, {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(data.message || "কুপন তৈরি সফল হয়েছে!");
        setShowModal(false);
        setFormData({
          code: "",
          universityName: "",
          shortName: "",
          tagColor: "#e11d48",
          maxDiscount: 15,
          minProfitPct: 12,
          welcomeTitle: "",
          welcomeSubtitle: "",
          isActive: true,
        });
        fetchCoupons();
      } else {
        alert(data.message || "কুপন তৈরি করতে সমস্যা হয়েছে।");
      }
    } catch (err) {
      console.error(err);
      alert("সার্ভার ত্রুটি: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, code) => {
    if (!confirm(`আপনি কি সত্যিই "${code}" কুপনটি ডিলিট করতে চান?`)) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/campus-coupons?id=${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`"${code}" মুছে ফেলা হয়েছে।`);
        fetchCoupons();
      } else {
        alert(data.message || "মুছে ফেলা সম্ভব হয়নি।");
      }
    } catch (err) {
      alert("ত্রুটি: " + err.message);
    }
  };

  const totalUses = coupons.reduce((sum, c) => sum + (c.usageCount || 0), 0);

  return (
    <div style={{ padding: "8px 0" }}>
      {/* Top Banner & Action */}
      <div
        style={{
          background: "linear-gradient(135deg, #1e1b4b 0%, #311042 50%, #4c0519 100%)",
          borderRadius: "16px",
          padding: "24px 28px",
          color: "#ffffff",
          boxShadow: "0 8px 30px rgba(0,0,0,0.3)",
          border: "1px solid rgba(244, 63, 94, 0.25)",
          marginBottom: "24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "28px" }}>🎓</span>
            <h2 style={{ margin: 0, fontSize: "22px", fontWeight: "900", letterSpacing: "-0.5px" }}>
              University & Campus Coupon Engine
            </h2>
            <span
              style={{
                fontSize: "11px",
                background: "rgba(244, 63, 94, 0.25)",
                color: "#fecdd3",
                border: "1px solid rgba(244, 63, 94, 0.4)",
                padding: "2px 8px",
                borderRadius: "12px",
                fontWeight: "800",
              }}
            >
              Smart Safe Margins
            </span>
          </div>
          <p style={{ margin: "8px 0 0", fontSize: "13px", color: "#cbd5e1", maxWidth: "680px", lineHeight: "1.5" }}>
            যেকোনো বিশ্ববিদ্যালয় বা কলেজের নিজস্ব স্টুডেন্ট কুপন তৈরি করুন। স্টুডেন্টরা কুপনটি ব্যবহার করলে তাদের ক্যাম্পাসের নাম সহ আধুনিক ওয়েলকাম ব্যানার, ব্যাজ ও <strong>নিরাপদ ১২-১৫% প্রফিট মার্জিন</strong> বজায় রেখে ফ্ল্যাট ছাড় কার্যকর হবে।
          </p>
        </div>

        <div style={{ display: "flex", gap: "12px" }}>
          <button
            onClick={() => setShowModal(true)}
            style={{
              background: "linear-gradient(135deg, #e11d48, #be123c)",
              color: "#ffffff",
              border: "none",
              padding: "12px 22px",
              borderRadius: "10px",
              fontWeight: "900",
              fontSize: "14px",
              cursor: "pointer",
              boxShadow: "0 4px 16px rgba(225, 29, 72, 0.4)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              transition: "transform 0.15s ease",
            }}
          >
            <span>+</span> নতুন বিশ্ববিদ্যালয় কুপন তৈরি করুন
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        <div style={{ background: "#ffffff", padding: "18px 20px", borderRadius: "14px", border: "1px solid #f1f5f9", boxShadow: "0 2px 10px rgba(0,0,0,0.03)" }}>
          <div style={{ fontSize: "12px", fontWeight: "700", color: "#64748b" }}>🏫 মোট বিশ্ববিদ্যালয় কুপন</div>
          <div style={{ fontSize: "26px", fontWeight: "900", color: "#0f172a", marginTop: "4px" }}>{coupons.length}টি</div>
        </div>

        <div style={{ background: "#ffffff", padding: "18px 20px", borderRadius: "14px", border: "1px solid #f1f5f9", boxShadow: "0 2px 10px rgba(0,0,0,0.03)" }}>
          <div style={{ fontSize: "12px", fontWeight: "700", color: "#64748b" }}>🎁 স্টুডেন্ট ব্যবহারের সংখ্যা</div>
          <div style={{ fontSize: "26px", fontWeight: "900", color: "#e11d48", marginTop: "4px" }}>{totalUses} বার</div>
        </div>

        <div style={{ background: "#ffffff", padding: "18px 20px", borderRadius: "14px", border: "1px solid #f1f5f9", boxShadow: "0 2px 10px rgba(0,0,0,0.03)" }}>
          <div style={{ fontSize: "12px", fontWeight: "700", color: "#64748b" }}>🛡️ লাভ সুরক্ষা মার্জিন</div>
          <div style={{ fontSize: "26px", fontWeight: "900", color: "#16a34a", marginTop: "4px" }}>কমপক্ষে ১২%-১৫%</div>
        </div>
      </div>

      {successMsg && (
        <div style={{ background: "#ecfdf5", border: "1px solid #10b981", color: "#065f46", padding: "12px 16px", borderRadius: "10px", marginBottom: "16px", fontWeight: "700", fontSize: "13px" }}>
          ✓ {successMsg}
        </div>
      )}

      {errorMsg && (
        <div style={{ background: "#fef2f2", border: "1px solid #ef4444", color: "#991b1b", padding: "12px 16px", borderRadius: "10px", marginBottom: "16px", fontWeight: "700", fontSize: "13px" }}>
          ⚠️ {errorMsg}
        </div>
      )}

      {/* Coupons Table / Grid */}
      <div style={{ background: "#ffffff", borderRadius: "16px", border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 4px 16px rgba(0,0,0,0.03)" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "800", color: "#1e293b" }}>
            সক্রিয় বিশ্ববিদ্যালয় কুপনের তালিকা ({coupons.length})
          </h3>
          <button onClick={fetchCoupons} style={{ background: "none", border: "none", color: "#64748b", fontWeight: "700", cursor: "pointer", fontSize: "13px" }}>
            🔄 রিফ্রেশ
          </button>
        </div>

        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>কুপন তালিকা লোড হচ্ছে...</div>
        ) : coupons.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>কোনো কুপন তৈরি করা হয়নি। উপরের বাটনে ক্লিক করে তৈরি করুন।</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ background: "#f1f5f9", textAlign: "left", color: "#475569", fontSize: "11.5px", textTransform: "uppercase" }}>
                  <th style={{ padding: "12px 16px" }}>কুপন কোড</th>
                  <th style={{ padding: "12px 16px" }}>বিশ্ববিদ্যালয় / প্রতিষ্ঠান</th>
                  <th style={{ padding: "12px 16px" }}>ব্যাজ ও কালার</th>
                  <th style={{ padding: "12px 16px" }}>সর্বোচ্চ ছাড়</th>
                  <th style={{ padding: "12px 16px" }}>ব্যবহার হয়েছে</th>
                  <th style={{ padding: "12px 16px" }}>স্ট্যাটাস</th>
                  <th style={{ padding: "12px 16px", textAlign: "right" }}>অ্যাকশন</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((c) => (
                  <tr key={c._id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "14px 16px", fontWeight: "900", color: "#0f172a" }}>
                      <span style={{ background: "#f1f5f9", padding: "4px 8px", borderRadius: "6px", fontFamily: "monospace", fontSize: "13px", letterSpacing: "1px" }}>
                        {c.code}
                      </span>
                    </td>
                    <td style={{ padding: "14px 16px", fontWeight: "700", color: "#1e293b" }}>
                      <div>{c.universityName}</div>
                      <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>{c.welcomeSubtitle}</div>
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <span
                        style={{
                          background: c.tagColor || "#e11d48",
                          color: "#ffffff",
                          padding: "3px 8px",
                          borderRadius: "6px",
                          fontSize: "11px",
                          fontWeight: "800",
                          display: "inline-block",
                        }}
                      >
                        {c.shortName} Exclusive
                      </span>
                    </td>
                    <td style={{ padding: "14px 16px", fontWeight: "800", color: "#e11d48" }}>
                      সর্বোচ্চ {c.maxDiscount || 15}%
                    </td>
                    <td style={{ padding: "14px 16px", color: "#64748b", fontWeight: "700" }}>
                      {c.usageCount || 0} বার
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <span
                        style={{
                          background: c.isActive ? "#dcfce7" : "#fee2e2",
                          color: c.isActive ? "#15803d" : "#b91c1c",
                          padding: "3px 8px",
                          borderRadius: "6px",
                          fontSize: "11px",
                          fontWeight: "800",
                        }}
                      >
                        {c.isActive ? "✓ সক্রিয়" : "✕ নিষ্ক্রিয়"}
                      </span>
                    </td>
                    <td style={{ padding: "14px 16px", textAlign: "right" }}>
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                        <a
                          href={`/?coupon=${c.code}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            background: "#f1f5f9",
                            color: "#0f172a",
                            padding: "6px 10px",
                            borderRadius: "6px",
                            fontSize: "11.5px",
                            fontWeight: "700",
                            textDecoration: "none",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          👁️ টেস্ট ভিউ
                        </a>
                        <button
                          onClick={() => handleDelete(c._id, c.code)}
                          style={{
                            background: "#fee2e2",
                            color: "#dc2626",
                            border: "none",
                            padding: "6px 10px",
                            borderRadius: "6px",
                            fontSize: "11.5px",
                            fontWeight: "800",
                            cursor: "pointer",
                          }}
                        >
                          মুছুন
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Coupon Modal */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.75)",
            backdropFilter: "blur(6px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "20px",
              maxWidth: "600px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
              padding: "28px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "24px" }}>🎓</span>
                <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "900", color: "#0f172a" }}>
                  নতুন বিশ্ববিদ্যালয় কুপন তৈরি করুন
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                style={{ background: "none", border: "none", fontSize: "18px", color: "#64748b", cursor: "pointer", fontWeight: "900" }}
              >
                ✕
              </button>
            </div>

            {/* Quick Presets */}
            <div style={{ marginBottom: "18px" }}>
              <label style={{ fontSize: "11.5px", fontWeight: "800", color: "#64748b", display: "block", marginBottom: "6px" }}>
                ⚡ দ্রুত পূরণ করতে নিচের যেকোনো বিশ্ববিদ্যালয়ে ক্লিক করুন:
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {PRESET_UNIVERSITIES.map((p) => (
                  <button
                    key={p.code}
                    type="button"
                    onClick={() => handleSelectPreset(p)}
                    style={{
                      background: formData.code === p.code ? p.color : "#f1f5f9",
                      color: formData.code === p.code ? "#ffffff" : "#334155",
                      border: "none",
                      padding: "4px 8px",
                      borderRadius: "6px",
                      fontSize: "11px",
                      fontWeight: "800",
                      cursor: "pointer",
                    }}
                  >
                    {p.short}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleCreateCoupon}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: "800", color: "#334155", display: "block", marginBottom: "4px" }}>
                    কুপন কোড (Coupon Code) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BRAC15, IUB15"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") })
                    }
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "13px",
                      fontWeight: "800",
                      letterSpacing: "1px",
                      textTransform: "uppercase",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "12px", fontWeight: "800", color: "#334155", display: "block", marginBottom: "4px" }}>
                    সংক্ষিপ্ত নাম (Short Badge) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BRACU, IUB"
                    value={formData.shortName}
                    onChange={(e) => setFormData({ ...formData, shortName: e.target.value.toUpperCase() })}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "13px",
                      fontWeight: "800",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label style={{ fontSize: "12px", fontWeight: "800", color: "#334155", display: "block", marginBottom: "4px" }}>
                  বিশ্ববিদ্যালয় / প্রতিষ্ঠানের পূর্ণ নাম *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BRAC University, Independent University"
                  value={formData.universityName}
                  onChange={(e) => {
                    const name = e.target.value;
                    setFormData({
                      ...formData,
                      universityName: name,
                      welcomeTitle: `🎓 Welcome ${name} Students!`,
                      welcomeSubtitle: `${name}-এর শিক্ষার্থীদের জন্য সর্বোচ্চ ${formData.maxDiscount}% স্পেশাল ছাড় সক্রিয় হয়েছে! ✨`,
                    });
                  }}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13px",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: "800", color: "#334155", display: "block", marginBottom: "4px" }}>
                    ব্যাজ কালার (Brand Color)
                  </label>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <input
                      type="color"
                      value={formData.tagColor}
                      onChange={(e) => setFormData({ ...formData, tagColor: e.target.value })}
                      style={{ width: "40px", height: "38px", border: "none", cursor: "pointer", borderRadius: "6px" }}
                    />
                    <input
                      type="text"
                      value={formData.tagColor}
                      onChange={(e) => setFormData({ ...formData, tagColor: e.target.value })}
                      style={{ width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "12px", fontFamily: "monospace" }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: "12px", fontWeight: "800", color: "#334155", display: "block", marginBottom: "4px" }}>
                    সর্বোচ্চ ছাড় (% Capped at 15%)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={formData.maxDiscount}
                    onChange={(e) => setFormData({ ...formData, maxDiscount: Number(e.target.value) })}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "13px",
                      fontWeight: "800",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>

              {/* Live Preview Box */}
              <div style={{ background: "#fff5f7", border: "1.5px dashed #fecdd3", borderRadius: "12px", padding: "14px", marginBottom: "18px" }}>
                <span style={{ fontSize: "11px", fontWeight: "800", color: "#e11d48", display: "block", marginBottom: "6px" }}>
                  👀 স্টুডেন্টরা ওয়েবসাইটে যেমন দেখবে (Live Preview):
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span
                    style={{
                      background: formData.tagColor || "#e11d48",
                      color: "#ffffff",
                      padding: "3px 8px",
                      borderRadius: "6px",
                      fontSize: "11px",
                      fontWeight: "900",
                    }}
                  >
                    {formData.shortName || "CAMPUS"} Exclusive
                  </span>
                  <span style={{ fontSize: "12px", fontWeight: "800", color: "#1e293b" }}>
                    {formData.universityName || "আপনার বিশ্ববিদ্যালয়"} — স্পেশাল ক্যাম্পাস প্রমোশন সক্রিয়!
                  </span>
                </div>
                <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
                  {formData.welcomeSubtitle || "সকল শিক্ষার্থীদের জন্য সর্বোচ্চ ১৫% স্পেশাল ছাড় কার্যকর হয়েছে! ✨"}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    background: "#f1f5f9",
                    color: "#475569",
                    border: "none",
                    padding: "10px 18px",
                    borderRadius: "8px",
                    fontWeight: "700",
                    cursor: "pointer",
                  }}
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    background: "linear-gradient(135deg, #e11d48, #be123c)",
                    color: "#ffffff",
                    border: "none",
                    padding: "10px 22px",
                    borderRadius: "8px",
                    fontWeight: "900",
                    cursor: "pointer",
                    boxShadow: "0 4px 12px rgba(225, 29, 72, 0.3)",
                  }}
                >
                  {submitting ? "সংরক্ষণ হচ্ছে..." : "✓ কুপন সেভ করুন"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
