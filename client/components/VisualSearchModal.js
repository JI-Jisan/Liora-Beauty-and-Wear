"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { extractCleanQuery } from "@/lib/beautyVision";

export default function VisualSearchModal({ isOpen, onClose, onSearch }) {
  const router = useRouter();
  const [imagePreview, setImagePreview] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStep, setScanStep] = useState("");
  const [detectedQuery, setDetectedQuery] = useState("");
  const [detectedTags, setDetectedTags] = useState([]);
  const [redirectCount, setRedirectCount] = useState(null);
  const [manualQuery, setManualQuery] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const redirectTimerRef = useRef(null);

  // Reset when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
      setImagePreview(null);
      setIsScanning(false);
      setScanProgress(0);
      setScanStep("");
      setDetectedQuery("");
      setDetectedTags([]);
      setRedirectCount(null);
      setManualQuery("");
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
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Load Tesseract.js dynamically from CDN
  const getTesseract = async () => {
    if (typeof window !== "undefined" && window.Tesseract) {
      return window.Tesseract;
    }
    return new Promise((resolve, reject) => {
      const existing = document.getElementById("tesseract-cdn-script");
      if (existing) {
        if (window.Tesseract) {
          resolve(window.Tesseract);
        } else {
          existing.onload = () => resolve(window.Tesseract);
        }
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

  /**
   * Preprocess image on offscreen HTML5 canvas:
   * 1. Downscales image to max 1000px (10x faster OCR, eliminates mobile memory crash).
   * 2. Detects luminance: if dark packaging (e.g. black mascara tube/box), inverts pixels
   *    so white/silver text on black background becomes crisp black text on white background!
   * 3. Enhances contrast (+40%) to make embossed cosmetic lettering pop.
   */
  const preprocessImageCanvas = (imgElement) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    const maxDim = 1000;
    let width = imgElement.naturalWidth || imgElement.width || 800;
    let height = imgElement.naturalHeight || imgElement.height || 600;

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

    try {
      const imgData = ctx.getImageData(0, 0, width, height);
      const data = imgData.data;

      // Calculate center luminance
      let totalLuminance = 0;
      for (let i = 0; i < data.length; i += 4) {
        totalLuminance += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      }
      const avgLuminance = totalLuminance / (data.length / 4);
      const isDarkBackground = avgLuminance < 125; // Dark tube or packaging

      for (let i = 0; i < data.length; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        let gray = 0.299 * r + 0.587 * g + 0.114 * b;

        // Invert if dark background (crucial for black mascara, dark serum bottles)
        if (isDarkBackground) {
          gray = 255 - gray;
        }

        // Contrast stretch (+45%)
        let contrast = (gray - 128) * 1.45 + 128;
        contrast = Math.max(0, Math.min(255, contrast));

        data[i] = contrast;
        data[i + 1] = contrast;
        data[i + 2] = contrast;
      }

      ctx.putImageData(imgData, 0, 0);
      return canvas.toDataURL("image/jpeg", 0.9);
    } catch (e) {
      console.warn("Canvas pixel processing fallback:", e);
      return canvas.toDataURL("image/jpeg", 0.9);
    }
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
    setScanProgress(10);
    setIsScanning(true);
    setScanStep("Loading photo...");

    // Show instant preview
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result;
      setImagePreview(dataUrl);

      try {
        setScanStep("Optimizing image for fast recognition...");
        setScanProgress(25);

        // Preprocess on hidden Image
        const img = new Image();
        img.src = dataUrl;
        await new Promise((resolve) => {
          img.onload = resolve;
        });

        const preprocessedDataUrl = preprocessImageCanvas(img);

        setScanStep("Scanning cosmetic packaging & brand...");
        setScanProgress(40);

        const tesseract = await getTesseract();
        const ocrResult = await tesseract.recognize(preprocessedDataUrl, "eng", {
          tessedit_pageseg_mode: "11", // Sparse text (best for curved bottles & packaging)
          logger: (m) => {
            if (m.status === "recognizing text") {
              const pct = Math.round((m.progress || 0) * 45) + 40;
              setScanProgress(pct);
              setScanStep(`Reading label: ${pct}%...`);
            }
          },
        });

        const rawText = ocrResult?.data?.text || "";

        // Client-side Beauty Extraction
        const clientParsed = extractCleanQuery(rawText);

        setScanStep("Connecting to LIORA catalog...");
        setScanProgress(90);

        // Query API to find best verified product phrase
        const res = await fetch("/api/visual-search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: rawText }),
        });

        const data = await res.json().catch(() => ({}));

        const finalSearchTerm =
          data.bestQuery || clientParsed.query || rawText.trim().slice(0, 35);

        if (finalSearchTerm && finalSearchTerm.trim().length >= 2) {
          setDetectedQuery(finalSearchTerm);
          setDetectedTags(data.keywords || clientParsed.keywords || [finalSearchTerm]);
          setScanStep(`Found: "${finalSearchTerm}"`);
          setScanProgress(100);
          setIsScanning(false);

          // Direct Navigation to Website Search Page
          triggerDirectNavigation(finalSearchTerm);
        } else {
          setIsScanning(false);
          setScanProgress(100);
          setErrorMsg(
            "Could not clearly read the product brand from this photo. You can type the product name below to search immediately."
          );
        }
      } catch (err) {
        console.error("Visual search error:", err);
        setIsScanning(false);
        setScanProgress(100);
        setErrorMsg("Failed to scan image. Please try another angle or photo.");
      }
    };
    reader.readAsDataURL(imgFile);
  };

  const triggerDirectNavigation = (query) => {
    const clean = query.trim();
    if (!clean) return;

    setRedirectCount(1);
    if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);

    redirectTimerRef.current = setTimeout(() => {
      onClose?.();
      if (typeof onSearch === "function") {
        onSearch(clean);
      } else {
        router.push(`/products?search=${encodeURIComponent(clean)}`);
      }
    }, 700);
  };

  const handleManualSearchSubmit = (e) => {
    e?.preventDefault();
    const query = (manualQuery || detectedQuery).trim();
    if (!query) return;
    if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
    onClose?.();
    if (typeof onSearch === "function") {
      onSearch(query);
    } else {
      router.push(`/products?search=${encodeURIComponent(query)}`);
    }
  };

  const handleQuickSample = (sampleTerm) => {
    if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
    onClose?.();
    if (typeof onSearch === "function") {
      onSearch(sampleTerm);
    } else {
      router.push(`/products?search=${encodeURIComponent(sampleTerm)}`);
    }
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
              <p>Find any cosmetic or skincare in our store by photo</p>
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
              <p>
                Point your camera at any cosmetic tube, bottle, or packaging box to open it directly on the search page!
              </p>

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

              {/* QUICK POPULAR SEARCH CHIPS */}
              <div className="jt-lens-samples-strip">
                <span className="jt-lens-samples-label">Quick search popular items:</span>
                <div className="jt-lens-sample-chips">
                  <button type="button" onClick={() => handleQuickSample("My Skin Saffron Glow Boost Face Wash")}>
                    ✨ My Skin Saffron
                  </button>
                  <button type="button" onClick={() => handleQuickSample("IMAGIC Mascara Giant Brush")}>
                    👁️ IMAGIC Mascara
                  </button>
                  <button type="button" onClick={() => handleQuickSample("Simple Kind to Skin Moisturiser")}>
                    🧴 Simple Moisturiser
                  </button>
                  <button type="button" onClick={() => handleQuickSample("COSRX Snail Mucin Essence")}>
                    🐌 COSRX Snail Mucin
                  </button>
                  <button type="button" onClick={() => handleQuickSample("Technic Mega Glow Highlighter")}>
                    ✨ Technic Highlighter
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
                ) : detectedQuery ? (
                  /* DIRECT REDIRECT BANNER */
                  <div className="jt-lens-redirect-box">
                    <div className="jt-lens-success-icon">✓</div>
                    <div>
                      <h4 className="jt-lens-found-title">Found: &ldquo;{detectedQuery}&rdquo;</h4>
                      <p className="jt-lens-found-sub">Redirecting to full website search results page...</p>
                    </div>
                    <button
                      type="button"
                      className="jt-lens-view-now-btn"
                      onClick={() => handleManualSearchSubmit()}
                    >
                      View Results Now →
                    </button>
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
                        setErrorMsg("");
                      }}
                    >
                      🔄 Retake / Choose Another Photo
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* DETECTED KEYWORDS BADGES */}
          {detectedTags.length > 0 && (
            <div className="jt-lens-tags-strip" style={{ marginTop: "16px" }}>
              <span className="jt-lens-tags-title">Identified:</span>
              <div className="jt-lens-tags-list">
                {detectedTags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="jt-lens-tag-pill clickable"
                    onClick={() => handleQuickSample(tag)}
                    title={`Search for "${tag}"`}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* FALLBACK MANUAL SEARCH INPUT IF UNCLEAR */}
          {(errorMsg || (!isScanning && imagePreview && !detectedQuery)) && (
            <div className="jt-lens-manual-box">
              {errorMsg && (
                <div className="jt-lens-error-box">
                  <span>⚠️</span> {errorMsg}
                </div>
              )}

              <form onSubmit={handleManualSearchSubmit} className="jt-lens-manual-form">
                <input
                  type="text"
                  placeholder="Type product name (e.g. Imagic Mascara)..."
                  value={manualQuery}
                  onChange={(e) => setManualQuery(e.target.value)}
                  className="jt-lens-manual-input"
                  autoFocus
                />
                <button type="submit" className="jt-lens-btn-primary" style={{ padding: "10px 20px" }}>
                  Search Products →
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
