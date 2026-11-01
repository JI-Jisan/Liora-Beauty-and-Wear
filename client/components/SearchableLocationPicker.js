"use client";

import { useState, useMemo, useEffect, useRef } from "react";

export default function SearchableLocationPicker({
  label,
  value,
  onChange,
  options = [], // Can be array of objects ({ id, nameEn, nameBn }) or array of strings (["Mirpur", "Uttara"])
  placeholder = "নির্বাচন করুন",
  searchPlaceholder = "নাম লিখে খুঁজুন...",
  popularItems = [],
  disabled = false,
  disabledMessage = "প্রথমে জেলা নির্বাচন করুন",
  required = false,
  icon = "📍",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const inputRef = useRef(null);
  const modalRef = useRef(null);

  // Normalize options into uniform { id, value, labelEn, labelBn, display }
  const normalizedOptions = useMemo(() => {
    return options.map((opt) => {
      if (typeof opt === "string") {
        return {
          id: opt,
          value: opt,
          labelEn: opt,
          labelBn: "",
          display: opt,
        };
      }
      return {
        id: opt.id || opt.nameEn,
        value: opt.nameEn || opt.id,
        labelEn: opt.nameEn || "",
        labelBn: opt.nameBn || "",
        display: opt.nameBn ? `${opt.nameBn} (${opt.nameEn})` : opt.nameEn,
      };
    });
  }, [options]);

  // Selected item display text
  const selectedDisplay = useMemo(() => {
    if (!value) return "";
    const found = normalizedOptions.find(
      (opt) => opt.value?.toLowerCase() === String(value).toLowerCase()
    );
    return found ? found.display : value;
  }, [value, normalizedOptions]);

  // Filtered list based on search query (matches English and Bengali)
  const filteredOptions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return normalizedOptions;

    return normalizedOptions.filter((opt) => {
      const en = opt.labelEn.toLowerCase();
      const bn = opt.labelBn.toLowerCase();
      const disp = opt.display.toLowerCase();
      return en.includes(q) || bn.includes(q) || disp.includes(q);
    });
  }, [normalizedOptions, searchQuery]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      const timer = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 120);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Lock body scroll when mobile modal is open
  useEffect(() => {
    if (isOpen) {
      const origOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = origOverflow;
      };
    }
  }, [isOpen]);

  const handleSelect = (val) => {
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div style={{ width: "100%", position: "relative" }}>
      {label && (
        <label
          style={{
            display: "block",
            fontSize: "13px",
            fontWeight: "700",
            color: "#334155",
            marginBottom: "6px",
          }}
        >
          {label}
        </label>
      )}

      {/* Trigger Button / Form Box */}
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={() => {
          if (!disabled) setIsOpen(true);
        }}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !disabled) {
            e.preventDefault();
            setIsOpen(true);
          }
        }}
        style={{
          width: "100%",
          padding: "11px 12px",
          borderRadius: "10px",
          border: disabled ? "1.5px dashed #cbd5e1" : "1.5px solid #cbd5e1",
          background: disabled ? "#f8fafc" : "#ffffff",
          color: disabled ? "#94a3b8" : value ? "#0f172a" : "#64748b",
          fontSize: "14px",
          fontWeight: value ? "700" : "500",
          cursor: disabled ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "8px",
          boxSizing: "border-box",
          transition: "all 0.2s ease",
          boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0, overflow: "hidden" }}>
          <span style={{ fontSize: "16px", flexShrink: 0 }}>{icon}</span>
          <span
            style={{
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              color: disabled ? "#94a3b8" : value ? "#0f172a" : "#64748b",
            }}
          >
            {disabled ? disabledMessage : selectedDisplay || placeholder}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
          {value && !disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
              title="Clear"
              aria-label="Clear selection"
              style={{
                background: "#f1f5f9",
                border: "none",
                borderRadius: "50%",
                width: "20px",
                height: "20px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "11px",
                color: "#64748b",
                cursor: "pointer",
              }}
            >
              ✕
            </button>
          )}
          <span style={{ fontSize: "11px", color: "#64748b" }}>▼</span>
        </div>
      </div>

      {/* Hidden real input for required form validation */}
      {required && (
        <input
          tabIndex={-1}
          autoComplete="off"
          style={{
            opacity: 0,
            width: 1,
            height: 1,
            position: "absolute",
            pointerEvents: "none",
            bottom: 0,
            left: 10,
          }}
          value={value || ""}
          onChange={() => {}}
          required
        />
      )}

      {/* SEARCH MODAL / BOTTOM SHEET */}
      {isOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999999,
            background: "rgba(15, 23, 42, 0.55)",
            backdropFilter: "blur(4px)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end", // Bottom sheet on mobile
            alignItems: "center",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsOpen(false);
          }}
        >
          <div
            ref={modalRef}
            style={{
              width: "100%",
              maxWidth: "520px",
              background: "#ffffff",
              borderRadius: "20px 20px 0 0",
              boxShadow: "0 -10px 40px rgba(0, 0, 0, 0.25)",
              display: "flex",
              flexDirection: "column",
              maxHeight: "85vh",
              overflow: "hidden",
              animation: "jtSheetSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "16px 20px 12px",
                borderBottom: "1px solid #f1f5f9",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "#fafafa",
              }}
            >
              <div>
                <h4 style={{ margin: 0, fontSize: "16px", fontWeight: "800", color: "#0f172a" }}>
                  {label ? label.replace(/[*📍🏘️]/g, "").trim() : "নির্বাচন করুন"}
                </h4>
                <span style={{ fontSize: "11.5px", color: "#64748b" }}>
                  নাম লিখে দ্রুত খুঁজুন অথবা তালিকা থেকে ট্যাপ করুন
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close"
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  border: "none",
                  background: "#e2e8f0",
                  color: "#334155",
                  fontSize: "14px",
                  fontWeight: "bold",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ✕
              </button>
            </div>

            {/* Sticky Search Input Box */}
            <div style={{ padding: "12px 16px", background: "#ffffff", borderBottom: "1px solid #f1f5f9" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  background: "#f8fafc",
                  border: "1.5px solid #e2e8f0",
                  borderRadius: "12px",
                  padding: "0 14px",
                  transition: "border-color 0.2s",
                }}
              >
                <span style={{ fontSize: "16px", color: "#64748b" }}>🔍</span>
                <input
                  ref={inputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  style={{
                    width: "100%",
                    padding: "12px 0",
                    border: "none",
                    outline: "none",
                    background: "transparent",
                    fontSize: "15px",
                    fontWeight: "600",
                    color: "#0f172a",
                  }}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      if (inputRef.current) inputRef.current.focus();
                    }}
                    style={{
                      background: "#cbd5e1",
                      border: "none",
                      borderRadius: "50%",
                      width: "20px",
                      height: "20px",
                      color: "#334155",
                      cursor: "pointer",
                      fontSize: "10px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Quick Popular Chips */}
            {popularItems.length > 0 && !searchQuery && (
              <div
                style={{
                  padding: "8px 16px 10px",
                  background: "#fdf2f8",
                  borderBottom: "1px solid #fce7f3",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  flexWrap: "wrap",
                }}
              >
                <span style={{ fontSize: "11px", fontWeight: "800", color: "#be185d" }}>
                  ⚡ জনপ্রিয়:
                </span>
                {popularItems.map((popVal) => {
                  const popOpt = normalizedOptions.find(
                    (o) => o.value?.toLowerCase() === popVal.toLowerCase()
                  );
                  const isCurrent = value?.toLowerCase() === popVal.toLowerCase();
                  return (
                    <button
                      key={popVal}
                      type="button"
                      onClick={() => handleSelect(popVal)}
                      style={{
                        padding: "4px 10px",
                        borderRadius: "16px",
                        background: isCurrent ? "#e11d48" : "#ffffff",
                        color: isCurrent ? "#ffffff" : "#9f1239",
                        border: isCurrent ? "1px solid #e11d48" : "1px solid #fbcfe8",
                        fontSize: "12px",
                        fontWeight: "700",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {popOpt ? popOpt.display : popVal}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Scrollable Results List */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "8px 12px 24px",
                maxHeight: "50vh",
                WebkitOverflowScrolling: "touch",
              }}
            >
              {filteredOptions.length > 0 ? (
                filteredOptions.map((opt) => {
                  const isSelected =
                    opt.value?.toLowerCase() === String(value || "").toLowerCase();
                  return (
                    <div
                      key={opt.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleSelect(opt.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleSelect(opt.value);
                        }
                      }}
                      style={{
                        padding: "12px 14px",
                        borderRadius: "10px",
                        background: isSelected ? "#fff1f2" : "#ffffff",
                        color: isSelected ? "#e11d48" : "#1e293b",
                        fontWeight: isSelected ? "800" : "600",
                        fontSize: "14.5px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        cursor: "pointer",
                        borderBottom: "1px solid #f8fafc",
                        transition: "background 0.15s ease",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ fontSize: "14px", color: isSelected ? "#e11d48" : "#94a3b8" }}>
                          {icon}
                        </span>
                        <span>{opt.display}</span>
                      </div>
                      {isSelected && (
                        <span style={{ color: "#e11d48", fontSize: "16px", fontWeight: "900" }}>
                          ✓
                        </span>
                      )}
                    </div>
                  );
                })
              ) : (
                <div style={{ padding: "30px 20px", textAlign: "center", color: "#64748b" }}>
                  <div style={{ fontSize: "28px", marginBottom: "8px" }}>🔍</div>
                  <strong style={{ display: "block", fontSize: "14px", color: "#0f172a" }}>
                    &quot;{searchQuery}&quot; দিয়ে কোনো ফলাফল পাওয়া যায়নি
                  </strong>
                  <span style={{ fontSize: "12px", display: "block", marginTop: "4px" }}>
                    বানান সঠিক কিনা যাচাই করুন অথবা নিচে বিকল্প ট্যাপ করুন
                  </span>

                  {/* Allow custom typing if it's a specific area/thana */}
                  {searchQuery.trim().length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleSelect(searchQuery.trim())}
                      style={{
                        marginTop: "14px",
                        padding: "8px 16px",
                        borderRadius: "8px",
                        background: "#0f172a",
                        color: "#ffffff",
                        border: "none",
                        fontWeight: "700",
                        fontSize: "13px",
                        cursor: "pointer",
                      }}
                    >
                      ➕ &quot;{searchQuery.trim()}&quot; এলাকা হিসেবে ব্যবহার করুন
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Global CSS for Bottom Sheet Animation */}
      <style jsx global>{`
        @keyframes jtSheetSlideUp {
          from {
            transform: translateY(100%);
            opacity: 0.5;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
