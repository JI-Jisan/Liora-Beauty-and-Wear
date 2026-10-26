"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";

export default function VisualSearchModal({ isOpen, onClose }) {
  const [file, setFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStep, setScanStep] = useState("");
  const [results, setResults] = useState([]);
  const [detectedTags, setDetectedTags] = useState([]);
  const [errorMsg, setErrorMsg] = useState("");
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const { addToCart } = useCart() || {};
  const [addedIds, setAddedIds] = useState(new Set());

  // Reset when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setFile(null);
      setImagePreview(null);
      setIsScanning(false);
      setScanProgress(0);
      setScanStep("");
      setResults([]);
      setDetectedTags([]);
      setErrorMsg("");
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
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Load Tesseract.js dynamically on demand from high-speed CDN
  const getTesseract = async () => {
    if (typeof window !== "undefined" && window.Tesseract) {
      return window.Tesseract;
    }
    return new Promise((resolve, reject) => {
      const existing = document.getElementById("tesseract-cdn-script");
      if (existing) {
        existing.onload = () => resolve(window.Tesseract);
        return;
      }
      const script = document.createElement("script");
      script.id = "tesseract-cdn-script";
      script.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
      script.async = true;
      script.onload = () => resolve(window.Tesseract);
      script.onerror = () => reject(new Error("Failed to load OCR engine"));
      document.head.appendChild(script);
    });
  };

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    processImage(selected);
  };

  const processImage = async (imgFile) => {
    setFile(imgFile);
    setErrorMsg("");
    setResults([]);
    setDetectedTags([]);
    setScanProgress(10);

    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(imgFile);

    setIsScanning(true);
    setScanStep("Initializing Google Lens scanner...");

    try {
      setScanStep("Scanning product bottle & text...");
      const tesseract = await getTesseract();

      const ocrResult = await tesseract.recognize(imgFile, "eng", {
        logger: (m) => {
          if (m.status === "recognizing text") {
            const pct = Math.round((m.progress || 0) * 80) + 10;
            setScanProgress(pct);
            setScanStep(`Reading label text: ${pct}%...`);
          }
        },
      });

      const extractedText = ocrResult?.data?.text || "";

      setScanStep("Matching with 4,131 products in LIORA...");
      setScanProgress(95);

      const res = await fetch("/api/visual-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: extractedText }),
      });

      const data = await res.json();

      if (data.success && data.products && data.products.length > 0) {
        setResults(data.products);
        setDetectedTags(data.detectedTags || []);
        setScanStep("Matches found!");
      } else {
        setErrorMsg(
          data.message ||
            "Could not clearly identify the product name on this packaging. Please try a clearer front photo."
        );
      }
    } catch (err) {
      console.error("Visual search error:", err);
      setErrorMsg("Failed to scan image. Please try again or test a sample.");
    } finally {
      setIsScanning(false);
      setScanProgress(100);
    }
  };

  const handleSampleSearch = async (sampleName) => {
    setIsScanning(true);
    setErrorMsg("");
    setResults([]);
    setDetectedTags([sampleName]);
    setScanStep(`Searching catalog for ${sampleName}...`);

    try {
      const res = await fetch("/api/visual-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: sampleName }),
      });
      const data = await res.json();
      if (data.success && data.products && data.products.length > 0) {
        setResults(data.products);
        setDetectedTags(data.detectedTags || [sampleName]);
      } else {
        setErrorMsg("No products found for this sample.");
      }
    } catch (e) {
      setErrorMsg("Sample search failed.");
    } finally {
      setIsScanning(false);
    }
  };

  const handleAddToCart = (e, prod) => {
    e.preventDefault();
    e.stopPropagation();
    if (!prod.inStock) return;
    addToCart?.(prod, 1);
    setAddedIds((prev) => new Set([...prev, prod._id]));
    setTimeout(() => {
      setAddedIds((prev) => {
        const next = new Set(prev);
        next.delete(prod._id);
        return next;
      });
    }, 2000);
  };

  return (
    <div className="jt-lens-modal-overlay" onClick={onClose}>
      <div className="jt-lens-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* MODAL HEADER */}
        <div className="jt-lens-header">
          <div className="jt-lens-brand-title">
            <span className="jt-lens-icon-gradient">📷</span>
            <div>
              <h3>LIORA Visual Lens</h3>
              <p>Search any cosmetics or skincare by photo</p>
            </div>
          </div>
          <button className="jt-lens-close-btn" onClick={onClose} aria-label="Close Lens">
            ✕
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="jt-lens-body">
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

              <h4>Snap or Upload a Product Photo</h4>
              <p>Point your camera at any cosmetic tube, bottle, or packaging box to find it instantly in LIORA!</p>

              <div className="jt-lens-actions-row">
                <button
                  type="button"
                  className="jt-lens-btn-primary"
                  onClick={() => cameraInputRef.current?.click()}
                >
                  📸 Take Photo
                </button>
                <button
                  type="button"
                  className="jt-lens-btn-secondary"
                  onClick={() => fileInputRef.current?.click()}
                >
                  📁 Choose from Gallery
                </button>
              </div>

              {/* DEMO / SAMPLES FOR QUICK TESTING */}
              <div className="jt-lens-samples-strip">
                <span className="jt-lens-samples-label">Or try a quick demo:</span>
                <div className="jt-lens-sample-chips">
                  <button type="button" onClick={() => handleSampleSearch("My Skin Saffron Glow Boost Face Wash")}>
                    ✨ My Skin Saffron
                  </button>
                  <button type="button" onClick={() => handleSampleSearch("Simple Kind to Skin Moisturiser")}>
                    🧴 Simple Moisturiser
                  </button>
                  <button type="button" onClick={() => handleSampleSearch("COSRX Snail Mucin Essence")}>
                    🐌 COSRX Snail Mucin
                  </button>
                  <button type="button" onClick={() => handleSampleSearch("WishCare Sunscreen SPF 50")}>
                    ☀️ WishCare Sunscreen
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* PREVIEW & SCANNING RETICLE */}
          {imagePreview && (
            <div className="jt-lens-preview-container">
              <div className="jt-lens-image-wrapper">
                <img src={imagePreview} alt="Scanned product" className="jt-lens-scanned-img" />

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
                ) : (
                  <div className="jt-lens-controls-inline">
                    <button
                      type="button"
                      className="jt-lens-retake-btn"
                      onClick={() => {
                        setImagePreview(null);
                        setResults([]);
                        setDetectedTags([]);
                      }}
                    >
                      🔄 Retake / Choose Another Photo
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* DETECTED TAGS PILLS */}
          {detectedTags.length > 0 && (
            <div className="jt-lens-tags-strip">
              <span className="jt-lens-tags-title">Detected Keywords:</span>
              <div className="jt-lens-tags-list">
                {detectedTags.map((tag, idx) => (
                  <span key={idx} className="jt-lens-tag-pill">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ERROR MESSAGE */}
          {errorMsg && (
            <div className="jt-lens-error-box">
              <span>⚠️</span> {errorMsg}
            </div>
          )}

          {/* RESULTS GRID */}
          {results.length > 0 && (
            <div className="jt-lens-results-section">
              <div className="jt-lens-results-header">
                <h4>Matching Products ({results.length})</h4>
              </div>

              <div className="jt-lens-results-grid">
                {results.map((prod) => (
                  <Link
                    key={prod._id}
                    href={`/products/${prod._id}`}
                    className="jt-lens-prod-card"
                    onClick={onClose}
                  >
                    <div className="jt-lens-prod-img-wrap">
                      {prod.image ? (
                        <img
                          src={prod.image}
                          alt={prod.name}
                          className="jt-lens-prod-img"
                          loading="lazy"
                        />
                      ) : (
                        <div className="jt-lens-prod-no-img">🧴</div>
                      )}
                      {prod.discountBadge && (
                        <span className="jt-lens-discount-badge">{prod.discountBadge}</span>
                      )}
                      {!prod.inStock && (
                        <span className="jt-lens-oos-badge">Out of Stock</span>
                      )}
                    </div>

                    <div className="jt-lens-prod-info">
                      {prod.brand && <span className="jt-lens-brand-name">{prod.brand}</span>}
                      <h5 className="jt-lens-prod-title" title={prod.name}>
                        {prod.name}
                      </h5>

                      <div className="jt-lens-pricing-row">
                        <span className="jt-lens-offer-price">৳{prod.offerPrice}</span>
                        {prod.originalPrice > prod.offerPrice && (
                          <span className="jt-lens-original-price">৳{prod.originalPrice}</span>
                        )}
                      </div>

                      <button
                        type="button"
                        className={`jt-lens-add-btn ${addedIds.has(prod._id) ? "added" : ""}`}
                        disabled={!prod.inStock}
                        onClick={(e) => handleAddToCart(e, prod)}
                      >
                        {addedIds.has(prod._id)
                          ? "✓ Added"
                          : prod.inStock
                          ? "Add to Cart"
                          : "Sold Out"}
                      </button>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
