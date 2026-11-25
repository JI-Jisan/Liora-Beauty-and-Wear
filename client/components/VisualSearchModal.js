"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getImageUrl } from "@/lib/api";
import { useCart } from "@/context/CartContext";

export default function VisualSearchModal({ isOpen, onClose, onSearch }) {
  const router = useRouter();
  const { addToCart } = useCart();
  const [imagePreview, setImagePreview] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState("");
  const [detectedQuery, setDetectedQuery] = useState("");
  const [detectedTags, setDetectedTags] = useState([]);
  const [matchedProducts, setMatchedProducts] = useState([]);
  const [manualQuery, setManualQuery] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [addedId, setAddedId] = useState(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const redirectTimerRef = useRef(null);

  // Reset when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
      setImagePreview(null);
      setIsScanning(false);
      setScanStep("");
      setDetectedQuery("");
      setDetectedTags([]);
      setMatchedProducts([]);
      setManualQuery("");
      setErrorMsg("");
      setAddedId(null);
    }
  }, [isOpen]);

  // Lock background scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  /**
   * Ultra-fast client-side canvas compression:
   * Scales high-res phone camera photos (5-10MB) down to max 640px in ~10ms,
   * yielding a crisp ~30-40KB JPEG ready for sub-second recognition.
   * Also runs instant hardware barcode detection in 5ms if supported.
   */
  const compressImageForVisualSearch = async (imgElement) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    const maxDim = 640;
    let width = imgElement.naturalWidth || imgElement.width || 640;
    let height = imgElement.naturalHeight || imgElement.height || 480;

    if (width > maxDim || height > maxDim) {
      if (width > height) {
        height = Math.round((height * maxDim) / width);
        width = maxDim;
      } else {
        width = Math.round((width * maxDim) / height);
        height = maxDim;
      }
    }

    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(imgElement, 0, 0, width, height);

    let barcode = "";
    if (typeof window !== "undefined" && "BarcodeDetector" in window) {
      try {
        const detector = new window.BarcodeDetector({
          formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "qr_code"],
        });
        const barcodes = await detector.detect(canvas);
        if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
          barcode = barcodes[0].rawValue.trim();
        }
      } catch (_) {}
    }

    const dataUrl = canvas.toDataURL("image/jpeg", 0.72);
    return { dataUrl, barcode };
  };

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    processImage(selected);
  };

  const processImage = async (imgFile) => {
    setErrorMsg("");
    setDetectedQuery("");
    setDetectedTags([]);
    setMatchedProducts([]);
    setIsScanning(true);
    setScanStep("পণ্য স্ক্যান করা হচ্ছে...");

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result;
      setImagePreview(dataUrl);

      try {
        const img = new Image();
        img.src = dataUrl;
        await new Promise((resolve) => {
          img.onload = resolve;
        });

        const { dataUrl: compressedDataUrl, barcode } = await compressImageForVisualSearch(img);

        setScanStep("ব্র্যান্ড ও কসমেটিক্স শনাক্ত করা হচ্ছে...");

        const res = await fetch("/api/visual-search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image: compressedDataUrl,
            barcode: barcode || undefined,
          }),
        });

        const data = await res.json().catch(() => ({}));

        if (data.success && data.bestQuery) {
          const finalSearchTerm = data.bestQuery;
          setDetectedQuery(finalSearchTerm);
          setDetectedTags(data.keywords || [finalSearchTerm]);
          setMatchedProducts(Array.isArray(data.products) ? data.products : []);
          setScanStep(`শনাক্ত হয়েছে: "${finalSearchTerm}"`);
          setIsScanning(false);
          // If onSearch is provided, sync the query with parent page so the website is ready in background
          if (typeof onSearch === "function") {
            onSearch(finalSearchTerm);
          }
        } else {
          setIsScanning(false);
          setErrorMsg(
            data.message ||
              "ছবিটি থেকে ব্র্যান্ড বা পণ্যের নাম স্পষ্ট বোঝা যায়নি। নিচে নাম লিখে সার্চ করুন।"
          );
        }
      } catch (err) {
        console.error("Visual search error:", err);
        setIsScanning(false);
        setErrorMsg("স্ক্যান সম্পন্ন হতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।");
      }
    };
    reader.readAsDataURL(imgFile);
  };

  const applySearchAndClose = (query) => {
    const clean = (query || detectedQuery).trim();
    if (clean && typeof onSearch === "function") {
      onSearch(clean);
    }
    onClose?.();
  };

  const navigateToProduct = (productId) => {
    if (!productId) return;
    onClose?.();
    router.push(`/products/${productId}`);
  };

  const handleAddToCartClick = (p, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (typeof addToCart === "function") {
      addToCart(p, 1, p.offerPrice);
      setAddedId(p._id);
      setTimeout(() => setAddedId(null), 1800);
    }
  };

  const handleManualSearchSubmit = (e) => {
    e?.preventDefault();
    const query = (manualQuery || detectedQuery).trim();
    if (!query) return;
    applySearchAndClose(query);
  };

  const handleQuickSample = (sampleTerm) => {
    applySearchAndClose(sampleTerm);
  };

  return (
    <div className="jt-lens-modal-overlay" onClick={onClose}>
      <div className="jt-lens-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "680px", maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
        {/* MODAL HEADER */}
        <div className="jt-lens-header">
          <div className="jt-lens-brand-title">
            <span className="jt-lens-icon-gradient">📷</span>
            <div>
              <h3>LIORA Visual Lens (ক্যামেরা স্ক্যানার)</h3>
              <p>ছবি তুলে বা আপলোড করে সরাসরি ওয়েবসাইটে ফলাফল দেখুন</p>
            </div>
          </div>
          <button className="jt-lens-close-btn" onClick={onClose} aria-label="Close Lens">
            ✕
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="jt-lens-body" style={{ overflowY: "auto", flex: 1, padding: "16px 20px 24px" }}>
          {/* Hidden file inputs */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleFileChange}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: "none" }}
            onChange={handleFileChange}
          />

          {!imagePreview && (
            <div className="jt-lens-upload-box">
              <div className="jt-lens-upload-icon-circle">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
              </div>

              <h4>পণ্য বা প্যাকেজিংয়ের ছবি তুলুন</h4>
              <p>
                যেকোনো ক্রিম, সিরাম, লিপস্টিক বা বোতলের ছবি তুললেই সাথে সাথে আমাদের ওয়েবসাইটে ফলাফল চলে আসবে!
              </p>

              <div className="jt-lens-actions-row">
                <button
                  type="button"
                  className="jt-lens-btn-primary"
                  onClick={() => cameraInputRef.current?.click()}
                >
                  📸 ছবি তুলুন (Camera)
                </button>
                <button
                  type="button"
                  className="jt-lens-btn-secondary"
                  onClick={() => fileInputRef.current?.click()}
                >
                  📁 গ্যালারি থেকে নিন (Gallery)
                </button>
              </div>

              {/* QUICK POPULAR SEARCH CHIPS */}
              <div className="jt-lens-samples-strip">
                <span className="jt-lens-samples-label">জনপ্রিয় পণ্য সরাসরি সার্চ করুন:</span>
                <div className="jt-lens-sample-chips">
                  <button type="button" onClick={() => handleQuickSample("Cetaphil Baby Soothing Moisturising Cream")}>
                    🧴 Cetaphil Cream
                  </button>
                  <button type="button" onClick={() => handleQuickSample("IMAGIC Mascara Giant Brush")}>
                    👁️ IMAGIC Mascara
                  </button>
                  <button type="button" onClick={() => handleQuickSample("COSRX Snail Mucin Essence")}>
                    🐌 COSRX Snail Mucin
                  </button>
                  <button type="button" onClick={() => handleQuickSample("BOB Super Stay Matte Liquid Lipstick")}>
                    💄 BOB Lipstick
                  </button>
                  <button type="button" onClick={() => handleQuickSample("Beauty Glazed")}>
                    ✨ Beauty Glazed
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* PREVIEW & SCANNING RETICLE */}
          {imagePreview && (
            <div className="jt-lens-preview-container" style={{ marginBottom: "16px" }}>
              <div className="jt-lens-image-wrapper" style={{ maxHeight: "200px" }}>
                <img src={imagePreview} alt="Scanned product" className="jt-lens-scanned-img" style={{ maxHeight: "200px" }} />

                {/* Google Lens Animated Reticle */}
                <div className={`jt-lens-reticle ${isScanning ? "scanning" : ""}`}>
                  <div className="corner top-left"></div>
                  <div className="corner top-right"></div>
                  <div className="corner bottom-left"></div>
                  <div className="corner bottom-right"></div>
                  {isScanning && <div className="jt-lens-laser-beam"></div>}
                </div>
              </div>

              <div className="jt-lens-scan-info">
                {isScanning ? (
                  <div className="jt-lens-scanning-indicator">
                    <div className="jt-lens-spinner"></div>
                    <span>{scanStep}</span>
                  </div>
                ) : detectedQuery ? (
                  <div className="jt-lens-redirect-box" style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "14px 18px", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#16a34a", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "700", fontSize: "16px" }}>✓</div>
                      <div>
                        <h4 style={{ margin: "0 0 2px 0", color: "#166534", fontSize: "15px", fontWeight: "700" }}>পণ্য শনাক্ত হয়েছে: &ldquo;{detectedQuery}&rdquo;</h4>
                        <p style={{ margin: 0, color: "#15803d", fontSize: "13px" }}>নিচে পাওয়া প্রোডাক্টগুলো থেকে সরাসরি কার্টে নিন অথবা ওয়েবসাইটে দেখুন</p>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      <button
                        type="button"
                        onClick={() => applySearchAndClose(detectedQuery)}
                        style={{ padding: "8px 16px", background: "#ff4d6d", color: "#fff", border: "none", borderRadius: "20px", fontWeight: "600", fontSize: "13px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}
                      >
                        ওয়েবসাইটে দেখুন →
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setImagePreview(null);
                          setDetectedQuery("");
                          setDetectedTags([]);
                          setMatchedProducts([]);
                          setErrorMsg("");
                        }}
                        style={{ padding: "8px 12px", background: "#f1f5f9", color: "#475569", border: "1px solid #cbd5e1", borderRadius: "20px", fontSize: "13px", cursor: "pointer" }}
                      >
                        🔄 পুনরায় স্ক্যান
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="jt-lens-controls-inline">
                    <button
                      type="button"
                      className="jt-lens-retake-btn"
                      onClick={() => {
                        setImagePreview(null);
                        setDetectedQuery("");
                        setDetectedTags([]);
                        setMatchedProducts([]);
                        setErrorMsg("");
                      }}
                    >
                      🔄 পুনরায় ছবি তুলুন (Retake)
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* INSTANT MATCHED PRODUCTS GRID (Shows directly in modal without taking to another page!) */}
          {matchedProducts.length > 0 && (
            <div style={{ marginTop: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                <span style={{ fontSize: "15px", fontWeight: "700", color: "#1e293b" }}>
                  ম্যাচিং প্রোডাক্ট ({matchedProducts.length}টি পাওয়া গেছে):
                </span>
                <button
                  type="button"
                  onClick={() => applySearchAndClose(detectedQuery)}
                  style={{ background: "none", border: "none", color: "#ff4d6d", fontWeight: "600", fontSize: "13px", cursor: "pointer" }}
                >
                  ওয়েবসাইটের পেজে দেখুন &rarr;
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "12px", maxHeight: "380px", overflowY: "auto", padding: "4px" }}>
                {matchedProducts.slice(0, 8).map((p) => {
                  const imgSrc = getImageUrl(p.image) || "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=200&auto=format&fit=crop&q=80";
                  const isAdded = addedId === p._id;
                  return (
                    <div
                      key={p._id}
                      style={{
                        background: "#fff",
                        border: "1px solid #fecdd3",
                        borderRadius: "14px",
                        padding: "10px",
                        display: "flex",
                        flexDirection: "column",
                        transition: "transform 0.15s ease, box-shadow 0.15s ease",
                        position: "relative",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-2px)";
                        e.currentTarget.style.boxShadow = "0 6px 16px rgba(255, 77, 109, 0.15)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "none";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    >
                      <div
                        onClick={() => navigateToProduct(p._id)}
                        style={{ cursor: "pointer", width: "100%", height: "130px", borderRadius: "10px", overflow: "hidden", background: "#fdf2f4", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "8px" }}
                      >
                        <img
                          src={imgSrc}
                          alt={p.name}
                          style={{ width: "100%", height: "100%", objectFit: "contain" }}
                          onError={(e) => {
                            e.currentTarget.src = "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=200&auto=format&fit=crop&q=80";
                          }}
                        />
                      </div>

                      <div style={{ fontSize: "11px", fontWeight: "700", color: "#e11d48", textTransform: "uppercase", marginBottom: "2px" }}>
                        {p.brand || "Authentic"}
                      </div>

                      <h5
                        onClick={() => navigateToProduct(p._id)}
                        style={{ margin: "0 0 6px 0", fontSize: "13px", fontWeight: "600", color: "#1e293b", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", lineHeight: "1.35", cursor: "pointer" }}
                      >
                        {p.name}
                      </h5>

                      <div style={{ marginTop: "auto", display: "flex", alignItems: "baseline", gap: "6px", marginBottom: "10px" }}>
                        <span style={{ fontSize: "15px", fontWeight: "800", color: "#e11d48" }}>{p.offerPrice} Tk</span>
                        {p.originalPrice > p.offerPrice && (
                          <span style={{ fontSize: "12px", color: "#94a3b8", textDecoration: "line-through" }}>{p.originalPrice} Tk</span>
                        )}
                      </div>

                      {/* DIRECT 1-CLICK ADD TO CART (No page reload!) */}
                      <button
                        type="button"
                        onClick={(e) => handleAddToCartClick(p, e)}
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          borderRadius: "10px",
                          border: "none",
                          background: isAdded ? "#16a34a" : "linear-gradient(135deg, #ff4d6d 0%, #e11d48 100%)",
                          color: "#fff",
                          fontWeight: "700",
                          fontSize: "12px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "6px",
                          transition: "background 0.2s ease",
                        }}
                      >
                        {isAdded ? "✓ কার্টে যোগ হয়েছে!" : "🛒 কার্টে নিন"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* DETECTED KEYWORDS BADGES */}
          {detectedTags.length > 0 && (
            <div className="jt-lens-tags-strip" style={{ marginTop: "14px" }}>
              <span className="jt-lens-tags-title">শনাক্ত ট্যাগ:</span>
              <div className="jt-lens-sample-chips">
                {detectedTags.map((tag, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleQuickSample(tag)}
                    title={`"${tag}" দিয়ে সার্চ করুন`}
                  >
                    🔍 {tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* FALLBACK MANUAL SEARCH INPUT IF UNCLEAR */}
          {(errorMsg || (!isScanning && imagePreview && !detectedQuery)) && (
            <div className="jt-lens-manual-box" style={{ marginTop: "16px" }}>
              {errorMsg && (
                <div className="jt-lens-error-box" style={{ marginBottom: "12px" }}>
                  <span>⚠️</span> {errorMsg}
                </div>
              )}

              <form onSubmit={handleManualSearchSubmit} className="jt-lens-manual-form">
                <input
                  type="text"
                  placeholder="পণ্যের নাম লিখুন (যেমন: Cetaphil, Imagic Mascara)..."
                  value={manualQuery}
                  onChange={(e) => setManualQuery(e.target.value)}
                  className="jt-lens-manual-input"
                  autoFocus
                />
                <button type="submit" className="jt-lens-btn-primary" style={{ padding: "10px 20px" }}>
                  সার্চ করুন →
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
