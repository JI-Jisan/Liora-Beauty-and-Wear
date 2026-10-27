"use client";

import { useState } from "react";
import { useCampus } from "@/context/CampusContext";

export default function CampusCouponBar() {
  const { activeCoupon, applyCampusCoupon, removeCampusCoupon } = useCampus();
  const [inputCode, setInputCode] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputCode || !inputCode.trim()) {
      setFeedback({ type: "error", message: "দয়া করে আপনার কুপন কোডটি লিখুন।" });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    setTimeout(() => {
      const res = applyCampusCoupon(inputCode);
      if (res.success) {
        setFeedback({ type: "success", message: res.message });
        setInputCode("");
        setTimeout(() => {
          const el = document.getElementById("view-offers") || document.getElementById("hot-items");
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }, 400);
      } else {
        setFeedback({ type: "error", message: res.message });
      }
      setIsSubmitting(false);
    }, 300);
  };

  return (
    <section
      aria-label="Student and Campus Privilege Bar"
      style={{
        maxWidth: "1440px",
        margin: "12px auto 16px",
        padding: "0 16px",
      }}
    >
      <div
        style={{
          borderRadius: "18px",
          overflow: "hidden",
          boxShadow: activeCoupon
            ? "0 8px 30px rgba(255, 77, 109, 0.15)"
            : "0 4px 20px rgba(15, 23, 42, 0.05)",
          border: activeCoupon
            ? "1.5px solid #ffccd5"
            : "1px solid #fed7e2",
          background: activeCoupon
            ? "linear-gradient(135deg, #fff0f3 0%, #ffe3e8 50%, #fff5f7 100%)"
            : "linear-gradient(135deg, #ffffff 0%, #fff7f9 100%)",
          padding: "16px 20px",
          transition: "all 0.3s ease",
        }}
      >
        {!activeCoupon ? (
          /* BEFORE COUPON APPLIED - UNIVERSAL CAMPUS VOUCHER BOX (NO DIU SPECIFIED) */
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "16px",
            }}
          >
            <div style={{ flex: "1 1 340px", display: "flex", alignItems: "center", gap: "14px" }}>
              <div
                style={{
                  width: "46px",
                  height: "46px",
                  borderRadius: "14px",
                  background: "linear-gradient(135deg, #ff4d6d 0%, #f43f5e 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "22px",
                  color: "#ffffff",
                  boxShadow: "0 6px 16px rgba(244, 63, 94, 0.28)",
                  flexShrink: 0,
                }}
              >
                🎓
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 800,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: "#e11d48",
                      background: "#ffe4e6",
                      padding: "2px 8px",
                      borderRadius: "6px",
                    }}
                  >
                    Campus Privilege
                  </span>
                  <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>
                    Up to 15% Student Discount
                  </span>
                </div>
                <h3
                  style={{
                    margin: "3px 0 0",
                    fontSize: "15px",
                    fontWeight: 800,
                    color: "#0f172a",
                    lineHeight: 1.3,
                  }}
                >
                  Have a Campus Coupon? Unlock Exclusive Student Prices!
                </h3>
              </div>
            </div>

            {/* Form */}
            <form
              onSubmit={handleSubmit}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                flex: "1 1 320px",
                maxWidth: "480px",
              }}
            >
              <div style={{ position: "relative", flex: 1 }}>
                <input
                  type="text"
                  value={inputCode}
                  onChange={(e) => {
                    setInputCode(e.target.value.toUpperCase());
                    if (feedback) setFeedback(null);
                  }}
                  placeholder="Enter Campus Coupon (e.g. DIU15)"
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    fontSize: "13.5px",
                    fontWeight: 700,
                    letterSpacing: "0.05em",
                    borderRadius: "12px",
                    border: feedback?.type === "error" ? "1.5px solid #f43f5e" : "1.5px solid #cbd5e1",
                    background: "#ffffff",
                    color: "#0f172a",
                    outline: "none",
                    boxSizing: "border-box",
                    transition: "all 0.2s",
                  }}
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  padding: "10px 18px",
                  fontSize: "13.5px",
                  fontWeight: 800,
                  borderRadius: "12px",
                  background: "linear-gradient(135deg, #ff4d6d 0%, #e11d48 100%)",
                  color: "#ffffff",
                  border: "none",
                  cursor: isSubmitting ? "wait" : "pointer",
                  whiteSpace: "nowrap",
                  boxShadow: "0 4px 14px rgba(225, 29, 72, 0.3)",
                  transition: "all 0.2s",
                }}
              >
                {isSubmitting ? "Checking..." : "Unlock Deals ✨"}
              </button>
            </form>
          </div>
        ) : (
          /* AFTER COUPON APPLIED - SHOWS SPECIFIC CAMPUS (e.g. DIU, EWU, BRAC, NSU) */
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "14px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "14px", flex: "1 1 360px" }}>
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "14px",
                  background: activeCoupon.tagColor || "#ff4d6d",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "24px",
                  color: "#ffffff",
                  boxShadow: "0 6px 18px rgba(255, 77, 109, 0.35)",
                  flexShrink: 0,
                  animation: "bounce 2s infinite ease-in-out",
                }}
              >
                🎓
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 900,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: "#ffffff",
                      background: activeCoupon.tagColor || "#ff4d6d",
                      padding: "2px 8px",
                      borderRadius: "6px",
                    }}
                  >
                    {activeCoupon.short} Exclusive
                  </span>
                  <span
                    style={{
                      fontSize: "11.5px",
                      color: "#16a34a",
                      fontWeight: 800,
                      background: "#dcfce7",
                      padding: "2px 8px",
                      borderRadius: "6px",
                    }}
                  >
                    ✓ Code {activeCoupon.code} Applied
                  </span>
                </div>
                <h3
                  style={{
                    margin: "3px 0 2px",
                    fontSize: "16px",
                    fontWeight: 900,
                    color: "#0f172a",
                    lineHeight: 1.3,
                  }}
                >
                  {activeCoupon.campus} ({activeCoupon.short}) Special Pricing Unlocked!
                </h3>
                <p style={{ margin: 0, fontSize: "12px", color: "#475569", fontWeight: 600 }}>
                  স্টোরের প্রতিটি প্রোডাক্টে আপনার জন্য স্পেশাল স্টুডেন্ট অফার রেট স্বয়ংক্রিয়ভাবে কার্যকর হয়েছে।
                </p>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById("view-offers") || document.getElementById("hot-items");
                  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                style={{
                  padding: "8px 14px",
                  fontSize: "12px",
                  fontWeight: 800,
                  borderRadius: "10px",
                  background: activeCoupon.tagColor || "#ff4d6d",
                  color: "#ffffff",
                  border: "none",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  boxShadow: "0 4px 12px rgba(255, 77, 109, 0.25)",
                  transition: "all 0.2s",
                }}
              >
                <span>🏷️ View Products with Discount ↓</span>
              </button>
              <button
                type="button"
                onClick={removeCampusCoupon}
                style={{
                  padding: "8px 14px",
                  fontSize: "12px",
                  fontWeight: 700,
                  borderRadius: "10px",
                  background: "#ffffff",
                  color: "#64748b",
                  border: "1px solid #cbd5e1",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                title="Deactivate campus coupon"
              >
                ✕ Deactivate Code
              </button>
            </div>
          </div>
        )}

        {/* Feedback message */}
        {feedback && (
          <div
            style={{
              marginTop: "10px",
              padding: "8px 14px",
              borderRadius: "10px",
              fontSize: "12.5px",
              fontWeight: 700,
              background: feedback.type === "success" ? "#ecfdf5" : "#fff1f2",
              color: feedback.type === "success" ? "#047857" : "#be123c",
              border: feedback.type === "success" ? "1px solid #a7f3d0" : "1px solid #fecdd3",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span>{feedback.type === "success" ? "🎉" : "⚠️"}</span>
            <span>{feedback.message}</span>
          </div>
        )}
      </div>
    </section>
  );
}
