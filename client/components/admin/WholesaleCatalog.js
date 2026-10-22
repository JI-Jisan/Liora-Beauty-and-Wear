"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { generateWholesalePdf } from "@/lib/wholesalePdf";
import { getAuthHeaders } from "@/lib/api";

export default function WholesaleCatalog({ products = [], categories = [] }) {
  // Main Tab Navigation: 'generator' | 'saved_list'
  const [activeMainTab, setActiveMainTab] = useState("generator");

  // Generator Filters
  const [selectedBrand, setSelectedBrand] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [inStockOnly, setInStockOnly] = useState(false);

  // Profit Margin State (Default 5%)
  const [profitPercent, setProfitPercent] = useState(5);

  // Selected Products for Quotation (Map of id -> { customPrice: number | null, qty: number })
  const [selectedProductMap, setSelectedProductMap] = useState({});

  // Client Details for Quotation Header
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [clientNote, setClientNote] = useState("");
  const [currentQuoteId, setCurrentQuoteId] = useState(null);
  const [currentQuoteNumber, setCurrentQuoteNumber] = useState(null);

  // UI State inside Generator: Active View ('browse' | 'selected')
  const [activeSubTab, setActiveSubTab] = useState("browse");

  // PDF Generation State
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfMessage, setPdfMessage] = useState("");

  // Save / API State
  const [isSavingQuote, setIsSavingQuote] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  // Saved Quotations List State
  const [savedQuotations, setSavedQuotations] = useState([]);
  const [savedLoading, setSavedLoading] = useState(false);
  const [savedSearch, setSavedSearch] = useState("");
  const [savedStatusFilter, setSavedStatusFilter] = useState("all");
  const [savedPage, setSavedPage] = useState(1);
  const [convertingId, setConvertingId] = useState(null);

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
      } catch (e) {}

      // Fallback: extract unique brands from products
      const bSet = new Map();
      products.forEach((p) => {
        if (p?.brand) {
          const bName = (p.brand && typeof p.brand === "object" ? p.brand.name : p.brand) || "";
          const bId = (p.brand && typeof p.brand === "object" ? p.brand._id : p.brand) || "";
          if (bName && !bSet.has(String(bName))) {
            bSet.set(String(bName), { _id: bId || bName, name: bName });
          }
        }
      });
      setBrands(Array.from(bSet.values()));
    }
    fetchBrands();
  }, [products]);

  // Fetch Saved Quotations from Backend API
  const fetchSavedQuotations = useCallback(async () => {
    setSavedLoading(true);
    try {
      const params = new URLSearchParams();
      if (savedSearch) params.append("search", savedSearch);
      if (savedStatusFilter !== "all") params.append("status", savedStatusFilter);
      params.append("page", String(savedPage));
      params.append("limit", "50");

      const res = await fetch(`/api/admin/quotations?${params.toString()}`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setSavedQuotations(data.quotations || []);
      }
    } catch (err) {
      console.error("Failed to load quotations:", err);
    } finally {
      setSavedLoading(false);
    }
  }, [savedSearch, savedStatusFilter, savedPage]);

  useEffect(() => {
    if (activeMainTab === "saved_list") {
      fetchSavedQuotations();
    }
  }, [activeMainTab, fetchSavedQuotations]);

  // Filtered Products for Browse view
  const filteredProducts = useMemo(() => {
    const q = (searchQuery || "").toLowerCase().trim();

    return (products || []).filter((p) => {
      if (!p) return false;

      // 1. Stock Filter
      if (inStockOnly && p.inStock === false) return false;

      // 2. Brand Filter
      if (selectedBrand !== "all") {
        const bName = (p.brand && typeof p.brand === "object" ? p.brand.name : p.brand) || "";
        const bId = (p.brand && typeof p.brand === "object" ? p.brand._id : p.brand) || "";
        if (String(bId) !== selectedBrand && String(bName).toLowerCase() !== selectedBrand.toLowerCase()) {
          return false;
        }
      }

      // 3. Category Filter
      if (selectedCategory !== "all") {
        const cId = (p.category && typeof p.category === "object" ? p.category._id : p.category) || "";
        const cName = (p.category && typeof p.category === "object" ? p.category.name : p.category) || "";
        if (String(cId) !== selectedCategory && String(cName).toLowerCase() !== selectedCategory.toLowerCase()) {
          return false;
        }
      }

      // 4. Search Filter
      if (q) {
        const pName = String(p.name || "").toLowerCase();
        const rawBrand = (p.brand && typeof p.brand === "object" ? p.brand.name : p.brand) || "";
        const bName = String(rawBrand).toLowerCase();
        const rawCat = (p.category && typeof p.category === "object" ? p.category.name : p.category) || "";
        const cName = String(rawCat).toLowerCase();
        const pId = String(p._id || p.id || "").toLowerCase();
        const pSku = String(p.sku || p.barcode || "").toLowerCase();

        if (
          !pName.includes(q) &&
          !bName.includes(q) &&
          !cName.includes(q) &&
          !pId.includes(q) &&
          !pSku.includes(q)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [products, selectedBrand, selectedCategory, searchQuery, inStockOnly]);

  // Selected Products List with Calculated Wholesale, Qty, and Line Total
  const selectedProductList = useMemo(() => {
    return products
      .filter((p) => selectedProductMap[p._id || p.id] !== undefined)
      .map((p) => {
        const id = p._id || p.id;
        const entry = selectedProductMap[id] || {};
        const customPrice = entry.customPrice;
        const qty = Math.max(1, parseInt(entry.qty) || 1);

        const buyPrice = Number(p.purchasePrice) || 0;
        const defaultWholesale = Math.round(buyPrice * (1 + Number(profitPercent || 0) / 100));
        const finalWholesale =
          customPrice !== undefined && customPrice !== null && customPrice !== ""
            ? Number(customPrice)
            : defaultWholesale;

        const origPrice =
          Number(p.originalPrice) || Number(p.offerPrice) || (buyPrice > 0 ? Math.round(buyPrice * 1.5) : 0);
        const discountPct =
          origPrice > finalWholesale ? Math.round(((origPrice - finalWholesale) / origPrice) * 100) : 0;

        const lineTotal = finalWholesale * qty;
        const lineMarket = origPrice * qty;
        const lineCost = buyPrice * qty;

        const rawBrand = (p.brand && typeof p.brand === "object" ? p.brand.name : p.brand) || "Other Brands";
        const brandName = String(rawBrand).trim() || "Other Brands";

        return {
          ...p,
          brandName,
          categoryName: (p.category && typeof p.category === "object" ? p.category.name : p.category) || "",
          quantity: qty,
          wholesalePrice: finalWholesale,
          calculatedDefaultPrice: defaultWholesale,
          customPrice: customPrice ?? null,
          discountPct,
          origPrice,
          lineTotal,
          lineMarket,
          lineCost,
        };
      });
  }, [products, selectedProductMap, profitPercent]);

  // Brand-Wise Grouping of Selected Products
  const brandGroupedSelected = useMemo(() => {
    const groups = {};
    selectedProductList.forEach((item) => {
      const b = item.brandName || "Other Brands";
      if (!groups[b]) {
        groups[b] = [];
      }
      groups[b].push(item);
    });

    return Object.keys(groups)
      .sort((a, b) => a.localeCompare(b))
      .map((bName) => {
        const items = groups[bName];
        const totalPcs = items.reduce((acc, it) => acc + it.quantity, 0);
        const subtotal = items.reduce((acc, it) => acc + it.lineTotal, 0);
        const subtotalMarket = items.reduce((acc, it) => acc + it.lineMarket, 0);
        const subtotalCost = items.reduce((acc, it) => acc + it.lineCost, 0);
        return {
          brandName: bName,
          items,
          totalPcs,
          subtotal,
          subtotalMarket,
          subtotalCost,
        };
      });
  }, [selectedProductList]);

  // Helper calculations for summary
  const summaryStats = useMemo(() => {
    const totalSelected = selectedProductList.length;
    let totalQty = 0;
    let totalWholesale = 0;
    let totalMarket = 0;
    let totalCost = 0;
    let totalDiscountSum = 0;

    selectedProductList.forEach((item) => {
      totalQty += item.quantity;
      totalWholesale += item.lineTotal;
      totalMarket += item.lineMarket;
      totalCost += item.lineCost;
      totalDiscountSum += item.discountPct;
    });

    const avgDiscount = totalSelected > 0 ? Math.round(totalDiscountSum / totalSelected) : 0;
    const totalSavings = Math.max(0, totalMarket - totalWholesale);
    const totalProfitEst = Math.max(0, totalWholesale - totalCost);
    const marginPct = totalWholesale > 0 ? Math.round((totalProfitEst / totalWholesale) * 100) : profitPercent;

    return {
      totalSelected,
      totalQty,
      totalWholesale,
      totalMarket,
      totalSavings,
      totalCost,
      totalProfitEst,
      avgDiscount,
      marginPct,
    };
  }, [selectedProductList, profitPercent]);

  // Toggle single product selection
  const toggleSelect = (product) => {
    const id = product._id || product.id;
    setSelectedProductMap((prev) => {
      const next = { ...prev };
      if (next[id] !== undefined) {
        delete next[id];
      } else {
        // default 1 piece, null customPrice
        next[id] = { customPrice: null, qty: 1 };
      }
      return next;
    });
  };

  // Update Quantity for an item
  const handleQtyChange = (id, newQty) => {
    const qty = Math.max(1, parseInt(newQty) || 1);
    setSelectedProductMap((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] || { customPrice: null }),
        qty,
      },
    }));
  };

  // Quick increment Qty (+6, +12, +24)
  const handleQuickAddQty = (id, delta) => {
    setSelectedProductMap((prev) => {
      const cur = prev[id]?.qty || 1;
      return {
        ...prev,
        [id]: {
          ...(prev[id] || { customPrice: null }),
          qty: Math.max(1, cur + delta),
        },
      };
    });
  };

  // Update custom wholesale price for a specific product
  const handleCustomPriceChange = (id, newPrice) => {
    setSelectedProductMap((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] || { qty: 1 }),
        customPrice: newPrice === "" ? null : Number(newPrice),
      },
    }));
  };

  // Select all filtered products
  const handleSelectAllFiltered = () => {
    setSelectedProductMap((prev) => {
      const next = { ...prev };
      filteredProducts.forEach((p) => {
        const id = p._id || p.id;
        if (next[id] === undefined) {
          next[id] = { customPrice: null, qty: 1 };
        }
      });
      return next;
    });
    setActiveSubTab("selected");
  };

  // Clear all selections
  const handleClearAll = () => {
    setSelectedProductMap({});
    setCurrentQuoteId(null);
    setCurrentQuoteNumber(null);
  };

  // Save Quotation / Billing Invoice to MongoDB
  const handleSaveQuotation = async () => {
    if (selectedProductList.length === 0) {
      alert("অনুগ্রহ করে অন্তত ১টি প্রোডাক্ট সিলেক্ট করুন!");
      return;
    }
    if (!clientName.trim()) {
      alert("অনুগ্রহ করে ক্লায়েন্ট বা দোকানের নাম লিখুন!");
      return;
    }

    setIsSavingQuote(true);
    setSaveMessage("কোটেশন ডাটাবেজে সংরক্ষণ হচ্ছে...");

    try {
      const payload = {
        quoteNumber: currentQuoteNumber || undefined,
        clientInfo: {
          clientName: clientName.trim(),
          clientPhone: clientPhone.trim(),
          clientAddress: clientAddress.trim(),
          note: clientNote.trim(),
        },
        profitPercent,
        items: selectedProductList.map((it) => ({
          productId: it._id || it.id,
          name: it.name,
          brandName: it.brandName,
          categoryName: it.categoryName,
          image: it.image || "",
          originalPrice: it.origPrice,
          purchasePrice: it.purchasePrice || 0,
          wholesalePrice: it.wholesalePrice,
          quantity: it.quantity,
          lineTotal: it.lineTotal,
          discountPct: it.discountPct,
        })),
        status: "Draft",
      };

      const url = currentQuoteId
        ? `/api/admin/quotations/${currentQuoteId}`
        : "/api/admin/quotations";
      const method = currentQuoteId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to save quotation");
      }

      setCurrentQuoteId(data.quotation._id);
      setCurrentQuoteNumber(data.quotation.quoteNumber);
      setSaveMessage(`✅ কোটেশন #${data.quotation.quoteNumber} সফলভাবে সংরক্ষিত হয়েছে!`);

      // Refresh saved list if cached
      fetchSavedQuotations();

      setTimeout(() => {
        setSaveMessage("");
      }, 4000);
    } catch (err) {
      console.error(err);
      alert("সংরক্ষণ করতে সমস্যা হয়েছে: " + err.message);
      setSaveMessage("");
    } finally {
      setIsSavingQuote(false);
    }
  };

  // Download PDF Handler
  const handleDownloadPdf = async (customItems = null, customClient = null, quoteNum = null) => {
    const listToPrint = customItems || selectedProductList;
    const infoToPrint = customClient || {
      clientName: clientName.trim() || "Wholesale Partner",
      clientPhone: clientPhone.trim(),
      clientAddress: clientAddress.trim(),
    };

    if (listToPrint.length === 0) {
      alert("অনুগ্রহ করে অন্তত ১টি প্রোডাক্ট সিলেক্ট করুন!");
      return;
    }

    setIsGeneratingPdf(true);
    setPdfMessage("ব্র্যান্ড অনুযায়ী ছবি ও ইনভয়েস টেবিল সাজানো হচ্ছে...");

    try {
      await generateWholesalePdf({
        items: listToPrint,
        clientInfo: infoToPrint,
        profitPercent,
        quoteNumber: quoteNum || currentQuoteNumber,
        onProgress: (current, total) => {
          setPdfMessage(`ছবি ও ডাটা প্রসেস হচ্ছে: ${current} / ${total}`);
        },
      });

      setPdfMessage("✅ হোলসেল ইনভয়েস PDF ডাউনলোড সফল হয়েছে!");
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

  // 1-Click Convert to Store Order
  const handleConvertToOrder = async (quoteId) => {
    if (!confirm("আপনি কি নিশ্চিত এই কোটেশনটি অফিসিয়াল অর্ডারে কনভার্ট করতে চান? এটি ইনভেন্টরি থেকে স্টক কমিয়ে দেবে!")) {
      return;
    }

    setConvertingId(quoteId);
    try {
      const res = await fetch(`/api/admin/quotations/${quoteId}/convert`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to convert quote to order");
      }

      alert(data.message || "কোটেশনটি সফলভাবে অর্ডারে কনভার্ট হয়েছে!");
      fetchSavedQuotations();
    } catch (err) {
      alert("অর্ডার কনভার্ট করতে ব্যর্থ: " + err.message);
    } finally {
      setConvertingId(null);
    }
  };

  // Delete Quotation from Database
  const handleDeleteQuote = async (quoteId, quoteNum) => {
    if (!confirm(`আপনি কি নিশ্চিত কোটেশন #${quoteNum} ডিলিট করতে চান?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/quotations/${quoteId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        alert("কোটেশনটি সফলভাবে মুছে ফেলা হয়েছে!");
        fetchSavedQuotations();
      } else {
        const data = await res.json();
        alert("ডিলিট করতে ব্যর্থ: " + data.message);
      }
    } catch (err) {
      alert("ডিলিট ত্রুটি: " + err.message);
    }
  };

  // Load Saved Quote into Active Editor
  const handleEditSavedQuote = (q) => {
    setClientName(q.clientInfo?.clientName || "");
    setClientPhone(q.clientInfo?.clientPhone || "");
    setClientAddress(q.clientInfo?.clientAddress || "");
    setClientNote(q.clientInfo?.note || "");
    setProfitPercent(q.profitPercent || 5);
    setCurrentQuoteId(q._id);
    setCurrentQuoteNumber(q.quoteNumber);

    const map = {};
    (q.items || []).forEach((it) => {
      const id = it.productId || it._id || it.name;
      map[id] = {
        customPrice: it.wholesalePrice,
        qty: it.quantity || 1,
      };
    });
    setSelectedProductMap(map);
    setActiveMainTab("generator");
    setActiveSubTab("selected");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Share Quotation via WhatsApp
  const handleWhatsAppShare = (q = null) => {
    const isSaved = Boolean(q);
    const targetQuoteNumber = isSaved ? q.quoteNumber : currentQuoteNumber || `WS-${Date.now().toString().slice(-6)}`;
    const targetClient = isSaved ? q.clientInfo?.clientName : clientName.trim() || "Wholesale Partner";
    const targetPhone = isSaved ? q.clientInfo?.clientPhone : clientPhone.trim();
    const targetItems = isSaved ? q.items : selectedProductList;
    const targetTotal = isSaved ? q.totalWholesaleSum : summaryStats.totalWholesale;
    const targetQty = isSaved ? q.totalQty : summaryStats.totalQty;
    const targetSavings = isSaved ? q.totalSavings : summaryStats.totalSavings;

    const domain = typeof window !== "undefined" ? window.location.origin : "https://www.liorabeautyandwear.com";
    const digitalLink = `${domain}/quote/${targetQuoteNumber}`;

    let msg = `*LIORA BEAUTY & WEAR — WHOLESALE INVOICE & QUOTATION*\n`;
    msg += `📄 *Invoice Ref:* #${targetQuoteNumber}\n`;
    msg += `🏪 *Billed To:* ${targetClient}\n`;
    msg += `📅 *Date:* ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}\n\n`;
    msg += `*ORDERED ITEMS LIST:*\n`;

    targetItems.slice(0, 15).forEach((it, idx) => {
      const name = it.name || "Item";
      const qty = it.quantity || 1;
      const rate = it.wholesalePrice;
      const tot = it.lineTotal || rate * qty;
      msg += `${idx + 1}. ${name}\n    ➔ ${qty} Pcs @ ৳${rate} = *৳${tot.toLocaleString()}*\n`;
    });

    if (targetItems.length > 15) {
      msg += `... এবং আরও ${targetItems.length - 15} টি প্রোডাক্ট।\n`;
    }

    msg += `\n📦 *মোট পরিমাণ (Total Qty):* ${targetQty} Pcs\n`;
    msg += `💵 *সর্বমোট পাইকারি বিল:* *৳${targetTotal.toLocaleString()}*\n`;
    if (targetSavings > 0) {
      msg += `🎁 *খুচরা দাম থেকে মোট সাশ্রয়:* ৳${targetSavings.toLocaleString()}\n`;
    }
    msg += `\n🌐 *ডিজিটাল ইনভয়েস লিংক ও PDF ডাউনলোড:*\n${digitalLink}\n\n`;
    msg += `_LIORA Wholesale Distribution Desk | +8801837223147_`;

    const encoded = encodeURIComponent(msg);
    const cleanPhone = (targetPhone || "").replace(/[^0-9]/g, "");
    const waUrl = cleanPhone ? `https://wa.me/88${cleanPhone.replace(/^88/, "")}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    window.open(waUrl, "_blank");
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
            <span style={{ fontSize: "26px" }}>💼</span>
            <h2 style={{ margin: 0, fontSize: "21px", fontWeight: "900", color: "#f8fafc" }}>
              Wholesale Quotation & Billing Invoice Manager
            </h2>
          </div>
          <p style={{ margin: 0, fontSize: "13px", color: "#94a3b8", maxWidth: "620px", lineHeight: "1.5" }}>
            ব্র্যান্ড অনুযায়ী গোছানো কোটেশন ও ইনভয়েস তৈরি করুন। কাস্টম পিস সংখ্যা (Pcs), রেট ও টোটাল ক্যালকুলেশন সহ
            মুহূর্তেই ক্লায়েন্টকে পাঠানোর মতো প্রফেশনাল পাইকারি বিলিং ইনভয়েস ডাউনলোড করুন অথবা ডেটাবেজে সেভ রাখুন।
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
              📈 আপনার ডিফল্ট লাভ (% Profit)
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
            <span style={{ fontSize: "10px", color: "#94a3b8" }}>দ্রুত সিলেক্ট:</span>
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

      {/* Main Tabs Navigation: Generator vs Saved History */}
      <div style={{ display: "flex", gap: "12px", borderBottom: "2px solid #e2e8f0", paddingBottom: "12px" }}>
        <button
          type="button"
          onClick={() => setActiveMainTab("generator")}
          style={{
            padding: "10px 22px",
            borderRadius: "10px",
            border: activeMainTab === "generator" ? "2px solid #e11d48" : "1px solid #cbd5e1",
            background: activeMainTab === "generator" ? "#e11d48" : "#ffffff",
            color: activeMainTab === "generator" ? "#ffffff" : "#475569",
            fontWeight: "800",
            fontSize: "13.5px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            boxShadow: activeMainTab === "generator" ? "0 4px 12px rgba(225, 29, 72, 0.25)" : "none",
          }}
        >
          <span>📝 নতুন কোটেশন ও ইনভয়েস তৈরি</span>
          {summaryStats.totalSelected > 0 && (
            <span
              style={{
                background: activeMainTab === "generator" ? "#ffffff" : "#e11d48",
                color: activeMainTab === "generator" ? "#e11d48" : "#ffffff",
                padding: "2px 8px",
                borderRadius: "12px",
                fontSize: "11px",
                fontWeight: "900",
              }}
            >
              {summaryStats.totalSelected}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveMainTab("saved_list");
            fetchSavedQuotations();
          }}
          style={{
            padding: "10px 22px",
            borderRadius: "10px",
            border: activeMainTab === "saved_list" ? "2px solid #0f172a" : "1px solid #cbd5e1",
            background: activeMainTab === "saved_list" ? "#0f172a" : "#ffffff",
            color: activeMainTab === "saved_list" ? "#ffffff" : "#475569",
            fontWeight: "800",
            fontSize: "13.5px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            boxShadow: activeMainTab === "saved_list" ? "0 4px 12px rgba(15, 23, 42, 0.25)" : "none",
          }}
        >
          <span>📂 সংরক্ষিত কোটেশন ও ইনভয়েস তালিকা</span>
          <span
            style={{
              background: activeMainTab === "saved_list" ? "rgba(255,255,255,0.2)" : "#f1f5f9",
              color: activeMainTab === "saved_list" ? "#ffffff" : "#475569",
              padding: "2px 8px",
              borderRadius: "12px",
              fontSize: "11px",
              fontWeight: "900",
            }}
          >
            {savedQuotations.length}
          </span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: GENERATOR & BILLING INVOICE BUILDER                */}
      {/* ========================================================= */}
      {activeMainTab === "generator" && (
        <>
          {/* Highlights & Live Summary Banner */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
              gap: "12px",
            }}
          >
            {/* Highlight 1: Selected Count & Total Pieces */}
            <div
              style={{
                background: "#ffffff",
                padding: "16px",
                borderRadius: "12px",
                border: "1px solid #e2e8f0",
                boxShadow: "0 2px 6px rgba(0, 0, 0, 0.03)",
              }}
            >
              <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "700" }}>📦 নির্বাচিত আইটেম ও পিস</div>
              <div style={{ fontSize: "22px", fontWeight: "900", color: "#0f172a", marginTop: "4px" }}>
                {summaryStats.totalSelected}{" "}
                <span style={{ fontSize: "13px", fontWeight: "600", color: "#64748b" }}>আইটেম</span>
                {" • "}
                <span style={{ color: "#e11d48" }}>{summaryStats.totalQty}</span>{" "}
                <span style={{ fontSize: "13px", fontWeight: "600", color: "#64748b" }}>পিস</span>
              </div>
              <div style={{ fontSize: "11px", color: "#0284c7", fontWeight: "700", marginTop: "4px" }}>
                ব্র্যান্ড গ্রুপ সংখ্যা: {brandGroupedSelected.length} টি
              </div>
            </div>

            {/* Highlight 2: Wholesale Buyer Savings */}
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
                🎁 ক্লায়েন্টের সাশ্রয় (Discount)
              </div>
              <div style={{ fontSize: "22px", fontWeight: "900", color: "#15803d", marginTop: "4px" }}>
                {summaryStats.avgDiscount}%{" "}
                <span style={{ fontSize: "13px", fontWeight: "700", color: "#166534" }}>গড় ছাড় (Avg OFF)</span>
              </div>
              <div style={{ fontSize: "11px", color: "#15803d", fontWeight: "700", marginTop: "4px" }}>
                মার্কেট দাম থেকে সাশ্রয়: ৳{summaryStats.totalSavings.toLocaleString()}
              </div>
            </div>

            {/* Highlight 3: Grand Wholesale Billing Amount */}
            <div
              style={{
                background: "#ffffff",
                padding: "16px",
                borderRadius: "12px",
                border: "1.5px solid #fda4af",
                boxShadow: "0 2px 6px rgba(225, 29, 72, 0.08)",
              }}
            >
              <div style={{ fontSize: "12px", color: "#9f1239", fontWeight: "700" }}>
                💵 মোট পাইকারি ইনভয়েস বিল (Payable)
              </div>
              <div style={{ fontSize: "24px", fontWeight: "900", color: "#e11d48", marginTop: "4px" }}>
                ৳{summaryStats.totalWholesale.toLocaleString()}
              </div>
              <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
                খুচরা মার্কেট মূল্য: ৳{summaryStats.totalMarket.toLocaleString()}
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
                ✨ অ্যাডমিন নিট প্রফিট ({summaryStats.marginPct}%)
              </div>
              <div style={{ fontSize: "22px", fontWeight: "900", color: "#2563eb", marginTop: "4px" }}>
                ৳{summaryStats.totalProfitEst.toLocaleString()}
              </div>
              <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
                মোট কেনার খরচ: ৳{summaryStats.totalCost.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Client Information & Invoice Actions Bar */}
          <div
            style={{
              background: "#ffffff",
              padding: "20px",
              borderRadius: "14px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 2px 6px rgba(0, 0, 0, 0.03)",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
              <div style={{ fontSize: "13.5px", fontWeight: "800", color: "#0f172a", display: "flex", alignItems: "center", gap: "6px" }}>
                <span>📝 ক্লায়েন্ট / কাস্টমার তথ্য ও ইনভয়েস বিলিং ডিটেইলস</span>
                {currentQuoteNumber && (
                  <span style={{ background: "#e0f2fe", color: "#0369a1", padding: "2px 8px", borderRadius: "6px", fontSize: "12px" }}>
                    ইনভয়েস #{currentQuoteNumber}
                  </span>
                )}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "10px" }}>
              <input
                type="text"
                placeholder="ক্লায়েন্ট বা দোকানের নাম (যেমন: স্বপ্ন সুপারশপ / করিম কসমেটিকস)"
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
                placeholder="ঠিকানা / আউটলেট লোকেশন (যেমন: গুলশান-১, ঢাকা)"
                value={clientAddress}
                onChange={(e) => setClientAddress(e.target.value)}
                style={inputStyle}
              />
              <input
                type="text"
                placeholder="অর্ডার নোট বা স্পেশাল কন্ডিশন (ঐচ্ছিক)"
                value={clientNote}
                onChange={(e) => setClientNote(e.target.value)}
                style={inputStyle}
              />
            </div>

            {/* Action Buttons Toolbar */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "10px",
                marginTop: "4px",
                paddingTop: "12px",
                borderTop: "1px dashed #e2e8f0",
              }}
            >
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
                    {activeSubTab === "selected"
                      ? "← নতুন প্রোডাক্ট যোগ করতে ফিরে যান"
                      : `📋 গোছানো বিলিং শিট দেখুন (${summaryStats.totalSelected} আইটেম, ${summaryStats.totalQty} পিস) ➔`}
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

              {/* Right Side Buttons: Save, Download PDF, WhatsApp */}
              <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                {/* Save Quotation Button */}
                <button
                  type="button"
                  onClick={handleSaveQuotation}
                  disabled={isSavingQuote || summaryStats.totalSelected === 0}
                  style={{
                    padding: "10px 18px",
                    borderRadius: "10px",
                    border: "none",
                    background: summaryStats.totalSelected === 0 ? "#cbd5e1" : "#0284c7",
                    color: "#ffffff",
                    fontWeight: "800",
                    fontSize: "13px",
                    cursor: summaryStats.totalSelected === 0 || isSavingQuote ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    boxShadow: summaryStats.totalSelected > 0 ? "0 4px 10px rgba(2, 132, 199, 0.25)" : "none",
                  }}
                >
                  {isSavingQuote ? "⏳ সংরক্ষণ হচ্ছে..." : "💾 কোটেশন সংরক্ষণ করুন"}
                </button>

                {/* WhatsApp Share Button */}
                <button
                  type="button"
                  onClick={() => handleWhatsAppShare()}
                  disabled={summaryStats.totalSelected === 0}
                  style={{
                    padding: "10px 18px",
                    borderRadius: "10px",
                    border: "none",
                    background: summaryStats.totalSelected === 0 ? "#cbd5e1" : "#16a34a",
                    color: "#ffffff",
                    fontWeight: "800",
                    fontSize: "13px",
                    cursor: summaryStats.totalSelected === 0 ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    boxShadow: summaryStats.totalSelected > 0 ? "0 4px 10px rgba(22, 163, 74, 0.25)" : "none",
                  }}
                >
                  💬 WhatsApp এ পাঠান
                </button>

                {/* Download PDF Button */}
                <button
                  type="button"
                  onClick={() => handleDownloadPdf()}
                  disabled={isGeneratingPdf || summaryStats.totalSelected === 0}
                  style={{
                    padding: "10px 20px",
                    borderRadius: "10px",
                    border: "none",
                    background:
                      summaryStats.totalSelected === 0
                        ? "#cbd5e1"
                        : "linear-gradient(135deg, #e11d48 0%, #be123c 100%)",
                    color: "#ffffff",
                    fontWeight: "900",
                    fontSize: "13px",
                    cursor: summaryStats.totalSelected === 0 || isGeneratingPdf ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    boxShadow: summaryStats.totalSelected > 0 ? "0 4px 14px rgba(225, 29, 72, 0.3)" : "none",
                  }}
                >
                  {isGeneratingPdf ? "⏳ PDF তৈরি হচ্ছে..." : "📥 ব্র্যান্ডেড PDF বিল ডাউনলোড"}
                </button>
              </div>
            </div>

            {/* Notification Messages */}
            {(saveMessage || pdfMessage) && (
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: "8px",
                  background: (saveMessage || pdfMessage).includes("✅") ? "#f0fdf4" : "#eff6ff",
                  border: `1px solid ${(saveMessage || pdfMessage).includes("✅") ? "#86efac" : "#bfdbfe"}`,
                  color: (saveMessage || pdfMessage).includes("✅") ? "#15803d" : "#1d4ed8",
                  fontWeight: "700",
                  fontSize: "13px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span>{saveMessage || pdfMessage}</span>
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
                  📂 ক্যাটাগরি:
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
                  🔍 প্রোডাক্ট সার্চ করুন:
                </label>
                <input
                  type="text"
                  placeholder="প্রোডাক্টের নাম বা ব্র্যান্ড লিখুন..."
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
                  শুধুমাত্র স্টকে আছে
                </label>
              </div>
            </div>
          </div>

          {/* Subtabs Switcher: Browse All vs Selected Brand-Grouped Sheet */}
          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => setActiveSubTab("browse")}
              style={{
                padding: "8px 18px",
                borderRadius: "8px",
                border: activeSubTab === "browse" ? "2px solid #0f172a" : "1.5px solid #cbd5e1",
                cursor: "pointer",
                fontWeight: "800",
                fontSize: "13px",
                background: activeSubTab === "browse" ? "#0f172a" : "#ffffff",
                color: activeSubTab === "browse" ? "#ffffff" : "#475569",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span>📦 সব প্রোডাক্ট ক্যাটালগ</span>
              <span
                style={{
                  background: activeSubTab === "browse" ? "rgba(255,255,255,0.2)" : "#f1f5f9",
                  color: activeSubTab === "browse" ? "#ffffff" : "#475569",
                  padding: "2px 7px",
                  borderRadius: "10px",
                  fontSize: "11px",
                }}
              >
                {filteredProducts.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab("selected")}
              style={{
                padding: "8px 20px",
                borderRadius: "8px",
                border: activeSubTab === "selected" ? "2px solid #e11d48" : "1.5px solid #cbd5e1",
                cursor: "pointer",
                fontWeight: "800",
                fontSize: "13px",
                background: activeSubTab === "selected" ? "#e11d48" : "#fff1f2",
                color: activeSubTab === "selected" ? "#ffffff" : "#e11d48",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span>🏷️ ব্র্যান্ড অনুযায়ী সাজানো ইনভয়েস শিট</span>
              <span
                style={{
                  background: activeSubTab === "selected" ? "#ffffff" : "#e11d48",
                  color: activeSubTab === "selected" ? "#e11d48" : "#ffffff",
                  padding: "2px 8px",
                  borderRadius: "10px",
                  fontSize: "11px",
                  fontWeight: "900",
                }}
              >
                {summaryStats.totalSelected} আইটেম ({summaryStats.totalQty} পিস)
              </span>
            </button>
          </div>

          {/* VIEW A: BROWSE ALL PRODUCTS */}
          {activeSubTab === "browse" && (
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
                        মার্কেট ছাড়
                      </th>
                      <th style={{ padding: "12px 10px", borderBottom: "1px solid #e2e8f0", color: "#334155", textAlign: "center", width: "100px" }}>
                        অ্যাকশন
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.length === 0 ? (
                      <tr>
                        <td colSpan="8" style={{ padding: "36px", textAlign: "center", color: "#64748b", fontWeight: "700" }}>
                          কোনো প্রোডাক্ট পাওয়া যায়নি। ফিল্টার বা সার্চ চেক করুন।
                        </td>
                      </tr>
                    ) : (
                      filteredProducts.map((p, idx) => {
                        const id = p._id || p.id;
                        const isSelected = selectedProductMap[id] !== undefined;
                        const buyPrice = Number(p.purchasePrice) || 0;
                        const origPrice =
                          Number(p.originalPrice) || Number(p.offerPrice) || (buyPrice > 0 ? Math.round(buyPrice * 1.5) : 0);
                        const defaultWholesale = Math.round(buyPrice * (1 + Number(profitPercent || 0) / 100));
                        const finalWholesale =
                          selectedProductMap[id]?.customPrice ?? defaultWholesale;
                        const discountPct =
                          origPrice > finalWholesale ? Math.round(((origPrice - finalWholesale) / origPrice) * 100) : 0;
                        const brandName = (p.brand && typeof p.brand === "object" ? p.brand?.name : p.brand) || "";
                        const categoryName = (p.category && typeof p.category === "object" ? p.category?.name : p.category) || "";

                        return (
                          <tr
                            key={id || idx}
                            style={{
                              background: isSelected ? "#fff1f2" : idx % 2 === 0 ? "#ffffff" : "#fbfcfe",
                              borderBottom: "1px solid #edf2f7",
                            }}
                          >
                            <td style={{ padding: "10px", textAlign: "center" }}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelect(p)}
                                style={{ width: "17px", height: "17px", cursor: "pointer", accentColor: "#e11d48" }}
                              />
                            </td>
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
                            <td style={{ padding: "10px" }}>
                              <div style={{ fontWeight: "800", color: "#0f172a", fontSize: "13px" }}>{p.name}</div>
                              <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px", display: "flex", gap: "6px", alignItems: "center" }}>
                                {brandName && <span style={{ fontWeight: "700", color: "#2563eb" }}>🏷️ {brandName}</span>}
                                {categoryName && <span>• {categoryName}</span>}
                                <span style={{ color: p.inStock !== false ? "#16a34a" : "#dc2626", fontWeight: "700" }}>
                                  • {p.inStock !== false ? `স্টক: ${p.stockQuantity ?? "আছে"}` : "স্টক আউট"}
                                </span>
                              </div>
                            </td>
                            <td style={{ padding: "10px", textAlign: "right", color: "#64748b", fontWeight: "600", whiteSpace: "nowrap" }}>
                              ৳{buyPrice.toLocaleString()}
                            </td>
                            <td style={{ padding: "10px", textAlign: "right", color: "#94a3b8", whiteSpace: "nowrap" }}>
                              <span style={{ textDecoration: "line-through" }}>৳{origPrice.toLocaleString()}</span>
                            </td>
                            <td style={{ padding: "10px", textAlign: "right", whiteSpace: "nowrap" }}>
                              <span style={{ fontWeight: "900", color: "#e11d48", fontSize: "13.5px" }}>
                                ৳{finalWholesale.toLocaleString()}
                              </span>
                            </td>
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
                            <td style={{ padding: "10px", textAlign: "center", whiteSpace: "nowrap" }}>
                              <button
                                type="button"
                                onClick={() => toggleSelect(p)}
                                style={{
                                  padding: "5px 12px",
                                  borderRadius: "6px",
                                  border: "none",
                                  cursor: "pointer",
                                  fontSize: "11.5px",
                                  fontWeight: "800",
                                  background: isSelected ? "#fee2e2" : "#f1f5f9",
                                  color: isSelected ? "#dc2626" : "#2563eb",
                                }}
                              >
                                {isSelected ? "✕ বাদ দিন" : "+ ইনভয়েসে যোগ"}
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
          )}

          {/* VIEW B: BRAND-GROUPED BILLING INVOICE EDITOR */}
          {activeSubTab === "selected" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {brandGroupedSelected.length === 0 ? (
                <div
                  style={{
                    background: "#ffffff",
                    padding: "48px 24px",
                    borderRadius: "14px",
                    border: "1px dashed #cbd5e1",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: "36px", marginBottom: "8px" }}>📋</div>
                  <h3 style={{ margin: "0 0 6px", fontSize: "16px", color: "#0f172a" }}>
                    আপনার ইনভয়েস শিটে এখনো কোনো প্রোডাক্ট নেই!
                  </h3>
                  <p style={{ margin: "0 0 16px", fontSize: "13px", color: "#64748b" }}>
                    "সব প্রোডাক্ট ক্যাটালগ" ট্যাব থেকে প্রয়োজনীয় প্রোডাক্ট সিলেক্ট করুন অথবা ফিল্টারের সব প্রোডাক্ট এক ক্লিকে যোগ করুন।
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveSubTab("browse")}
                    style={{
                      padding: "10px 20px",
                      borderRadius: "8px",
                      border: "none",
                      background: "#e11d48",
                      color: "#fff",
                      fontWeight: "800",
                      fontSize: "13px",
                      cursor: "pointer",
                    }}
                  >
                    📦 প্রোডাক্ট সিলেক্ট করতে যান
                  </button>
                </div>
              ) : (
                brandGroupedSelected.map((group) => (
                  <div
                    key={group.brandName}
                    style={{
                      background: "#ffffff",
                      borderRadius: "14px",
                      border: "1px solid #cbd5e1",
                      overflow: "hidden",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                    }}
                  >
                    {/* Brand Banner Header */}
                    <div
                      style={{
                        background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
                        color: "#ffffff",
                        padding: "12px 18px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: "10px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ fontSize: "18px" }}>🏷️</span>
                        <div>
                          <span style={{ fontSize: "15px", fontWeight: "900", color: "#f8fafc", letterSpacing: "0.5px" }}>
                            BRAND: {group.brandName.toUpperCase()}
                          </span>
                          <span style={{ marginLeft: "10px", fontSize: "12px", color: "#94a3b8" }}>
                            ({group.items.length} টি আইটেম)
                          </span>
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "16px", fontSize: "12.5px" }}>
                        <span style={{ color: "#cbd5e1" }}>
                          মোট পিস: <strong style={{ color: "#ffffff", fontSize: "14px" }}>{group.totalPcs} Pcs</strong>
                        </span>
                        <span style={{ color: "#cbd5e1" }}>
                          ব্র্যান্ড সাবটোটাল:{" "}
                          <strong style={{ color: "#f43f5e", fontSize: "15px" }}>
                            ৳{group.subtotal.toLocaleString()}
                          </strong>
                        </span>
                      </div>
                    </div>

                    {/* Brand Items Table */}
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px", textAlign: "left" }}>
                        <thead style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                          <tr>
                            <th style={{ padding: "10px", width: "45px", textAlign: "center", color: "#475569" }}>ছবি</th>
                            <th style={{ padding: "10px", color: "#475569" }}>প্রোডাক্ট ও সাইজ</th>
                            <th style={{ padding: "10px", textAlign: "right", color: "#475569", width: "80px" }}>কেনার দাম</th>
                            <th style={{ padding: "10px", textAlign: "right", color: "#475569", width: "90px" }}>খুচরা MRP</th>
                            <th style={{ padding: "10px", textAlign: "right", color: "#0f172a", width: "120px", fontWeight: "900" }}>
                              পাইকারি দর (রেট)
                            </th>
                            <th style={{ padding: "10px", textAlign: "center", color: "#0f172a", width: "160px", fontWeight: "900" }}>
                              পরিমাণ (Pcs)
                            </th>
                            <th style={{ padding: "10px", textAlign: "right", color: "#e11d48", width: "120px", fontWeight: "900" }}>
                              টোটাল টাকা (বিল)
                            </th>
                            <th style={{ padding: "10px", textAlign: "center", color: "#166534", width: "80px" }}>ছাড়</th>
                            <th style={{ padding: "10px", textAlign: "center", color: "#475569", width: "50px" }}>বাদ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.items.map((item, iIdx) => {
                            const id = item._id || item.id;
                            const isStockLow = item.stockQuantity !== undefined && item.stockQuantity < item.quantity;

                            return (
                              <tr
                                key={id || iIdx}
                                style={{
                                  background: iIdx % 2 === 0 ? "#ffffff" : "#fbfcfe",
                                  borderBottom: "1px solid #f1f5f9",
                                }}
                              >
                                {/* Thumbnail */}
                                <td style={{ padding: "8px 10px", textAlign: "center" }}>
                                  {item.image ? (
                                    <img
                                      src={item.image}
                                      alt=""
                                      style={{
                                        width: "36px",
                                        height: "36px",
                                        objectFit: "contain",
                                        borderRadius: "6px",
                                        border: "1px solid #e2e8f0",
                                        background: "#fff",
                                      }}
                                    />
                                  ) : (
                                    <div
                                      style={{
                                        width: "36px",
                                        height: "36px",
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

                                {/* Name & Stock Warning */}
                                <td style={{ padding: "8px 10px" }}>
                                  <div style={{ fontWeight: "800", color: "#0f172a", fontSize: "13px" }}>
                                    {item.name}
                                  </div>
                                  <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px", display: "flex", gap: "6px", alignItems: "center" }}>
                                    {item.categoryName && <span>{item.categoryName}</span>}
                                    <span style={{ color: isStockLow ? "#dc2626" : "#16a34a", fontWeight: "700" }}>
                                      • বর্তমান স্টক: {item.stockQuantity ?? "অজানা"}
                                    </span>
                                    {isStockLow && (
                                      <span style={{ background: "#fee2e2", color: "#dc2626", padding: "1px 6px", borderRadius: "4px", fontSize: "10px", fontWeight: "800" }}>
                                        ⚠️ চাহিদার তুলনায় স্টক কম!
                                      </span>
                                    )}
                                  </div>
                                </td>

                                {/* Purchase Cost */}
                                <td style={{ padding: "8px 10px", textAlign: "right", color: "#64748b", fontWeight: "600" }}>
                                  ৳{Number(item.purchasePrice || 0).toLocaleString()}
                                </td>

                                {/* Retail MRP */}
                                <td style={{ padding: "8px 10px", textAlign: "right", color: "#94a3b8" }}>
                                  <span style={{ textDecoration: "line-through" }}>৳{item.origPrice.toLocaleString()}</span>
                                </td>

                                {/* Wholesale Rate (Editable) */}
                                <td style={{ padding: "8px 10px", textAlign: "right", whiteSpace: "nowrap" }}>
                                  <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                    <span style={{ fontWeight: "800", color: "#e11d48", fontSize: "12px" }}>৳</span>
                                    <input
                                      type="number"
                                      min="0"
                                      value={item.customPrice !== null && item.customPrice !== undefined ? item.customPrice : item.wholesalePrice}
                                      onChange={(e) => handleCustomPriceChange(id, e.target.value)}
                                      title="প্রয়োজনে কাস্টম রেট লিখুন"
                                      style={{
                                        width: "74px",
                                        padding: "4px 6px",
                                        borderRadius: "6px",
                                        border: item.customPrice ? "2px solid #e11d48" : "1px solid #cbd5e1",
                                        background: item.customPrice ? "#fff" : "#fff1f2",
                                        color: "#0f172a",
                                        fontWeight: "800",
                                        textAlign: "right",
                                        fontSize: "13px",
                                        outline: "none",
                                      }}
                                    />
                                  </div>
                                </td>

                                {/* Quantity (Pcs) Input with Quick Presets */}
                                <td style={{ padding: "8px 10px", textAlign: "center" }}>
                                  <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                      <button
                                        type="button"
                                        onClick={() => handleQtyChange(id, item.quantity - 1)}
                                        style={stepBtnStyle}
                                      >
                                        -
                                      </button>
                                      <input
                                        type="number"
                                        min="1"
                                        value={item.quantity}
                                        onChange={(e) => handleQtyChange(id, e.target.value)}
                                        style={{
                                          width: "50px",
                                          padding: "4px 4px",
                                          borderRadius: "6px",
                                          border: "1.5px solid #0f172a",
                                          fontWeight: "900",
                                          textAlign: "center",
                                          fontSize: "13px",
                                          color: "#0f172a",
                                          outline: "none",
                                        }}
                                      />
                                      <button
                                        type="button"
                                        onClick={() => handleQtyChange(id, item.quantity + 1)}
                                        style={stepBtnStyle}
                                      >
                                        +
                                      </button>
                                      <span style={{ fontSize: "11px", fontWeight: "700", color: "#64748b" }}>Pcs</span>
                                    </div>

                                    {/* Quick Increment Presets: +6, +12, +24 */}
                                    <div style={{ display: "flex", gap: "3px" }}>
                                      <button
                                        type="button"
                                        onClick={() => handleQuickAddQty(id, 6)}
                                        style={quickQtyBtnStyle}
                                        title="৬ পিস যোগ করুন"
                                      >
                                        +6
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleQuickAddQty(id, 12)}
                                        style={quickQtyBtnStyle}
                                        title="১ ডজন (১২ পিস) যোগ করুন"
                                      >
                                        +12
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleQuickAddQty(id, 24)}
                                        style={quickQtyBtnStyle}
                                        title="২ ডজন (২৪ পিস) যোগ করুন"
                                      >
                                        +24
                                      </button>
                                    </div>
                                  </div>
                                </td>

                                {/* Line Total (Billing Amount) */}
                                <td style={{ padding: "8px 10px", textAlign: "right", whiteSpace: "nowrap" }}>
                                  <div style={{ fontWeight: "900", color: "#e11d48", fontSize: "14px" }}>
                                    ৳{item.lineTotal.toLocaleString()}
                                  </div>
                                  <div style={{ fontSize: "10.5px", color: "#64748b" }}>
                                    ({item.quantity} × ৳{item.wholesalePrice})
                                  </div>
                                </td>

                                {/* Discount Badge */}
                                <td style={{ padding: "8px 10px", textAlign: "center", whiteSpace: "nowrap" }}>
                                  <span
                                    style={{
                                      background: "#dcfce7",
                                      color: "#15803d",
                                      padding: "3px 6px",
                                      borderRadius: "6px",
                                      fontWeight: "800",
                                      fontSize: "11px",
                                    }}
                                  >
                                    {item.discountPct}%
                                  </span>
                                </td>

                                {/* Remove Button */}
                                <td style={{ padding: "8px 10px", textAlign: "center" }}>
                                  <button
                                    type="button"
                                    onClick={() => toggleSelect(item)}
                                    title="বাদ দিন"
                                    style={{
                                      background: "#fee2e2",
                                      border: "none",
                                      color: "#dc2626",
                                      borderRadius: "6px",
                                      padding: "4px 8px",
                                      cursor: "pointer",
                                      fontWeight: "900",
                                      fontSize: "11px",
                                    }}
                                  >
                                    ✕
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}

      {/* ========================================================= */}
      {/* TAB 2: SAVED QUOTATIONS & BILLING INVOICES LIST (DB)       */}
      {/* ========================================================= */}
      {activeMainTab === "saved_list" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Saved Search & Status Bar */}
          <div
            style={{
              background: "#ffffff",
              padding: "16px",
              borderRadius: "14px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 2px 6px rgba(0, 0, 0, 0.03)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <div style={{ display: "flex", gap: "10px", flex: 1, minWidth: "260px" }}>
              <input
                type="text"
                placeholder="কোটেশন নং, ক্লায়েন্ট বা মোবাইল নম্বর খুঁজুন..."
                value={savedSearch}
                onChange={(e) => setSavedSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchSavedQuotations()}
                style={inputStyle}
              />
              <button
                type="button"
                onClick={fetchSavedQuotations}
                style={{
                  padding: "9px 18px",
                  borderRadius: "8px",
                  border: "none",
                  background: "#0f172a",
                  color: "#ffffff",
                  fontWeight: "800",
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                সার্চ
              </button>
            </div>

            {/* Status Filter */}
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              {["all", "Draft", "Sent", "Converted"].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => {
                    setSavedStatusFilter(st);
                  }}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "8px",
                    border: savedStatusFilter === st ? "2px solid #0f172a" : "1px solid #cbd5e1",
                    background: savedStatusFilter === st ? "#0f172a" : "#ffffff",
                    color: savedStatusFilter === st ? "#ffffff" : "#475569",
                    fontWeight: "700",
                    fontSize: "12px",
                    cursor: "pointer",
                  }}
                >
                  {st === "all" ? "সব স্ট্যাটাস" : st}
                </button>
              ))}
            </div>
          </div>

          {/* Saved Quotations Table */}
          <div style={{ background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "14px", overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px", textAlign: "left" }}>
                <thead style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                  <tr>
                    <th style={{ padding: "12px 14px", color: "#334155" }}>ইনভয়েস / কোটেশন নং</th>
                    <th style={{ padding: "12px 14px", color: "#334155" }}>তারিখ</th>
                    <th style={{ padding: "12px 14px", color: "#334155" }}>ক্লায়েন্ট / শপ</th>
                    <th style={{ padding: "12px 14px", color: "#334155", textAlign: "center" }}>মোট আইটেম ও পিস</th>
                    <th style={{ padding: "12px 14px", color: "#0f172a", textAlign: "right", fontWeight: "900" }}>
                      বিল মূল্য (টাকা)
                    </th>
                    <th style={{ padding: "12px 14px", color: "#2563eb", textAlign: "right" }}>প্রফিট (লাভ)</th>
                    <th style={{ padding: "12px 14px", color: "#334155", textAlign: "center" }}>স্ট্যাটাস</th>
                    <th style={{ padding: "12px 14px", color: "#334155", textAlign: "center" }}>অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody>
                  {savedLoading ? (
                    <tr>
                      <td colSpan="8" style={{ padding: "36px", textAlign: "center", color: "#64748b" }}>
                        ⏳ কোটেশন তালিকা লোড হচ্ছে...
                      </td>
                    </tr>
                  ) : savedQuotations.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ padding: "36px", textAlign: "center", color: "#64748b", fontWeight: "700" }}>
                        কোনো সংরক্ষিত কোটেশন পাওয়া যায়নি!
                      </td>
                    </tr>
                  ) : (
                    savedQuotations.map((q, idx) => {
                      const isConverted = q.status === "Converted";

                      return (
                        <tr
                          key={q._id || idx}
                          style={{
                            background: idx % 2 === 0 ? "#ffffff" : "#fbfcfe",
                            borderBottom: "1px solid #edf2f7",
                          }}
                        >
                          <td style={{ padding: "12px 14px" }}>
                            <div style={{ fontWeight: "900", color: "#0f172a", fontSize: "13px" }}>
                              #{q.quoteNumber}
                            </div>
                            {q.convertedOrderNumber && (
                              <div style={{ fontSize: "11px", color: "#16a34a", fontWeight: "700", marginTop: "2px" }}>
                                🛒 অর্ডার: {q.convertedOrderNumber}
                              </div>
                            )}
                          </td>

                          <td style={{ padding: "12px 14px", color: "#64748b", whiteSpace: "nowrap" }}>
                            {new Date(q.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </td>

                          <td style={{ padding: "12px 14px" }}>
                            <div style={{ fontWeight: "800", color: "#0f172a" }}>
                              {q.clientInfo?.clientName || "Wholesale Buyer"}
                            </div>
                            <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                              {q.clientInfo?.clientPhone || "ফোন নেই"} {q.clientInfo?.clientAddress ? `• ${q.clientInfo.clientAddress}` : ""}
                            </div>
                          </td>

                          <td style={{ padding: "12px 14px", textAlign: "center", whiteSpace: "nowrap" }}>
                            <span style={{ fontWeight: "800", color: "#0f172a" }}>
                              {q.totalItems} আইটেম
                            </span>
                            <span style={{ color: "#64748b", fontSize: "11.5px", marginLeft: "4px" }}>
                              ({q.totalQty} Pcs)
                            </span>
                          </td>

                          <td style={{ padding: "12px 14px", textAlign: "right", whiteSpace: "nowrap" }}>
                            <div style={{ fontWeight: "900", color: "#e11d48", fontSize: "14px" }}>
                              ৳{Number(q.totalWholesaleSum || 0).toLocaleString()}
                            </div>
                            <div style={{ fontSize: "10.5px", color: "#15803d" }}>
                              সাশ্রয়: ৳{Number(q.totalSavings || 0).toLocaleString()}
                            </div>
                          </td>

                          <td style={{ padding: "12px 14px", textAlign: "right", whiteSpace: "nowrap" }}>
                            <div style={{ fontWeight: "800", color: "#2563eb", fontSize: "13px" }}>
                              ৳{Number(q.estimatedProfit || 0).toLocaleString()}
                            </div>
                            <div style={{ fontSize: "10.5px", color: "#64748b" }}>
                              ({q.profitPercent}%)
                            </div>
                          </td>

                          <td style={{ padding: "12px 14px", textAlign: "center", whiteSpace: "nowrap" }}>
                            <span
                              style={{
                                background: isConverted ? "#dcfce7" : q.status === "Sent" ? "#e0f2fe" : "#f1f5f9",
                                color: isConverted ? "#15803d" : q.status === "Sent" ? "#0369a1" : "#475569",
                                border: `1px solid ${isConverted ? "#86efac" : q.status === "Sent" ? "#7dd3fc" : "#cbd5e1"}`,
                                padding: "4px 8px",
                                borderRadius: "6px",
                                fontWeight: "800",
                                fontSize: "11px",
                              }}
                            >
                              {q.status}
                            </span>
                          </td>

                          <td style={{ padding: "12px 14px", textAlign: "center", whiteSpace: "nowrap" }}>
                            <div style={{ display: "flex", gap: "6px", justifyContent: "center", alignItems: "center" }}>
                              {/* Edit / View in Generator */}
                              <button
                                type="button"
                                onClick={() => handleEditSavedQuote(q)}
                                title="এডিট বা শিট দেখুন"
                                style={actionIconBtnStyle}
                              >
                                ✏️ এডিট
                              </button>

                              {/* Download PDF */}
                              <button
                                type="button"
                                onClick={() => handleDownloadPdf(q.items, q.clientInfo, q.quoteNumber)}
                                title="PDF ডাউনলোড"
                                style={actionIconBtnStyle}
                              >
                                📥 PDF
                              </button>

                              {/* WhatsApp Share */}
                              <button
                                type="button"
                                onClick={() => handleWhatsAppShare(q)}
                                title="WhatsApp এ পাঠান"
                                style={{ ...actionIconBtnStyle, color: "#16a34a" }}
                              >
                                💬 WA
                              </button>

                              {/* Convert to Store Order */}
                              {!isConverted ? (
                                <button
                                  type="button"
                                  onClick={() => handleConvertToOrder(q._id)}
                                  disabled={convertingId === q._id}
                                  title="অফিসিয়াল অর্ডারে কনভার্ট করুন"
                                  style={{
                                    ...actionIconBtnStyle,
                                    background: "#eff6ff",
                                    color: "#2563eb",
                                    border: "1px solid #bfdbfe",
                                  }}
                                >
                                  {convertingId === q._id ? "⏳..." : "🛒 অর্ডার"}
                                </button>
                              ) : (
                                <span style={{ fontSize: "11px", color: "#16a34a", fontWeight: "800" }}>
                                  ✓ কনভার্ট হয়েছে
                                </span>
                              )}

                              {/* Delete */}
                              <button
                                type="button"
                                onClick={() => handleDeleteQuote(q._id, q.quoteNumber)}
                                title="মুছে ফেলুন"
                                style={{
                                  ...actionIconBtnStyle,
                                  background: "#fee2e2",
                                  color: "#dc2626",
                                  border: "1px solid #fecdd3",
                                }}
                              >
                                🗑️
                              </button>
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
        </div>
      )}
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

const stepBtnStyle = {
  width: "24px",
  height: "26px",
  borderRadius: "5px",
  border: "1px solid #cbd5e1",
  background: "#f1f5f9",
  color: "#0f172a",
  fontWeight: "900",
  fontSize: "14px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const quickQtyBtnStyle = {
  padding: "2px 5px",
  borderRadius: "4px",
  border: "1px solid #e2e8f0",
  background: "#f8fafc",
  color: "#475569",
  fontSize: "10px",
  fontWeight: "800",
  cursor: "pointer",
};

const actionIconBtnStyle = {
  padding: "5px 8px",
  borderRadius: "6px",
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  color: "#334155",
  fontSize: "11px",
  fontWeight: "800",
  cursor: "pointer",
};
