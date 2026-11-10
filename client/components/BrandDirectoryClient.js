"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

const POPULAR_BRAND_SLUGS = [
  "dr-althea",
  "cosrx",
  "beauty-of-joseon",
  "cerave",
  "sheglam",
  "the-ordinary",
  "axis-y",
  "skin1004",
  "anua",
  "dot-key",
  "beauty-glazed",
  "swiss-beauty"
];

const ALPHABETS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export default function BrandDirectoryClient({ initialBrands = [] }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLetter, setSelectedLetter] = useState("ALL");

  // Normalized brands list
  const brands = useMemo(() => {
    return Array.isArray(initialBrands) ? initialBrands : [];
  }, [initialBrands]);

  // Available letters set
  const availableLetters = useMemo(() => {
    const letters = new Set();
    brands.forEach((b) => {
      const firstChar = (b.name || "").trim().charAt(0).toUpperCase();
      if (/[A-Z]/.test(firstChar)) {
        letters.add(firstChar);
      } else {
        letters.add("#");
      }
    });
    return letters;
  }, [brands]);

  // Filtered brands based on search query and selected letter
  const filteredBrands = useMemo(() => {
    let result = brands;

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (b) =>
          (b.name || "").toLowerCase().includes(q) ||
          (b.slug || "").toLowerCase().includes(q)
      );
    }

    // Filter by alphabet
    if (selectedLetter !== "ALL") {
      if (selectedLetter === "#") {
        result = result.filter((b) => {
          const firstChar = (b.name || "").trim().charAt(0).toUpperCase();
          return !/[A-Z]/.test(firstChar);
        });
      } else {
        result = result.filter((b) => {
          const firstChar = (b.name || "").trim().charAt(0).toUpperCase();
          return firstChar === selectedLetter;
        });
      }
    }

    return result;
  }, [brands, searchQuery, selectedLetter]);

  // Quick popular brands
  const popularBrands = useMemo(() => {
    return brands.filter((b) =>
      POPULAR_BRAND_SLUGS.some((s) => b.slug?.toLowerCase().includes(s) || b.name?.toLowerCase().includes(s.replace(/-/g, " ")))
    ).slice(0, 10);
  }, [brands]);

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "16px 16px 48px" }}>
      {/* ── BREADCRUMB ── */}
      <nav style={{ marginBottom: "16px", fontSize: "13px", color: "#64748b" }}>
        <Link href="/" style={{ color: "#64748b", textDecoration: "none" }}>
          Home
        </Link>
        <span style={{ margin: "0 8px" }}>/</span>
        <span style={{ color: "#0f172a", fontWeight: 700 }}>All Brands</span>
      </nav>

      {/* ── HERO BANNER & SEARCH ── */}
      <div
        style={{
          background: "linear-gradient(135deg, #fff1f2 0%, #fdf4f5 50%, #fbf8f3 100%)",
          border: "1px solid #fed7aa22",
          borderRadius: "20px",
          padding: "32px 24px",
          textAlign: "center",
          marginBottom: "28px",
          boxShadow: "0 4px 20px rgba(244, 63, 94, 0.04)",
        }}
      >
        <span
          style={{
            display: "inline-block",
            fontSize: "12px",
            fontWeight: 800,
            letterSpacing: "1px",
            textTransform: "uppercase",
            color: "#e11d48",
            background: "#ffe4e6",
            padding: "4px 12px",
            borderRadius: "999px",
            marginBottom: "10px",
          }}
        >
          100% Authentic Brands
        </span>
        <h1
          style={{
            fontSize: "clamp(24px, 4vw, 36px)",
            fontWeight: 800,
            color: "#0f172a",
            margin: "0 0 10px",
            letterSpacing: "-0.5px",
          }}
        >
          Explore All Cosmetic & Skincare Brands
        </h1>
        <p
          style={{
            fontSize: "14px",
            color: "#64748b",
            maxWidth: "600px",
            margin: "0 auto 24px",
            lineHeight: 1.5,
          }}
        >
          Find your favorite authentic Korean, UK, and international beauty brands with guaranteed genuine products.
        </p>

        {/* ── SEARCH INPUT BOX ── */}
        <div
          style={{
            maxWidth: "560px",
            margin: "0 auto",
            position: "relative",
            display: "flex",
            alignItems: "center",
          }}
        >
          <span
            style={{
              position: "absolute",
              left: "16px",
              fontSize: "18px",
              color: "#94a3b8",
              pointerEvents: "none",
            }}
          >
            🔍
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (selectedLetter !== "ALL") setSelectedLetter("ALL");
            }}
            placeholder="Search brands... (e.g. Dr. Althea, Cosrx, CeraVe, SHEGLAM)"
            style={{
              width: "100%",
              padding: "14px 44px 14px 48px",
              fontSize: "15px",
              fontWeight: 500,
              color: "#0f172a",
              background: "#ffffff",
              border: "1.5px solid #e2e8f0",
              borderRadius: "999px",
              outline: "none",
              boxShadow: "0 4px 14px rgba(0, 0, 0, 0.05)",
              transition: "all 0.2s ease",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "#ff4d6d";
              e.currentTarget.style.boxShadow = "0 0 0 4px rgba(255, 77, 109, 0.12)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "#e2e8f0";
              e.currentTarget.style.boxShadow = "0 4px 14px rgba(0, 0, 0, 0.05)";
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              style={{
                position: "absolute",
                right: "14px",
                width: "24px",
                height: "24px",
                borderRadius: "50%",
                background: "#f1f5f9",
                border: "none",
                color: "#64748b",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "13px",
                fontWeight: 800,
              }}
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        {/* ── POPULAR QUICK TAGS ── */}
        {popularBrands.length > 0 && !searchQuery && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexWrap: "wrap",
              gap: "8px",
              marginTop: "20px",
            }}
          >
            <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 700 }}>
              Trending:
            </span>
            {popularBrands.map((b) => (
              <button
                key={b._id}
                type="button"
                onClick={() => setSearchQuery(b.name)}
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#e11d48",
                  background: "#ffffff",
                  border: "1px solid #fecdd3",
                  padding: "4px 10px",
                  borderRadius: "999px",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#e11d48";
                  e.currentTarget.style.color = "#ffffff";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#ffffff";
                  e.currentTarget.style.color = "#e11d48";
                }}
              >
                {b.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── ALPHABET FILTER BAR ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "4px",
          overflowX: "auto",
          padding: "8px 0 16px",
          marginBottom: "16px",
          scrollbarWidth: "none",
        }}
      >
        <button
          type="button"
          onClick={() => {
            setSelectedLetter("ALL");
            setSearchQuery("");
          }}
          style={{
            flexShrink: 0,
            padding: "6px 14px",
            borderRadius: "999px",
            fontSize: "12.5px",
            fontWeight: 700,
            cursor: "pointer",
            border: selectedLetter === "ALL" ? "none" : "1px solid #e2e8f0",
            background: selectedLetter === "ALL" ? "#0f172a" : "#ffffff",
            color: selectedLetter === "ALL" ? "#ffffff" : "#475569",
            transition: "all 0.15s ease",
          }}
        >
          ALL ({brands.length})
        </button>

        {ALPHABETS.map((letter) => {
          const hasBrands = availableLetters.has(letter);
          const isSelected = selectedLetter === letter;

          return (
            <button
              key={letter}
              type="button"
              disabled={!hasBrands}
              onClick={() => {
                setSelectedLetter(letter);
                setSearchQuery("");
              }}
              style={{
                flexShrink: 0,
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                fontSize: "12px",
                fontWeight: 700,
                cursor: hasBrands ? "pointer" : "default",
                border: isSelected ? "none" : "1px solid #e2e8f0",
                background: isSelected ? "#e11d48" : hasBrands ? "#ffffff" : "#f8fafc",
                color: isSelected ? "#ffffff" : hasBrands ? "#1e293b" : "#cbd5e1",
                opacity: hasBrands ? 1 : 0.45,
                transition: "all 0.15s ease",
              }}
            >
              {letter}
            </button>
          );
        })}

        <button
          type="button"
          disabled={!availableLetters.has("#")}
          onClick={() => {
            setSelectedLetter("#");
            setSearchQuery("");
          }}
          style={{
            flexShrink: 0,
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            fontSize: "12px",
            fontWeight: 700,
            cursor: availableLetters.has("#") ? "pointer" : "default",
            border: selectedLetter === "#" ? "none" : "1px solid #e2e8f0",
            background: selectedLetter === "#" ? "#e11d48" : "#ffffff",
            color: selectedLetter === "#" ? "#ffffff" : "#1e293b",
            transition: "all 0.15s ease",
          }}
        >
          #
        </button>
      </div>

      {/* ── RESULTS HEADER & COUNT ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "16px",
          paddingBottom: "8px",
          borderBottom: "1px solid #f1f5f9",
        }}
      >
        <span style={{ fontSize: "14px", fontWeight: 700, color: "#334155" }}>
          {searchQuery
            ? `Search Results for "${searchQuery}" (${filteredBrands.length})`
            : selectedLetter !== "ALL"
            ? `Brands starting with "${selectedLetter}" (${filteredBrands.length})`
            : `All Authentic Brands (${filteredBrands.length})`}
        </span>
        {(searchQuery || selectedLetter !== "ALL") && (
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setSelectedLetter("ALL");
            }}
            style={{
              background: "none",
              border: "none",
              color: "#e11d48",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* ── BRANDS GRID ── */}
      {filteredBrands.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "60px 20px",
            background: "#ffffff",
            borderRadius: "16px",
            border: "1px dashed #e2e8f0",
          }}
        >
          <div style={{ fontSize: "40px", marginBottom: "12px" }}>🔍</div>
          <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#0f172a", margin: "0 0 6px" }}>
            No brands found matching "{searchQuery}"
          </h3>
          <p style={{ fontSize: "14px", color: "#64748b", margin: "0 0 20px" }}>
            Try checking for spelling mistakes or browse our full collection of brands.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setSelectedLetter("ALL");
            }}
            style={{
              padding: "10px 24px",
              background: "#0f172a",
              color: "#ffffff",
              border: "none",
              borderRadius: "999px",
              fontSize: "13.5px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            View All Brands
          </button>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
            gap: "16px",
          }}
        >
          {filteredBrands.map((b) => (
            <Link
              key={b._id}
              href={`/brands/${b.slug}`}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "16px 12px 14px",
                background: "#ffffff",
                border: "1px solid #f1f5f9",
                borderRadius: "16px",
                textDecoration: "none",
                color: "#1e293b",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.03)",
                transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                position: "relative",
                overflow: "hidden",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-3px)";
                e.currentTarget.style.borderColor = "#fecdd3";
                e.currentTarget.style.boxShadow = "0 8px 20px rgba(244, 63, 94, 0.08)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.borderColor = "#f1f5f9";
                e.currentTarget.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.03)";
              }}
            >
              {/* Logo container */}
              <div
                style={{
                  width: "76px",
                  height: "76px",
                  borderRadius: "14px",
                  background: "#f8fafc",
                  border: "1px solid #f1f5f9",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  padding: "6px",
                  marginBottom: "10px",
                }}
              >
                {b.logo ? (
                  <img
                    src={
                      b.logo.includes("/upload/")
                        ? b.logo.replace("/upload/", "/upload/f_auto,q_auto,w_200/")
                        : b.logo
                    }
                    alt={b.name}
                    width={64}
                    height={64}
                    style={{ objectFit: "contain", width: "100%", height: "100%" }}
                    loading="lazy"
                  />
                ) : (
                  <span
                    style={{
                      fontSize: "20px",
                      fontWeight: 800,
                      color: "#e11d48",
                      background: "#fff1f2",
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "10px",
                    }}
                  >
                    {b.name.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>

              {/* Brand Name */}
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: 700,
                  textAlign: "center",
                  color: "#0f172a",
                  lineHeight: 1.3,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  minHeight: "34px",
                }}
                title={b.name}
              >
                {b.name}
              </span>

              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "#e11d48",
                  marginTop: "6px",
                }}
              >
                View products →
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
