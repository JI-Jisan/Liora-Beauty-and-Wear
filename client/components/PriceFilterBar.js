"use client";

import { useState, useEffect } from "react";

const PRESET_TIERS = [
  { id: "all", label: "সব দাম", min: null, max: null },
  { id: "under-499", label: "৳৪৯৯ এর নিচে", min: 0, max: 499, tag: "বাজেট" },
  { id: "500-999", label: "৳৫০০ – ৳৯৯৯", min: 500, max: 999, tag: "পপুলার" },
  { id: "1000-1999", label: "৳১,০০০ – ৳১,৯৯৯", min: 1000, max: 1999, tag: "প্রিমিয়াম" },
  { id: "2000-plus", label: "৳২,০০০+", min: 2000, max: null, tag: "লাক্সারি" },
];

export default function PriceFilterBar({
  activeMinPrice,
  activeMaxPrice,
  activeSort = "",
  totalProducts = 0,
  onPriceChange,
  onSortChange,
}) {
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [tempMin, setTempMin] = useState(activeMinPrice !== null && activeMinPrice !== undefined ? String(activeMinPrice) : "");
  const [tempMax, setTempMax] = useState(activeMaxPrice !== null && activeMaxPrice !== undefined ? String(activeMaxPrice) : "");

  useEffect(() => {
    setTempMin(activeMinPrice !== null && activeMinPrice !== undefined ? String(activeMinPrice) : "");
    setTempMax(activeMaxPrice !== null && activeMaxPrice !== undefined ? String(activeMaxPrice) : "");
  }, [activeMinPrice, activeMaxPrice]);

  // Determine which preset is active (if any)
  const currentActivePreset = PRESET_TIERS.find((tier) => {
    if (tier.id === "all") {
      return (activeMinPrice === null || activeMinPrice === undefined || activeMinPrice === "") &&
             (activeMaxPrice === null || activeMaxPrice === undefined || activeMaxPrice === "");
    }
    const matchMin = tier.min === null ? (activeMinPrice === null || activeMinPrice === undefined || activeMinPrice === "") : Number(activeMinPrice) === tier.min;
    const matchMax = tier.max === null ? (activeMaxPrice === null || activeMaxPrice === undefined || activeMaxPrice === "") : Number(activeMaxPrice) === tier.max;
    return matchMin && matchMax;
  });

  const isCustomActive = !currentActivePreset && (activeMinPrice !== null || activeMaxPrice !== null);
  const isAnyFilterActive = activeMinPrice !== null || activeMaxPrice !== null;

  const handleSelectPreset = (tier) => {
    if (tier.id === "all") {
      onPriceChange(null, null);
    } else {
      onPriceChange(tier.min, tier.max);
    }
  };

  const handleApplyCustom = (e) => {
    if (e) e.preventDefault();
    const minVal = tempMin !== "" && !isNaN(Number(tempMin)) ? Math.max(0, Number(tempMin)) : null;
    const maxVal = tempMax !== "" && !isNaN(Number(tempMax)) ? Math.max(0, Number(tempMax)) : null;

    if (minVal !== null && maxVal !== null && minVal > maxVal) {
      alert("সর্বনিম্ন দাম সর্বোচ্চ দামের চেয়ে বেশি হতে পারবে না");
      return;
    }

    onPriceChange(minVal, maxVal);
    setShowCustomModal(false);
  };

  const handleReset = () => {
    setTempMin("");
    setTempMax("");
    onPriceChange(null, null);
    setShowCustomModal(false);
  };

  return (
    <div
      style={{
        width: "100%",
        marginBottom: "16px",
        boxSizing: "border-box",
      }}
    >
      {/* Main Filter & Sort Flex Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "10px",
          background: "#ffffff",
          border: "1px solid #fecdd3",
          borderRadius: "14px",
          padding: "10px 14px",
          boxShadow: "0 2px 10px rgba(255, 77, 109, 0.05)",
        }}
      >
        {/* Left: Horizontal Scroll Quick Price Chips */}
        <div
          className="price-chips-scroll"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            overflowX: "auto",
            WebkitOverflowScrolling: "touch",
            paddingBottom: "2px",
            flex: "1 1 auto",
            minWidth: "260px",
          }}
        >
          <style>{`
            .price-chips-scroll::-webkit-scrollbar {
              display: none;
            }
            .price-chips-scroll {
              -ms-overflow-style: none;
              scrollbar-width: none;
            }
          `}</style>

          <span
            style={{
              fontSize: "12px",
              fontWeight: "800",
              color: "#64748b",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              marginRight: "4px",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              whiteSpace: "nowrap",
            }}
          >
            <span>🏷️</span>
            <span className="hidden-on-mobile">বাজেট:</span>
          </span>

          {PRESET_TIERS.map((tier) => {
            const isActive = currentActivePreset?.id === tier.id;
            return (
              <button
                key={tier.id}
                type="button"
                onClick={() => handleSelectPreset(tier)}
                style={{
                  background: isActive
                    ? "linear-gradient(135deg, #e11d48 0%, #be123c 100%)"
                    : "#fff5f6",
                  color: isActive ? "#ffffff" : "#475569",
                  border: isActive ? "1px solid #be123c" : "1px solid #fecdd3",
                  padding: "6px 12px",
                  borderRadius: "20px",
                  fontSize: "12.5px",
                  fontWeight: isActive ? "800" : "600",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  boxShadow: isActive ? "0 2px 8px rgba(225, 29, 72, 0.25)" : "none",
                  transition: "all 0.18s ease",
                }}
              >
                <span>{tier.label}</span>
                {tier.tag && !isActive && (
                  <span
                    style={{
                      fontSize: "9px",
                      background: "rgba(225, 29, 72, 0.08)",
                      color: "#e11d48",
                      padding: "1px 5px",
                      borderRadius: "10px",
                      fontWeight: "700",
                    }}
                  >
                    {tier.tag}
                  </span>
                )}
              </button>
            );
          })}

          {/* Custom Range Trigger Button */}
          <button
            type="button"
            onClick={() => setShowCustomModal(true)}
            style={{
              background: isCustomActive
                ? "linear-gradient(135deg, #e11d48 0%, #be123c 100%)"
                : "#ffffff",
              color: isCustomActive ? "#ffffff" : "#0f172a",
              border: isCustomActive ? "1px solid #be123c" : "1px dashed #cbd5e1",
              padding: "6px 12px",
              borderRadius: "20px",
              fontSize: "12.5px",
              fontWeight: isCustomActive ? "800" : "600",
              cursor: "pointer",
              whiteSpace: "nowrap",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              gap: "4px",
              boxShadow: isCustomActive ? "0 2px 8px rgba(225, 29, 72, 0.25)" : "none",
              transition: "all 0.18s ease",
            }}
          >
            <span>⚙️</span>
            <span>
              {isCustomActive
                ? `৳${activeMinPrice || 0} - ৳${activeMaxPrice || "..."}`
                : "কাস্টম রেঞ্জ"}
            </span>
          </button>

          {/* Clear Active Price Filter Pill */}
          {isAnyFilterActive && (
            <button
              type="button"
              onClick={handleReset}
              title="ফিল্টার ক্লিয়ার করুন"
              style={{
                background: "#fee2e2",
                color: "#dc2626",
                border: "1px solid #fca5a5",
                padding: "6px 10px",
                borderRadius: "20px",
                fontSize: "11.5px",
                fontWeight: "800",
                cursor: "pointer",
                whiteSpace: "nowrap",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                gap: "3px",
              }}
            >
              <span>✕</span>
              <span>মুছুন</span>
            </button>
          )}
        </div>

        {/* Right: Sort By Dropdown & Total Count */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            flexShrink: 0,
            marginLeft: "auto",
          }}
        >
          {totalProducts > 0 && (
            <span
              style={{
                fontSize: "12px",
                fontWeight: "700",
                color: "#64748b",
                whiteSpace: "nowrap",
              }}
            >
              {totalProducts}টি পণ্য
            </span>
          )}

          <div
            style={{
              position: "relative",
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            <span
              style={{
                position: "absolute",
                left: "10px",
                color: "#e11d48",
                fontSize: "12px",
                pointerEvents: "none",
              }}
            >
              ⇅
            </span>
            <select
              value={activeSort}
              onChange={(e) => onSortChange(e.target.value)}
              style={{
                background: "#fff1f2",
                color: "#881337",
                border: "1px solid #fecdd3",
                borderRadius: "20px",
                padding: "6px 12px 6px 26px",
                fontSize: "12.5px",
                fontWeight: "800",
                cursor: "pointer",
                outline: "none",
              }}
            >
              <option value="">⚡ সেরা মিল (Default)</option>
              <option value="price_asc">💰 দাম: কম থেকে বেশি ⬆️</option>
              <option value="price_desc">💎 দাম: বেশি থেকে কম ⬇️</option>
              <option value="newest">🆕 নতুন কালেকশন</option>
            </select>
          </div>
        </div>
      </div>

      {/* Modern Bottom Sheet / Modal for Custom Price Range */}
      {showCustomModal && (
        <div
          onClick={() => setShowCustomModal(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            animation: "fadeIn 0.2s ease",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#ffffff",
              width: "100%",
              maxWidth: "460px",
              borderRadius: "24px 24px 0 0",
              padding: "20px 24px 28px",
              boxShadow: "0 -8px 30px rgba(0, 0, 0, 0.2)",
              animation: "slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            <style>{`
              @keyframes slideUp {
                from { transform: translateY(100%); }
                to { transform: translateY(0); }
              }
              @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
              }
            `}</style>

            {/* Drag Pill Handle */}
            <div
              style={{
                width: "40px",
                height: "4px",
                background: "#cbd5e1",
                borderRadius: "4px",
                margin: "0 auto 16px",
              }}
            />

            {/* Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
              }}
            >
              <div>
                <h3
                  style={{
                    fontSize: "17px",
                    fontWeight: "900",
                    color: "#0f172a",
                    margin: 0,
                  }}
                >
                  🎯 বাজেট অনুযায়ী ফিল্টার করুন
                </h3>
                <p
                  style={{
                    fontSize: "12px",
                    color: "#64748b",
                    margin: "2px 0 0 0",
                  }}
                >
                  আপনার পছন্দসই সর্বনিম্ন ও সর্বোচ্চ দাম নির্ধারণ করুন
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowCustomModal(false)}
                style={{
                  background: "#f1f5f9",
                  border: "none",
                  borderRadius: "50%",
                  width: "32px",
                  height: "32px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#64748b",
                  fontSize: "14px",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            {/* Min & Max Inputs */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto 1fr",
                alignItems: "center",
                gap: "10px",
                marginBottom: "18px",
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "11px",
                    fontWeight: "700",
                    color: "#64748b",
                    marginBottom: "4px",
                    textTransform: "uppercase",
                  }}
                >
                  সর্বনিম্ন দাম (৳)
                </label>
                <div style={{ position: "relative" }}>
                  <span
                    style={{
                      position: "absolute",
                      left: "10px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#94a3b8",
                      fontWeight: "700",
                    }}
                  >
                    ৳
                  </span>
                  <input
                    type="number"
                    min="0"
                    placeholder="০"
                    value={tempMin}
                    onChange={(e) => setTempMin(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 10px 10px 24px",
                      borderRadius: "10px",
                      border: "1.5px solid #e2e8f0",
                      fontSize: "14px",
                      fontWeight: "700",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>

              <span
                style={{
                  color: "#cbd5e1",
                  fontSize: "20px",
                  marginTop: "16px",
                  fontWeight: "700",
                }}
              >
                —
              </span>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "11px",
                    fontWeight: "700",
                    color: "#64748b",
                    marginBottom: "4px",
                    textTransform: "uppercase",
                  }}
                >
                  সর্বোচ্চ দাম (৳)
                </label>
                <div style={{ position: "relative" }}>
                  <span
                    style={{
                      position: "absolute",
                      left: "10px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#94a3b8",
                      fontWeight: "700",
                    }}
                  >
                    ৳
                  </span>
                  <input
                    type="number"
                    min="0"
                    placeholder="৫,০০০"
                    value={tempMax}
                    onChange={(e) => setTempMax(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 10px 10px 24px",
                      borderRadius: "10px",
                      border: "1.5px solid #e2e8f0",
                      fontSize: "14px",
                      fontWeight: "700",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Quick Preset Pills */}
            <div style={{ marginBottom: "22px" }}>
              <div
                style={{
                  fontSize: "11.5px",
                  fontWeight: "700",
                  color: "#64748b",
                  marginBottom: "8px",
                }}
              >
                জনপ্রিয় বাজেট শর্টকাট:
              </div>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {[
                  { label: "৳৩০০ এর নিচে", min: "0", max: "300" },
                  { label: "৳৫০০ এর নিচে", min: "0", max: "500" },
                  { label: "৳৫০০ - ৳১০০০", min: "500", max: "1000" },
                  { label: "৳১০০০ - ৳২০০০", min: "1000", max: "2000" },
                ].map((sc, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setTempMin(sc.min);
                      setTempMax(sc.max);
                    }}
                    style={{
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: "16px",
                      padding: "4px 10px",
                      fontSize: "11.5px",
                      fontWeight: "600",
                      color: "#334155",
                      cursor: "pointer",
                    }}
                  >
                    {sc.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                type="button"
                onClick={handleReset}
                style={{
                  flex: 1,
                  padding: "12px 16px",
                  borderRadius: "12px",
                  border: "1px solid #cbd5e1",
                  background: "#f8fafc",
                  color: "#475569",
                  fontSize: "13.5px",
                  fontWeight: "700",
                  cursor: "pointer",
                }}
              >
                রিসেট
              </button>

              <button
                type="button"
                onClick={handleApplyCustom}
                style={{
                  flex: 2,
                  padding: "12px 16px",
                  borderRadius: "12px",
                  border: "none",
                  background: "linear-gradient(135deg, #e11d48 0%, #be123c 100%)",
                  color: "#ffffff",
                  fontSize: "13.5px",
                  fontWeight: "800",
                  cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(225, 29, 72, 0.3)",
                }}
              >
                ফিল্টার প্রয়োগ করুন ➔
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
