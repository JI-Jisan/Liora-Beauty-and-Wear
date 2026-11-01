"use client";

import { useState } from "react";
import { useCampus } from "@/context/CampusContext";
import { ALL_CAMPUSES_SELECT_OPTIONS, POPULAR_CAMPUSES_LIST } from "@/lib/campusCoupons";

export default function CampusCouponBar() {
  const { activeCoupon, applyCampusCoupon, removeCampusCoupon } = useCampus();
  const [inputCode, setInputCode] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isChanging, setIsChanging] = useState(false);

  const handleApplyCode = (codeToApply) => {
    if (!codeToApply || !codeToApply.trim()) {
      setFeedback({ type: "error", message: "দয়া করে আপনার বিশ্ববিদ্যালয় নির্বাচন করুন অথবা কুপন কোড লিখুন।" });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    setTimeout(() => {
      const res = applyCampusCoupon(codeToApply);
      if (res.success) {
        setFeedback({ type: "success", message: res.message });
        setInputCode("");
        setIsChanging(false);
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

  const handleSubmit = (e) => {
    e.preventDefault();
    handleApplyCode(inputCode);
  };

  const handleSelectUniversity = (e) => {
    const val = e.target.value;
    if (val) {
      setInputCode(val);
      handleApplyCode(val);
    }
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
        {!activeCoupon || isChanging ? (
          /* BEFORE COUPON APPLIED OR USER WANTS TO CHANGE VARSITY - ALL UNIVERSITIES SUPPORTED */
          <div>
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
                    width: "48px",
                    height: "48px",
                    borderRadius: "14px",
                    background: "linear-gradient(135deg, #ff4d6d 0%, #f43f5e 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "24px",
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
                      All University Campus Privilege
                    </span>
                    <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 700 }}>
                      সর্বোচ্চ ১৫% স্টুডেন্ট ছাড়
                    </span>
                  </div>
                  <h3
                    style={{
                      margin: "3px 0 0",
                      fontSize: "15.5px",
                      fontWeight: 800,
                      color: "#0f172a",
                      lineHeight: 1.3,
                    }}
                  >
                    সকল বিশ্ববিদ্যালয়ের শিক্ষার্থীদের জন্য এক্সক্লুসিভ ক্যাম্পাস ডিল!
                  </h3>
                  <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#64748b" }}>
                    আপনার বিশ্ববিদ্যালয় সিলেক্ট করুন বা কুপন কোড দিয়ে স্পেশাল স্টুডেন্ট রেট আনলক করুন ✨
                  </p>
                </div>
              </div>

              {/* Form & Dropdown */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  flex: "1 1 340px",
                  maxWidth: "520px",
                }}
              >
                {/* University Select Dropdown */}
                <select
                  aria-label="Select University"
                  onChange={handleSelectUniversity}
                  defaultValue=""
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    fontSize: "13px",
                    fontWeight: 700,
                    borderRadius: "12px",
                    border: "1.5px solid #cbd5e1",
                    background: "#ffffff",
                    color: "#0f172a",
                    outline: "none",
                    cursor: "pointer",
                    boxSizing: "border-box",
                  }}
                >
                  {ALL_CAMPUSES_SELECT_OPTIONS.map((opt) => (
                    <option key={opt.code || "placeholder"} value={opt.code}>
                      {opt.label}
                    </option>
                  ))}
                </select>

                {/* Manual Code Input Form */}
                <form
                  onSubmit={handleSubmit}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    width: "100%",
                  }}
                >
                  <input
                    type="text"
                    value={inputCode}
                    onChange={(e) => {
                      setInputCode(e.target.value.toUpperCase());
                      if (feedback) setFeedback(null);
                    }}
                    placeholder="অথবা কুপন কোড লিখুন (যেমন: DU15, NSU15)"
                    style={{
                      flex: 1,
                      padding: "9px 14px",
                      fontSize: "13px",
                      fontWeight: 700,
                      letterSpacing: "0.05em",
                      borderRadius: "12px",
                      border: feedback?.type === "error" ? "1.5px solid #f43f5e" : "1.5px solid #cbd5e1",
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
                      fontSize: "13px",
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
                    {isSubmitting ? "যাচাই হচ্ছে..." : "আনলক করুন ✨"}
                  </button>
                  {isChanging && (
                    <button
                      type="button"
                      onClick={() => setIsChanging(false)}
                      style={{
                        padding: "9px 12px",
                        fontSize: "12px",
                        fontWeight: 700,
                        borderRadius: "12px",
                        background: "#f1f5f9",
                        color: "#475569",
                        border: "1px solid #cbd5e1",
                        cursor: "pointer",
                      }}
                    >
                      বাতিল
                    </button>
                  )}
                </form>
              </div>
            </div>

            {/* Quick Varsity Pills */}
            <div
              style={{
                marginTop: "12px",
                paddingTop: "10px",
                borderTop: "1px dashed #fed7e2",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                flexWrap: "wrap",
              }}
            >
              <span style={{ fontSize: "11px", fontWeight: 800, color: "#64748b", marginRight: "4px" }}>
                জনপ্রিয় ক্যাম্পাস:
              </span>
              {POPULAR_CAMPUSES_LIST.map((camp) => (
                <button
                  key={camp.code}
                  type="button"
                  onClick={() => handleApplyCode(camp.code)}
                  style={{
                    padding: "4px 10px",
                    fontSize: "11.5px",
                    fontWeight: 700,
                    borderRadius: "20px",
                    background: "#ffffff",
                    border: "1px solid #fed7e2",
                    color: "#9f1239",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#ffe4e6";
                    e.currentTarget.style.borderColor = "#f43f5e";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#ffffff";
                    e.currentTarget.style.borderColor = "#fed7e2";
                  }}
                  title={`Apply ${camp.short} Coupon (${camp.code})`}
                >
                  <span>{camp.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* AFTER COUPON APPLIED - DYNAMIC CAMPUS (DU, BRACU, NSU, EWU, DIU, ETC.) */
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
                onClick={() => setIsChanging(true)}
                style={{
                  padding: "8px 12px",
                  fontSize: "12px",
                  fontWeight: 700,
                  borderRadius: "10px",
                  background: "#ffffff",
                  color: "#1e293b",
                  border: "1px solid #cbd5e1",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                title="Change selected university"
              >
                🔄 বিশ্ববিদ্যালয় পরিবর্তন
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
