"use client";

import { useState, useMemo, useEffect } from "react";
import { generateWholesalePdf } from "@/lib/wholesalePdf";

export default function WholesaleCatalog({ products = [], categories = [] }) {
  // Filters
  const [selectedBrand, setSelectedBrand] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [inStockOnly, setInStockOnly] = useState(false);

  // Profit Margin State (Default 5%)
  const [profitPercent, setProfitPercent] = useState(5);

  // Selected Products for Quotation (Map of id -> customWholesalePrice or null)
  const [selectedProductMap, setSelectedProductMap] = useState({});

  // Client Details for Quotation Header
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientAddress, setClientAddress] = useState("");

  // UI State: Active View ('browse' | 'selected')
  const [activeSubTab, setActiveSubTab] = useState("browse");

  // PDF Generation State
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfProgress, setPdfProgress] = useState({ current: 0, total: 0 });
  const [pdfMessage, setPdfMessage] = useState("");

  // Brands list (fetched from /api/brands with fallback to unique brands in products)
  const [brands, setBrands] = useState([]);

  useEffect(() => {
    async function fetchBrands() {
      try {
        const res = await fetch("/api/brands");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setBrands(data);
            return;
          }
        }
      } catch (e) {
        // fallback
      }
      // Fallback: extract unique brands from products
      const bSet = new Map();
      products.forEach((p) => {
        if (p.brand) {
          const bName = typeof p.brand === "object" ? p.brand?.name : p.brand;
          const bId = typeof p.brand === "object" ? p.brand?._id : p.brand;
          if (bName && !bSet.has(bName)) {
            bSet.set(bName, { _id: bId || bName, name: bName });
          }
        }
      });
      setBrands(Array.from(bSet.values()));
    }
    fetchBrands();
  }, [products]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return products.filter((p) => {
      // 1. Stock Filter
      if (inStockOnly && p.inStock === false) return false;

      // 2. Brand Filter
      if (selectedBrand !== "all") {
        const bName = (typeof p.brand === "object" ? p.brand?.name : p.brand) || "";
        const bId = (typeof p.brand === "object" ? p.brand?._id : p.brand) || "";
        if (String(bId) !== selectedBrand && bName.toLowerCase() !== selectedBrand.toLowerCase()) {
          return false;
        }
      }

      // 3. Category Filter
      if (selectedCategory !== "all") {
        const cId = (typeof p.category === "object" ? p.category?._id : p.category) || "";
        const cName = (typeof p.category === "object" ? p.category?.name : p.category) || "";
        if (String(cId) !== selectedCategory && cName.toLowerCase() !== selectedCategory.toLowerCase()) {
          return false;
        }
      }

      // 4. Search Filter
      if (q) {
        const pName = (p.name || "").toLowerCase();
        const bName = (typeof p.brand === "object" ? p.brand?.name : p.brand || "").toLowerCase();
        if (!pName.includes(q) && !bName.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [products, selectedBrand, selectedCategory, searchQuery, inStockOnly]);

  // Selected Products List
  const selectedProductList = useMemo(() => {
    return products
      .filter((p) => selectedProductMap[p._id || p.id] !== undefined)
      .map((p) => {
        const customPrice = selectedProductMap[p._id || p.id];
        const buyPrice = Number(p.purchasePrice) || 0;
        const defaultWholesale = Math.round(buyPrice * (1 + Number(profitPercent || 0) / 100));
        const finalWholesale = customPrice !== undefined && customPrice !== null && customPrice !== ""
          ? Number(customPrice)
          : defaultWholesale;

        const origPrice = Number(p.originalPrice) || Number(p.offerPrice) || (buyPrice > 0 ? Math.round(buyPrice * 1.5) : 0);
        const discountPct = origPrice > finalWholesale
          ? Math.round(((origPrice - finalWholesale) / origPrice) * 100)
          : 0;

        return {
          ...p,
          wholesalePrice: finalWholesale,
          calculatedDefaultPrice: defaultWholesale,
          discountPct,
          origPrice,
        };
      });
  }, [products, selectedProductMap, profitPercent]);

  // Helper calculations for summary
  const summaryStats = useMemo(() => {
    const totalSelected = selectedProductList.length;
    let totalWholesale = 0;
    let totalMarket = 0;
    let totalCost = 0;
    let totalDiscountSum = 0;

    selectedProductList.forEach((item) => {
      const ws = Number(item.wholesalePrice) || 0;
      const mkt = Number(item.origPrice) || 0;
      const c = Number(item.purchasePrice) || 0;
      totalWholesale += ws;
      totalMarket += mkt;
      totalCost += c;
      totalDiscountSum += item.discountPct;
    });

    const avgDiscount = totalSelected > 0 ? Math.round(totalDiscountSum / totalSelected) : 0;
    const totalSavings = Math.max(0, totalMarket - totalWholesale);
    const totalProfitEst = Math.max(0, totalWholesale - totalCost);

    return {
      totalSelected,
      totalWholesale,
      totalMarket,
      totalSavings,
      totalProfitEst,
      avgDiscount,
    };
  }, [selectedProductList]);

  // Toggle single product selection
  const toggleSelect = (product) => {
    const id = product._id || product.id;
    setSelectedProductMap((prev) => {
      const next = { ...prev };
      if (next[id] !== undefined) {
        delete next[id];
      } else {
        next[id] = null; // null means use default calculated price based on profitPercent
      }
      return next;
    });
  };

  // Select all filtered products
  const handleSelectAllFiltered = () => {
    setSelectedProductMap((prev) => {
      const next = { ...prev };
      filteredProducts.forEach((p) => {
        const id = p._id || p.id;
        if (next[id] === undefined) {
          next[id] = null;
        }
      });
      return next;
    });
    setActiveSubTab("selected");
  };

  // Clear all selections
  const handleClearAll = () => {
    setSelectedProductMap({});
  };

  // Update custom wholesale price for a specific product
  const handleCustomPriceChange = (id, newPrice) => {
    setSelectedProductMap((prev) => ({
      ...prev,
      [id]: newPrice === "" ? null : Number(newPrice),
    }));
  };

  // Download PDF Handler
  const handleDownloadPdf = async () => {
    if (selectedProductList.length === 0) {
      alert("অনুগ্রহ করে অন্তত ১টি প্রোডাক্ট সিলেক্ট করুন!");
      return;
    }

    setIsGeneratingPdf(true);
    setPdfMessage("প্রোডাক্টের ছবি ও তথ্য প্রসেস হচ্ছে...");

    try {
      await generateWholesalePdf({
        items: selectedProductList,
        clientInfo: {
          clientName: clientName.trim() || "Wholesale Partner",
          clientPhone: clientPhone.trim(),
          clientAddress: clientAddress.trim(),
        },
        profitPercent,
        onProgress: (current, total) => {
          setPdfProgress({ current, total });
          setPdfMessage(`ছবি ও ডাটা রেডি হচ্ছে: ${current} / ${total}`);
        },
      });

      setPdfMessage("✅ হোলসেল PDF ডাউনলোড সফল হয়েছে!");
      setTimeout(() => {
        setPdfMessage("");
        setIsGeneratingPdf(false);
      }, 3000);
    } catch (err) {
      console.error(err);
      alert("PDF তৈরি করতে সমস্যা হয়েছে: " + err.message);
      setIsGeneratingPdf(false);
      setPdfMessage("");
    }
  };

  const profitPresets = [3, 5, 8, 10, 12, 15, 20];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Top Banner & Title */}
      <div
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          color: "#ffffff",
          padding: "24px",
          borderRadius: "16px",
          boxShadow: "0 10px 25px rgba(15, 23, 42, 0.15)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
            <span style={{ fontSize: "24px" }}>💼</span>
            <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "900", color: "#f8fafc" }}>
              Wholesale Rate Sheet & Quotation Generator
            </h2>
          </div>
          <p style={{ margin: 0, fontSize: "13px", color: "#94a3b8", maxWidth: "600px", lineHeight: "1.5" }}>
            কেনার দামের ওপর নির্দিষ্ট % লাভ ধরে মুহূর্তেই পাইকারি কোটেশন রেডি করুন। ওয়েবসাইট মার্কেট দামের সাথে
            ডিসকাউন্ট তুলনা ও প্রোডাক্টের ছবি সহ আকর্ষণীয় ব্র্যান্ডেড PDF ডাউনলোড করে ক্লায়েন্টকে পাঠান।
          </p>
        </div>

        {/* Global Profit Margin Control in Header */}
        <div
          style={{
            background: "rgba(255, 255, 255, 0.08)",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            padding: "12px 18px",
            borderRadius: "12px",
            display: "flex",
            alignItems: "center",
            gap: "14px",
            backdropFilter: "blur(8px)",
          }}
        >
          <div>
            <div style={{ fontSize: "11px", color: "#f472b6", fontWeight: "700", textTransform: "uppercase" }}>
              📈 আপনার নিট লাভ (% Profit)
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px" }}>
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={profitPercent}
                onChange={(e) => setProfitPercent(Math.max(0, parseFloat(e.target.value) || 0))}
                style={{
                  width: "70px",
                  padding: "6px 8px",
                  borderRadius: "8px",
                  border: "2px solid #e11d48",
                  background: "#ffffff",
                  color: "#0f172a",
                  fontWeight: "900",
                  fontSize: "18px",
                  textAlign: "center",
                  outline: "none",
                }}
              />
              <span style={{ fontSize: "18px", fontWeight: "900", color: "#f8fafc" }}>%</span>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <span style={{ fontSize: "10px", color: "#94a3b8" }}>দ্রুত সিলেক্ট করুন:</span>
            <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", maxWidth: "160px" }}>
              {profitPresets.map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setProfitPercent(pct)}
                  style={{
                    padding: "3px 6px",
                    borderRadius: "6px",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "11px",
                    fontWeight: "800",
                    background: profitPercent === pct ? "#e11d48" : "rgba(255, 255, 255, 0.15)",
                    color: "#ffffff",
                    transition: "all 0.15s",
                  }}
                >
                  +{pct}%
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Highlights & Live Savings Banner (The Customer Delight Card) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "12px",
        }}
      >
        {/* Highlight 1: Selected Count */}
        <div
          style={{
            background: "#ffffff",
            padding: "16px",
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 2px 6px rgba(0, 0, 0, 0.03)",
          }}
        >
          <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "700" }}>📦 নির্বাচিত প্রোডাক্ট</div>
          <div style={{ fontSize: "24px", fontWeight: "900", color: "#0f172a", marginTop: "4px" }}>
            {summaryStats.totalSelected}{" "}
            <span style={{ fontSize: "13px", fontWeight: "600", color: "#64748b" }}>টি আইটেম</span>
          </div>
          <div style={{ fontSize: "11px", color: "#0284c7", fontWeight: "700", marginTop: "4px" }}>
            ফিল্টারে মোট আছে: {filteredProducts.length} টি
          </div>
        </div>

        {/* Highlight 2: Average Discount for Wholesale Buyer */}
        <div
          style={{
            background: "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)",
            padding: "16px",
            borderRadius: "12px",
            border: "1px solid #86efac",
            boxShadow: "0 2px 6px rgba(0, 0, 0, 0.03)",
          }}
        >
          <div style={{ fontSize: "12px", color: "#166534", fontWeight: "700" }}>
            🎁 ক্লায়েন্টের পাইকারি ছাড় (Discount)
          </div>
          <div style={{ fontSize: "24px", fontWeight: "900", color: "#15803d", marginTop: "4px" }}>
            {summaryStats.avgDiscount}%{" "}
            <span style={{ fontSize: "13px", fontWeight: "700", color: "#166534" }}>গড় ছাড় (Avg OFF)</span>
          </div>
          <div style={{ fontSize: "11px", color: "#15803d", fontWeight: "700", marginTop: "4px" }}>
            মার্কেট দাম থেকে সাশ্রয়: ৳{summaryStats.totalSavings.toLocaleString()}
          </div>
        </div>

        {/* Highlight 3: Wholesale Order Total */}
        <div
          style={{
            background: "#ffffff",
            padding: "16px",
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 2px 6px rgba(0, 0, 0, 0.03)",
          }}
        >
          <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "700" }}>💵 মোট পাইকারি মূল্য (Total)</div>
          <div style={{ fontSize: "24px", fontWeight: "900", color: "#e11d48", marginTop: "4px" }}>
            ৳{summaryStats.totalWholesale.toLocaleString()}
          </div>
          <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
            মার্কেট খুচরা মূল্য: ৳{summaryStats.totalMarket.toLocaleString()}
          </div>
        </div>

        {/* Highlight 4: Estimated Owner Profit */}
        <div
          style={{
            background: "#ffffff",
            padding: "16px",
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 2px 6px rgba(0, 0, 0, 0.03)",
          }}
        >
          <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "700" }}>
            ✨ আপনার মোট লাভ ({profitPercent}%)
          </div>
          <div style={{ fontSize: "24px", fontWeight: "900", color: "#2563eb", marginTop: "4px" }}>
            ৳{summaryStats.totalProfitEst.toLocaleString()}
          </div>
          <div style={{ fontSize: "11px", color: "#16a34a", fontWeight: "700", marginTop: "4px" }}>
            নিট প্রফিট রেট মার্জিন
          </div>
        </div>
      </div>

      {/* Client Information Form & Download Bar */}
      <div
        style={{
          background: "#ffffff",
          padding: "18px",
          borderRadius: "14px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 2px 6px rgba(0, 0, 0, 0.03)",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
        }}
      >
        <div style={{ fontSize: "13px", fontWeight: "800", color: "#0f172a" }}>
          📝 ক্লায়েন্ট / কাস্টমার তথ্য (PDF এর হেডিং-এ থাকবে):
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "10px" }}>
          <input
            type="text"
            placeholder="ক্লায়েন্ট বা দোকানের নাম (যেমন: করিম কসমেটিকস)"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            style={inputStyle}
          />
          <input
            type="text"
            placeholder="মোবাইল নম্বর (যেমন: 017XXXXXXXX)"
            value={clientPhone}
            onChange={(e) => setClientPhone(e.target.value)}
            style={inputStyle}
          />
          <input
            type="text"
            placeholder="ঠিকানা / এরিয়া (যেমন: চকবাজার, ঢাকা)"
            value={clientAddress}
            onChange={(e) => setClientAddress(e.target.value)}
            style={inputStyle}
          />
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginTop: "4px" }}>
          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={handleSelectAllFiltered}
              style={{
                padding: "8px 14px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                background: "#f1f5f9",
                color: "#1e293b",
                fontWeight: "700",
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              ✓ ফিল্টারের সব প্রোডাক্ট যোগ করুন ({filteredProducts.length})
            </button>

            {summaryStats.totalSelected > 0 && (
              <button
                type="button"
                onClick={() => setActiveSubTab(activeSubTab === "selected" ? "browse" : "selected")}
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  border: "1.5px solid #e11d48",
                  background: activeSubTab === "selected" ? "#e11d48" : "#fff1f2",
                  color: activeSubTab === "selected" ? "#ffffff" : "#be123c",
                  fontWeight: "800",
                  fontSize: "12px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  boxShadow: "0 2px 8px rgba(225, 29, 72, 0.15)",
                }}
              >
                {activeSubTab === "selected" ? "← প্রোডাক্ট যোগ করতে ফিরে যান" : `📋 নির্বাচিত শিট দেখুন (${summaryStats.totalSelected}টি) ➔`}
              </button>
            )}

            {summaryStats.totalSelected > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                style={{
                  padding: "8px 14px",
                  borderRadius: "8px",
                  border: "1px solid #fca5a5",
                  background: "#fff1f2",
                  color: "#e11d48",
                  fontWeight: "700",
                  fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                ✕ সব ক্লিয়ার করুন
              </button>
            )}
          </div>

          {/* Download PDF Button */}
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf || summaryStats.totalSelected === 0}
            style={{
              padding: "12px 24px",
              borderRadius: "10px",
              border: "none",
              background: summaryStats.totalSelected === 0 ? "#cbd5e1" : "linear-gradient(135deg, #e11d48 0%, #be123c 100%)",
              color: "#ffffff",
              fontWeight: "900",
              fontSize: "14px",
              cursor: summaryStats.totalSelected === 0 || isGeneratingPdf ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: summaryStats.totalSelected > 0 ? "0 4px 14px rgba(225, 29, 72, 0.3)" : "none",
              transition: "all 0.2s",
            }}
          >
            {isGeneratingPdf ? "⏳ PDF তৈরি হচ্ছে..." : "📥 ছবি সহ হোলসেল PDF ডাউনলোড করুন"}
          </button>
        </div>

        {/* Progress or Status Message */}
        {pdfMessage && (
          <div
            style={{
              padding: "10px 14px",
              borderRadius: "8px",
              background: pdfMessage.includes("✅") ? "#f0fdf4" : "#eff6ff",
              border: `1px solid ${pdfMessage.includes("✅") ? "#86efac" : "#bfdbfe"}`,
              color: pdfMessage.includes("✅") ? "#15803d" : "#1d4ed8",
              fontWeight: "700",
              fontSize: "13px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span>{pdfMessage}</span>
          </div>
        )}
      </div>

      {/* Filter Bar (Brand, Category, Search, Stock) */}
      <div
        style={{
          background: "#ffffff",
          padding: "16px",
          borderRadius: "14px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 2px 6px rgba(0, 0, 0, 0.03)",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
          {/* Brand Filter */}
          <div style={{ flex: 1, minWidth: "160px" }}>
            <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#64748b", marginBottom: "4px" }}>
              🏷️ ব্র্যান্ড অনুযায়ী ফিল্টার:
            </label>
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              style={selectStyle}
            >
              <option value="all">সব ব্র্যান্ড (All Brands)</option>
              {brands.map((b) => (
                <option key={b._id || b.name} value={b._id || b.name}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div style={{ flex: 1, minWidth: "160px" }}>
            <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#64748b", marginBottom: "4px" }}>
              📂 ক্যাটাগরি (Shower Gel, Face Wash, etc.):
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={selectStyle}
            >
              <option value="all">সব ক্যাটাগরি (All Categories)</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Search Box */}
          <div style={{ flex: 2, minWidth: "220px" }}>
            <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#64748b", marginBottom: "4px" }}>
              🔍 প্রোডাক্ট বা ব্র্যান্ড সার্চ করুন:
            </label>
            <input
              type="text"
              placeholder="প্রোডাক্টের নাম লিখুন..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* In Stock Only Checkbox */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px", paddingTop: "18px" }}>
            <input
              type="checkbox"
              id="inStockCheck"
              checked={inStockOnly}
              onChange={(e) => setInStockOnly(e.target.checked)}
              style={{ width: "16px", height: "16px", cursor: "pointer" }}
            />
            <label htmlFor="inStockCheck" style={{ fontSize: "12px", fontWeight: "700", color: "#334155", cursor: "pointer" }}>
              শুধুমাত্র স্টকে আছে (In Stock)
            </label>
          </div>
        </div>
      </div>

      {/* Tabs Switcher: Browse All vs Selected List */}
      <div style={{ display: "flex", gap: "10px", alignItems: "center", borderBottom: "2px solid #e2e8f0", paddingBottom: "10px", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => setActiveSubTab("browse")}
          style={{
            padding: "9px 20px",
            borderRadius: "10px",
            border: activeSubTab === "browse" ? "2px solid #0f172a" : "1.5px solid #cbd5e1",
            cursor: "pointer",
            fontWeight: "800",
            fontSize: "13px",
            background: activeSubTab === "browse" ? "#0f172a" : "#ffffff",
            color: activeSubTab === "browse" ? "#ffffff" : "#475569",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            transition: "all 0.15s ease",
            boxShadow: activeSubTab === "browse" ? "0 2px 8px rgba(15,23,42,0.18)" : "none",
          }}
        >
          <span>📦 সব প্রোডাক্ট</span>
          <span
            style={{
              background: activeSubTab === "browse" ? "rgba(255,255,255,0.2)" : "#f1f5f9",
              color: activeSubTab === "browse" ? "#ffffff" : "#475569",
              padding: "2px 8px",
              borderRadius: "10px",
              fontSize: "11px",
              fontWeight: "900",
            }}
          >
            {filteredProducts.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab("selected")}
          style={{
            padding: "9px 22px",
            borderRadius: "10px",
            border: activeSubTab === "selected" ? "2px solid #e11d48" : summaryStats.totalSelected > 0 ? "2px solid #fda4af" : "1.5px solid #cbd5e1",
            cursor: "pointer",
            fontWeight: "800",
            fontSize: "13px",
            background: activeSubTab === "selected" ? "#e11d48" : summaryStats.totalSelected > 0 ? "#fff1f2" : "#ffffff",
            color: activeSubTab === "selected" ? "#ffffff" : "#e11d48",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            transition: "all 0.15s ease",
            boxShadow: activeSubTab === "selected" ? "0 4px 12px rgba(225,29,72,0.25)" : summaryStats.totalSelected > 0 ? "0 2px 8px rgba(225,29,72,0.12)" : "none",
          }}
        >
          <span>📋 নির্বাচিত কোটেশন শিট</span>
          <span
            style={{
              background: activeSubTab === "selected" ? "#ffffff" : "#e11d48",
              color: activeSubTab === "selected" ? "#e11d48" : "#ffffff",
              padding: "2px 9px",
              borderRadius: "10px",
              fontSize: "11.5px",
              fontWeight: "900",
            }}
          >
            {summaryStats.totalSelected}
          </span>
          {activeSubTab === "browse" && summaryStats.totalSelected > 0 && (
            <span style={{ fontSize: "11px", opacity: 0.9 }}>➔ ক্লিক করুন</span>
          )}
        </button>
      </div>

      {/* Contextual Info Banner */}
      {activeSubTab === "browse" && summaryStats.totalSelected > 0 && (
        <div
          style={{
            background: "#f0fdf4",
            border: "1.5px solid #86efac",
            borderRadius: "10px",
            padding: "10px 16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <div style={{ color: "#166534", fontSize: "13px", fontWeight: "700", display: "flex", alignItems: "center", gap: "6px" }}>
            <span>✅</span>
            <span>
              আপনার কোটেশন শিটে <strong>{summaryStats.totalSelected}</strong> টি প্রোডাক্ট যোগ করা হয়েছে।
            </span>
          </div>
          <button
            type="button"
            onClick={() => setActiveSubTab("selected")}
            style={{
              background: "#16a34a",
              border: "none",
              color: "#ffffff",
              padding: "6px 16px",
              borderRadius: "8px",
              fontSize: "12px",
              fontWeight: "800",
              cursor: "pointer",
              boxShadow: "0 2px 6px rgba(22, 163, 74, 0.2)",
            }}
          >
            📋 নির্বাচিত শিট ওপেন করুন ➔
          </button>
        </div>
      )}

      {activeSubTab === "selected" && (
        <div
          style={{
            background: "#fff1f2",
            border: "1.5px solid #fecdd3",
            borderRadius: "10px",
            padding: "10px 16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <div style={{ color: "#9f1239", fontSize: "13px", fontWeight: "700", display: "flex", alignItems: "center", gap: "6px" }}>
            <span>📋</span>
            <span>
              <strong>নির্বাচিত কোটেশন শিট:</strong> মোট {summaryStats.totalSelected} টি প্রোডাক্ট। এখানে প্রয়োজনমতো পাইকারি রেট কাস্টমাইজ করতে পারবেন।
            </span>
          </div>
          <button
            type="button"
            onClick={() => setActiveSubTab("browse")}
            style={{
              background: "#ffffff",
              border: "1.5px solid #e11d48",
              color: "#e11d48",
              padding: "6px 14px",
              borderRadius: "8px",
              fontSize: "12px",
              fontWeight: "800",
              cursor: "pointer",
            }}
          >
            + আরও প্রোডাক্ট যোগ করুন
          </button>
        </div>
      )}

      {/* Products Table */}
      <div style={{ background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "14px", overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px", textAlign: "left" }}>
            <thead style={{ background: "#f8fafc" }}>
              <tr>
                <th style={{ padding: "12px 10px", borderBottom: "1px solid #e2e8f0", color: "#334155", width: "40px", textAlign: "center" }}>
                  সিলেক্ট
                </th>
                <th style={{ padding: "12px 10px", borderBottom: "1px solid #e2e8f0", color: "#334155", width: "50px", textAlign: "center" }}>
                  ছবি
                </th>
                <th style={{ padding: "12px 10px", borderBottom: "1px solid #e2e8f0", color: "#334155" }}>
                  প্রোডাক্টের বিবরণ
                </th>
                <th style={{ padding: "12px 10px", borderBottom: "1px solid #e2e8f0", color: "#334155", textAlign: "right" }}>
                  কেনার দাম
                </th>
                <th style={{ padding: "12px 10px", borderBottom: "1px solid #e2e8f0", color: "#334155", textAlign: "right" }}>
                  মার্কেট দাম (MRP)
                </th>
                <th style={{ padding: "12px 10px", borderBottom: "1px solid #e2e8f0", color: "#0f172a", textAlign: "right", fontWeight: "900" }}>
                  পাইকারি রেট (+{profitPercent}%)
                </th>
                <th style={{ padding: "12px 10px", borderBottom: "1px solid #e2e8f0", color: "#166534", textAlign: "center" }}>
                  মার্কেট ছাড় (% OFF)
                </th>
                <th style={{ padding: "12px 10px", borderBottom: "1px solid #e2e8f0", color: "#334155", textAlign: "center", width: "90px" }}>
                  অ্যাকশন
                </th>
              </tr>
            </thead>
            <tbody>
              {(activeSubTab === "browse" ? filteredProducts : selectedProductList).length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ padding: "36px", textAlign: "center", color: "#64748b", fontWeight: "700" }}>
                    {activeSubTab === "browse"
                      ? "কোনো প্রোডাক্ট পাওয়া যায়নি। ফিল্টার বা সার্চ চেক করুন।"
                      : "কোনো প্রোডাক্ট এখনো সিলেক্ট করা হয়নি! 'সব প্রোডাক্ট' ট্যাব থেকে প্রোডাক্ট সিলেক্ট করুন।"}
                  </td>
                </tr>
              ) : (
                (activeSubTab === "browse" ? filteredProducts : selectedProductList).map((p, idx) => {
                  const id = p._id || p.id;
                  const isSelected = selectedProductMap[id] !== undefined;
                  const buyPrice = Number(p.purchasePrice) || 0;
                  const origPrice = Number(p.originalPrice) || Number(p.offerPrice) || (buyPrice > 0 ? Math.round(buyPrice * 1.5) : 0);

                  // Calculate Wholesale Price
                  const customPrice = selectedProductMap[id];
                  const defaultWholesale = Math.round(buyPrice * (1 + Number(profitPercent || 0) / 100));
                  const finalWholesale = customPrice !== undefined && customPrice !== null && customPrice !== ""
                    ? Number(customPrice)
                    : defaultWholesale;

                  // Discount from original MRP
                  const discountPct = origPrice > finalWholesale
                    ? Math.round(((origPrice - finalWholesale) / origPrice) * 100)
                    : 0;

                  const brandName = typeof p.brand === "object" ? p.brand?.name : (p.brand || "");
                  const categoryName = typeof p.category === "object" ? p.category?.name : (p.category || "");

                  return (
                    <tr
                      key={id || idx}
                      style={{
                        background: isSelected ? "#fff1f2" : idx % 2 === 0 ? "#ffffff" : "#fbfcfe",
                        borderBottom: "1px solid #edf2f7",
                      }}
                    >
                      {/* Checkbox */}
                      <td style={{ padding: "10px", textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(p)}
                          style={{ width: "17px", height: "17px", cursor: "pointer", accentColor: "#e11d48" }}
                        />
                      </td>

                      {/* Image Thumbnail */}
                      <td style={{ padding: "10px", textAlign: "center" }}>
                        {p.image ? (
                          <img
                            src={p.image}
                            alt=""
                            style={{
                              width: "38px",
                              height: "38px",
                              objectFit: "contain",
                              borderRadius: "6px",
                              border: "1px solid #e2e8f0",
                              background: "#fff",
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: "38px",
                              height: "38px",
                              borderRadius: "6px",
                              background: "#f1f5f9",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "10px",
                              color: "#94a3b8",
                            }}
                          >
                            📦
                          </div>
                        )}
                      </td>

                      {/* Product Name & Brand */}
                      <td style={{ padding: "10px" }}>
                        <div style={{ fontWeight: "800", color: "#0f172a", fontSize: "13px" }}>
                          {p.name}
                        </div>
                        <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px", display: "flex", gap: "6px", alignItems: "center" }}>
                          {brandName && <span style={{ fontWeight: "700", color: "#2563eb" }}>🏷️ {brandName}</span>}
                          {categoryName && <span>• {categoryName}</span>}
                          <span style={{ color: p.inStock !== false ? "#16a34a" : "#dc2626", fontWeight: "700" }}>
                            • {p.inStock !== false ? `স্টক: ${p.stockQuantity ?? "আছে"}` : "স্টক আউট"}
                          </span>
                        </div>
                      </td>

                      {/* Buying Cost */}
                      <td style={{ padding: "10px", textAlign: "right", color: "#64748b", fontWeight: "600", whiteSpace: "nowrap" }}>
                        ৳{buyPrice.toLocaleString()}
                      </td>

                      {/* Original / Market Price */}
                      <td style={{ padding: "10px", textAlign: "right", color: "#94a3b8", whiteSpace: "nowrap" }}>
                        <span style={{ textDecoration: "line-through" }}>৳{origPrice.toLocaleString()}</span>
                      </td>

                      {/* Wholesale Rate (Input to customize or auto-calculated) */}
                      <td style={{ padding: "10px", textAlign: "right", whiteSpace: "nowrap" }}>
                        {isSelected ? (
                          <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                            <span style={{ fontWeight: "800", color: "#e11d48", fontSize: "12px" }}>৳</span>
                            <input
                              type="number"
                              min="0"
                              value={customPrice !== null && customPrice !== undefined ? customPrice : finalWholesale}
                              onChange={(e) => handleCustomPriceChange(id, e.target.value)}
                              title="কাস্টম পাইকারি রেট বসাতে পারেন"
                              style={{
                                width: "75px",
                                padding: "4px 6px",
                                borderRadius: "6px",
                                border: customPrice ? "2px solid #e11d48" : "1px solid #cbd5e1",
                                background: customPrice ? "#fff" : "#fff1f2",
                                color: "#0f172a",
                                fontWeight: "800",
                                textAlign: "right",
                                fontSize: "13px",
                              }}
                            />
                          </div>
                        ) : (
                          <span style={{ fontWeight: "800", color: "#e11d48", fontSize: "14px" }}>
                            ৳{finalWholesale.toLocaleString()}
                          </span>
                        )}
                      </td>

                      {/* Discount % from Real Retail Price */}
                      <td style={{ padding: "10px", textAlign: "center", whiteSpace: "nowrap" }}>
                        <span
                          style={{
                            background: "#dcfce7",
                            color: "#15803d",
                            border: "1px solid #86efac",
                            padding: "3px 8px",
                            borderRadius: "12px",
                            fontWeight: "900",
                            fontSize: "11px",
                          }}
                        >
                          {discountPct}% OFF
                        </span>
                      </td>

                      {/* Action */}
                      <td style={{ padding: "10px", textAlign: "center", whiteSpace: "nowrap" }}>
                        <button
                          type="button"
                          onClick={() => toggleSelect(p)}
                          style={{
                            padding: "5px 10px",
                            borderRadius: "6px",
                            border: "none",
                            cursor: "pointer",
                            fontSize: "11px",
                            fontWeight: "800",
                            background: isSelected ? "#fee2e2" : "#f1f5f9",
                            color: isSelected ? "#dc2626" : "#2563eb",
                          }}
                        >
                          {isSelected ? "✕ বাদ দিন" : "+ যোগ করুন"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: "8px",
  border: "1px solid #cbd5e1",
  fontSize: "13px",
  outline: "none",
  boxSizing: "border-box",
  background: "#f8fafc",
  color: "#0f172a",
};

const selectStyle = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: "8px",
  border: "1px solid #cbd5e1",
  fontSize: "13px",
  outline: "none",
  boxSizing: "border-box",
  background: "#f8fafc",
  color: "#0f172a",
  cursor: "pointer",
  fontWeight: "600",
};
