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
    const cleanCode = (inputCode || "").trim();
    if (!cleanCode) {
      setFeedback({ type: "error", message: "দয়া করে আপনার বিশ্ববিদ্যালয়ের কুপন কোডটি টাইপ করুন।" });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    setTimeout(() => {
      const res = applyCampusCoupon(cleanCode);
      if (res.success) {
        setFeedback({ type: "success", message: res.message });
        setInputCode("");
        setTimeout(() => {
          const el = document.getElementById("view-offers") || document.getElementById("hot-items");
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }, 300);
      } else {
        setFeedback({ type: "error", message: res.message });
      }
      setIsSubmitting(false);
    }, 250);
  };


  return (
    <section
      aria-label="Student and Campus Privilege Bar"
      style={{
        maxWidth: "1440px",
        margin: "8px auto 14px",
        padding: "0 14px",
      }}
    >
      <div
        style={{
          borderRadius: "16px",
          overflow: "hidden",
          boxShadow: activeCoupon
            ? "0 6px 24px rgba(225, 29, 72, 0.15)"
            : "0 3px 16px rgba(15, 23, 42, 0.04)",
          border: activeCoupon
            ? "1.5px solid #fecdd3"
            : "1px solid #fecdd3",
          background: activeCoupon
            ? "linear-gradient(135deg, #fff0f3 0%, #ffe3e8 50%, #fff5f7 100%)"
            : "linear-gradient(135deg, #ffffff 0%, #fff7f9 100%)",
          padding: "12px 16px",
          transition: "all 0.3s ease",
        }}
      >
        {!activeCoupon ? (
          /* BEFORE COUPON APPLIED - REQUIRE VALID CAMPUS CODE ENTRY */
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
            }}
          >
            <div style={{ flex: "1 1 300px", display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "12px",
                  background: "linear-gradient(135deg, #e11d48 0%, #be123c 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "22px",
                  color: "#ffffff",
                  boxShadow: "0 4px 12px rgba(225, 29, 72, 0.28)",
                  flexShrink: 0,
                }}
              >
                🎓
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                  <span
                    style={{
                      fontSize: "9.5px",
                      fontWeight: 900,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: "#881337",
                      background: "#ffe4e6",
                      padding: "2px 6px",
                      borderRadius: "5px",
                    }}
                  >
                    Campus VIP Privilege
                  </span>
                  <span style={{ fontSize: "11px", color: "#e11d48", fontWeight: 800 }}>
                    ★ স্টুডেন্ট প্রিভিলেজ অফার
                  </span>
                </div>
                <h3
                  style={{
                    margin: "2px 0 0",
                    fontSize: "14px",
                    fontWeight: 800,
                    color: "#0f172a",
                    lineHeight: 1.25,
                  }}
                >
                  বিশ্ববিদ্যালয় শিক্ষার্থীদের জন্য বিশেষ ছাড়!
                </h3>
                <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#64748b", fontWeight: 500 }}>
                  আপনার ক্যাম্পাস প্রিভিলেজ কোড জানা থাকলে নিচে এন্টার করে ১৫% ছাড় আনলক করুন
                </p>
              </div>
            </div>

            {/* Secret Campus Code Entry Form */}
            <div style={{ flex: "1 1 280px", maxWidth: "420px", width: "100%" }}>
              <form
                onSubmit={handleSubmit}
                style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%" }}
              >
                <input
                  type="text"
                  value={inputCode}
                  onChange={(e) => {
                    setInputCode(e.target.value.toUpperCase());
                    if (feedback) setFeedback(null);
                  }}
                  placeholder="আপনার ক্যাম্পাস কোড লিখুন..."
                  style={{
                    flex: 1,
                    padding: "9px 12px",
                    fontSize: "13px",
                    fontWeight: 700,
                    letterSpacing: "0.05em",
                    borderRadius: "10px",
                    border: feedback?.type === "error" ? "1.5px solid #f43f5e" : "1px solid #cbd5e1",
                    background: "#ffffff",
                    color: "#0f172a",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    padding: "9px 16px",
                    fontSize: "12px",
                    fontWeight: 800,
                    borderRadius: "10px",
                    background: "linear-gradient(135deg, #e11d48 0%, #be123c 100%)",
                    color: "#ffffff",
                    border: "none",
                    cursor: isSubmitting ? "wait" : "pointer",
                    whiteSpace: "nowrap",
                    boxShadow: "0 3px 10px rgba(225, 29, 72, 0.25)",
                    transition: "all 0.2s ease",
                  }}
                >
                  {isSubmitting ? "যাচাই হচ্ছে..." : "⚡ আনলক করুন"}
                </button>
              </form>
              {feedback && (
                <div
                  style={{
                    marginTop: "6px",
                    fontSize: "11.5px",
                    fontWeight: 700,
                    color: feedback.type === "success" ? "#16a34a" : "#e11d48",
                  }}
                >
                  {feedback.message}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* AFTER COUPON APPLIED - DYNAMIC CAMPUS DISPLAY (DU, BRACU, NSU, EWU, DIU, ETC.) */
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
                    ✓ কুপন কোড {activeCoupon.code} কার্যকর
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
                  {activeCoupon.campus} — স্পেশাল ক্যাম্পাস প্রমোশন সক্রিয়!
                </h3>
                <p style={{ margin: 0, fontSize: "12px", color: "#475569", fontWeight: 600 }}>
                  স্টোরের প্রতিটি প্রোডাক্টে আপনার জন্য স্পেশাল রেট কার্যকর হয়েছে—সর্বোচ্চ ১৫% ছাড়ের বেস্টসেলার ডিলগুলো সবার উপরে সাজানো হয়েছে! ✨
                </p>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
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
                <span>🏷️ ছাড়ের প্রোডাক্ট দেখুন ↓</span>
              </button>
              <button
                type="button"
                onClick={removeCampusCoupon}
                style={{
                  padding: "8px 12px",
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
                ✕ বন্ধ করুন
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
