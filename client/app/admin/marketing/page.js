"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { API_BASE_URL } from "@/lib/api";
import { removeStudioBackgroundClient } from "@/lib/clientCutout";

export default function AdminMarketingPage() {
  const [brands, setBrands] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState("");
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [activeProduct, setActiveProduct] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [selectedTheme, setSelectedTheme] = useState("teal");
  
  // Batch State
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchResult, setBatchResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Facebook Integration State
  const [fbConfig, setFbConfig] = useState({ fbPageId: "1213659151838727", hasToken: false, tokenMasked: "" });
  const [inputToken, setInputToken] = useState("");
  const [savingToken, setSavingToken] = useState(false);
  const [tokenSavedMsg, setTokenSavedMsg] = useState("");
  const [publishingSingle, setPublishingSingle] = useState(false);
  const [singlePostSuccess, setSinglePostSuccess] = useState(null);

  // Auto-Pilot State
  const [autoPilotInterval, setAutoPilotInterval] = useState(15);
  const [autoPilotStatus, setAutoPilotStatus] = useState(null);
  const [autoPilotLoading, setAutoPilotLoading] = useState(false);

  // 1. Fetch available brands & FB config on mount
  useEffect(() => {
    async function loadInitialData() {
      try {
        const [brandsRes, fbRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/marketing/brands`),
          fetch(`${API_BASE_URL}/api/marketing/fb-config`)
        ]);
        const brandsJson = await brandsRes.json();
        const fbJson = await fbRes.json();

        if (brandsJson.success && brandsJson.brands) {
          setBrands(brandsJson.brands);
          if (brandsJson.brands.length > 0) {
            const hasReady = brandsJson.brands.find((b) => b._id === "instock_ready");
            setSelectedBrand(hasReady ? "instock_ready" : brandsJson.brands[0]._id);
          }
        }

        if (fbJson.success) {
          setFbConfig(fbJson);
        }
      } catch (err) {
        console.error("Failed to load initial data:", err);
      }
    }
    loadInitialData();
  }, []);

  // Poll Auto-Pilot status every 8 seconds
  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await fetch(`${API_BASE_URL}/api/marketing/autopilot-status`);
        const json = await res.json();
        if (json.success) {
          setAutoPilotStatus(json.status);
        }
      } catch (e) {
        // silent
      }
    }
    checkStatus();
    const interval = setInterval(checkStatus, 8000);
    return () => clearInterval(interval);
  }, []);

  // 2. Load products when brand changes
  useEffect(() => {
    if (!selectedBrand) return;
    async function loadBrandProducts() {
      setLoadingProducts(true);
      setErrorMsg("");
      setBatchResult(null);
      setSinglePostSuccess(null);
      try {
        const res = await fetch(`${API_BASE_URL}/api/marketing/products?brandId=${selectedBrand}`);
        const json = await res.json();
        if (json.success) {
          setProducts(json.products || []);
          if (json.products && json.products.length > 0) {
            loadProductPreview(json.products[0]._id);
          } else {
            setActiveProduct(null);
            setPreviewData(null);
          }
        }
      } catch (err) {
        setErrorMsg("Failed to load products for selected brand.");
      } finally {
        setLoadingProducts(false);
      }
    }
    loadBrandProducts();
  }, [selectedBrand]);

  // 3. Load Preview for a single product
  async function loadProductPreview(productId, theme = null) {
    setActiveProduct(productId);
    setPreviewLoading(true);
    setCopied(false);
    setSinglePostSuccess(null);
    try {
      const url = `${API_BASE_URL}/api/marketing/preview/${productId}${theme ? `?theme=${theme}` : ''}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setPreviewData(json);
        if (!theme) {
          setSelectedTheme(json.theme || "teal");
        }
      } else {
        setErrorMsg(json.error || "Failed to load product preview.");
      }
    } catch (err) {
      console.error("Preview failed:", err);
      setErrorMsg("Network error loading product preview.");
    } finally {
      setPreviewLoading(false);
    }
  }

  // 4. Save Page Access Token
  async function handleSaveFbToken() {
    if (!inputToken.trim()) return;
    setSavingToken(true);
    setTokenSavedMsg("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/marketing/fb-config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fbPageId: fbConfig.fbPageId || "1213659151838727",
          fbPageAccessToken: inputToken.trim()
        })
      });
      const json = await res.json();
      if (json.success) {
        setTokenSavedMsg(`✅ Connected as "${json.pageName}"!`);
        setFbConfig(prev => ({ ...prev, hasToken: true, tokenMasked: `${inputToken.slice(0, 10)}...` }));
        setInputToken("");
      }
    } catch (err) {
      setTokenSavedMsg("❌ Failed to save token.");
    } finally {
      setSavingToken(false);
    }
  }

  // 5. Publish Single Product to Facebook Page
  async function handlePublishSingle() {
    if (!activeProduct || !previewData) return;
    setPublishingSingle(true);
    setSinglePostSuccess(null);
    setErrorMsg("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/marketing/publish-single`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: activeProduct,
          customCaption: previewData.caption,
          theme: selectedTheme
        })
      });
      const json = await res.json();
      if (json.success) {
        setSinglePostSuccess(json.fbResult);
      } else {
        setErrorMsg(json.error || "Failed to publish post to Facebook.");
      }
    } catch (err) {
      setErrorMsg(err.message || "Failed to post to Facebook.");
    } finally {
      setPublishingSingle(false);
    }
  }

  // 6. Start Auto-Pilot Scheduler
  async function handleStartAutoPilot() {
    if (!selectedBrand) return;
    setAutoPilotLoading(true);
    setErrorMsg("");
    try {
      const currentBrandObj = brands.find((b) => b._id === selectedBrand);
      const res = await fetch(`${API_BASE_URL}/api/marketing/start-autopilot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandId: selectedBrand,
          brandName: currentBrandObj?.name,
          intervalMinutes: Number(autoPilotInterval) || 15,
          limit: 100
        })
      });
      const json = await res.json();
      if (json.success) {
        setAutoPilotStatus(json.initialStatus);
      } else {
        setErrorMsg(json.error || "Failed to start auto-pilot.");
      }
    } catch (err) {
      setErrorMsg(err.message || "Auto-pilot start failed.");
    } finally {
      setAutoPilotLoading(false);
    }
  }

  // 7. Stop Auto-Pilot Scheduler
  async function handleStopAutoPilot() {
    try {
      await fetch(`${API_BASE_URL}/api/marketing/stop-autopilot`, { method: "POST" });
      setAutoPilotStatus(prev => ({ ...prev, isRunning: false, nextPostTime: null }));
    } catch (e) {
      // silent
    }
  }

  // 8. Batch generate all banners for current brand (ZIP)
  async function handleBatchGenerate() {
    if (!selectedBrand) return;
    setBatchLoading(true);
    setErrorMsg("");
    try {
      const currentBrandObj = brands.find((b) => b._id === selectedBrand);
      const res = await fetch(`${API_BASE_URL}/api/marketing/batch-generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandId: selectedBrand,
          brandName: currentBrandObj ? currentBrandObj.name : "brand",
          limit: 100,
        }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setBatchResult(json.data);
      } else {
        setErrorMsg(json.error || "Batch generation failed");
      }
    } catch (err) {
      setErrorMsg(err.message || "Failed to generate batch promotions");
    } finally {
      setBatchLoading(false);
    }
  }

  const handleCopyCaption = () => {
    if (!previewData?.caption) return;
    navigator.clipboard.writeText(previewData.caption);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const selectedBrandObj = brands.find((b) => b._id === selectedBrand);

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0f172a", color: "#f8fafc", fontFamily: "system-ui, sans-serif" }}>
      {/* Top Bar Navigation */}
      <div style={{ padding: "16px 24px", borderBottom: "1px solid #1e293b", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#0b1120" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Link href="/admin" style={{ color: "#94a3b8", textDecoration: "none", fontSize: "14px", fontWeight: "600", padding: "6px 12px", borderRadius: "6px", background: "#1e293b" }}>
            ← Back to Admin
          </Link>
          <h1 style={{ fontSize: "20px", fontWeight: "800", color: "#ffffff", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
            <span>⚡</span> Facebook Auto Promotion & Live Poster
          </h1>
        </div>

        {/* Facebook Connection Status Badge */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "13px", color: fbConfig.hasToken ? "#34d399" : "#f59e0b", background: fbConfig.hasToken ? "rgba(16,185,129,0.12)" : "rgba(245,158,11,0.12)", padding: "6px 14px", borderRadius: "20px", border: `1px solid ${fbConfig.hasToken ? "rgba(16,185,129,0.3)" : "rgba(245,158,11,0.3)"}`, fontWeight: "700" }}>
            {fbConfig.hasToken ? "🟢 Page Connected (Liora Beauty & Wear)" : "⚪ Token Not Connected"}
          </span>
        </div>
      </div>

      <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "24px" }}>
        {/* Token Configuration Drawer (Collapsible) */}
        <div style={{ background: "#141e33", padding: "16px 20px", borderRadius: "12px", border: "1px solid #243452", marginBottom: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ fontSize: "18px" }}>🔑</span>
              <div>
                <strong style={{ fontSize: "14px", color: "#ffffff" }}>Facebook Page Configuration:</strong>
                <span style={{ fontSize: "13px", color: "#94a3b8", marginLeft: "8px" }}>
                  Page ID: <code style={{ color: "#38bdf8" }}>{fbConfig.fbPageId}</code>
                </span>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <input
                type="password"
                placeholder={fbConfig.hasToken ? "Update Page Access Token..." : "Paste Page Access Token here..."}
                value={inputToken}
                onChange={(e) => setInputToken(e.target.value)}
                style={{ background: "#0f172a", border: "1px solid #334155", color: "#ffffff", padding: "8px 14px", borderRadius: "6px", fontSize: "13px", minWidth: "280px", outline: "none" }}
              />
              <button
                onClick={handleSaveFbToken}
                disabled={savingToken || !inputToken.trim()}
                style={{ background: "#0284c7", color: "#ffffff", border: "none", padding: "8px 16px", borderRadius: "6px", fontSize: "13px", fontWeight: "700", cursor: "pointer" }}
              >
                {savingToken ? "Verifying..." : "Save & Verify"}
              </button>
              {tokenSavedMsg && <span style={{ fontSize: "13px", color: "#34d399", fontWeight: "700" }}>{tokenSavedMsg}</span>}
            </div>
          </div>
        </div>

        {/* Live Auto-Pilot Banner (When Active) */}
        {autoPilotStatus?.isRunning && (
          <div style={{ background: "linear-gradient(135deg, #064e3b, #022c22)", border: "1px solid #10b981", borderRadius: "14px", padding: "20px", marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px", boxShadow: "0 8px 24px rgba(16,185,129,0.2)" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#34d399", display: "inline-block", boxShadow: "0 0 10px #34d399" }} />
                <h3 style={{ margin: 0, color: "#ffffff", fontSize: "17px", fontWeight: "900" }}>
                  AUTO-PILOT ACTIVE: Posting Brand "{autoPilotStatus.brandName}" to Facebook
                </h3>
              </div>
              <p style={{ margin: 0, fontSize: "13.5px", color: "#a7f3d0" }}>
                Progress: <strong>{autoPilotStatus.postedCount}</strong> posted of <strong>{autoPilotStatus.totalProducts}</strong> total |
                Interval: <strong>Every {autoPilotStatus.intervalMinutes} mins</strong> |
                {autoPilotStatus.nextPostTime && ` Next Post: ${new Date(autoPilotStatus.nextPostTime).toLocaleTimeString()}`}
              </p>
            </div>
            <button
              onClick={handleStopAutoPilot}
              style={{ background: "#ef4444", color: "#ffffff", border: "none", padding: "10px 20px", borderRadius: "8px", fontWeight: "800", fontSize: "14px", cursor: "pointer", boxShadow: "0 4px 14px rgba(239, 68, 68, 0.4)" }}
            >
              ⏹️ Stop Auto-Pilot
            </button>
          </div>
        )}

        {/* Brand Selector & Automation Controls Bar */}
        <div style={{ background: "#1e293b", padding: "20px", borderRadius: "14px", border: "1px solid #334155", marginBottom: "24px", display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", textTransform: "uppercase", fontWeight: "700", color: "#94a3b8", marginBottom: "6px" }}>
                Select Brand to Promote
              </label>
              <select
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                style={{ background: "#0f172a", color: "#ffffff", border: "1px solid #475569", padding: "10px 16px", borderRadius: "8px", fontSize: "15px", fontWeight: "700", minWidth: "240px", cursor: "pointer", outline: "none" }}
              >
                {brands.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.name} ({b.productCount} Products)
                  </option>
                ))}
              </select>
            </div>

            <div style={{ alignSelf: "flex-end" }}>
              <span style={{ fontSize: "14px", color: "#cbd5e1" }}>
                Found: <strong style={{ color: "#38bdf8" }}>{products.length}</strong> items in <strong>{selectedBrandObj?.name}</strong>
              </span>
            </div>
          </div>

          <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
            {/* Auto-Pilot Interval Picker */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#0f172a", padding: "6px 12px", borderRadius: "8px", border: "1px solid #334155" }}>
              <span style={{ fontSize: "12px", color: "#94a3b8", fontWeight: "700" }}>Interval:</span>
              <select
                value={autoPilotInterval}
                onChange={(e) => setAutoPilotInterval(e.target.value)}
                style={{ background: "transparent", border: "none", color: "#38bdf8", fontWeight: "800", fontSize: "13px", cursor: "pointer", outline: "none" }}
              >
                <option value={10}>Every 10 mins</option>
                <option value={15}>Every 15 mins</option>
                <option value={20}>Every 20 mins</option>
                <option value={30}>Every 30 mins</option>
                <option value={60}>Every 1 hour</option>
              </select>
            </div>

            {/* Start Auto-Pilot Button */}
            <button
              onClick={handleStartAutoPilot}
              disabled={autoPilotLoading || autoPilotStatus?.isRunning || products.length === 0}
              style={{
                background: "linear-gradient(135deg, #10b981, #059669)",
                color: "#ffffff",
                border: "none",
                padding: "12px 20px",
                borderRadius: "8px",
                fontWeight: "800",
                fontSize: "14px",
                cursor: autoPilotLoading || autoPilotStatus?.isRunning ? "not-allowed" : "pointer",
                boxShadow: "0 4px 14px rgba(16, 185, 129, 0.4)",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}
            >
              {autoPilotLoading ? "Starting..." : "🚀 Start FB Auto-Pilot"}
            </button>

            {/* Generate ZIP Bundle Button */}
            <button
              onClick={handleBatchGenerate}
              disabled={batchLoading || products.length === 0}
              style={{
                background: "linear-gradient(135deg, #e11d48, #be123c)",
                color: "#ffffff",
                border: "none",
                padding: "12px 20px",
                borderRadius: "8px",
                fontWeight: "800",
                fontSize: "14px",
                cursor: batchLoading || products.length === 0 ? "not-allowed" : "pointer",
                boxShadow: "0 4px 14px rgba(225, 29, 72, 0.4)",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}
            >
              {batchLoading ? "⏳ Generating..." : `📦 Download ZIP (${products.length})`}
            </button>
          </div>
        </div>

        {/* Batch Results Banner */}
        {batchResult && (
          <div style={{ background: "rgba(16, 185, 129, 0.15)", border: "1px solid #10b981", borderRadius: "12px", padding: "18px 24px", marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "14px" }}>
            <div>
              <h3 style={{ margin: "0 0 6px 0", color: "#34d399", fontSize: "17px", fontWeight: "800" }}>
                ✅ Batch Created Successfully! ({batchResult.successful} of {batchResult.totalProducts} products generated)
              </h3>
              <p style={{ margin: 0, fontSize: "13.5px", color: "#cbd5e1" }}>
                All HD Shajgoj banners and ready-to-use Facebook captions have been compiled into a single ZIP archive.
              </p>
            </div>
            <div style={{ display: "flex", gap: "12px" }}>
              {batchResult.zipBase64 ? (
                <button
                  type="button"
                  onClick={() => {
                    const byteCharacters = atob(batchResult.zipBase64);
                    const byteNumbers = new Array(byteCharacters.length);
                    for (let i = 0; i < byteCharacters.length; i++) {
                      byteNumbers[i] = byteCharacters.charCodeAt(i);
                    }
                    const byteArray = new Uint8Array(byteNumbers);
                    const blob = new Blob([byteArray], { type: "application/zip" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = batchResult.zipFilename || "brand_promotions.zip";
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  }}
                  style={{ background: "#10b981", color: "#ffffff", padding: "10px 20px", borderRadius: "8px", fontWeight: "800", border: "none", cursor: "pointer", boxShadow: "0 4px 12px rgba(16, 185, 129, 0.4)" }}
                >
                  ⬇️ Download Full ZIP Bundle
                </button>
              ) : (
                <a
                  href={`${API_BASE_URL}${batchResult.zipDownloadUrl}`}
                  download
                  style={{ background: "#10b981", color: "#ffffff", padding: "10px 20px", borderRadius: "8px", fontWeight: "800", textDecoration: "none", display: "inline-block", boxShadow: "0 4px 12px rgba(16, 185, 129, 0.4)" }}
                >
                  ⬇️ Download Full ZIP Bundle
                </a>
              )}
              <a
                href={`${API_BASE_URL}${batchResult.summaryTxtUrl}`}
                target="_blank"
                rel="noreferrer"
                style={{ background: "#334155", color: "#ffffff", padding: "10px 18px", borderRadius: "8px", fontWeight: "700", textDecoration: "none", display: "inline-block" }}
              >
                📄 View All Captions (.txt)
              </a>
            </div>
          </div>
        )}

        {/* Single Post Success Banner */}
        {singlePostSuccess && (
          <div style={{ background: "rgba(56, 189, 248, 0.2)", border: "1px solid #38bdf8", borderRadius: "12px", padding: "16px 20px", marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <strong style={{ color: "#38bdf8", fontSize: "15px" }}>🎉 Published Live to Liora Facebook Page!</strong>
              <div style={{ fontSize: "13px", color: "#cbd5e1", marginTop: "2px" }}>Post ID: {singlePostSuccess.postId}</div>
            </div>
            <a
              href={singlePostSuccess.postUrl}
              target="_blank"
              rel="noreferrer"
              style={{ background: "#0284c7", color: "#ffffff", padding: "8px 16px", borderRadius: "6px", textDecoration: "none", fontWeight: "800", fontSize: "13px" }}
            >
              View on Facebook ↗
            </a>
          </div>
        )}

        {errorMsg && (
          <div style={{ background: "rgba(239, 68, 68, 0.2)", border: "1px solid #ef4444", color: "#fca5a5", padding: "12px 18px", borderRadius: "8px", marginBottom: "20px" }}>
            {errorMsg}
          </div>
        )}

        {/* Main 2-Column Work Area */}
        <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: "24px", alignItems: "start" }}>
          {/* Left Column: Product List */}
          <div style={{ background: "#1e293b", borderRadius: "14px", border: "1px solid #334155", overflow: "hidden", maxHeight: "820px", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid #334155", background: "#0b1120" }}>
              <h2 style={{ fontSize: "14px", fontWeight: "800", color: "#94a3b8", textTransform: "uppercase", margin: 0 }}>
                Products in {selectedBrandObj?.name || "Brand"} ({products.length})
              </h2>
            </div>

            <div style={{ overflowY: "auto", padding: "8px" }}>
              {loadingProducts ? (
                <div style={{ padding: "30px", textAlign: "center", color: "#94a3b8" }}>Loading products...</div>
              ) : products.length === 0 ? (
                <div style={{ padding: "30px", textAlign: "center", color: "#94a3b8" }}>No products found for this brand.</div>
              ) : (
                products.map((p) => {
                  const isSelected = activeProduct === p._id;
                  return (
                    <div
                      key={p._id}
                      onClick={() => loadProductPreview(p._id)}
                      style={{
                        padding: "12px",
                        borderRadius: "10px",
                        marginBottom: "6px",
                        cursor: "pointer",
                        background: isSelected ? "rgba(56, 189, 248, 0.15)" : "transparent",
                        border: isSelected ? "1px solid #38bdf8" : "1px solid transparent",
                        display: "flex",
                        gap: "12px",
                        alignItems: "center",
                        transition: "all 0.15s"
                      }}
                    >
                      {p.image ? (
                        <img src={p.image} alt={p.name} style={{ width: "48px", height: "48px", objectFit: "contain", borderRadius: "6px", background: "#0f172a" }} />
                      ) : (
                        <div style={{ width: "48px", height: "48px", background: "#334155", borderRadius: "6px" }} />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "13.5px", fontWeight: "700", color: isSelected ? "#38bdf8" : "#ffffff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {p.name}
                        </div>
                        <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "2px" }}>
                          <span style={{ textDecoration: "line-through" }}>৳{p.originalPrice}</span>{" "}
                          <strong style={{ color: "#34d399" }}>৳{p.offerPrice}</strong>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Live Interactive Preview & FB Studio */}
          <div style={{ background: "#1e293b", borderRadius: "14px", border: "1px solid #334155", padding: "24px" }}>
            {previewLoading ? (
              <div style={{ height: "600px", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "16px" }}>
                <div style={{ width: "48px", height: "48px", border: "4px solid rgba(56, 189, 248, 0.2)", borderTopColor: "#38bdf8", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                <p style={{ color: "#94a3b8", fontSize: "15px" }}>Extracting AI Cutout & Rendering Shajgoj Studio Banner...</p>
                <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
              </div>
            ) : previewData ? (
              <div>
                {/* Product Title & Controls Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px", flexWrap: "wrap", gap: "16px" }}>
                  <div>
                    <span style={{ fontSize: "12px", fontWeight: "800", textTransform: "uppercase", color: "#38bdf8", letterSpacing: "1px" }}>
                      {previewData.product.brand}
                    </span>
                    <h2 style={{ fontSize: "20px", fontWeight: "800", color: "#ffffff", margin: "4px 0 0 0" }}>
                      {previewData.product.name}
                    </h2>
                  </div>

                  {/* Theme Switcher Buttons */}
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <span style={{ fontSize: "12px", color: "#94a3b8", fontWeight: "700" }}>THEME:</span>
                    {[
                      { key: "teal", label: "Ocean Teal", color: "#00b4d8" },
                      { key: "rose", label: "Ruby Rose", color: "#f43f5e" },
                      { key: "emerald", label: "Emerald", color: "#10b981" },
                      { key: "gold", label: "Gold Amber", color: "#f59e0b" },
                      { key: "navy", label: "Midnight Navy", color: "#3b82f6" },
                    ].map((t) => (
                      <button
                        key={t.key}
                        onClick={() => {
                          setSelectedTheme(t.key);
                          loadProductPreview(previewData.product._id, t.key);
                        }}
                        style={{
                          background: selectedTheme === t.key ? t.color : "#0f172a",
                          color: selectedTheme === t.key ? "#ffffff" : "#cbd5e1",
                          border: `1px solid ${selectedTheme === t.key ? t.color : "#475569"}`,
                          padding: "6px 12px",
                          borderRadius: "6px",
                          fontSize: "12px",
                          fontWeight: "700",
                          cursor: "pointer"
                        }}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                  {/* Banner Image Preview Box */}
                  <div>
                    <div style={{ borderRadius: "12px", overflow: "hidden", border: "1px solid #334155", background: "#0b1120", position: "relative" }}>
                      <img src={previewData.bannerBase64} alt="HD Promotional Banner" style={{ width: "100%", height: "auto", display: "block" }} />
                    </div>

                    <div style={{ marginTop: "14px", display: "flex", gap: "10px" }}>
                      <a
                        href={`${API_BASE_URL}/api/marketing/banner-download/${previewData.product._id}?theme=${selectedTheme}`}
                        download
                        style={{
                          flex: 1,
                          textAlign: "center",
                          background: "#0284c7",
                          color: "#ffffff",
                          textDecoration: "none",
                          padding: "12px 14px",
                          borderRadius: "8px",
                          fontWeight: "800",
                          fontSize: "13.5px",
                          boxShadow: "0 4px 12px rgba(2, 132, 199, 0.35)"
                        }}
                      >
                        ⬇️ Download HD Banner (.PNG)
                      </a>

                      <button
                        onClick={handlePublishSingle}
                        disabled={publishingSingle || !fbConfig.hasToken}
                        style={{
                          background: fbConfig.hasToken ? "linear-gradient(135deg, #1877f2, #0d65d9)" : "#475569",
                          color: "#ffffff",
                          border: "none",
                          padding: "12px 16px",
                          borderRadius: "8px",
                          fontWeight: "800",
                          fontSize: "13.5px",
                          cursor: fbConfig.hasToken && !publishingSingle ? "pointer" : "not-allowed",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px"
                        }}
                        title={!fbConfig.hasToken ? "Save Page Token above to enable instant Facebook posting" : "Post live to Facebook"}
                      >
                        {publishingSingle ? "Publishing..." : "🚀 Post to FB Now"}
                      </button>
                    </div>
                  </div>

                  {/* Facebook Ready Caption Box */}
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <label style={{ fontSize: "13px", fontWeight: "800", textTransform: "uppercase", color: "#94a3b8" }}>
                        Facebook Sales Caption:
                      </label>
                      <button
                        onClick={handleCopyCaption}
                        style={{
                          background: copied ? "#10b981" : "#334155",
                          color: "#ffffff",
                          border: "none",
                          padding: "6px 14px",
                          borderRadius: "6px",
                          fontSize: "12px",
                          fontWeight: "700",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px"
                        }}
                      >
                        {copied ? "✓ Copied!" : "📋 Copy Caption"}
                      </button>
                    </div>

                    <textarea
                      value={previewData.caption}
                      onChange={(e) => setPreviewData({ ...previewData, caption: e.target.value })}
                      rows={18}
                      style={{
                        width: "100%",
                        flex: 1,
                        background: "#0f172a",
                        color: "#f1f5f9",
                        border: "1px solid #475569",
                        borderRadius: "10px",
                        padding: "14px",
                        fontSize: "13.5px",
                        lineHeight: "1.6",
                        fontFamily: "inherit",
                        resize: "none",
                        outline: "none"
                      }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ height: "400px", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8" }}>
                Select a product from the left to preview banner and caption.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
