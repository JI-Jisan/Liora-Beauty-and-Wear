"use client";

import { useState, useEffect, useRef } from "react";
import { API_BASE_URL, getAuthHeaders, getImageUrl } from "@/lib/api";
import { uploadToCloudinary } from "@/lib/cloudinary";

const PRESET_LINKS = [
  { label: "🛍️ All Products", url: "/products" },
  { label: "🌸 Skincare / Serums", url: "/products?category=Serum" },
  { label: "💄 Lipsticks & Makeup", url: "/products?category=Lipsticks" },
  { label: "⚡ Flash Sale", url: "/flash-sales" },
  { label: "🎁 Clearance Offer", url: "/clearance" },
  { label: "✨ Korean Combos", url: "/combo" },
];

export default function BannerManager({ siteSettings, onUpdateSettings }) {
  const [slides, setSlides] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [customUrl, setCustomUrl] = useState("");
  const fileInputRef = useRef(null);

  // Initialize slides from siteSettings or fetch from API
  useEffect(() => {
    if (siteSettings && Array.isArray(siteSettings.promoSlides)) {
      setSlides(
        siteSettings.promoSlides.map((s, idx) => ({
          id: s._id || s.id || `slide-${idx}-${Date.now()}`,
          image: s.image || "",
          title: s.title || "",
          buttonLink: s.buttonLink || s.link || "/products",
        }))
      );
    } else {
      fetch(`${API_BASE_URL}/api/settings`)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data.promoSlides)) {
            setSlides(
              data.promoSlides.map((s, idx) => ({
                id: s._id || s.id || `slide-${idx}-${Date.now()}`,
                image: s.image || "",
                title: s.title || "",
                buttonLink: s.buttonLink || s.link || "/products",
              }))
            );
          }
        })
        .catch((err) => console.error("Error loading settings:", err));
    }
  }, [siteSettings]);

  // Handle direct file upload from device
  const handleFileUpload = async (file) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setMessage({ type: "error", text: "❌ দয়া করে শুধুমাত্র ছবির ফাইল (JPG, PNG, WEBP) নির্বাচন করুন।" });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setMessage({ type: "error", text: "❌ ছবির সাইজ ১০MB-র কম হতে হবে।" });
      return;
    }

    setIsUploading(true);
    setMessage({ type: "info", text: "⏳ ক্লাউডিনারিতে ছবি আপলোড হচ্ছে... অনুগ্রহ করে অপেক্ষা করুন।" });

    try {
      const uploadedUrl = await uploadToCloudinary(file);
      
      const newSlide = {
        id: `slide-${Date.now()}`,
        image: uploadedUrl,
        title: "Special Campaign Offer",
        buttonLink: "/products",
      };

      setSlides((prev) => [...prev, newSlide]);
      setMessage({
        type: "success",
        text: "✅ ব্যানার সফলভাবে আপলোড হয়েছে! লাইভ করতে নিচে '💾 সমস্ত ব্যানার সেভ করুন' বাটনে চাপ দিন।",
      });

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
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
      setMessage({ type: "error", text: "❌ দয়া করে একটি ভ্যালিড ছবির URL লিখুন।" });
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
    if (!window.confirm("আপনি কি নিশ্চিত এই ব্যানারটি মুছে ফেলতে চান?")) return;
    setSlides((prev) => prev.filter((_, idx) => idx !== index));
    setMessage({
      type: "info",
      text: "🗑️ ব্যানার সরানো হয়েছে। পরিবর্তন স্থায়ী করতে '💾 সমস্ত ব্যানার সেভ করুন'-এ চাপ দিন।",
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
    <div
      style={{
        background: "#ffffff",
        borderRadius: "18px",
        padding: "24px",
        boxShadow: "0 4px 20px rgba(15, 23, 42, 0.06)",
        border: "1px solid #fecdd3",
        margin: "12px 0 32px",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "14px",
          borderBottom: "1.5px solid #ffe4e6",
          paddingBottom: "16px",
          marginBottom: "20px",
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
            🖼️ Homepage Banners & Sliders (ব্যানার ও অফার আপলোড)
          </h3>
          <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748b" }}>
            হোমপেজের মেইন স্লাইডার ব্যানার এখান থেকে সরাসরি আপলোড, সাজানো ও ডিলিট করুন।
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: "12px",
              fontWeight: 800,
              color: "#be123c",
              textDecoration: "none",
              padding: "8px 14px",
              borderRadius: "10px",
              background: "#ffe4e6",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
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
              padding: "10px 20px",
              borderRadius: "10px",
              fontWeight: 800,
              fontSize: "13px",
              cursor: isSaving || isUploading ? "wait" : "pointer",
              boxShadow: "0 4px 14px rgba(225, 29, 72, 0.35)",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            {isSaving ? "⏳ সেভ হচ্ছে..." : "💾 সমস্ত ব্যানার সেভ করুন"}
          </button>
        </div>
      </div>

      {/* Message Alert Banner */}
      {message && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: "12px",
            marginBottom: "20px",
            fontSize: "13px",
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
            border: `1px solid ${
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
              fontSize: "14px",
              color: "inherit",
              fontWeight: 900,
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Upload New Banner Card */}
      <div
        style={{
          border: "2px dashed #f43f5e",
          background: "linear-gradient(135deg, #fff5f7 0%, #ffffff 100%)",
          borderRadius: "16px",
          padding: "24px",
          textAlign: "center",
          marginBottom: "26px",
        }}
      >
        <div style={{ fontSize: "36px", marginBottom: "8px" }}>📤</div>
        <h4 style={{ margin: "0 0 6px", fontSize: "16px", fontWeight: 800, color: "#881337" }}>
          নতুন অফার ব্যানার ছবি আপলোড করুন
        </h4>
        <p style={{ margin: "0 0 16px", fontSize: "12.5px", color: "#64748b" }}>
          মোবাইল গ্যালারি বা কম্পিউটার থেকে সরাসরি সিলেক্ট করুন। <br />
          <strong>💡 সুপারিশকৃত রেজোলিউশন:</strong> 1440 × 600 px (অথবা 1200 × 500 px — 16:6.6 বা 16:9 অনুপাত)
        </p>

        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          id="banner-file-input"
          style={{ display: "none" }}
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFileUpload(e.target.files[0]);
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
              padding: "12px 26px",
              borderRadius: "12px",
              fontWeight: 900,
              fontSize: "14px",
              cursor: isUploading ? "wait" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: "0 4px 14px rgba(225, 29, 72, 0.3)",
              transition: "transform 0.15s ease",
            }}
          >
            {isUploading ? "⏳ আপলোড হচ্ছে..." : "📁 ছবি সিলেক্ট করে আপলোড করুন"}
          </button>
        </div>

        {/* Alternative: Add by URL */}
        <div
          style={{
            marginTop: "16px",
            paddingTop: "14px",
            borderTop: "1px solid #ffe4e6",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 700 }}>অথবা ছবির URL পেস্ট করুন:</span>
          <input
            type="text"
            value={customUrl}
            onChange={(e) => setCustomUrl(e.target.value)}
            placeholder="https://.../banner.jpg"
            style={{
              padding: "8px 12px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              fontSize: "12.5px",
              width: "280px",
              maxWidth: "100%",
            }}
          />
          <button
            type="button"
            onClick={handleAddByUrl}
            style={{
              padding: "8px 14px",
              borderRadius: "8px",
              background: "#0f172a",
              color: "#ffffff",
              border: "none",
              fontSize: "12px",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            + লিঙ্ক যোগ করুন
          </button>
        </div>
      </div>

      {/* Active Banners Count */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "14px",
        }}
      >
        <span style={{ fontSize: "14px", fontWeight: 800, color: "#0f172a" }}>
          সক্রিয় ব্যানার তালিকা ({slides.length}টি স্লাইড)
        </span>
        <span style={{ fontSize: "12px", color: "#64748b" }}>
          💡 তীর বাটন (⬆️ ⬇️) দিয়ে স্লাইডের ক্রম পরিবর্তন করুন
        </span>
      </div>

      {/* Banners List */}
      {slides.length === 0 ? (
        <div
          style={{
            padding: "36px 16px",
            textAlign: "center",
            background: "#f8fafc",
            borderRadius: "14px",
            border: "1px dashed #cbd5e1",
            color: "#64748b",
            fontSize: "14px",
          }}
        >
          কোনো কাস্টম ব্যানার আপলোড করা নেই। উপরে ছবি আপলোড করে নতুন অফার ব্যানার যোগ করুন। <br />
          (আপাতত ডিফল্ট কোরিয়ান স্কিনকেয়ার ব্যানার প্রদর্শিত হচ্ছে)
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {slides.map((slide, index) => (
            <div
              key={slide.id || index}
              style={{
                display: "grid",
                gridTemplateColumns: "180px 1fr auto",
                gap: "16px",
                alignItems: "center",
                padding: "16px",
                borderRadius: "14px",
                border: "1px solid #e2e8f0",
                background: "#fcfaf8",
                boxShadow: "0 2px 8px rgba(15, 23, 42, 0.03)",
              }}
            >
              {/* Thumbnail Image */}
              <div
                style={{
                  width: "100%",
                  aspectRatio: "16 / 6.6",
                  borderRadius: "10px",
                  overflow: "hidden",
                  backgroundColor: "#ffe4e6",
                  position: "relative",
                  border: "1.5px solid #fecdd3",
                }}
              >
                <img
                  src={getImageUrl(slide.image)}
                  alt={`Slide ${index + 1}`}
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
                <span
                  style={{
                    position: "absolute",
                    top: "6px",
                    left: "6px",
                    background: "rgba(15, 23, 42, 0.8)",
                    color: "#ffffff",
                    fontSize: "10px",
                    fontWeight: 900,
                    padding: "2px 6px",
                    borderRadius: "6px",
                  }}
                >
                  #{index + 1}
                </span>
              </div>

              {/* Slide Meta Inputs */}
              <div>
                <div style={{ marginBottom: "8px" }}>
                  <label
                    style={{
                      fontSize: "11px",
                      fontWeight: 800,
                      color: "#475569",
                      display: "block",
                      marginBottom: "3px",
                      textTransform: "uppercase",
                    }}
                  >
                    ব্যানার টাইটেল / নাম:
                  </label>
                  <input
                    type="text"
                    value={slide.title || ""}
                    onChange={(e) => updateSlideField(index, "title", e.target.value)}
                    placeholder="যেমন: Korean Glass Skin Special Offer"
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "12.5px",
                      fontWeight: 700,
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      fontSize: "11px",
                      fontWeight: 800,
                      color: "#475569",
                      display: "block",
                      marginBottom: "3px",
                      textTransform: "uppercase",
                    }}
                  >
                    ক্লিক করলে যে পেজে যাবে (লিংক):
                  </label>
                  <input
                    type="text"
                    value={slide.buttonLink || ""}
                    onChange={(e) => updateSlideField(index, "buttonLink", e.target.value)}
                    placeholder="যেমন: /products অথবা /flash-sales"
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "12px",
                      boxSizing: "border-box",
                      marginBottom: "6px",
                    }}
                  />

                  {/* Preset Quick Chips */}
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
                    <span style={{ fontSize: "10.5px", color: "#94a3b8", fontWeight: 700 }}>কুইক লিংক:</span>
                    {PRESET_LINKS.map((preset) => (
                      <button
                        key={preset.url}
                        type="button"
                        onClick={() => updateSlideField(index, "buttonLink", preset.url)}
                        style={{
                          fontSize: "10.5px",
                          fontWeight: 700,
                          padding: "2px 7px",
                          borderRadius: "6px",
                          background: slide.buttonLink === preset.url ? "#be123c" : "#ffffff",
                          color: slide.buttonLink === preset.url ? "#ffffff" : "#475569",
                          border: "1px solid #cbd5e1",
                          cursor: "pointer",
                        }}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", minWidth: "100px" }}>
                <div style={{ display: "flex", gap: "4px" }}>
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => moveUp(index)}
                    title="Move Up"
                    style={{
                      flex: 1,
                      padding: "6px",
                      borderRadius: "8px",
                      background: index === 0 ? "#f1f5f9" : "#ffffff",
                      border: "1px solid #cbd5e1",
                      cursor: index === 0 ? "not-allowed" : "pointer",
                      fontSize: "12px",
                      fontWeight: 800,
                      color: index === 0 ? "#94a3b8" : "#0f172a",
                    }}
                  >
                    ⬆️
                  </button>
                  <button
                    type="button"
                    disabled={index >= slides.length - 1}
                    onClick={() => moveDown(index)}
                    title="Move Down"
                    style={{
                      flex: 1,
                      padding: "6px",
                      borderRadius: "8px",
                      background: index >= slides.length - 1 ? "#f1f5f9" : "#ffffff",
                      border: "1px solid #cbd5e1",
                      cursor: index >= slides.length - 1 ? "not-allowed" : "pointer",
                      fontSize: "12px",
                      fontWeight: 800,
                      color: index >= slides.length - 1 ? "#94a3b8" : "#0f172a",
                    }}
                  >
                    ⬇️
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => deleteSlide(index)}
                  style={{
                    padding: "7px 10px",
                    borderRadius: "8px",
                    background: "#fef2f2",
                    color: "#dc2626",
                    border: "1px solid #fecaca",
                    fontSize: "11.5px",
                    fontWeight: 800,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "4px",
                  }}
                >
                  🗑️ ডিলিট
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bottom Sticky Save Button */}
      {slides.length > 0 && (
        <div
          style={{
            marginTop: "24px",
            paddingTop: "16px",
            borderTop: "1px solid #ffe4e6",
            display: "flex",
            justifyContent: "flex-end",
            gap: "12px",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: "12px", color: "#64748b" }}>
            পরিবর্তন লাইভ করতে সেভ বাটনে চাপ দিন
          </span>
          <button
            type="button"
            onClick={saveAllBanners}
            disabled={isSaving || isUploading}
            style={{
              background: "linear-gradient(135deg, #e11d48 0%, #be123c 100%)",
              color: "#ffffff",
              border: "none",
              padding: "12px 28px",
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
  );
}
