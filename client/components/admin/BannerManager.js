"use client";

import { useState, useEffect, useRef } from "react";
import { API_BASE_URL, getAuthHeaders, getImageUrl } from "@/lib/api";
import { uploadToCloudinary } from "@/lib/cloudinary";

const PRESET_LINKS = [
  { label: "🛍️ সকল পণ্য", url: "/products" },
  { label: "💄 Swiss Beauty (সুইস বিউটি)", url: "/brand/swiss-beauty" },
  { label: "🌸 K-Beauty (কোরিয়ান গ্লাস স্কিন)", url: "/products?category=K-Beauty" },
  { label: "💇‍♀️ Hair Care (হেয়ার কেয়ার)", url: "/products?category=Hair+Care" },
  { label: "✨ Beauty Glazed মেকআপ", url: "/brand/beauty-glazed" },
  { label: "💧 স্কিনকেয়ার ও সিরাম", url: "/products?category=Serum" },
  { label: "⚡ ফ্ল্যাশ সেল", url: "/flash-sales" },
  { label: "🎁 অফার / ক্লিয়ারেন্স", url: "/clearance" },
  { label: "✨ কোরিয়ান কম্বো", url: "/combo" },
];

export default function BannerManager({ siteSettings, onUpdateSettings }) {
  const [slides, setSlides] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [replacingIndex, setReplacingIndex] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [customUrl, setCustomUrl] = useState("");
  const fileInputRef = useRef(null);
  const replaceInputRef = useRef(null);

  // Helper to sanitize slides and filter out empty ghost slides (no image)
  const sanitizeSlides = (rawList) => {
    if (!Array.isArray(rawList)) return [];
    return rawList
      .filter((s) => s && typeof s.image === "string" && s.image.trim().length > 0)
      .map((s, idx) => ({
        id: s._id || s.id || `slide-${idx}-${Date.now()}`,
        image: s.image.trim(),
        title: s.title || "",
        buttonLink: s.buttonLink || s.link || "/products",
      }));
  };

  // Initialize slides from siteSettings or fetch from API
  useEffect(() => {
    if (siteSettings && Array.isArray(siteSettings.promoSlides)) {
      setSlides(sanitizeSlides(siteSettings.promoSlides));
    } else {
      fetch(`${API_BASE_URL}/api/settings`)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data.promoSlides)) {
            setSlides(sanitizeSlides(data.promoSlides));
          }
        })
        .catch((err) => console.error("Error loading settings:", err));
    }
  }, [siteSettings]);

  // Handle direct file upload from device
  const handleFileUpload = async (file, targetIndex = null) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setMessage({ type: "error", text: "❌ দয়া করে শুধুমাত্র ছবির ফাইল (JPG, PNG, WEBP) নির্বাচন করুন।" });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: "error", text: "❌ ছবির সাইজ ৫MB-র কম হতে হবে।" });
      return;
    }

    setIsUploading(true);
    setMessage({ type: "info", text: "⏳ ক্লাউডিনারিতে ছবি আপলোড হচ্ছে... অনুগ্রহ করে একটু অপেক্ষা করুন।" });

    try {
      const uploadedUrl = await uploadToCloudinary(file);

      if (targetIndex !== null && targetIndex >= 0 && targetIndex < slides.length) {
        // Replacing an existing banner's image
        setSlides((prev) => {
          const updated = [...prev];
          updated[targetIndex] = { ...updated[targetIndex], image: uploadedUrl };
          return updated;
        });
        setMessage({
          type: "success",
          text: `✅ ব্যানার #${targetIndex + 1}-এর ছবি সফলভাবে পরিবর্তন হয়েছে! লাইভ করতে নিচে 'সেভ করুন'-এ চাপ দিন।`,
        });
      } else {
        // Adding a new banner slide
        const newSlide = {
          id: `slide-${Date.now()}`,
          image: uploadedUrl,
          title: "Special Campaign Offer",
          buttonLink: "/products",
        };
        setSlides((prev) => [...prev, newSlide]);
        setMessage({
          type: "success",
          text: "✅ নতুন ব্যানার সফলভাবে আপলোড হয়েছে! লাইভ করতে নিচে 'সমস্ত ব্যানার সেভ করুন' বাটনে চাপ দিন।",
        });
      }

      if (fileInputRef.current) fileInputRef.current.value = "";
      if (replaceInputRef.current) replaceInputRef.current.value = "";
      setReplacingIndex(null);
    } catch (error) {
      console.error("Cloudinary upload failed:", error);
      setMessage({ type: "error", text: `❌ ছবি আপলোড ব্যর্থ হয়েছে: ${error.message}` });
    } finally {
      setIsUploading(false);
    }
  };

  // Add slide by URL
  const handleAddByUrl = () => {
    const trimmed = (customUrl || "").trim();
    if (!trimmed) {
      setMessage({ type: "error", text: "❌ দয়া করে একটি সঠিক ছবির লিঙ্ক (URL) লিখুন।" });
      return;
    }

    const newSlide = {
      id: `slide-${Date.now()}`,
      image: trimmed,
      title: "Special Campaign Offer",
      buttonLink: "/products",
    };

    setSlides((prev) => [...prev, newSlide]);
    setCustomUrl("");
    setShowUrlInput(false);
    setMessage({
      type: "success",
      text: "✅ ব্যানার যুক্ত হয়েছে! সেভ করতে নিচের সেভ বাটনে চাপ দিন।",
    });
  };

  // Update a field on a slide
  const updateSlideField = (index, field, value) => {
    setSlides((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  // Move slide up
  const moveUp = (index) => {
    if (index === 0) return;
    setSlides((prev) => {
      const copy = [...prev];
      const temp = copy[index - 1];
      copy[index - 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  };

  // Move slide down
  const moveDown = (index) => {
    if (index >= slides.length - 1) return;
    setSlides((prev) => {
      const copy = [...prev];
      const temp = copy[index + 1];
      copy[index + 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  };

  // Delete slide
  const deleteSlide = (index) => {
    if (!window.confirm(`আপনি কি নিশ্চিত ব্যানার #${index + 1} মুছে ফেলতে চান?`)) return;
    setSlides((prev) => prev.filter((_, idx) => idx !== index));
    setMessage({
      type: "info",
      text: "🗑️ ব্যানার সরানো হয়েছে। পরিবর্তন স্থায়ী করতে 'সমস্ত ব্যানার সেভ করুন'-এ চাপ দিন।",
    });
  };

  // Save all slides to database
  const saveAllBanners = async () => {
    setIsSaving(true);
    setMessage({ type: "info", text: "⏳ লাইভ সার্ভার ও ডাটাবেজে ব্যানার সেভ হচ্ছে..." });

    try {
      const payloadSlides = slides
        .filter((s) => s.image && s.image.trim())
        .map((s) => ({
          image: s.image.trim(),
          title: s.title || "Special Offer",
          buttonLink: s.buttonLink || "/products",
          buttonText: "Shop Now",
        }));

      const res = await fetch(`${API_BASE_URL}/api/settings`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          promoSlides: payloadSlides,
        }),
      });

      const updated = await res.json();
      if (!res.ok) {
        throw new Error(updated.message || "Failed to save settings");
      }

      setMessage({
        type: "success",
        text: "🎉 সমস্ত ব্যানার সফলভাবে লাইভ ওয়েবসাইটে সেভ ও আপডেট করা হয়েছে!",
      });

      if (onUpdateSettings) {
        onUpdateSettings(updated);
      }
    } catch (error) {
      console.error("Save error:", error);
      setMessage({ type: "error", text: `❌ সেভ ব্যর্থ: ${error.message}` });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="jt-banner-wrapper">
      {/* Hidden File Input for Replacing an existing slide */}
      <input
        type="file"
        ref={replaceInputRef}
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => {
          if (e.target.files && e.target.files[0] && replacingIndex !== null) {
            handleFileUpload(e.target.files[0], replacingIndex);
          }
        }}
      />

      {/* Main Container Card */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: "20px",
          padding: "24px",
          boxShadow: "0 6px 24px rgba(15, 23, 42, 0.05)",
          border: "1.5px solid #fecdd3",
          marginBottom: "24px",
        }}
      >
        {/* Top Header */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "14px",
            borderBottom: "1.5px solid #ffe4e6",
            paddingBottom: "18px",
            marginBottom: "22px",
          }}
        >
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: "20px",
                fontWeight: 900,
                color: "#881337",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              🖼️ হোমপেজ ব্যানার স্লাইডার ম্যানেজার
            </h3>
            <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748b" }}>
              হোমপেজের মেইন ব্যানার স্লাইডার এখানে ছবি আপলোড করে সহজেই পরিবর্তন, সাজানো ও ডিলিট করুন।
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: "12.5px",
                fontWeight: 800,
                color: "#be123c",
                textDecoration: "none",
                padding: "9px 16px",
                borderRadius: "10px",
                background: "#ffe4e6",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                transition: "all 0.15s ease",
              }}
            >
              🔗 লাইভ হোমপেজ দেখুন ↗
            </a>
            <button
              type="button"
              onClick={saveAllBanners}
              disabled={isSaving || isUploading}
              style={{
                background: "linear-gradient(135deg, #e11d48 0%, #be123c 100%)",
                color: "#ffffff",
                border: "none",
                padding: "10px 22px",
                borderRadius: "10px",
                fontWeight: 800,
                fontSize: "13.5px",
                cursor: isSaving || isUploading ? "wait" : "pointer",
                boxShadow: "0 4px 14px rgba(225, 29, 72, 0.35)",
                display: "inline-flex",
                alignItems: "center",
                gap: "7px",
              }}
            >
              {isSaving ? "⏳ সেভ হচ্ছে..." : "💾 সমস্ত ব্যানার সেভ করুন (Save Live)"}
            </button>
          </div>
        </div>

        {/* Message Alert Banner */}
        {message && (
          <div
            style={{
              padding: "12px 18px",
              borderRadius: "12px",
              marginBottom: "20px",
              fontSize: "13.5px",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background:
                message.type === "success"
                  ? "#f0fdf4"
                  : message.type === "error"
                  ? "#fef2f2"
                  : "#eff6ff",
              color:
                message.type === "success"
                  ? "#15803d"
                  : message.type === "error"
                  ? "#b91c1c"
                  : "#1d4ed8",
              border: `1.5px solid ${
                message.type === "success"
                  ? "#bbf7d0"
                  : message.type === "error"
                  ? "#fecaca"
                  : "#bfdbfe"
              }`,
            }}
          >
            <span>{message.text}</span>
            <button
              type="button"
              onClick={() => setMessage(null)}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                fontSize: "16px",
                color: "inherit",
                fontWeight: 900,
                padding: "0 4px",
              }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Upload New Banner Hero Card */}
        <div
          style={{
            border: "2px dashed #f43f5e",
            background: "linear-gradient(135deg, #fff5f7 0%, #ffffff 100%)",
            borderRadius: "16px",
            padding: "24px 18px",
            textAlign: "center",
            marginBottom: "28px",
          }}
        >
          <div style={{ fontSize: "36px", marginBottom: "8px" }}>📤</div>
          <h4 style={{ margin: "0 0 6px", fontSize: "17px", fontWeight: 900, color: "#881337" }}>
            নতুন অফার ব্যানার ছবি আপলোড করুন
          </h4>
          <p style={{ margin: "0 auto 18px", fontSize: "13px", color: "#64748b", maxWidth: "600px", lineHeight: 1.5 }}>
            মোবাইল গ্যালারি বা কম্পিউটার থেকে সরাসরি সিলেক্ট করুন। <br />
            <strong>💡 সুপারিশকৃত রেজোলিউশন:</strong> 1440 × 600 px (16:6.6 অনুপাত) — সাইজ ৫MB-র মধ্যে
          </p>

          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            id="banner-file-input"
            style={{ display: "none" }}
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileUpload(e.target.files[0], null);
              }
            }}
          />

          <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap", alignItems: "center" }}>
            <button
              type="button"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              style={{
                background: isUploading ? "#94a3b8" : "linear-gradient(135deg, #e11d48 0%, #be123c 100%)",
                color: "#ffffff",
                border: "none",
                padding: "12px 28px",
                borderRadius: "12px",
                fontWeight: 900,
                fontSize: "14px",
                cursor: isUploading ? "wait" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                boxShadow: "0 4px 14px rgba(225, 29, 72, 0.3)",
              }}
            >
              {isUploading ? "⏳ ক্লাউডে আপলোড হচ্ছে..." : "📁 ছবি সিলেক্ট করে আপলোড করুন"}
            </button>

            <button
              type="button"
              onClick={() => setShowUrlInput(!showUrlInput)}
              style={{
                background: "#f1f5f9",
                color: "#475569",
                border: "1px solid #cbd5e1",
                padding: "11px 18px",
                borderRadius: "12px",
                fontSize: "13px",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              {showUrlInput ? "▲ URL অপশন লুকান" : "🔗 ছবির লিংক ব্যবহার করুন ▾"}
            </button>
          </div>

          {/* Collapsible URL Input Box */}
          {showUrlInput && (
            <div
              style={{
                marginTop: "16px",
                paddingTop: "14px",
                borderTop: "1px dashed #fecdd3",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                flexWrap: "wrap",
              }}
            >
              <input
                type="text"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="https://.../banner-image.jpg"
                style={{
                  padding: "10px 14px",
                  borderRadius: "10px",
                  border: "1px solid #cbd5e1",
                  fontSize: "13px",
                  width: "360px",
                  maxWidth: "100%",
                }}
              />
              <button
                type="button"
                onClick={handleAddByUrl}
                style={{
                  padding: "10px 18px",
                  borderRadius: "10px",
                  background: "#0f172a",
                  color: "#ffffff",
                  border: "none",
                  fontSize: "13px",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                + লিংক দিয়ে যুক্ত করুন
              </button>
            </div>
          )}
        </div>

        {/* Active Banners Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "8px",
            marginBottom: "16px",
          }}
        >
          <span style={{ fontSize: "16px", fontWeight: 900, color: "#0f172a" }}>
            সক্রিয় ব্যানার তালিকা ({slides.length}টি স্লাইড)
          </span>
          <span style={{ fontSize: "12.5px", color: "#64748b" }}>
            💡 প্রতিটি ব্যানারের ক্রম পরিবর্তন করতে (⬆️ ⬇️) বাটন ব্যবহার করুন
          </span>
        </div>

        {/* Empty State */}
        {slides.length === 0 ? (
          <div
            style={{
              padding: "48px 20px",
              textAlign: "center",
              background: "#fffafb",
              borderRadius: "16px",
              border: "1.5px dashed #fecdd3",
              color: "#64748b",
            }}
          >
            <div style={{ fontSize: "40px", marginBottom: "8px" }}>🖼️</div>
            <h4 style={{ margin: "0 0 6px", color: "#881337", fontSize: "16px", fontWeight: 800 }}>
              কোনো কাস্টম ব্যানার আপলোড করা নেই
            </h4>
            <p style={{ margin: "0 0 16px", fontSize: "13px" }}>
              উপরে <strong>"📁 ছবি সিলেক্ট করে আপলোড করুন"</strong> বাটনে চাপ দিয়ে আপনার ব্যানার ছবি যোগ করুন।
            </p>
          </div>
        ) : (
          /* List of Banners */
          <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            {slides.map((slide, index) => (
              <div key={slide.id || index} className="jt-banner-card">
                {/* Card Top Bar with Title and Actions */}
                <div className="jt-banner-card-header">
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span
                      style={{
                        background: "linear-gradient(135deg, #e11d48 0%, #be123c 100%)",
                        color: "#ffffff",
                        padding: "4px 10px",
                        borderRadius: "8px",
                        fontSize: "12px",
                        fontWeight: 900,
                        letterSpacing: "0.5px",
                      }}
                    >
                      🎯 ব্যানার #{index + 1}
                    </span>
                    <span style={{ fontSize: "13px", color: "#475569", fontWeight: 700 }}>
                      {slide.title || "Special Campaign Offer"}
                    </span>
                  </div>

                  {/* Move & Delete Controls */}
                  <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => moveUp(index)}
                      title="Move Up"
                      style={{
                        padding: "6px 12px",
                        borderRadius: "8px",
                        background: index === 0 ? "#f1f5f9" : "#ffffff",
                        border: "1px solid #cbd5e1",
                        cursor: index === 0 ? "not-allowed" : "pointer",
                        fontSize: "12px",
                        fontWeight: 800,
                        color: index === 0 ? "#94a3b8" : "#0f172a",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      ⬆️ আগে
                    </button>

                    <button
                      type="button"
                      disabled={index >= slides.length - 1}
                      onClick={() => moveDown(index)}
                      title="Move Down"
                      style={{
                        padding: "6px 12px",
                        borderRadius: "8px",
                        background: index >= slides.length - 1 ? "#f1f5f9" : "#ffffff",
                        border: "1px solid #cbd5e1",
                        cursor: index >= slides.length - 1 ? "not-allowed" : "pointer",
                        fontSize: "12px",
                        fontWeight: 800,
                        color: index >= slides.length - 1 ? "#94a3b8" : "#0f172a",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      ⬇️ পরে
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteSlide(index)}
                      title="Delete Banner"
                      style={{
                        padding: "6px 12px",
                        borderRadius: "8px",
                        background: "#fef2f2",
                        color: "#dc2626",
                        border: "1px solid #fecaca",
                        fontSize: "12px",
                        fontWeight: 800,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      🗑️ ডিলিট
                    </button>
                  </div>
                </div>

                {/* Card Body (Two Columns: Image Preview & Settings) */}
                <div className="jt-banner-card-body">
                  {/* Left Column: Banner Preview */}
                  <div>
                    <div
                      style={{
                        width: "100%",
                        aspectRatio: "16 / 6.6",
                        borderRadius: "12px",
                        overflow: "hidden",
                        backgroundColor: "#ffe4e6",
                        border: "1.5px solid #fecdd3",
                        boxShadow: "0 2px 10px rgba(0, 0, 0, 0.05)",
                        position: "relative",
                      }}
                    >
                      <img
                        src={getImageUrl(slide.image)}
                        alt={`Banner ${index + 1}`}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          display: "block",
                        }}
                        onError={(e) => {
                          e.currentTarget.src = slide.image;
                        }}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setReplacingIndex(index);
                        replaceInputRef.current?.click();
                      }}
                      style={{
                        marginTop: "10px",
                        width: "100%",
                        padding: "8px 12px",
                        borderRadius: "8px",
                        background: "#fff1f2",
                        color: "#be123c",
                        border: "1px dashed #f43f5e",
                        fontSize: "12.5px",
                        fontWeight: 800,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                      }}
                    >
                      🔄 অন্য ছবি দিয়ে পরিবর্তন করুন
                    </button>
                  </div>

                  {/* Right Column: Title & Link Controls */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {/* Link Target */}
                    <div>
                      <label
                        style={{
                          fontSize: "12px",
                          fontWeight: 800,
                          color: "#334155",
                          display: "block",
                          marginBottom: "4px",
                        }}
                      >
                        🔗 ব্যানার ক্লিক লিংক (যে পেজে যাবে):
                      </label>
                      <input
                        type="text"
                        value={slide.buttonLink || ""}
                        onChange={(e) => updateSlideField(index, "buttonLink", e.target.value)}
                        placeholder="যেমন: /products অথবা /flash-sales"
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          borderRadius: "10px",
                          border: "1.5px solid #cbd5e1",
                          fontSize: "13px",
                          boxSizing: "border-box",
                        }}
                      />

                      {/* Quick Category Chips */}
                      <div
                        style={{
                          display: "flex",
                          gap: "6px",
                          flexWrap: "wrap",
                          alignItems: "center",
                          marginTop: "8px",
                        }}
                      >
                        <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 700 }}>
                          কুইক লিংক:
                        </span>
                        {PRESET_LINKS.map((preset) => (
                          <button
                            key={preset.url}
                            type="button"
                            onClick={() => updateSlideField(index, "buttonLink", preset.url)}
                            style={{
                              fontSize: "11px",
                              fontWeight: 700,
                              padding: "4px 9px",
                              borderRadius: "20px",
                              background: slide.buttonLink === preset.url ? "#e11d48" : "#f1f5f9",
                              color: slide.buttonLink === preset.url ? "#ffffff" : "#475569",
                              border: slide.buttonLink === preset.url ? "1px solid #e11d48" : "1px solid #cbd5e1",
                              cursor: "pointer",
                              transition: "all 0.15s ease",
                            }}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Banner Title */}
                    <div>
                      <label
                        style={{
                          fontSize: "12px",
                          fontWeight: 800,
                          color: "#334155",
                          display: "block",
                          marginBottom: "4px",
                        }}
                      >
                        📝 ব্যানারের নাম / টাইটেল (ঐচ্ছিক):
                      </label>
                      <input
                        type="text"
                        value={slide.title || ""}
                        onChange={(e) => updateSlideField(index, "title", e.target.value)}
                        placeholder="যেমন: Korean Glass Skin Special Offer"
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          borderRadius: "10px",
                          border: "1.5px solid #cbd5e1",
                          fontSize: "13px",
                          fontWeight: 700,
                          boxSizing: "border-box",
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Bottom Save Bar */}
        {slides.length > 0 && (
          <div
            style={{
              marginTop: "26px",
              paddingTop: "18px",
              borderTop: "1.5px solid #ffe4e6",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "14px",
            }}
          >
            <span style={{ fontSize: "13px", color: "#64748b", fontWeight: 600 }}>
              💡 সমস্ত পরিবর্তন সম্পন্ন হলে লাইভ করতে পাশের বাটনে চাপ দিন
            </span>
            <button
              type="button"
              onClick={saveAllBanners}
              disabled={isSaving || isUploading}
              style={{
                background: "linear-gradient(135deg, #e11d48 0%, #be123c 100%)",
                color: "#ffffff",
                border: "none",
                padding: "12px 30px",
                borderRadius: "12px",
                fontWeight: 900,
                fontSize: "14px",
                cursor: isSaving || isUploading ? "wait" : "pointer",
                boxShadow: "0 4px 14px rgba(225, 29, 72, 0.35)",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              {isSaving ? "⏳ সেভ হচ্ছে..." : "💾 সমস্ত ব্যানার সেভ করুন (Save Live)"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
