"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { generateWholesalePdf, buildHierarchicalGroups } from "@/lib/wholesalePdf";
import { getAuthHeaders } from "@/lib/api";

// Helper to determine buying cost
function getProductBaseCost(p, fallbackSnapshot = null) {
  const bp = Number(p?.purchasePrice);
  if (!isNaN(bp) && bp > 0 && bp < 100000) return bp;
  const sp = Number(fallbackSnapshot?.purchasePrice);
  if (!isNaN(sp) && sp > 0 && sp < 100000) return sp;
  const wp = Number(p?.wholesalePrice || fallbackSnapshot?.wholesalePrice);
  if (!isNaN(wp) && wp > 0 && wp < 100000) return wp;
  const op = Number(p?.offerPrice || fallbackSnapshot?.offerPrice);
  if (!isNaN(op) && op > 0 && op < 100000) return Math.round(op * 0.72);
  const rp = Number(p?.originalPrice || fallbackSnapshot?.originalPrice);
  if (!isNaN(rp) && rp > 0 && rp < 100000) return Math.round(rp * 0.65);
  return 100;
}

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

  // Selected Products for Quotation (Map of id -> { customPrice: number | null, qty: number, snapshot: object | null })
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

  // Grouping Mode: 'brand' (Brand -> Category) | 'category' (Category -> Brand)
  const [groupByMode, setGroupByMode] = useState("brand");

  // Per-Brand Profit % Overrides: { [brandName]: number }
  const [brandProfitOverrides, setBrandProfitOverrides] = useState({});

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

  // Apply Profit Percentage to All Selected Products (Auto Price Set)
  const handleApplyProfitPercent = (pct) => {
    const rawPct = parseFloat(pct);
    const newPct = Math.min(500, Math.max(0, isNaN(rawPct) ? 0 : rawPct));
    setProfitPercent(newPct);

    // Auto update prices: reset customPrice to null so each item dynamically uses buyPrice + newPct%
    setSelectedProductMap((prev) => {
      const next = {};
      Object.entries(prev).forEach(([id, entry]) => {
        next[id] = {
          ...entry,
          customPrice: null, // null ensures it recomputes automatically
        };
      });
      return next;
    });
  };

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

  // Selected Products List (Works with both active products and saved quote items)
  const selectedProductList = useMemo(() => {
    const prodMap = new Map();
    products.forEach((p) => {
      if (p) {
        prodMap.set(String(p._id || p.id), p);
        if (p.name) prodMap.set(p.name.toLowerCase().trim(), p);
      }
    });

    const list = [];
    Object.entries(selectedProductMap).forEach(([id, entry]) => {
      if (!entry) return;
      const matchedProd =
        prodMap.get(String(id)) ||
        prodMap.get(String(entry.snapshot?.name || "").toLowerCase().trim());
      const p = matchedProd || entry.snapshot || {};

      const rawBrand =
        (p.brand && typeof p.brand === "object" ? p.brand?.name : p.brand) ||
        p.brandName ||
        entry.snapshot?.brandName ||
        "Other Brands";
      const brandName = String(rawBrand).trim() || "Other Brands";

      // Effective Profit %: check if there is a brand-specific override, otherwise use central profitPercent
      const brandOverride = brandProfitOverrides[brandName];
      const rawProfitPct =
        brandOverride !== undefined && brandOverride !== null && brandOverride !== ""
          ? Number(brandOverride)
          : Number(profitPercent || 0);
      const effectiveProfitPct = Math.min(500, Math.max(0, isNaN(rawProfitPct) ? 0 : rawProfitPct));

      const buyPrice = getProductBaseCost(p, entry.snapshot);
      const defaultWholesale = Math.round(buyPrice * (1 + effectiveProfitPct / 100));

      let finalWholesale = defaultWholesale;
      if (entry.customPrice !== undefined && entry.customPrice !== null && entry.customPrice !== "") {
        const parsedCustom = Number(entry.customPrice);
        // Safety guard: reject absurd custom price (> 100,000) e.g. accidental phone number or barcode autofill
        if (!isNaN(parsedCustom) && parsedCustom >= 0 && parsedCustom <= 100000) {
          finalWholesale = Math.round(parsedCustom);
        }
      }

      const qty = Math.min(10000, Math.max(1, parseInt(entry.qty) || 1));
      let origPrice =
        Number(p.originalPrice) ||
        Number(entry.snapshot?.originalPrice) ||
        Number(p.offerPrice) ||
        (buyPrice > 0 ? Math.round(buyPrice * 1.5) : 0);
      if (isNaN(origPrice) || origPrice <= 0 || origPrice > 200000) {
        origPrice = buyPrice > 0 ? Math.round(buyPrice * 1.4) : 100;
      }

      const discountPct =
        origPrice > finalWholesale ? Math.round(((origPrice - finalWholesale) / origPrice) * 100) : 0;

      const lineTotal = Math.round(finalWholesale * qty);
      const lineMarket = Math.round(origPrice * qty);
      const lineCost = Math.round(buyPrice * qty);

      list.push({
        ...p,
        _id: p._id || id,
        id: p._id || id,
        name: p.name || entry.snapshot?.name || "Product Item",
        brandName,
        categoryName:
          (p.category && typeof p.category === "object" ? p.category?.name : p.category) ||
          p.categoryName ||
          entry.snapshot?.categoryName ||
          "",
        image: p.image || entry.snapshot?.image || "",
        purchasePrice: buyPrice,
        quantity: qty,
        wholesalePrice: finalWholesale,
        calculatedDefaultPrice: defaultWholesale,
        customPrice: entry.customPrice ?? null,
        discountPct,
        origPrice,
        lineTotal,
        lineMarket,
        lineCost,
        stockQuantity: p.stockQuantity ?? entry.snapshot?.stockQuantity ?? 0,
        inStock: p.inStock ?? entry.snapshot?.inStock ?? true,
      });
    });

    return list;
  }, [products, selectedProductMap, profitPercent, brandProfitOverrides]);

  // Hierarchical Grouping of Selected Products (Brand -> Category or Category -> Brand)
  const hierarchicalSelected = useMemo(() => {
    return buildHierarchicalGroups(selectedProductList, groupByMode);
  }, [selectedProductList, groupByMode]);

  // Brand-Wise Grouping of Selected Products (compatibility)
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
    const markupPct =
      totalCost > 0 ? Math.round((totalProfitEst / totalCost) * 100) : Number(profitPercent || 0);
    const marginPct =
      totalWholesale > 0 ? Math.round((totalProfitEst / totalWholesale) * 100) : profitPercent;

    return {
      totalSelected,
      totalQty,
      totalWholesale,
      totalMarket,
      totalSavings,
      totalCost,
      totalProfitEst,
      avgDiscount,
      markupPct,
      marginPct,
    };
  }, [selectedProductList, profitPercent]);

  // Toggle single product selection
  const toggleSelect = (product) => {
    const id = String(product._id || product.id);
    setSelectedProductMap((prev) => {
      const next = { ...prev };
      if (next[id] !== undefined) {
        delete next[id];
      } else {
        // default 1 piece, null customPrice (auto calculates with profitPercent)
        next[id] = { customPrice: null, qty: 1, snapshot: product };
      }
      return next;
    });
  };

  // Update Quantity for an item
  const handleQtyChange = (id, newQty) => {
    const strId = String(id);
    const parsed = parseInt(newQty) || 1;
    const qty = Math.min(10000, Math.max(1, parsed));
    setSelectedProductMap((prev) => ({
      ...prev,
      [strId]: {
        ...(prev[strId] || { customPrice: null }),
        qty,
      },
    }));
  };

  // Quick increment Qty (+6, +12, +24)
  const handleQuickAddQty = (id, delta) => {
    const strId = String(id);
    setSelectedProductMap((prev) => {
      const cur = prev[strId]?.qty || 1;
      const nextQty = Math.min(10000, Math.max(1, cur + delta));
      return {
        ...prev,
        [strId]: {
          ...(prev[strId] || { customPrice: null }),
          qty: nextQty,
        },
      };
    });
  };

  // Update custom wholesale price for a specific product
  const handleCustomPriceChange = (id, newPrice, productSnapshot = null) => {
    const strId = String(id);
    if (newPrice === "" || newPrice === null || newPrice === undefined) {
      setSelectedProductMap((prev) => ({
        ...prev,
        [strId]: {
          ...(prev[strId] || { qty: 1, snapshot: productSnapshot }),
          customPrice: null,
        },
      }));
      return;
    }

    const parsed = parseFloat(newPrice);
    if (isNaN(parsed) || parsed < 0) return;

    // Safety guard: max price 100,000 to prevent accidental barcode/phone autofill (e.g. 140000000000)
    const safePrice = Math.min(100000, Math.round(parsed));

    setSelectedProductMap((prev) => ({
      ...prev,
      [strId]: {
        ...(prev[strId] || { qty: 1, snapshot: productSnapshot }),
        customPrice: safePrice,
      },
    }));
  };

  // Reset a specific product's price back to auto-calculated price
  const handleResetToAutoPrice = (id) => {
    const strId = String(id);
    setSelectedProductMap((prev) => ({
      ...prev,
      [strId]: {
        ...(prev[strId] || { qty: 1 }),
        customPrice: null,
      },
    }));
  };

  // Set custom profit % for a specific brand
  const handleSetBrandProfit = (brandName, pct) => {
    if (!brandName) return;
    const raw = parseFloat(pct);
    const safePct = pct === "" ? null : Math.min(500, Math.max(0, isNaN(raw) ? 0 : raw));
    setBrandProfitOverrides((prev) => ({
      ...prev,
      [brandName]: safePct,
    }));
  };

  // Reset a brand's profit % back to default central profit
  const handleResetBrandProfit = (brandName) => {
    setBrandProfitOverrides((prev) => {
      const next = { ...prev };
      delete next[brandName];
      return next;
    });
  };

  // Select all filtered products
  const handleSelectAllFiltered = () => {
    setSelectedProductMap((prev) => {
      const next = { ...prev };
      filteredProducts.forEach((p) => {
        const id = String(p._id || p.id);
        if (next[id] === undefined) {
          next[id] = { customPrice: null, qty: 1, snapshot: p };
        }
      });
      return next;
    });
    setActiveSubTab("selected");
  };

  // Select all products of a specific Brand
  const handleSelectAllByBrand = (targetBrand) => {
    if (!targetBrand || targetBrand === "all") return;
    const cleanBrand = String(targetBrand).toLowerCase().trim();
    setSelectedProductMap((prev) => {
      const next = { ...prev };
      products.forEach((p) => {
        const bName = String((p.brand && typeof p.brand === "object" ? p.brand.name : p.brand) || p.brandName || "").toLowerCase().trim();
        const bId = String((p.brand && typeof p.brand === "object" ? p.brand._id : p.brand) || "").toLowerCase().trim();
        if (bName === cleanBrand || bId === cleanBrand) {
          const id = String(p._id || p.id);
          if (next[id] === undefined) {
            next[id] = { customPrice: null, qty: 1, snapshot: p };
          }
        }
      });
      return next;
    });
  };

  // Select all products of a specific Category
  const handleSelectAllByCategory = (targetCategory) => {
    if (!targetCategory || targetCategory === "all") return;
    const cleanCat = String(targetCategory).toLowerCase().trim();
    setSelectedProductMap((prev) => {
      const next = { ...prev };
      products.forEach((p) => {
        const cName = String((p.category && typeof p.category === "object" ? p.category.name : p.category) || p.categoryName || "").toLowerCase().trim();
        const cId = String((p.category && typeof p.category === "object" ? p.category._id : p.category) || "").toLowerCase().trim();
        if (cName === cleanCat || cId === cleanCat) {
          const id = String(p._id || p.id);
          if (next[id] === undefined) {
            next[id] = { customPrice: null, qty: 1, snapshot: p };
          }
        }
      });
      return next;
    });
  };

  // Select all products of BOTH Brand & Category
  const handleSelectAllByBrandAndCategory = (targetBrand, targetCategory) => {
    const cleanBrand = targetBrand && targetBrand !== "all" ? String(targetBrand).toLowerCase().trim() : null;
    const cleanCat = targetCategory && targetCategory !== "all" ? String(targetCategory).toLowerCase().trim() : null;

    setSelectedProductMap((prev) => {
      const next = { ...prev };
      products.forEach((p) => {
        const bName = String((p.brand && typeof p.brand === "object" ? p.brand.name : p.brand) || p.brandName || "").toLowerCase().trim();
        const bId = String((p.brand && typeof p.brand === "object" ? p.brand._id : p.brand) || "").toLowerCase().trim();
        const cName = String((p.category && typeof p.category === "object" ? p.category.name : p.category) || p.categoryName || "").toLowerCase().trim();
        const cId = String((p.category && typeof p.category === "object" ? p.category._id : p.category) || "").toLowerCase().trim();

        const matchBrand = !cleanBrand || bName === cleanBrand || bId === cleanBrand;
        const matchCat = !cleanCat || cName === cleanCat || cId === cleanCat;

        if (matchBrand && matchCat) {
          const id = String(p._id || p.id);
          if (next[id] === undefined) {
            next[id] = { customPrice: null, qty: 1, snapshot: p };
          }
        }
      });
      return next;
    });
  };

  // Remove all products in a specific group from the selection
  const handleRemoveGroupItems = (itemsToRemove) => {
    if (!Array.isArray(itemsToRemove) || itemsToRemove.length === 0) return;
    setSelectedProductMap((prev) => {
      const next = { ...prev };
      itemsToRemove.forEach((it) => {
        const id = String(it._id || it.id || it.productId);
        delete next[id];
      });
      return next;
    });
  };

  // Clear all selections
  const handleClearAll = () => {
    setSelectedProductMap({});
    setBrandProfitOverrides({});
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
        brandProfitOverrides,
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

      // Refresh saved list
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
  const handleDownloadPdf = async (
    customItems = null,
    customClient = null,
    quoteNum = null,
    customGroupBy = null,
    groupLabel = null
  ) => {
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

    const targetGroup = customGroupBy || groupByMode;
    setIsGeneratingPdf(true);
    setPdfMessage(
      groupLabel
        ? `"${groupLabel}" এর প্রোডাক্ট সাজানো হচ্ছে...`
        : targetGroup === "brand"
        ? "ব্র্যান্ড ➔ ক্যাটাগরি অনুযায়ী ছবি ও ইনভয়েস টেবিল সাজানো হচ্ছে..."
        : "ক্যাটাগরি ➔ ব্র্যান্ড অনুযায়ী ছবি ও ইনভয়েস টেবিল সাজানো হচ্ছে..."
    );

    try {
      await generateWholesalePdf({
        items: listToPrint,
        clientInfo: infoToPrint,
        profitPercent,
        quoteNumber: quoteNum || currentQuoteNumber,
        groupBy: targetGroup,
        groupLabel,
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
    if (
      !confirm(
        "আপনি কি নিশ্চিত এই কোটেশনটি অফিসিয়াল অর্ডারে কনভার্ট করতে চান? এটি ইনভেন্টরি থেকে স্টক কমিয়ে দেবে!"
      )
    ) {
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
    const savedProfit = Number(q.profitPercent) || 5;
    setProfitPercent(savedProfit);
    setBrandProfitOverrides(q.brandProfitOverrides || {});
    setCurrentQuoteId(q._id);
    setCurrentQuoteNumber(q.quoteNumber);

    const map = {};
    (q.items || []).forEach((it) => {
      const id = String(it.productId || it._id || it.name);
      // Keep price as null if it matches the formula so changing profit% dynamically recalculates it!
      const buyPrice = Number(it.purchasePrice) || 0;
      const calculatedExpected = Math.round(buyPrice * (1 + savedProfit / 100));
      const rawWs = Number(it.wholesalePrice);
      const safeWs = !isNaN(rawWs) && rawWs >= 0 && rawWs <= 100000 ? Math.round(rawWs) : calculatedExpected;
      const wasCustom = buyPrice > 0 && safeWs !== calculatedExpected;

      map[id] = {
        customPrice: wasCustom ? safeWs : null,
        qty: Math.min(10000, Math.max(1, parseInt(it.quantity) || 1)),
        snapshot: it,
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
    const targetQuoteNumber = isSaved
      ? q.quoteNumber
      : currentQuoteNumber || `WS-${Date.now().toString().slice(-6)}`;
    const targetClient = isSaved ? q.clientInfo?.clientName : clientName.trim() || "Wholesale Partner";
    const targetPhone = isSaved ? q.clientInfo?.clientPhone : clientPhone.trim();
    const targetItems = isSaved ? q.items : selectedProductList;
    const targetTotal = isSaved ? q.totalWholesaleSum : summaryStats.totalWholesale;
    const targetQty = isSaved ? q.totalQty : summaryStats.totalQty;
    const targetSavings = isSaved ? q.totalSavings : summaryStats.totalSavings;

    const domain =
      typeof window !== "undefined" ? window.location.origin : "https://www.liorabeautyandwear.com";
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
    const waUrl = cleanPhone
      ? `https://wa.me/88${cleanPhone.replace(/^88/, "")}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;
    window.open(waUrl, "_blank");
  };

  const profitPresets = [3, 5, 8, 10, 12, 15, 20];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Top Banner & Title with LIVE PROFIT CONTROLS */}
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
            কেনার দামের ওপর নির্দিষ্ট % লাভ ধরে মুহূর্তেই পাইকারি কোটেশন ও ইনভয়েস রেডি করুন।
            পিস সংখ্যা (Pcs) ও লাইন টোটাল সহ ব্র্যান্ড অনুযায়ী আকর্ষণীয় অফিসিয়াল বিলিং ইনভয়েস PDF ডাউনলোড বা সেভ করুন।
          </p>
        </div>

        {/* Global Profit Margin Control in Header (Auto-calculates for all products!) */}
        <div
          style={{
            background: "rgba(255, 255, 255, 0.08)",
            border: "1.5px solid rgba(244, 114, 182, 0.4)",
            padding: "14px 20px",
            borderRadius: "14px",
            display: "flex",
            alignItems: "center",
            gap: "16px",
            backdropFilter: "blur(8px)",
            boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
          }}
        >
          <div>
            <div style={{ fontSize: "11px", color: "#f472b6", fontWeight: "800", textTransform: "uppercase" }}>
              📈 কেন্দ্রীয় ডিফল্ট লাভ (% PROFIT)
            </div>
            {Object.keys(brandProfitOverrides).length > 0 && (
              <div style={{ fontSize: "10px", color: "#fca5a5", fontWeight: "800", marginTop: "2px" }}>
                ⭐ {Object.keys(brandProfitOverrides).length} টি ব্র্যান্ডে কাস্টম লাভ সক্রিয়
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px" }}>
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={profitPercent}
                onChange={(e) => handleApplyProfitPercent(e.target.value)}
                title="লাভের পার্সেন্টেজ লিখলে সাথে সাথে সব প্রোডাক্টের দাম আপডেট হবে"
                style={{
                  width: "74px",
                  padding: "6px 8px",
                  borderRadius: "8px",
                  border: "2.5px solid #e11d48",
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

          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            <span style={{ fontSize: "10.5px", color: "#cbd5e1", fontWeight: "700" }}>
              ⚡ দ্রুত সিলেক্ট (অটো প্রাইস আপডেট):
            </span>
            <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", maxWidth: "180px" }}>
              {profitPresets.map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => handleApplyProfitPercent(pct)}
                  title={`${pct}% লাভে সব প্রোডাক্টের রেট অটো সেট করুন`}
                  style={{
                    padding: "4px 7px",
                    borderRadius: "6px",
                    border: profitPercent === pct ? "1.5px solid #ffffff" : "1px solid rgba(255, 255, 255, 0.2)",
                    cursor: "pointer",
                    fontSize: "11px",
                    fontWeight: "900",
                    background: profitPercent === pct ? "#e11d48" : "rgba(255, 255, 255, 0.12)",
                    color: "#ffffff",
                    transition: "all 0.15s ease",
                    transform: profitPercent === pct ? "scale(1.05)" : "scale(1)",
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
                গ্রুপ: {hierarchicalSelected.length} টি ({groupByMode === "brand" ? "ব্র্যান্ড ➔ ক্যাটাগরি" : "ক্যাটাগরি ➔ ব্র্যান্ড"})
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
                ✨ অ্যাডমিন নিট প্রফিট (+{summaryStats.markupPct}%)
              </div>
              <div style={{ fontSize: "22px", fontWeight: "900", color: "#2563eb", marginTop: "4px" }}>
                ৳{summaryStats.totalProfitEst.toLocaleString()}
              </div>
              <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
                কেনার খরচ: ৳{summaryStats.totalCost.toLocaleString()} (মার্জিন: {summaryStats.marginPct}%)
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
                  <span style={{ background: "#e0f2fe", color: "#0369a1", padding: "2px 8px", borderRadius: "6px", fontSize: "12px", fontWeight: "800" }}>
                    ইনভয়েস #{currentQuoteNumber} (এডিট মোড)
                  </span>
                )}
              </div>
              {currentQuoteNumber && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  style={{
                    background: "#f1f5f9",
                    border: "1px solid #cbd5e1",
                    color: "#475569",
                    padding: "4px 10px",
                    borderRadius: "6px",
                    fontSize: "11px",
                    fontWeight: "700",
                    cursor: "pointer",
                  }}
                >
                  + নতুন কোটেশন তৈরি করুন
                </button>
              )}
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
                    onClick={() => handleApplyProfitPercent(profitPercent)}
                    title="সকল প্রোডাক্টে বর্তমান লাভের % অনুযায়ী রেট রি-ক্যালকুলেট করুন"
                    style={{
                      padding: "8px 14px",
                      borderRadius: "8px",
                      border: "1.5px solid #2563eb",
                      background: "#eff6ff",
                      color: "#1d4ed8",
                      fontWeight: "800",
                      fontSize: "12px",
                      cursor: "pointer",
                    }}
                  >
                    ⚡ অটো প্রাইস রিফ্রেশ (+{profitPercent}%)
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
                  {isGeneratingPdf ? "⏳ PDF তৈরি হচ্ছে..." : `📥 PDF বিল ডাউনলোড (${groupByMode === "brand" ? "ব্র্যান্ড ➔ ক্যাটাগরি" : "ক্যাটাগরি ➔ ব্র্যান্ড"})`}
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

            {/* Quick Batch Selection Ribbon (Select All for Brand, Category, Filtered) */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "8px",
                paddingTop: "10px",
                borderTop: "1px dashed #e2e8f0",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "12px", fontWeight: "800", color: "#475569" }}>
                  ⚡ এক ক্লিকে সিলেক্ট করুন:
                </span>

                {/* 1. Select All Filtered */}
                <button
                  type="button"
                  onClick={handleSelectAllFiltered}
                  disabled={filteredProducts.length === 0}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "7px",
                    border: "1.5px solid #0f172a",
                    background: "#0f172a",
                    color: "#ffffff",
                    fontSize: "12px",
                    fontWeight: "800",
                    cursor: filteredProducts.length === 0 ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                  }}
                  title="ফিল্টারের সব প্রোডাক্ট ইনভয়েসে যোগ করুন"
                >
                  <span>✓ ফিল্টারের সব প্রোডাক্ট ({filteredProducts.length})</span>
                </button>

                {/* 2. Select All by Brand (if brand selected) */}
                {selectedBrand !== "all" && (() => {
                  const bObj = brands.find((b) => (b._id || b.name) === selectedBrand);
                  const bName = bObj ? bObj.name : selectedBrand;
                  return (
                    <button
                      type="button"
                      onClick={() => handleSelectAllByBrand(bName)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "7px",
                        border: "1.5px solid #2563eb",
                        background: "#eff6ff",
                        color: "#1d4ed8",
                        fontSize: "12px",
                        fontWeight: "800",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                      }}
                      title={`"${bName}" ব্র্যান্ডের সব প্রোডাক্ট একসাথে সিলেক্ট করুন`}
                    >
                      <span>🏷️ {bName} এর সব প্রোডাক্ট</span>
                    </button>
                  );
                })()}

                {/* 3. Select All by Category (if category selected) */}
                {selectedCategory !== "all" && (() => {
                  const cObj = categories.find((c) => (c._id || c.name) === selectedCategory);
                  const cName = cObj ? cObj.name : selectedCategory;
                  return (
                    <button
                      type="button"
                      onClick={() => handleSelectAllByCategory(selectedCategory)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "7px",
                        border: "1.5px solid #7c3aed",
                        background: "#f5f3ff",
                        color: "#6d28d9",
                        fontSize: "12px",
                        fontWeight: "800",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                      }}
                      title={`"${cName}" ক্যাটাগরির সব প্রোডাক্ট একসাথে সিলেক্ট করুন`}
                    >
                      <span>📂 {cName} এর সব প্রোডাক্ট</span>
                    </button>
                  );
                })()}

                {/* 4. Select All by BOTH Brand & Category */}
                {selectedBrand !== "all" && selectedCategory !== "all" && (() => {
                  const bObj = brands.find((b) => (b._id || b.name) === selectedBrand);
                  const bName = bObj ? bObj.name : selectedBrand;
                  const cObj = categories.find((c) => (c._id || c.name) === selectedCategory);
                  const cName = cObj ? cObj.name : selectedCategory;
                  return (
                    <button
                      type="button"
                      onClick={() => handleSelectAllByBrandAndCategory(selectedBrand, selectedCategory)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "7px",
                        border: "1.5px solid #e11d48",
                        background: "#fff1f2",
                        color: "#be123c",
                        fontSize: "12px",
                        fontWeight: "800",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                      }}
                      title={`"${bName}" এর "${cName}" ক্যাটাগরির সব প্রোডাক্ট সিলেক্ট করুন`}
                    >
                      <span>🎯 {bName} ➔ {cName} এর সব</span>
                    </button>
                  );
                })()}
              </div>

              {/* Clear All Button */}
              {summaryStats.totalSelected > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "7px",
                    border: "1px solid #fca5a5",
                    background: "#fff1f2",
                    color: "#dc2626",
                    fontSize: "11.5px",
                    fontWeight: "800",
                    cursor: "pointer",
                  }}
                  title="ইনভয়েস থেকে সব প্রোডাক্ট বাদ দিন"
                >
                  ✕ সব ক্লিয়ার ({summaryStats.totalSelected})
                </button>
              )}
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
                      <th style={{ padding: "10px", borderBottom: "1px solid #e2e8f0", color: "#334155", width: "50px", textAlign: "center" }}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
                          <input
                            type="checkbox"
                            checked={
                              filteredProducts.length > 0 &&
                              filteredProducts.every((p) => selectedProductMap[String(p._id || p.id)] !== undefined)
                            }
                            onChange={() => {
                              const areAllSelected =
                                filteredProducts.length > 0 &&
                                filteredProducts.every((p) => selectedProductMap[String(p._id || p.id)] !== undefined);
                              if (areAllSelected) {
                                setSelectedProductMap((prev) => {
                                  const next = { ...prev };
                                  filteredProducts.forEach((p) => {
                                    delete next[String(p._id || p.id)];
                                  });
                                  return next;
                                });
                              } else {
                                handleSelectAllFiltered();
                              }
                            }}
                            title="ফিল্টারের সব প্রোডাক্ট এক ক্লিকে সিলেক্ট / আনসিলেক্ট করুন"
                            style={{ width: "17px", height: "17px", cursor: "pointer", accentColor: "#e11d48" }}
                          />
                          <span style={{ fontSize: "10px", fontWeight: "800", color: "#64748b" }}>সব</span>
                        </div>
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
                        const id = String(p._id || p.id);
                        const isSelected = selectedProductMap[id] !== undefined;
                        const buyPrice = getProductBaseCost(p);
                        const origPrice =
                          Number(p.originalPrice) || Number(p.offerPrice) || (buyPrice > 0 ? Math.round(buyPrice * 1.5) : 0);
                        const rawBrand = (p.brand && typeof p.brand === "object" ? p.brand?.name : p.brand) || p.brandName || "";
                        const brandName = String(rawBrand).trim();
                        const brandOverride = brandProfitOverrides[brandName];
                        const effectiveProfitPct =
                          brandOverride !== undefined && brandOverride !== null && brandOverride !== ""
                            ? Number(brandOverride)
                            : Number(profitPercent || 0);
                        const defaultWholesale = Math.round(buyPrice * (1 + effectiveProfitPct / 100));
                        const customVal = selectedProductMap[id]?.customPrice;
                        const isCustom = customVal !== undefined && customVal !== null && customVal !== "";
                        const finalWholesale = isCustom ? Number(customVal) : defaultWholesale;
                        const discountPct =
                          origPrice > finalWholesale ? Math.round(((origPrice - finalWholesale) / origPrice) * 100) : 0;
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
                            <td style={{ padding: "8px 10px", textAlign: "right", whiteSpace: "nowrap" }}>
                              {isSelected ? (
                                <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-end", gap: "2px" }}>
                                  <div style={{ display: "inline-flex", alignItems: "center", gap: "3px" }}>
                                    <span style={{ fontWeight: "800", color: "#e11d48", fontSize: "12px" }}>৳</span>
                                    <input
                                      type="number"
                                      min="0"
                                      max="100000"
                                      autoComplete="off"
                                      value={finalWholesale}
                                      onChange={(e) => handleCustomPriceChange(id, e.target.value, p)}
                                      title="কাস্টম পাইকারি রেট লিখুন (অটো আপডেট হবে)"
                                      style={{
                                        width: "74px",
                                        padding: "4px 6px",
                                        borderRadius: "6px",
                                        border: isCustom ? "2px solid #e11d48" : "1.5px solid #cbd5e1",
                                        background: isCustom ? "#fff1f2" : "#ffffff",
                                        color: "#0f172a",
                                        fontWeight: "800",
                                        textAlign: "right",
                                        fontSize: "13px",
                                        outline: "none",
                                      }}
                                    />
                                    {isCustom && (
                                      <button
                                        type="button"
                                        onClick={() => handleResetToAutoPrice(id)}
                                        title="অটো রেটে ফিরিয়ে নিন"
                                        style={{
                                          border: "none",
                                          background: "none",
                                          cursor: "pointer",
                                          fontSize: "12px",
                                          color: "#2563eb",
                                          padding: "0 2px",
                                        }}
                                      >
                                        ↺
                                      </button>
                                    )}
                                  </div>
                                  {brandOverride !== undefined && brandOverride !== null && brandOverride !== "" && !isCustom && (
                                    <span style={{ fontSize: "9.5px", color: "#e11d48", fontWeight: "800" }}>
                                      ব্র্যান্ড +{effectiveProfitPct}%
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-end" }}>
                                  <span style={{ fontWeight: "900", color: "#e11d48", fontSize: "14px" }}>
                                    ৳{finalWholesale.toLocaleString()}
                                  </span>
                                  {brandOverride !== undefined && brandOverride !== null && brandOverride !== "" && (
                                    <span style={{ fontSize: "9.5px", color: "#e11d48", fontWeight: "800" }}>
                                      ব্র্যান্ড +{effectiveProfitPct}%
                                    </span>
                                  )}
                                </div>
                              )}
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
                              <div style={{ display: "flex", flexDirection: "column", gap: "4px", alignItems: "center" }}>
                                <button
                                  type="button"
                                  onClick={() => toggleSelect(p)}
                                  style={{
                                    width: "100%",
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
                                {brandName && (
                                  <button
                                    type="button"
                                    onClick={() => handleSelectAllByBrand(brandName)}
                                    title={`"${brandName}" ব্র্যান্ডের সব প্রোডাক্ট সিলেক্ট করুন`}
                                    style={{
                                      border: "none",
                                      background: "none",
                                      color: "#475569",
                                      fontSize: "10.5px",
                                      fontWeight: "700",
                                      cursor: "pointer",
                                      textDecoration: "underline",
                                      padding: "1px 4px",
                                    }}
                                  >
                                    + {brandName} এর সব
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
          )}

          {/* VIEW B: HIERARCHICAL BILLING INVOICE EDITOR (Brand -> Cat OR Cat -> Brand) */}
          {activeSubTab === "selected" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Grouping Mode Switcher */}
              <div
                style={{
                  background: "#ffffff",
                  padding: "14px 18px",
                  borderRadius: "12px",
                  border: "1.5px solid #e2e8f0",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "10px",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
                }}
              >
                <div>
                  <div style={{ fontSize: "13.5px", fontWeight: "900", color: "#0f172a" }}>
                    🔄 ইনভয়েস প্রোডাক্ট বিন্যাস (Grouping Mode)
                  </div>
                  <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                    {groupByMode === "brand"
                      ? "🏷️ ব্র্যান্ড ➔ ক্যাটাগরি: প্রথমে ব্র্যান্ডের নাম, তার নিচে ক্যাটাগরি অনুযায়ী প্রডাক্ট আলাদা হবে।"
                      : "📁 ক্যাটাগরি ➔ ব্র্যান্ড: প্রথমে ক্যাটাগরি (যেমন: শ্যাম্পু), তার নিচে বিভিন্ন ব্র্যান্ড আলাদা হবে।"}
                  </div>
                </div>

                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={() => setGroupByMode("brand")}
                    style={{
                      padding: "8px 16px",
                      borderRadius: "8px",
                      border: groupByMode === "brand" ? "2px solid #e11d48" : "1.5px solid #cbd5e1",
                      background: groupByMode === "brand" ? "#fff1f2" : "#ffffff",
                      color: groupByMode === "brand" ? "#e11d48" : "#475569",
                      fontWeight: "800",
                      fontSize: "12.5px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      boxShadow: groupByMode === "brand" ? "0 2px 8px rgba(225, 29, 72, 0.15)" : "none",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <span>🏷️ ব্র্যান্ড ➔ ক্যাটাগরি</span>
                    {groupByMode === "brand" && (
                      <span style={{ fontSize: "10px", background: "#e11d48", color: "#fff", padding: "1px 6px", borderRadius: "10px" }}>
                        Active
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setGroupByMode("category")}
                    style={{
                      padding: "8px 16px",
                      borderRadius: "8px",
                      border: groupByMode === "category" ? "2px solid #0f172a" : "1.5px solid #cbd5e1",
                      background: groupByMode === "category" ? "#0f172a" : "#ffffff",
                      color: groupByMode === "category" ? "#ffffff" : "#475569",
                      fontWeight: "800",
                      fontSize: "12.5px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      boxShadow: groupByMode === "category" ? "0 2px 8px rgba(15, 23, 42, 0.15)" : "none",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <span>📁 ক্যাটাগরি ➔ ব্র্যান্ড</span>
                    {groupByMode === "category" && (
                      <span style={{ fontSize: "10px", background: "#e11d48", color: "#fff", padding: "1px 6px", borderRadius: "10px" }}>
                        Active
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {hierarchicalSelected.length === 0 ? (
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
                    &ldquo;সব প্রোডাক্ট ক্যাটালগ&rdquo; ট্যাব থেকে প্রয়োজনীয় প্রোডাক্ট সিলেক্ট করুন অথবা ফিল্টারের সব প্রোডাক্ট এক ক্লিকে যোগ করুন।
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
                hierarchicalSelected.map((pGroup) => (
                  <div
                    key={pGroup.primaryName}
                    style={{
                      background: "#ffffff",
                      borderRadius: "14px",
                      border: "1px solid #cbd5e1",
                      overflow: "hidden",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                    }}
                  >
                    {/* Primary Banner Header */}
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
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "18px" }}>
                          {groupByMode === "brand" ? "🏷️" : "📁"}
                        </span>
                        <div>
                          <span style={{ fontSize: "15px", fontWeight: "900", color: "#f8fafc", letterSpacing: "0.5px" }}>
                            {groupByMode === "brand" ? "BRAND: " : "CATEGORY: "}
                            {pGroup.primaryName.toUpperCase()}
                          </span>
                          <span style={{ marginLeft: "10px", fontSize: "12px", color: "#94a3b8" }}>
                            ({pGroup.items.length} টি আইটেম)
                          </span>
                        </div>

                        {/* When Brand mode: Allow overriding this brand's profit % */}
                        {groupByMode === "brand" && (
                          <div
                            style={{
                              marginLeft: "8px",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px",
                              background:
                                brandProfitOverrides[pGroup.primaryName] !== undefined
                                  ? "rgba(225, 29, 72, 0.3)"
                                  : "rgba(255, 255, 255, 0.12)",
                              padding: "3px 10px",
                              borderRadius: "8px",
                              border:
                                brandProfitOverrides[pGroup.primaryName] !== undefined
                                  ? "1.5px solid #f43f5e"
                                  : "1px solid rgba(255, 255, 255, 0.2)",
                            }}
                            title={`"${pGroup.primaryName}" এর জন্য বিশেষ লাভ %। ফাঁকা রাখলে কেন্দ্রীয় লাভ (${profitPercent}%) কার্যকর থাকবে।`}
                          >
                            <span style={{ fontSize: "11.5px", color: "#f1f5f9", fontWeight: "700" }}>
                              📈 লাভ:
                            </span>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.5"
                              placeholder={String(profitPercent)}
                              value={
                                brandProfitOverrides[pGroup.primaryName] !== undefined &&
                                brandProfitOverrides[pGroup.primaryName] !== null
                                  ? brandProfitOverrides[pGroup.primaryName]
                                  : ""
                              }
                              onChange={(e) => handleSetBrandProfit(pGroup.primaryName, e.target.value)}
                              style={{
                                width: "48px",
                                padding: "2px 4px",
                                borderRadius: "4px",
                                border: "1px solid #ffffff",
                                background: "#ffffff",
                                color: "#0f172a",
                                fontWeight: "900",
                                fontSize: "12px",
                                textAlign: "center",
                                outline: "none",
                              }}
                            />
                            <span style={{ fontSize: "12px", color: "#ffffff", fontWeight: "800" }}>%</span>
                            {brandProfitOverrides[pGroup.primaryName] !== undefined && (
                              <button
                                type="button"
                                onClick={() => handleResetBrandProfit(pGroup.primaryName)}
                                title="কেন্দ্রীয় লাভে রিসেট করুন"
                                style={{
                                  border: "none",
                                  background: "#fee2e2",
                                  color: "#dc2626",
                                  cursor: "pointer",
                                  fontSize: "10px",
                                  padding: "2px 6px",
                                  borderRadius: "4px",
                                  fontWeight: "800",
                                }}
                              >
                                রিসেট
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "12.5px", flexWrap: "wrap" }}>
                        <span style={{ color: "#cbd5e1" }}>
                          মোট পিস: <strong style={{ color: "#ffffff", fontSize: "14px" }}>{pGroup.totalQty} Pcs</strong>
                        </span>
                        <span style={{ color: "#cbd5e1" }}>
                          সাবটোটাল:{" "}
                          <strong style={{ color: "#f43f5e", fontSize: "15px" }}>
                            ৳{pGroup.subtotal.toLocaleString()}
                          </strong>
                        </span>

                        {/* Individual PDF Download for this Brand or Category */}
                        <button
                          type="button"
                          onClick={() =>
                            handleDownloadPdf(
                              pGroup.items,
                              null,
                              `${currentQuoteNumber || "WS"}-${pGroup.primaryName}`,
                              groupByMode,
                              pGroup.primaryName
                            )
                          }
                          disabled={isGeneratingPdf}
                          style={{
                            padding: "6px 14px",
                            borderRadius: "7px",
                            border: "none",
                            background: "linear-gradient(135deg, #e11d48 0%, #be123c 100%)",
                            color: "#ffffff",
                            fontWeight: "800",
                            fontSize: "12px",
                            cursor: isGeneratingPdf ? "not-allowed" : "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "5px",
                            boxShadow: "0 2px 8px rgba(225, 29, 72, 0.4)",
                          }}
                          title={`শুধুমাত্র "${pGroup.primaryName}" এর জন্য আলাদা PDF বিল ডাউনলোড করুন`}
                        >
                          <span>📥 {groupByMode === "brand" ? "এই ব্র্যান্ডের PDF" : "এই ক্যাটাগরির PDF"}</span>
                        </button>

                        {/* Remove Group Button */}
                        <button
                          type="button"
                          onClick={() => handleRemoveGroupItems(pGroup.items)}
                          style={{
                            padding: "6px 10px",
                            borderRadius: "7px",
                            border: "1px solid rgba(239, 68, 68, 0.4)",
                            background: "rgba(239, 68, 68, 0.2)",
                            color: "#fca5a5",
                            fontSize: "11.5px",
                            fontWeight: "700",
                            cursor: "pointer",
                          }}
                          title="এই গ্রুপের সকল পণ্য ইনভয়েস থেকে বাদ দিন"
                        >
                          ✕ সব বাদ
                        </button>
                      </div>
                    </div>

                    {/* Secondary Sub-groups */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px", padding: "12px" }}>
                      {pGroup.secondaryGroups.map((sGroup) => (
                        <div
                          key={sGroup.secondaryName}
                          style={{
                            borderRadius: "10px",
                            border: "1px solid #e2e8f0",
                            overflow: "hidden",
                          }}
                        >
                          {/* Secondary Sub-header Bar */}
                          <div
                            style={{
                              background: "#f8fafc",
                              padding: "8px 14px",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              flexWrap: "wrap",
                              gap: "6px",
                              borderLeft: "4px solid #e11d48",
                              borderBottom: "1px solid #e2e8f0",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                              <div style={{ fontSize: "12.5px", fontWeight: "800", color: "#1e293b" }}>
                                {groupByMode === "brand" ? "📁 ক্যাটাগরি: " : "🏷️ ব্র্যান্ড: "}
                                <span style={{ color: "#0f172a" }}>{sGroup.secondaryName}</span>
                              </div>

                              {/* If Category mode: Secondary is Brand, so allow setting brand profit override right here! */}
                              {groupByMode === "category" && (
                                <div
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "4px",
                                    background:
                                      brandProfitOverrides[sGroup.secondaryName] !== undefined
                                        ? "#fff1f2"
                                        : "#f1f5f9",
                                    padding: "2px 8px",
                                    borderRadius: "6px",
                                    border:
                                      brandProfitOverrides[sGroup.secondaryName] !== undefined
                                        ? "1px solid #f43f5e"
                                        : "1px solid #cbd5e1",
                                    marginLeft: "4px",
                                  }}
                                  title={`"${sGroup.secondaryName}" ব্র্যান্ডের জন্য লাভ %`}
                                >
                                  <span style={{ fontSize: "11px", color: "#475569", fontWeight: "700" }}>
                                    📈 লাভ:
                                  </span>
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.5"
                                    placeholder={String(profitPercent)}
                                    value={
                                      brandProfitOverrides[sGroup.secondaryName] !== undefined &&
                                      brandProfitOverrides[sGroup.secondaryName] !== null
                                        ? brandProfitOverrides[sGroup.secondaryName]
                                        : ""
                                    }
                                    onChange={(e) => handleSetBrandProfit(sGroup.secondaryName, e.target.value)}
                                    style={{
                                      width: "42px",
                                      padding: "1px 4px",
                                      borderRadius: "4px",
                                      border: "1px solid #94a3b8",
                                      background: "#ffffff",
                                      color: "#0f172a",
                                      fontWeight: "800",
                                      fontSize: "11px",
                                      textAlign: "center",
                                      outline: "none",
                                    }}
                                  />
                                  <span style={{ fontSize: "11px", color: "#334155", fontWeight: "700" }}>%</span>
                                  {brandProfitOverrides[sGroup.secondaryName] !== undefined && (
                                    <button
                                      type="button"
                                      onClick={() => handleResetBrandProfit(sGroup.secondaryName)}
                                      title="রিসেট করুন"
                                      style={{
                                        border: "none",
                                        background: "none",
                                        color: "#dc2626",
                                        cursor: "pointer",
                                        fontSize: "11px",
                                        padding: "0 2px",
                                        fontWeight: "800",
                                      }}
                                    >
                                      ✕
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "11.5px", color: "#64748b", fontWeight: "700", flexWrap: "wrap" }}>
                              <span>{sGroup.items.length} আইটেম</span>
                              <span>•</span>
                              <span>{sGroup.totalQty} Pcs</span>
                              <span>•</span>
                              <span style={{ color: "#e11d48", fontWeight: "800" }}>
                                ৳{sGroup.subtotal.toLocaleString()}
                              </span>

                              {/* If Category mode: Secondary is Brand, so allow downloading this brand's PDF directly! */}
                              {groupByMode === "category" && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDownloadPdf(
                                      sGroup.items,
                                      null,
                                      `${currentQuoteNumber || "WS"}-${sGroup.secondaryName}`,
                                      "brand",
                                      sGroup.secondaryName
                                    )
                                  }
                                  disabled={isGeneratingPdf}
                                  style={{
                                    padding: "3px 8px",
                                    borderRadius: "5px",
                                    border: "1px solid #e11d48",
                                    background: "#fff1f2",
                                    color: "#e11d48",
                                    cursor: isGeneratingPdf ? "not-allowed" : "pointer",
                                    fontSize: "10.5px",
                                    fontWeight: "800",
                                  }}
                                  title={`শুধুমাত্র "${sGroup.secondaryName}" এর PDF ডাউনলোড`}
                                >
                                  📥 এই ব্র্যান্ডের PDF
                                </button>
                              )}

                              {/* Remove Subgroup Button */}
                              <button
                                type="button"
                                onClick={() => handleRemoveGroupItems(sGroup.items)}
                                style={{
                                  padding: "3px 8px",
                                  borderRadius: "5px",
                                  border: "1px solid #fecaca",
                                  background: "#fee2e2",
                                  color: "#dc2626",
                                  cursor: "pointer",
                                  fontSize: "10.5px",
                                  fontWeight: "700",
                                }}
                                title="এই সাব-গ্রুপের আইটেমগুলো ইনভয়েস থেকে বাদ দিন"
                              >
                                ✕ সাব-গ্রুপ বাদ
                              </button>
                            </div>
                          </div>

                          {/* Items Table */}
                          <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px", textAlign: "left" }}>
                              <thead style={{ background: "#ffffff", borderBottom: "1px solid #e2e8f0" }}>
                                <tr>
                                  <th style={{ padding: "10px", width: "45px", textAlign: "center", color: "#475569" }}>ছবি</th>
                                  <th style={{ padding: "10px", color: "#475569" }}>প্রোডাক্ট ও সাইজ</th>
                                  <th style={{ padding: "10px", textAlign: "right", color: "#475569", width: "80px" }}>কেনার দাম</th>
                                  <th style={{ padding: "10px", textAlign: "right", color: "#334155", width: "95px", fontWeight: "800" }}>
                                    খুচরা MRP
                                  </th>
                                  <th style={{ padding: "10px", textAlign: "center", color: "#166534", width: "85px", fontWeight: "800" }}>
                                    ছাড় (% OFF)
                                  </th>
                                  <th style={{ padding: "10px", textAlign: "right", color: "#0f172a", width: "135px", fontWeight: "900" }}>
                                    পাইকারি দর (Wholesale)
                                  </th>
                                  <th style={{ padding: "10px", textAlign: "center", color: "#0f172a", width: "155px", fontWeight: "900" }}>
                                    পরিমাণ (Pcs)
                                  </th>
                                  <th style={{ padding: "10px", textAlign: "right", color: "#e11d48", width: "115px", fontWeight: "900" }}>
                                    টোটাল বিল
                                  </th>
                                  <th style={{ padding: "10px", textAlign: "center", color: "#475569", width: "45px" }}>বাদ</th>
                                </tr>
                              </thead>
                              <tbody>
                                {sGroup.items.map((item, iIdx) => {
                                  const id = String(item._id || item.id);
                                  const isStockLow = item.stockQuantity !== undefined && item.stockQuantity < item.quantity;
                                  const isCustom = item.customPrice !== null && item.customPrice !== undefined;

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

                                      {/* Name & Subtitle */}
                                      <td style={{ padding: "8px 10px" }}>
                                        <div style={{ fontWeight: "800", color: "#0f172a", fontSize: "13px" }}>
                                          {item.name}
                                        </div>
                                        <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px", display: "flex", gap: "6px", alignItems: "center" }}>
                                          <span>{groupByMode === "brand" ? item.categoryName : item.brandName}</span>
                                          <span style={{ color: isStockLow ? "#dc2626" : "#16a34a", fontWeight: "700" }}>
                                            • বর্তমান স্টক: {item.stockQuantity ?? "অজানা"}
                                          </span>
                                          {isStockLow && (
                                            <span style={{ background: "#fee2e2", color: "#dc2626", padding: "1px 6px", borderRadius: "4px", fontSize: "10px", fontWeight: "800" }}>
                                              ⚠️ স্টক কম!
                                            </span>
                                          )}
                                        </div>
                                      </td>

                                      {/* Purchase Cost */}
                                      <td style={{ padding: "8px 10px", textAlign: "right", color: "#64748b", fontWeight: "600" }}>
                                        ৳{Number(item.purchasePrice || 0).toLocaleString()}
                                      </td>

                                      {/* Retail MRP — NO STRIKETHROUGH */}
                                      <td style={{ padding: "8px 10px", textAlign: "right" }}>
                                        <span
                                          style={{
                                            fontWeight: "800",
                                            color: "#334155",
                                            background: "#f1f5f9",
                                            padding: "3px 8px",
                                            borderRadius: "6px",
                                            border: "1px solid #e2e8f0",
                                            fontSize: "12px",
                                            display: "inline-block",
                                          }}
                                          title="খুচরা মার্কেট বিক্রয় মূল্য (MRP)"
                                        >
                                          ৳{item.origPrice.toLocaleString()}
                                        </span>
                                      </td>

                                      {/* Discount % badge */}
                                      <td style={{ padding: "8px 10px", textAlign: "center" }}>
                                        <span
                                          style={{
                                            background: "#dcfce7",
                                            color: "#15803d",
                                            border: "1px solid #86efac",
                                            padding: "2px 7px",
                                            borderRadius: "6px",
                                            fontWeight: "900",
                                            fontSize: "11px",
                                            display: "inline-block",
                                          }}
                                        >
                                          {item.discountPct}% OFF
                                        </span>
                                      </td>

                                      {/* Wholesale Rate (Editable with Auto Price Sync) */}
                                      <td style={{ padding: "8px 10px", textAlign: "right", whiteSpace: "nowrap" }}>
                                        <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-end", gap: "2px" }}>
                                          <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                            <span style={{ fontWeight: "800", color: "#e11d48", fontSize: "12px" }}>৳</span>
                                            <input
                                              type="number"
                                              min="0"
                                              max="100000"
                                              autoComplete="off"
                                              value={item.wholesalePrice}
                                              onChange={(e) => handleCustomPriceChange(id, e.target.value)}
                                              title="কাস্টম রেট লিখুন অথবা উপরে % চেঞ্জ করলে অটো আপডেট হবে"
                                              style={{
                                                width: "74px",
                                                padding: "4px 6px",
                                                borderRadius: "6px",
                                                border: isCustom ? "2px solid #e11d48" : "1.5px solid #cbd5e1",
                                                background: isCustom ? "#fff1f2" : "#ffffff",
                                                color: "#0f172a",
                                                fontWeight: "800",
                                                textAlign: "right",
                                                fontSize: "13px",
                                                outline: "none",
                                              }}
                                            />
                                            {isCustom && (
                                              <button
                                                type="button"
                                                onClick={() => handleResetToAutoPrice(id)}
                                                title="অটো রেটে ফিরিয়ে নিন"
                                                style={{
                                                  border: "none",
                                                  background: "none",
                                                  cursor: "pointer",
                                                  fontSize: "12px",
                                                  color: "#2563eb",
                                                  padding: "0 2px",
                                                }}
                                              >
                                                ↺
                                              </button>
                                            )}
                                          </div>
                                          {item.isBrandOverridden && !isCustom && (
                                            <span style={{ fontSize: "9.5px", color: "#e11d48", fontWeight: "800" }}>
                                              ব্র্যান্ড +{item.effectiveProfitPct}%
                                            </span>
                                          )}
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
                                              max="10000"
                                              autoComplete="off"
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

                                          {/* Quick Increment Presets: +3, +6, +12, +24 */}
                                          <div style={{ display: "flex", gap: "3px" }}>
                                            <button
                                              type="button"
                                              onClick={() => handleQuickAddQty(id, 3)}
                                              style={quickQtyBtnStyle}
                                              title="৩ পিস (সর্বনিম্ন MOQ) যোগ করুন"
                                            >
                                              +3
                                            </button>
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

                                      {/* Line Total */}
                                      <td style={{ padding: "8px 10px", textAlign: "right", whiteSpace: "nowrap" }}>
                                        <div style={{ fontWeight: "900", color: "#e11d48", fontSize: "14px" }}>
                                          ৳{item.lineTotal.toLocaleString()}
                                        </div>
                                        <div style={{ fontSize: "10.5px", color: "#64748b" }}>
                                          ({item.quantity} × ৳{item.wholesalePrice})
                                        </div>
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
                      ))}
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
