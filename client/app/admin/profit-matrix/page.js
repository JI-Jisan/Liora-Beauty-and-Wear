"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { API_BASE_URL, getAuthHeaders } from "@/lib/api";

export default function AdminProfitMatrixPage() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);

  // Active Channel Mode
  const [activeMode, setActiveMode] = useState("retail"); // 'retail' | 'diu15' | 'student15' | 'wholesale' | 'reseller' | 'ogerio'

  // Filter & Search Controls
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedBrand, setSelectedBrand] = useState("all");
  const [selectedMargin, setSelectedMargin] = useState("all"); // 'all' | 'loss' | 'low' | 'healthy' | 'high' | 'no_cost'
  const [selectedStock, setSelectedStock] = useState("all"); // 'all' | 'in_stock' | 'low_stock' | 'out_of_stock'
  const [sortBy, setSortBy] = useState("profit_desc"); // 'profit_desc' | 'profit_asc' | 'margin_desc' | 'margin_asc' | 'price_desc' | 'name_asc'

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 60;

  // Row inline edit state (draft edits keyed by productId)
  const [draftEdits, setDraftEdits] = useState({});
  const [savingRowId, setSavingRowId] = useState(null);
  const [savedRowSuccess, setSavedRowSuccess] = useState({});
  const [errorMsg, setErrorMsg] = useState("");

  // Table container scroll state & ref for sticky header & back-to-top
  const tableContainerRef = useRef(null);
  const [isScrolledDown, setIsScrolledDown] = useState(false);

  const handleTableScroll = () => {
    if (tableContainerRef.current) {
      setIsScrolledDown(tableContainerRef.current.scrollTop > 140);
    }
  };

  const scrollToTableTop = () => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Fetch Matrix Data
  const fetchMatrix = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const params = new URLSearchParams({
        search,
        category: selectedCategory,
        brand: selectedBrand,
        marginStatus: selectedMargin,
        stockStatus: selectedStock,
        mode: activeMode,
        sortBy,
        page: String(page),
        limit: String(limit),
      });

      const res = await fetch(`${API_BASE_URL}/api/admin/profit-matrix?${params.toString()}`, {
        headers: getAuthHeaders(),
      });

      if (res.status === 401) {
        setErrorMsg("Session expired or unauthorized. Please log in to admin.");
        setLoading(false);
        return;
      }

      const json = await res.json();
      if (json.success) {
        setProducts(json.products || []);
        setSummary(json.summary || null);
        if (json.categories) setCategories(json.categories);
        if (json.brands) setBrands(json.brands);
        if (json.pagination) {
          setTotalPages(json.pagination.totalPages || 1);
          setTotalCount(json.pagination.totalCount || 0);
        }
      } else {
        setErrorMsg(json.error || "Failed to load profit matrix data.");
      }
    } catch (err) {
      console.error("Profit matrix fetch error:", err);
      setErrorMsg("Network error connecting to profit matrix API.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatrix();
  }, [activeMode, selectedCategory, selectedBrand, selectedMargin, selectedStock, sortBy, page]);

  // Debounced search
  useEffect(() => {
    const handler = setTimeout(() => {
      setPage(1);
      fetchMatrix();
    }, 350);
    return () => clearTimeout(handler);
  }, [search]);

  // Handle local cell edit
  const handleCellChange = (productId, field, value) => {
    setDraftEdits((prev) => {
      const currentDraft = prev[productId] || {};
      return {
        ...prev,
        [productId]: {
          ...currentDraft,
          [field]: value === "" ? "" : Number(value),
        },
      };
    });
  };

  // Save single product row
  const handleSaveRow = async (product) => {
    const draft = draftEdits[product._id];
    if (!draft || Object.keys(draft).length === 0) return;

    setSavingRowId(product._id);
    try {
      const payload = {
        productId: product._id,
        ...draft,
      };

      const res = await fetch(`${API_BASE_URL}/api/admin/profit-matrix`, {
        method: "PATCH",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        // Update local product list
        setProducts((prev) =>
          prev.map((p) => {
            if (p._id !== product._id) return p;
            const updated = { ...p, ...json.product };
            // Recalculate metrics for current active mode
            return recalculateMetrics(updated, activeMode);
          })
        );

        // Clear draft for this row
        setDraftEdits((prev) => {
          const next = { ...prev };
          delete next[product._id];
          return next;
        });

        // Trigger flash success badge
        setSavedRowSuccess((prev) => ({ ...prev, [product._id]: true }));
        setTimeout(() => {
          setSavedRowSuccess((prev) => ({ ...prev, [product._id]: false }));
        }, 2200);
      } else {
        alert(json.error || "Failed to update pricing.");
      }
    } catch (err) {
      console.error("Save row error:", err);
      alert("Error saving product pricing: " + err.message);
    } finally {
      setSavingRowId(null);
    }
  };

  // Dynamic live metric recalculation for row
  const recalculateMetrics = (p, mode) => {
    const draft = draftEdits[p._id] || {};
    const purchasePrice = draft.purchasePrice !== undefined ? Number(draft.purchasePrice) : Number(p.purchasePrice) || 0;
    const offerPrice = draft.offerPrice !== undefined ? Number(draft.offerPrice) : Number(p.offerPrice) || 0;
    const wholesalePrice = draft.wholesalePrice !== undefined ? Number(draft.wholesalePrice) : Number(p.wholesalePrice) || 0;
    const resellerPrice = draft.resellerPrice !== undefined ? Number(draft.resellerPrice) : Number(p.resellerPrice) || 0;
    const ogerioPrice = draft.ogerioPrice !== undefined ? Number(draft.ogerioPrice) : Number(p.ogerioPrice) || 0;
    const campusDiscountPct = draft.campusDiscountPct !== undefined ? Number(draft.campusDiscountPct) : Number(p.campusDiscountPct) || 15;

    let effectiveSellingPrice = offerPrice;
    if (mode === "diu15") {
      effectiveSellingPrice = Math.max(0, offerPrice - Math.round(offerPrice * (campusDiscountPct / 100)));
    } else if (mode === "student15") {
      effectiveSellingPrice = Math.max(0, offerPrice - Math.round(offerPrice * 0.15));
    } else if (mode === "wholesale") {
      effectiveSellingPrice = wholesalePrice;
    } else if (mode === "reseller") {
      effectiveSellingPrice = resellerPrice;
    } else if (mode === "ogerio") {
      effectiveSellingPrice = offerPrice;
    }

    const unitProfit = effectiveSellingPrice - purchasePrice;
    const profitMarginPct = effectiveSellingPrice > 0 ? parseFloat(((unitProfit / effectiveSellingPrice) * 100).toFixed(1)) : 0;
    const ogerioDiff = ogerioPrice > 0 ? ogerioPrice - offerPrice : null;

    let marginHealth = "healthy";
    if (purchasePrice === 0) marginHealth = "no_cost";
    else if (unitProfit <= 0) marginHealth = "loss";
    else if (profitMarginPct < 15) marginHealth = "low";
    else if (profitMarginPct >= 35) marginHealth = "high";

    return {
      ...p,
      purchasePrice,
      offerPrice,
      wholesalePrice,
      resellerPrice,
      ogerioPrice,
      effectiveSellingPrice,
      unitProfit,
      profitMarginPct,
      ogerioDiff,
      marginHealth,
    };
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0b1120", color: "#f8fafc", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* Top Header Navigation */}
      <header style={{ background: "#0f172a", borderBottom: "1px solid #1e293b", padding: "16px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px", position: "sticky", top: 0, zIndex: 40, boxShadow: "0 4px 20px rgba(0,0,0,0.4)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <Link
            href="/admin"
            style={{
              color: "#94a3b8",
              textDecoration: "none",
              fontSize: "13.5px",
              fontWeight: "700",
              padding: "7px 14px",
              borderRadius: "8px",
              background: "#1e293b",
              border: "1px solid #334155",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              transition: "all 0.2s"
            }}
          >
            ← Admin Dashboard
          </Link>
          <div>
            <h1 style={{ fontSize: "20px", fontWeight: "900", color: "#ffffff", margin: 0, display: "flex", alignItems: "center", gap: "10px", letterSpacing: "-0.5px" }}>
              <span style={{ fontSize: "22px" }}>💰</span>
              <span>LIORA Master Profit & Margin Matrix</span>
              <span style={{ fontSize: "11px", fontWeight: "800", color: "#38bdf8", background: "rgba(56, 189, 248, 0.15)", border: "1px solid rgba(56, 189, 248, 0.35)", padding: "2px 8px", borderRadius: "12px", textTransform: "uppercase" }}>
                Live Cockpit
              </span>
            </h1>
            <p style={{ margin: "3px 0 0 0", fontSize: "12.5px", color: "#94a3b8" }}>
              সকল প্রোডাক্টের কেনা দাম, বিক্রয় মূল্য, ওজেরিও কম্প্যারিজন, কুপন ও হোলসেল লাভের লাইভ হিসাব ও এডিটর
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            onClick={() => fetchMatrix()}
            disabled={loading}
            style={{
              background: "#1e293b",
              color: "#38bdf8",
              border: "1px solid #334155",
              padding: "8px 16px",
              borderRadius: "8px",
              fontWeight: "700",
              fontSize: "13px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <span>🔄</span> Refresh
          </button>
          <Link
            href="/admin/marketing"
            style={{
              background: "linear-gradient(135deg, #e11d48, #be123c)",
              color: "#ffffff",
              textDecoration: "none",
              padding: "8px 16px",
              borderRadius: "8px",
              fontWeight: "800",
              fontSize: "13px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "0 4px 12px rgba(225, 29, 72, 0.3)"
            }}
          >
            <span>⚡</span> FB Auto Promoter
          </Link>
        </div>
      </header>

      <main style={{ maxWidth: "1680px", margin: "0 auto", padding: "24px 28px" }}>
        {/* Error Alert Bar */}
        {errorMsg && (
          <div style={{ background: "rgba(239, 68, 68, 0.15)", border: "1px solid #ef4444", borderRadius: "10px", padding: "12px 18px", marginBottom: "20px", color: "#fca5a5", fontSize: "13.5px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>⚠️ {errorMsg}</span>
            <button onClick={() => setErrorMsg("")} style={{ background: "none", border: "none", color: "#fca5a5", cursor: "pointer", fontWeight: "800" }}>✕</button>
          </div>
        )}

        {/* 1. Real-Time Top KPI Stats Dashboard */}
        {summary && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "14px", marginBottom: "24px" }}>
            {/* Total In-Stock Value */}
            <div style={{ background: "linear-gradient(135deg, #1e293b, #0f172a)", border: "1px solid #334155", borderRadius: "12px", padding: "16px 20px", boxShadow: "0 4px 12px rgba(0,0,0,0.2)" }}>
              <div style={{ fontSize: "12px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                📦 মোট ইনভেন্টরি কস্ট (কেনা)
              </div>
              <div style={{ fontSize: "24px", fontWeight: "900", color: "#f8fafc", marginTop: "6px" }}>
                ৳{summary.totalInventoryCost.toLocaleString("en-IN")}
              </div>
              <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
                মোট {summary.totalProducts} আইটেম সিলেক্টেড
              </div>
            </div>

            {/* Projected Sales Revenue */}
            <div style={{ background: "linear-gradient(135deg, #1e293b, #0f172a)", border: "1px solid #334155", borderRadius: "12px", padding: "16px 20px", boxShadow: "0 4px 12px rgba(0,0,0,0.2)" }}>
              <div style={{ fontSize: "12px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                🛍️ প্রত্যাশিত বিক্রয়মূল্য ({activeMode.toUpperCase()})
              </div>
              <div style={{ fontSize: "24px", fontWeight: "900", color: "#38bdf8", marginTop: "6px" }}>
                ৳{summary.totalProjectedRevenue.toLocaleString("en-IN")}
              </div>
              <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
                বর্তমান নির্বাচিত মোড অনুযায়ী
              </div>
            </div>

            {/* Total Potential Profit */}
            <div style={{ background: "linear-gradient(135deg, rgba(16, 185, 129, 0.1), #0f172a)", border: "1px solid rgba(16, 185, 129, 0.35)", borderRadius: "12px", padding: "16px 20px", boxShadow: "0 4px 12px rgba(0,0,0,0.2)" }}>
              <div style={{ fontSize: "12px", fontWeight: "700", color: "#34d399", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                💚 মোট প্রত্যাশিত লাভ (Gross Profit)
              </div>
              <div style={{ fontSize: "24px", fontWeight: "900", color: "#34d399", marginTop: "6px" }}>
                ৳{summary.totalProjectedProfit.toLocaleString("en-IN")}
              </div>
              <div style={{ fontSize: "12px", color: "#a7f3d0", marginTop: "4px" }}>
                গড় প্রফিট মার্জিন: <strong>{summary.avgProfitMargin}%</strong>
              </div>
            </div>

            {/* Healthy vs High Profit Margins */}
            <div style={{ background: "linear-gradient(135deg, #1e293b, #0f172a)", border: "1px solid #334155", borderRadius: "12px", padding: "16px 20px", boxShadow: "0 4px 12px rgba(0,0,0,0.2)" }}>
              <div style={{ fontSize: "12px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                💎 সেরা লাভের আইটেম (&gt;35%)
              </div>
              <div style={{ fontSize: "24px", fontWeight: "900", color: "#a855f7", marginTop: "6px" }}>
                {summary.highMarginCount} টি
              </div>
              <div style={{ fontSize: "12px", color: "#c084fc", marginTop: "4px" }}>
                ১৫-৩৫% মার্জিন: {summary.healthyMarginCount} টি
              </div>
            </div>

            {/* Risk / Loss Alert Box */}
            <div style={{ background: summary.lossCount > 0 ? "linear-gradient(135deg, rgba(239, 68, 68, 0.18), #0f172a)" : "linear-gradient(135deg, #1e293b, #0f172a)", border: summary.lossCount > 0 ? "1px solid #ef4444" : "1px solid #334155", borderRadius: "12px", padding: "16px 20px", boxShadow: "0 4px 12px rgba(0,0,0,0.2)" }}>
              <div style={{ fontSize: "12px", fontWeight: "700", color: summary.lossCount > 0 ? "#f87171" : "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                ⚠️ লস / জিরো মার্জিন অ্যালার্ট
              </div>
              <div style={{ fontSize: "24px", fontWeight: "900", color: summary.lossCount > 0 ? "#ef4444" : "#10b981", marginTop: "6px" }}>
                {summary.lossCount} টি প্রোডাক্ট
              </div>
              <div style={{ fontSize: "12px", color: summary.lossCount > 0 ? "#fca5a5" : "#64748b", marginTop: "4px" }}>
                {summary.lossCount > 0 ? "জরুরিভাবে দাম সংশোধন করুন!" : "সব প্রোডাক্টে লাভজনক প্রাইসিং সক্রিয়"}
              </div>
            </div>
          </div>
        )}

        {/* 2. Interactive Multi-Channel Mode Switcher Pills */}
        <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "14px", padding: "16px 20px", marginBottom: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "10px" }}>
            <div>
              <span style={{ fontSize: "12px", fontWeight: "800", color: "#38bdf8", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                🎛️ Live Multi-Channel Profit Simulator
              </span>
              <h2 style={{ fontSize: "16px", fontWeight: "800", color: "#ffffff", margin: "2px 0 0 0" }}>
                কোন চ্যানেলে বেচলে আপনার কত টাকা নিট লাভ ও মার্জিন থাকে তা এক ক্লিকে লাইভ দেখুন:
              </h2>
            </div>
            {summary?.missingCostCount > 0 && (
              <div style={{ background: "rgba(245, 158, 11, 0.15)", border: "1px solid #f59e0b", color: "#fbbf24", padding: "6px 12px", borderRadius: "8px", fontSize: "12px", fontWeight: "700" }}>
                ℹ️ {summary.missingCostCount}টি আইটেমের কেনা দাম (Cost) ০ দেওয়া আছে। টেবিলে টাইপ করে সেভ করুন।
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            {[
              { id: "retail", label: "🌐 Regular Retail (Web Offer)", desc: "সাধারণ গ্রাহকের জন্য নির্ধারিত সেলস দাম", color: "#0284c7" },
              { id: "diu15", label: "🏛️ DIU15 Campus Mode (15% OFF)", desc: "ড্যাফোডিল বা ক্যাম্পাস বিশেষ ছাড়ে লাভের হিসাব", color: "#f43f5e" },
              { id: "student15", label: "🎓 Universal Student15 Mode", desc: "শিক্ষার্থী স্পেশাল ১৫% ছাড়ে লাভের মার্জিন", color: "#e11d48" },
              { id: "wholesale", label: "📦 Wholesale (পাইকারি বান্ডেল)", desc: "মিনিমাম কোয়ান্টিটি সহ পাইকারি লাভের মার্জিন", color: "#10b981" },
              { id: "reseller", label: "🤝 Reseller Dropship Mode", desc: "রিসেলারদের স্পেশাল প্রাইসে কত টাকা লাভ থাকে", color: "#8b5cf6" },
              { id: "ogerio", label: "🆚 Ogerio Benchmarking", desc: "ওজেরিও এর দাম ও সুযোগের লাইভ তুলনা", color: "#f59e0b" },
            ].map((m) => {
              const isActive = activeMode === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => {
                    setActiveMode(m.id);
                    setPage(1);
                  }}
                  style={{
                    background: isActive ? m.color : "#0f172a",
                    color: isActive ? "#ffffff" : "#cbd5e1",
                    border: `1px solid ${isActive ? m.color : "#334155"}`,
                    padding: "10px 16px",
                    borderRadius: "10px",
                    fontWeight: "800",
                    fontSize: "13px",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    gap: "2px",
                    boxShadow: isActive ? `0 4px 14px ${m.color}40` : "none",
                    transition: "all 0.15s ease",
                  }}
                >
                  <span style={{ fontSize: "13.5px" }}>{m.label}</span>
                  <span style={{ fontSize: "11px", fontWeight: "500", opacity: isActive ? 0.9 : 0.6 }}>
                    {m.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Filter & Search Controls Bar */}
        <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: "14px", padding: "16px 20px", marginBottom: "20px", display: "flex", flexWrap: "wrap", gap: "14px", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center", flex: 1, minWidth: "300px" }}>
            {/* Search Box */}
            <div style={{ position: "relative", minWidth: "260px", flex: "1 1 240px" }}>
              <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#64748b", fontSize: "14px" }}>🔍</span>
              <input
                type="text"
                placeholder="নাম দিয়ে খুঁজুন (e.g. Simple, Cosrx, Lip)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: "100%",
                  background: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: "8px",
                  color: "#ffffff",
                  padding: "9px 14px 9px 34px",
                  fontSize: "13px",
                  outline: "none",
                }}
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Category Filter */}
            <div>
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setPage(1);
                }}
                style={{ background: "#1e293b", color: "#ffffff", border: "1px solid #334155", padding: "9px 14px", borderRadius: "8px", fontSize: "13px", fontWeight: "700", cursor: "pointer", outline: "none" }}
              >
                <option value="all">📁 All Categories ({categories.length})</option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Brand Filter */}
            <div>
              <select
                value={selectedBrand}
                onChange={(e) => {
                  setSelectedBrand(e.target.value);
                  setPage(1);
                }}
                style={{ background: "#1e293b", color: "#ffffff", border: "1px solid #334155", padding: "9px 14px", borderRadius: "8px", fontSize: "13px", fontWeight: "700", cursor: "pointer", outline: "none" }}
              >
                <option value="all">🏷️ All Brands ({brands.length})</option>
                {brands.map((b) => (
                  <option key={b._id} value={b._id}>{b.name}</option>
                ))}
              </select>
            </div>

            {/* Margin Health Filter */}
            <div>
              <select
                value={selectedMargin}
                onChange={(e) => {
                  setSelectedMargin(e.target.value);
                  setPage(1);
                }}
                style={{ background: "#1e293b", color: selectedMargin === "loss" ? "#f87171" : "#ffffff", border: `1px solid ${selectedMargin === "loss" ? "#ef4444" : "#334155"}`, padding: "9px 14px", borderRadius: "8px", fontSize: "13px", fontWeight: "800", cursor: "pointer", outline: "none" }}
              >
                <option value="all">🎯 All Profit Margins</option>
                <option value="loss">🔴 Loss / Zero Margin (&lt;= 0%)</option>
                <option value="low">🟡 Low Margin (1% – 15%)</option>
                <option value="healthy">🟢 Healthy Margin (15% – 35%)</option>
                <option value="high">💎 High Profit (&gt; 35%)</option>
                <option value="no_cost">⚠️ Missing Cost (৳0)</option>
              </select>
            </div>

            {/* Stock Filter */}
            <div>
              <select
                value={selectedStock}
                onChange={(e) => {
                  setSelectedStock(e.target.value);
                  setPage(1);
                }}
                style={{ background: "#1e293b", color: "#ffffff", border: "1px solid #334155", padding: "9px 14px", borderRadius: "8px", fontSize: "13px", fontWeight: "700", cursor: "pointer", outline: "none" }}
              >
                <option value="all">📦 All Stock Status</option>
                <option value="in_stock">In Stock (&gt; 5)</option>
                <option value="low_stock">Low Stock (1 – 5)</option>
                <option value="out_of_stock">Out of Stock (0)</option>
              </select>
            </div>
          </div>

          {/* Sort By Dropdown */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "12px", color: "#94a3b8", fontWeight: "700" }}>Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{ background: "#1e293b", color: "#38bdf8", border: "1px solid #334155", padding: "9px 14px", borderRadius: "8px", fontSize: "13px", fontWeight: "800", cursor: "pointer", outline: "none" }}
            >
              <option value="profit_desc">💰 Highest Profit (৳) First</option>
              <option value="profit_asc">⚠️ Lowest / Loss First</option>
              <option value="margin_desc">📈 Highest Margin (%) First</option>
              <option value="margin_asc">📉 Lowest Margin (%) First</option>
              <option value="price_desc">🏷️ Highest Sell Price</option>
              <option value="price_asc">🏷️ Lowest Sell Price</option>
              <option value="stock_desc">📦 Highest Stock First</option>
              <option value="name_asc">🔤 Name (A to Z)</option>
            </select>
          </div>
        </div>

        {/* 4. Live Interactive Profit Matrix Table */}
        <div style={{ background: "#1e293b", borderRadius: "14px", border: "1px solid #334155", overflow: "hidden", boxShadow: "0 10px 30px rgba(0,0,0,0.3)" }}>
          {/* Table Action Bar */}
          <div style={{ padding: "14px 20px", background: "#0b1120", borderBottom: "1px solid #334155", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <div style={{ fontSize: "13.5px", color: "#cbd5e1" }}>
                Showing <strong>{products.length}</strong> of <strong>{totalCount}</strong> products in <span style={{ color: "#38bdf8", fontWeight: "800" }}>{activeMode.toUpperCase()}</span> mode
              </div>
              <span style={{ fontSize: "11px", fontWeight: "700", background: "rgba(16, 185, 129, 0.15)", color: "#34d399", border: "1px solid rgba(16, 185, 129, 0.3)", padding: "2px 8px", borderRadius: "12px", display: "flex", alignItems: "center", gap: "4px" }}>
                📌 হেডার লকড (Sticky)
              </span>
              {Object.keys(draftEdits).length > 0 && (
                <span style={{ color: "#f59e0b", fontWeight: "800", background: "rgba(245, 158, 11, 0.15)", padding: "3px 10px", borderRadius: "12px", fontSize: "12px" }}>
                  ✏️ {Object.keys(draftEdits).length}টি প্রোডাক্টে এডিট করা হয়েছে (সেভ করতে 💾 চাপুন বা Enter দিন)
                </span>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              {isScrolledDown && (
                <button
                  onClick={scrollToTableTop}
                  style={{
                    background: "#334155",
                    color: "#38bdf8",
                    border: "1px solid #475569",
                    padding: "4px 10px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: "700",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px"
                  }}
                >
                  ⬆️ টেবিলে শীর্ষে যান
                </button>
              )}
              <div style={{ fontSize: "12px", color: "#94a3b8" }}>
                💡 ইনপুট বক্সে দাম লিখে <kbd style={{ background: "#334155", padding: "2px 6px", borderRadius: "4px", color: "#ffffff" }}>Enter</kbd> চাপলে সেভ হয়ে যায়
              </div>
            </div>
          </div>

          {/* Sticky Table Scroll Container */}
          <div
            ref={tableContainerRef}
            onScroll={handleTableScroll}
            className="profit-table-scroll"
            style={{
              overflowX: "auto",
              maxHeight: "75vh",
              overflowY: "auto",
              position: "relative",
              borderRadius: "0 0 14px 14px",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
              scrollbarWidth: "thin",
              scrollbarColor: "#334155 #0b1120"
            }}
          >
            <style>{`
              .profit-table-scroll::-webkit-scrollbar {
                width: 9px;
                height: 9px;
              }
              .profit-table-scroll::-webkit-scrollbar-track {
                background: #0b1120;
              }
              .profit-table-scroll::-webkit-scrollbar-thumb {
                background: #334155;
                border-radius: 5px;
              }
              .profit-table-scroll::-webkit-scrollbar-thumb:hover {
                background: #475569;
              }
            `}</style>

            <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, textAlign: "left", fontSize: "13px" }}>
              <thead style={{ position: "sticky", top: 0, zIndex: 25 }}>
                <tr style={{ background: "#0b1120" }}>
                  <th style={{ position: "sticky", top: 0, left: 0, zIndex: 35, background: "#0b1120", padding: "14px 16px", minWidth: "260px", borderBottom: "2px solid #334155", boxShadow: "4px 4px 10px rgba(0, 0, 0, 0.6)", color: "#94a3b8", textTransform: "uppercase", fontSize: "11px", letterSpacing: "0.5px" }}>
                    Product & Brand
                  </th>
                  <th style={{ position: "sticky", top: 0, zIndex: 25, background: "#0b1120", padding: "14px 10px", width: "105px", borderBottom: "2px solid #334155", boxShadow: "0 4px 10px rgba(0, 0, 0, 0.5)", color: "#94a3b8", textTransform: "uppercase", fontSize: "11px", letterSpacing: "0.5px" }}>
                    কেনা দাম (Cost ৳)
                  </th>
                  <th style={{ position: "sticky", top: 0, zIndex: 25, background: "#0b1120", padding: "14px 10px", width: "105px", borderBottom: "2px solid #334155", boxShadow: "0 4px 10px rgba(0, 0, 0, 0.5)", color: "#94a3b8", textTransform: "uppercase", fontSize: "11px", letterSpacing: "0.5px" }}>
                    অফার সেল (৳)
                  </th>
                  <th style={{ position: "sticky", top: 0, zIndex: 25, background: "#0b1120", padding: "14px 10px", width: "105px", borderBottom: "2px solid #334155", boxShadow: "0 4px 10px rgba(0, 0, 0, 0.5)", color: "#94a3b8", textTransform: "uppercase", fontSize: "11px", letterSpacing: "0.5px" }}>
                    রেগুলার MRP (৳)
                  </th>
                  <th style={{ position: "sticky", top: 0, zIndex: 25, background: "#0b1120", padding: "14px 10px", width: "105px", borderBottom: "2px solid #334155", boxShadow: "0 4px 10px rgba(0, 0, 0, 0.5)", color: "#94a3b8", textTransform: "uppercase", fontSize: "11px", letterSpacing: "0.5px" }}>
                    ওজেরিও (৳)
                  </th>
                  <th style={{ position: "sticky", top: 0, zIndex: 25, background: "#0b1120", padding: "14px 10px", width: "105px", borderBottom: "2px solid #334155", boxShadow: "0 4px 10px rgba(0, 0, 0, 0.5)", color: "#94a3b8", textTransform: "uppercase", fontSize: "11px", letterSpacing: "0.5px" }}>
                    হোলসেল (৳)
                  </th>
                  <th style={{ position: "sticky", top: 0, zIndex: 25, background: "#0b1120", padding: "14px 10px", width: "105px", borderBottom: "2px solid #334155", boxShadow: "0 4px 10px rgba(0, 0, 0, 0.5)", color: "#94a3b8", textTransform: "uppercase", fontSize: "11px", letterSpacing: "0.5px" }}>
                    রিসেলার (৳)
                  </th>
                  <th style={{ position: "sticky", top: 0, zIndex: 25, background: "#0f233f", padding: "14px 12px", width: "115px", borderBottom: "2px solid #38bdf8", color: "#38bdf8", boxShadow: "0 4px 10px rgba(0, 0, 0, 0.5)", textTransform: "uppercase", fontSize: "11px", letterSpacing: "0.5px" }}>
                    কার্যকর দাম ({activeMode})
                  </th>
                  <th style={{ position: "sticky", top: 0, zIndex: 25, background: "#0b1120", padding: "14px 12px", width: "115px", borderBottom: "2px solid #334155", boxShadow: "0 4px 10px rgba(0, 0, 0, 0.5)", color: "#94a3b8", textTransform: "uppercase", fontSize: "11px", letterSpacing: "0.5px" }}>
                    নিট লাভ (৳)
                  </th>
                  <th style={{ position: "sticky", top: 0, zIndex: 25, background: "#0b1120", padding: "14px 12px", width: "110px", borderBottom: "2px solid #334155", boxShadow: "0 4px 10px rgba(0, 0, 0, 0.5)", color: "#94a3b8", textTransform: "uppercase", fontSize: "11px", letterSpacing: "0.5px" }}>
                    মার্জিন (%)
                  </th>
                  <th style={{ position: "sticky", top: 0, zIndex: 25, background: "#0b1120", padding: "14px 10px", width: "70px", borderBottom: "2px solid #334155", boxShadow: "0 4px 10px rgba(0, 0, 0, 0.5)", color: "#94a3b8", textTransform: "uppercase", fontSize: "11px", letterSpacing: "0.5px" }}>
                    স্টক
                  </th>
                  <th style={{ position: "sticky", top: 0, zIndex: 25, background: "#0b1120", padding: "14px 14px", width: "95px", textAlign: "center", borderBottom: "2px solid #334155", boxShadow: "0 4px 10px rgba(0, 0, 0, 0.5)", color: "#94a3b8", textTransform: "uppercase", fontSize: "11px", letterSpacing: "0.5px" }}>
                    অ্যাকশন
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={12} style={{ padding: "60px", textAlign: "center", color: "#94a3b8", borderBottom: "1px solid #233149" }}>
                      <div style={{ display: "inline-block", width: "36px", height: "36px", border: "3px solid rgba(56, 189, 248, 0.2)", borderTopColor: "#38bdf8", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                      <p style={{ marginTop: "12px", fontSize: "14px" }}>লাইভ প্রফিট ম্যাট্রিক্স লোড হচ্ছে...</p>
                      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={12} style={{ padding: "60px", textAlign: "center", color: "#94a3b8", borderBottom: "1px solid #233149" }}>
                      কোনো প্রোডাক্ট খুঁজে পাওয়া যায়নি। ফিল্টার পরিবর্তন করে আবার চেষ্টা করুন।
                    </td>
                  </tr>
                ) : (
                  products.map((p, idx) => {
                    const rowRecalc = recalculateMetrics(p, activeMode);
                    const draft = draftEdits[p._id] || {};
                    const hasDraftChanges = Object.keys(draft).length > 0;
                    const isSaving = savingRowId === p._id;
                    const isFlashSaved = savedRowSuccess[p._id];

                    // Row highlights
                    const isLoss = rowRecalc.unitProfit <= 0 && rowRecalc.purchasePrice > 0;
                    const isHigh = rowRecalc.profitMarginPct >= 35;

                    const rowBg = isFlashSaved
                      ? "rgba(16, 185, 129, 0.18)"
                      : hasDraftChanges
                      ? "#292012"
                      : isLoss
                      ? "#2b1419"
                      : idx % 2 === 0
                      ? "#1e293b"
                      : "#182234";

                    return (
                      <tr
                        key={p._id}
                        style={{
                          background: rowBg,
                          transition: "background 0.2s ease",
                        }}
                      >
                        {/* 1. Product Thumbnail & Identity (Sticky Left Column) */}
                        <td
                          style={{
                            position: "sticky",
                            left: 0,
                            zIndex: 10,
                            padding: "12px 16px",
                            borderBottom: "1px solid #233149",
                            background: rowBg,
                            boxShadow: "4px 0 8px rgba(0,0,0,0.4)",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            {p.image ? (
                              <img
                                src={p.image}
                                alt={p.name}
                                style={{ width: "42px", height: "42px", objectFit: "contain", borderRadius: "6px", background: "#0b1120", border: "1px solid #334155", flexShrink: 0 }}
                              />
                            ) : (
                              <div style={{ width: "42px", height: "42px", borderRadius: "6px", background: "#0b1120", border: "1px solid #334155", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", fontSize: "16px", flexShrink: 0 }}>
                                🧴
                              </div>
                            )}
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: "700", color: "#ffffff", fontSize: "13.5px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "230px" }} title={p.name}>
                                {p.name}
                              </div>
                              <div style={{ display: "flex", gap: "6px", marginTop: "3px", flexWrap: "wrap" }}>
                                {p.brand && (
                                  <span style={{ fontSize: "10.5px", color: "#38bdf8", background: "rgba(56, 189, 248, 0.12)", padding: "1px 6px", borderRadius: "4px", fontWeight: "700" }}>
                                    {p.brand.name}
                                  </span>
                                )}
                                {p.category && (
                                  <span style={{ fontSize: "10.5px", color: "#94a3b8", background: "#334155", padding: "1px 6px", borderRadius: "4px" }}>
                                    {p.category.name}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 2. Buying Price (purchasePrice) */}
                        <td style={{ padding: "8px 10px", borderBottom: "1px solid #233149" }}>
                          <input
                            type="number"
                            min="0"
                            value={draft.purchasePrice !== undefined ? draft.purchasePrice : p.purchasePrice}
                            onChange={(e) => handleCellChange(p._id, "purchasePrice", e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveRow(p);
                            }}
                            placeholder="0"
                            style={{
                              width: "100%",
                              background: draft.purchasePrice !== undefined ? "#3b2d12" : "#0f172a",
                              border: `1px solid ${draft.purchasePrice !== undefined ? "#f59e0b" : "#475569"}`,
                              color: "#f8fafc",
                              padding: "6px 8px",
                              borderRadius: "6px",
                              fontWeight: "700",
                              fontSize: "13px",
                              outline: "none",
                              textAlign: "right"
                            }}
                          />
                        </td>

                        {/* 3. Offer Sell Price (offerPrice) */}
                        <td style={{ padding: "8px 10px", borderBottom: "1px solid #233149" }}>
                          <input
                            type="number"
                            min="0"
                            value={draft.offerPrice !== undefined ? draft.offerPrice : p.offerPrice}
                            onChange={(e) => handleCellChange(p._id, "offerPrice", e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveRow(p);
                            }}
                            style={{
                              width: "100%",
                              background: draft.offerPrice !== undefined ? "#3b2d12" : "#0f172a",
                              border: `1px solid ${draft.offerPrice !== undefined ? "#f59e0b" : p.is1111Applied ? "#f43f5e" : "#475569"}`,
                              color: p.is1111Applied ? "#fda4af" : "#38bdf8",
                              padding: "6px 8px",
                              borderRadius: "6px",
                              fontWeight: "800",
                              fontSize: "13px",
                              outline: "none",
                              textAlign: "right"
                            }}
                          />
                          {p.pre1111OfferPrice && (
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "3px", fontSize: "10.5px" }}>
                              <span style={{ background: "#881337", color: "#fecdd3", padding: "1px 4px", borderRadius: "3px", fontWeight: "800", fontSize: "9px" }}>
                                11.11
                              </span>
                              <span style={{ color: "#94a3b8", textDecoration: "line-through" }}>
                                ৳{p.pre1111OfferPrice}
                              </span>
                            </div>
                          )}
                        </td>

                        {/* 4. Regular MRP (originalPrice) */}
                        <td style={{ padding: "8px 10px", borderBottom: "1px solid #233149" }}>
                          <input
                            type="number"
                            min="0"
                            value={draft.originalPrice !== undefined ? draft.originalPrice : p.originalPrice}
                            onChange={(e) => handleCellChange(p._id, "originalPrice", e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveRow(p);
                            }}
                            style={{
                              width: "100%",
                              background: draft.originalPrice !== undefined ? "#3b2d12" : "#0f172a",
                              border: `1px solid ${draft.originalPrice !== undefined ? "#f59e0b" : "#334155"}`,
                              color: "#94a3b8",
                              padding: "6px 8px",
                              borderRadius: "6px",
                              fontSize: "12.5px",
                              outline: "none",
                              textAlign: "right"
                            }}
                          />
                        </td>

                        {/* 5. Ogerio Price (ogerioPrice) */}
                        <td style={{ padding: "8px 10px", borderBottom: "1px solid #233149" }}>
                          <input
                            type="number"
                            min="0"
                            value={draft.ogerioPrice !== undefined ? draft.ogerioPrice : p.ogerioPrice || ""}
                            onChange={(e) => handleCellChange(p._id, "ogerioPrice", e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveRow(p);
                            }}
                            placeholder="-"
                            style={{
                              width: "100%",
                              background: draft.ogerioPrice !== undefined ? "#3b2d12" : "#0f172a",
                              border: `1px solid ${draft.ogerioPrice !== undefined ? "#f59e0b" : "#334155"}`,
                              color: "#fbbf24",
                              padding: "6px 8px",
                              borderRadius: "6px",
                              fontSize: "12.5px",
                              outline: "none",
                              textAlign: "right"
                            }}
                          />
                        </td>

                        {/* 6. Wholesale Price (wholesalePrice) */}
                        <td style={{ padding: "8px 10px", borderBottom: "1px solid #233149" }}>
                          <input
                            type="number"
                            min="0"
                            value={draft.wholesalePrice !== undefined ? draft.wholesalePrice : p.wholesalePrice || ""}
                            onChange={(e) => handleCellChange(p._id, "wholesalePrice", e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveRow(p);
                            }}
                            placeholder="Auto"
                            style={{
                              width: "100%",
                              background: draft.wholesalePrice !== undefined ? "#3b2d12" : "#0f172a",
                              border: `1px solid ${draft.wholesalePrice !== undefined ? "#f59e0b" : "#334155"}`,
                              color: "#34d399",
                              padding: "6px 8px",
                              borderRadius: "6px",
                              fontSize: "12.5px",
                              outline: "none",
                              textAlign: "right"
                            }}
                          />
                        </td>

                        {/* 7. Reseller Price (resellerPrice) */}
                        <td style={{ padding: "8px 10px", borderBottom: "1px solid #233149" }}>
                          <input
                            type="number"
                            min="0"
                            value={draft.resellerPrice !== undefined ? draft.resellerPrice : p.resellerPrice || ""}
                            onChange={(e) => handleCellChange(p._id, "resellerPrice", e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveRow(p);
                            }}
                            placeholder="Auto"
                            style={{
                              width: "100%",
                              background: draft.resellerPrice !== undefined ? "#3b2d12" : "#0f172a",
                              border: `1px solid ${draft.resellerPrice !== undefined ? "#f59e0b" : "#334155"}`,
                              color: "#c084fc",
                              padding: "6px 8px",
                              borderRadius: "6px",
                              fontSize: "12.5px",
                              outline: "none",
                              textAlign: "right"
                            }}
                          />
                        </td>

                        {/* 8. Effective Selling Price for Active Mode */}
                        <td style={{ padding: "12px 12px", borderBottom: "1px solid #233149", background: "rgba(56, 189, 248, 0.08)", fontWeight: "800", color: "#38bdf8", fontSize: "14px" }}>
                          ৳{rowRecalc.effectiveSellingPrice.toLocaleString("en-IN")}
                          {activeMode === "diu15" && (
                            <span style={{ display: "block", fontSize: "10.5px", color: "#f43f5e", fontWeight: "600" }}>
                              DIU15 (-{p.campusDiscountPct || 15}%)
                            </span>
                          )}
                          {activeMode === "ogerio" && rowRecalc.ogerioDiff !== null && (
                            <span style={{ display: "block", fontSize: "10.5px", color: rowRecalc.ogerioDiff > 0 ? "#10b981" : "#ef4444", fontWeight: "700" }}>
                              {rowRecalc.ogerioDiff > 0 ? `Liora ৳${rowRecalc.ogerioDiff} সস্তা!` : `Liora ৳${Math.abs(rowRecalc.ogerioDiff)} দামি`}
                            </span>
                          )}
                        </td>

                        {/* 9. Net Unit Profit (৳) */}
                        <td style={{ padding: "12px 12px", borderBottom: "1px solid #233149" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span
                              style={{
                                fontSize: "14px",
                                fontWeight: "900",
                                color: isLoss ? "#ef4444" : rowRecalc.unitProfit > 0 ? "#10b981" : "#94a3b8",
                              }}
                            >
                              {rowRecalc.unitProfit > 0 ? `+৳${rowRecalc.unitProfit.toLocaleString("en-IN")}` : `৳${rowRecalc.unitProfit.toLocaleString("en-IN")}`}
                            </span>
                          </div>
                          {rowRecalc.purchasePrice === 0 && (
                            <span style={{ fontSize: "10px", color: "#f59e0b", display: "block" }}>কেনা দাম দিন</span>
                          )}
                        </td>

                        {/* 10. Margin Percentage Badge */}
                        <td style={{ padding: "12px 12px", borderBottom: "1px solid #233149" }}>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "4px 8px",
                              borderRadius: "6px",
                              fontSize: "12px",
                              fontWeight: "800",
                              background: isLoss
                                ? "rgba(239, 68, 68, 0.2)"
                                : isHigh
                                ? "rgba(168, 85, 247, 0.2)"
                                : rowRecalc.profitMarginPct < 15
                                ? "rgba(245, 158, 11, 0.2)"
                                : "rgba(16, 185, 129, 0.2)",
                              color: isLoss
                                ? "#ef4444"
                                : isHigh
                                ? "#c084fc"
                                : rowRecalc.profitMarginPct < 15
                                ? "#fbbf24"
                                : "#34d399",
                              border: `1px solid ${
                                isLoss
                                  ? "rgba(239, 68, 68, 0.4)"
                                  : isHigh
                                  ? "rgba(168, 85, 247, 0.4)"
                                  : rowRecalc.profitMarginPct < 15
                                  ? "rgba(245, 158, 11, 0.4)"
                                  : "rgba(16, 185, 129, 0.4)"
                              }`,
                            }}
                          >
                            {isLoss ? "🔴 " : isHigh ? "💎 " : rowRecalc.profitMarginPct < 15 ? "🟡 " : "🟢 "}
                            {rowRecalc.profitMarginPct}%
                          </span>
                        </td>

                        {/* 11. Stock Qty */}
                        <td style={{ padding: "12px 10px", borderBottom: "1px solid #233149" }}>
                          <span
                            style={{
                              fontSize: "12px",
                              fontWeight: "800",
                              color: p.stockQuantity <= 0 ? "#ef4444" : p.stockQuantity <= 5 ? "#f59e0b" : "#f8fafc",
                            }}
                          >
                            {p.stockQuantity}
                          </span>
                        </td>

                        {/* 12. Instant Row Action */}
                        <td style={{ padding: "12px 14px", borderBottom: "1px solid #233149", textAlign: "center" }}>
                          {isFlashSaved ? (
                            <span style={{ color: "#34d399", fontSize: "12px", fontWeight: "800" }}>✓ Saved!</span>
                          ) : (
                            <button
                              onClick={() => handleSaveRow(p)}
                              disabled={!hasDraftChanges || isSaving}
                              style={{
                                background: hasDraftChanges ? "linear-gradient(135deg, #10b981, #059669)" : "#334155",
                                color: hasDraftChanges ? "#ffffff" : "#94a3b8",
                                border: "none",
                                padding: "6px 12px",
                                borderRadius: "6px",
                                fontWeight: "800",
                                fontSize: "12px",
                                cursor: hasDraftChanges && !isSaving ? "pointer" : "not-allowed",
                                opacity: hasDraftChanges ? 1 : 0.6,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                boxShadow: hasDraftChanges ? "0 2px 8px rgba(16, 185, 129, 0.4)" : "none",
                              }}
                            >
                              {isSaving ? "..." : "💾 Save"}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {/* Floating Back to Top Button inside Scroll Container */}
            {isScrolledDown && (
              <button
                onClick={scrollToTableTop}
                style={{
                  position: "sticky",
                  bottom: "20px",
                  float: "right",
                  marginRight: "24px",
                  zIndex: 30,
                  background: "linear-gradient(135deg, #38bdf8, #2563eb)",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "22px",
                  padding: "10px 18px",
                  fontSize: "12.5px",
                  fontWeight: "800",
                  cursor: "pointer",
                  boxShadow: "0 8px 24px rgba(37, 99, 235, 0.45)",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  transition: "transform 0.15s ease",
                }}
              >
                <span>⬆️</span> শীর্ষে যান (Top)
              </button>
            )}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div style={{ padding: "16px 20px", background: "#0f172a", borderTop: "1px solid #334155", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
              <div style={{ fontSize: "13px", color: "#94a3b8" }}>
                Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({totalCount} total products)
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  style={{
                    background: page <= 1 ? "#1e293b" : "#334155",
                    color: page <= 1 ? "#64748b" : "#ffffff",
                    border: "none",
                    padding: "8px 14px",
                    borderRadius: "6px",
                    fontWeight: "700",
                    fontSize: "13px",
                    cursor: page <= 1 ? "not-allowed" : "pointer"
                  }}
                >
                  ← Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  style={{
                    background: page >= totalPages ? "#1e293b" : "#38bdf8",
                    color: page >= totalPages ? "#64748b" : "#0f172a",
                    border: "none",
                    padding: "8px 16px",
                    borderRadius: "6px",
                    fontWeight: "800",
                    fontSize: "13px",
                    cursor: page >= totalPages ? "not-allowed" : "pointer"
                  }}
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
