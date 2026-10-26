"use client";

import { useEffect, useState, use, useMemo } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import ProductGrid from "@/components/ProductGrid";
import { API_BASE_URL, getImageUrl } from "@/lib/api";
import { cld } from "@/lib/cloudinary";
import { useCart } from "@/context/CartContext";

export default function BrandProductsPage({ params }) {
  const unwrappedParams = use(params);
  const slug = (unwrappedParams?.slug || "").trim();
  const { addToCart } = useCart();
  const [searchTerm, setSearchTerm] = useState("");

  const [brandInfo, setBrandInfo] = useState(null);
  const [allBrands, setAllBrands] = useState([]);
  const [showcaseProducts, setShowcaseProducts] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [activeTab, setActiveTab] = useState("highlights"); // "highlights" | "popular" | "newFinds"
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [loadingShowcase, setLoadingShowcase] = useState(true);

  const brandDisplayName = useMemo(() => {
    if (brandInfo?.name) return brandInfo.name;
    return decodeURIComponent(slug)
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }, [brandInfo, slug]);

  // 1. Fetch brand list for "More brands" sidebar & brand info
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/brands`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setAllBrands(data);
          const found = data.find(
            (b) =>
              b.slug?.toLowerCase() === slug.toLowerCase() ||
              b.name?.toLowerCase() === slug.toLowerCase()
          );
          if (found) setBrandInfo(found);
        }
      })
      .catch((err) => console.error("Error fetching brands list:", err));
  }, [slug]);

  // 2. Fetch products for this brand to populate count & top showcase cards
  useEffect(() => {
    setLoadingShowcase(true);
    fetch(`${API_BASE_URL}/api/products?brand=${encodeURIComponent(slug)}&paginate=1&limit=12`)
      .then((r) => r.json())
      .then((data) => {
        if (data && Array.isArray(data.products)) {
          setShowcaseProducts(data.products);
          setTotalCount(data.total || data.products.length);
        } else if (Array.isArray(data)) {
          setShowcaseProducts(data);
          setTotalCount(data.length);
        }
      })
      .catch((err) => console.error("Error fetching brand showcase:", err))
      .finally(() => setLoadingShowcase(false));
  }, [slug]);

  // Slices for the 3 tabs
  const tabCards = useMemo(() => {
    if (!showcaseProducts || showcaseProducts.length === 0) return [];
    if (activeTab === "popular") {
      const sorted = [...showcaseProducts].sort(
        (a, b) => (b.reviewCount || 0) - (a.reviewCount || 0)
      );
      return sorted.slice(0, 4);
    }
    if (activeTab === "newFinds") {
      return showcaseProducts.slice(4, 8).length >= 2
        ? showcaseProducts.slice(4, 8)
        : showcaseProducts.slice(0, 4);
    }
    // highlights default:
    return showcaseProducts.slice(0, 4);
  }, [showcaseProducts, activeTab]);

  const handleRefreshShowcase = () => {
    setActiveTab((curr) => {
      if (curr === "highlights") return "popular";
      if (curr === "popular") return "newFinds";
      return "highlights";
    });
  };

  const handleScrollToCatalog = () => {
    const el = document.getElementById("brand-products-section");
    if (el) {
      const topOffset = el.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top: topOffset, behavior: "smooth" });
    }
  };

  const cardLabels = ["01 Bestseller", "02 New find", "03 Discover", "04 Discover"];

  return (
    <main className="jt-page" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#fcfaf8" }}>
      <Header searchTerm={searchTerm} onSearchChange={setSearchTerm} />

      {/* ── BREADCRUMB ── */}
      <nav style={{ maxWidth: "1440px", margin: "16px auto 0", padding: "0 20px", width: "100%", boxSizing: "border-box" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#64748b" }}>
          <Link href="/" style={{ color: "#64748b", textDecoration: "none" }}>Home</Link>
          <span>/</span>
          <Link href="/brands" style={{ color: "#64748b", textDecoration: "none" }}>Brands</Link>
          <span>/</span>
          <span style={{ color: "#1e293b", fontWeight: 700 }}>{brandDisplayName}</span>
        </div>
      </nav>

      {/* ── BRAND SHOWCASE HERO (OGERIO STYLE) ── */}
      <section style={{ maxWidth: "1440px", margin: "16px auto 0", padding: "0 20px", width: "100%", boxSizing: "border-box" }}>
        <div
          style={{
            background: "linear-gradient(135deg, #fdf6f7 0%, #faf5fe 45%, #fef8f0 100%)",
            border: "1px solid #f2e2e7",
            borderRadius: "24px",
            padding: "28px 32px",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.03)",
            display: "flex",
            gap: "32px",
            alignItems: "stretch",
            flexWrap: "wrap",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Subtle curved background illustration circle */}
          <div
            style={{
              position: "absolute",
              top: "-50px",
              left: "-50px",
              width: "220px",
              height: "220px",
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(254, 205, 211, 0.4) 0%, rgba(255, 255, 255, 0) 70%)",
              pointerEvents: "none",
            }}
          />

          {/* LEFT COLUMN: BRAND INFO & CALL TO ACTION */}
          <div
            style={{
              flex: "0 0 280px",
              minWidth: "240px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              zIndex: 1,
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                {brandInfo?.logo ? (
                  <img
                    src={brandInfo.logo.includes("/upload/") ? brandInfo.logo.replace("/upload/", "/upload/f_auto,q_auto,w_80/") : brandInfo.logo}
                    alt={brandDisplayName}
                    style={{ width: 34, height: 34, objectFit: "contain", borderRadius: 8, background: "#ffffff", padding: 2, border: "1px solid #f1f5f9" }}
                  />
                ) : (
                  <span
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: "#ff4d6d",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 800,
                      fontSize: 16,
                    }}
                  >
                    {brandDisplayName.charAt(0)}
                  </span>
                )}
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    letterSpacing: "0.5px",
                    textTransform: "uppercase",
                    color: "#e11d48",
                    background: "rgba(225, 29, 72, 0.08)",
                    padding: "3px 8px",
                    borderRadius: "6px",
                  }}
                >
                  Official Brand
                </span>
              </div>

              <h1
                style={{
                  margin: "4px 0 2px",
                  fontSize: "36px",
                  color: "#1e1b4b",
                  fontWeight: 800,
                  letterSpacing: "-0.5px",
                  lineHeight: 1.15,
                }}
              >
                {brandDisplayName}
              </h1>

              <p style={{ margin: "4px 0 14px", fontSize: "14px", color: "#64748b", fontWeight: 600 }}>
                {totalCount > 0 ? `${totalCount} products` : "Curated Collection"}
              </p>

              <button
                type="button"
                onClick={() => setIsGuideOpen(true)}
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  fontSize: "13.5px",
                  fontWeight: 600,
                  color: "#334155",
                  textDecoration: "underline",
                  textUnderlineOffset: "3px",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                Read the guide ↗
              </button>
            </div>

            <div style={{ marginTop: "24px" }}>
              <button
                type="button"
                onClick={handleScrollToCatalog}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 22px",
                  borderRadius: "999px",
                  background: "#ffffff",
                  border: "1.5px solid #1e1b4b",
                  color: "#1e1b4b",
                  fontSize: "14px",
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                  boxShadow: "0 2px 8px rgba(30, 27, 75, 0.06)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#1e1b4b";
                  e.currentTarget.style.color = "#ffffff";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#ffffff";
                  e.currentTarget.style.color = "#1e1b4b";
                }}
              >
                Shop collection →
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN: SHOWCASE TABS & 4 MINI PRODUCT CARDS */}
          <div style={{ flex: 1, minWidth: "320px", display: "flex", flexDirection: "column", gap: "14px", zIndex: 1 }}>
            {/* TABS & REFRESH BAR */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <button
                  type="button"
                  onClick={() => setActiveTab("highlights")}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "999px",
                    fontSize: "12.5px",
                    fontWeight: 700,
                    cursor: "pointer",
                    border: activeTab === "highlights" ? "none" : "1px solid #e2e8f0",
                    background: activeTab === "highlights" ? "#382025" : "#ffffff",
                    color: activeTab === "highlights" ? "#ffffff" : "#475569",
                    transition: "all 0.2s ease",
                  }}
                >
                  Highlights
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("popular")}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "999px",
                    fontSize: "12.5px",
                    fontWeight: 700,
                    cursor: "pointer",
                    border: activeTab === "popular" ? "none" : "1px solid #e2e8f0",
                    background: activeTab === "popular" ? "#382025" : "#ffffff",
                    color: activeTab === "popular" ? "#ffffff" : "#475569",
                    transition: "all 0.2s ease",
                  }}
                >
                  Popular
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("newFinds")}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "999px",
                    fontSize: "12.5px",
                    fontWeight: 700,
                    cursor: "pointer",
                    border: activeTab === "newFinds" ? "none" : "1px solid #e2e8f0",
                    background: activeTab === "newFinds" ? "#382025" : "#ffffff",
                    color: activeTab === "newFinds" ? "#ffffff" : "#475569",
                    transition: "all 0.2s ease",
                  }}
                >
                  New finds
                </button>
              </div>

              <button
                type="button"
                onClick={handleRefreshShowcase}
                title="Shuffle highlights"
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  color: "#475569",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  fontSize: "14px",
                  transition: "all 0.2s ease",
                }}
              >
                ⟳
              </button>
            </div>

            {/* 4 MINI SHOWCASE CARDS ROW */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                gap: "12px",
              }}
            >
              {tabCards.slice(0, 4).map((p, idx) => {
                const imgUrl = getImageUrl(p.image);
                const label = cardLabels[idx] || "Discover";

                return (
                  <Link
                    key={p._id}
                    href={`/products/${p._id}`}
                    style={{
                      textDecoration: "none",
                      background: "#ffffff",
                      borderRadius: "14px",
                      padding: "10px",
                      border: "1px solid #f1f5f9",
                      boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      transition: "transform 0.2s ease, box-shadow 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow = "0 6px 16px rgba(0,0,0,0.06)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "0 2px 10px rgba(0,0,0,0.03)";
                    }}
                  >
                    <div>
                      <span
                        style={{
                          fontSize: "10.5px",
                          fontWeight: 700,
                          color: "#78716c",
                          display: "block",
                          marginBottom: "6px",
                          letterSpacing: "0.2px",
                        }}
                      >
                        {label}
                      </span>

                      <div
                        style={{
                          position: "relative",
                          width: "100%",
                          paddingBottom: "100%",
                          borderRadius: "10px",
                          overflow: "hidden",
                          background: "#fafafa",
                        }}
                      >
                        <img
                          src={cld(imgUrl, 300, 300)}
                          alt={p.name}
                          loading="lazy"
                          style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            height: "100%",
                            objectFit: "contain",
                            padding: "4px",
                            boxSizing: "border-box",
                          }}
                        />
                        {/* Circular arrow icon */}
                        <div
                          style={{
                            position: "absolute",
                            bottom: "6px",
                            right: "6px",
                            width: "24px",
                            height: "24px",
                            borderRadius: "50%",
                            background: "#201419",
                            color: "#ffffff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "12px",
                            boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
                          }}
                        >
                          ↗
                        </div>
                      </div>

                      <h4
                        style={{
                          fontSize: "12px",
                          fontWeight: 600,
                          color: "#1e293b",
                          lineHeight: 1.35,
                          margin: "8px 0 4px",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                          height: "32px",
                        }}
                        title={p.name}
                      >
                        {p.name}
                      </h4>
                    </div>

                    <p style={{ margin: "2px 0 0", fontSize: "14px", fontWeight: 800, color: "#0f172a" }}>
                      ৳{p.offerPrice || p.originalPrice || 0}
                    </p>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── TWO-COLUMN BODY: MORE BRANDS SIDEBAR + PRODUCT GRID ── */}
      <section
        id="brand-products-section"
        style={{
          maxWidth: "1440px",
          margin: "28px auto 40px",
          padding: "0 20px",
          flex: 1,
          width: "100%",
          boxSizing: "border-box",
          display: "flex",
          gap: "28px",
          alignItems: "flex-start",
        }}
      >
        {/* LEFT SIDEBAR: "More brands" (Desktop Sticky) */}
        <aside
          style={{
            width: "210px",
            flexShrink: 0,
            position: "sticky",
            top: "84px",
            maxHeight: "calc(100vh - 100px)",
            overflowY: "auto",
            paddingRight: "6px",
            display: "none", // Toggled via CSS below on desktop
          }}
          className="jt-brand-sidebar-desktop"
        >
          <h3
            style={{
              fontSize: "17px",
              fontWeight: 800,
              color: "#0f172a",
              margin: "0 0 12px",
              letterSpacing: "-0.2px",
            }}
          >
            More brands
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            <Link
              href="/products"
              style={{
                fontSize: "13.5px",
                fontWeight: 600,
                color: "#475569",
                padding: "7px 10px",
                borderRadius: "8px",
                textDecoration: "none",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#f1f5f9"; e.currentTarget.style.color = "#0f172a"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#475569"; }}
            >
              All products
            </Link>

            {allBrands.map((b) => {
              const isCurrent =
                b.slug?.toLowerCase() === slug.toLowerCase() ||
                b.name?.toLowerCase() === slug.toLowerCase();

              return (
                <Link
                  key={b._id}
                  href={`/brands/${b.slug}`}
                  style={{
                    fontSize: "13.5px",
                    fontWeight: isCurrent ? 800 : 500,
                    color: isCurrent ? "#e11d48" : "#475569",
                    background: isCurrent ? "#ffe4e6" : "transparent",
                    padding: "7px 10px",
                    borderRadius: "8px",
                    textDecoration: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!isCurrent) {
                      e.currentTarget.style.background = "#f8fafc";
                      e.currentTarget.style.color = "#0f172a";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isCurrent) {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = "#475569";
                    }
                  }}
                >
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {b.name}
                  </span>
                  {isCurrent && <span style={{ fontSize: "11px" }}>●</span>}
                </Link>
              );
            })}
          </div>
        </aside>

        {/* RIGHT SECTION: PRODUCT GRID */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Mobile brand chips scroller */}
          <div
            className="jt-brand-chips-mobile"
            style={{
              display: "none",
              overflowX: "auto",
              whiteSpace: "nowrap",
              gap: "8px",
              paddingBottom: "12px",
              marginBottom: "12px",
            }}
          >
            <Link
              href="/products"
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: "#475569",
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                padding: "6px 12px",
                borderRadius: "999px",
                textDecoration: "none",
                display: "inline-block",
              }}
            >
              All products
            </Link>
            {allBrands.slice(0, 20).map((b) => {
              const isCurrent =
                b.slug?.toLowerCase() === slug.toLowerCase() ||
                b.name?.toLowerCase() === slug.toLowerCase();
              return (
                <Link
                  key={b._id}
                  href={`/brands/${b.slug}`}
                  style={{
                    fontSize: "12px",
                    fontWeight: isCurrent ? 700 : 500,
                    color: isCurrent ? "#ffffff" : "#475569",
                    background: isCurrent ? "#ff4d6d" : "#ffffff",
                    border: `1px solid ${isCurrent ? "#ff4d6d" : "#e2e8f0"}`,
                    padding: "6px 12px",
                    borderRadius: "999px",
                    textDecoration: "none",
                    display: "inline-block",
                  }}
                >
                  {b.name}
                </Link>
              );
            })}
          </div>

          <ProductGrid
            brand={slug}
            searchTerm={searchTerm}
            onAddToCart={addToCart}
            title=""
            showCategoryBar={false}
            showPagination={true}
          />
        </div>
      </section>

      {/* ── BRAND GUIDE MODAL ── */}
      {isGuideOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
          onClick={() => setIsGuideOpen(false)}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "20px",
              maxWidth: "520px",
              width: "100%",
              padding: "28px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsGuideOpen(false)}
              style={{
                position: "absolute",
                top: "16px",
                right: "16px",
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                border: "none",
                background: "#f1f5f9",
                cursor: "pointer",
                fontSize: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ✕
            </button>

            <span
              style={{
                fontSize: "11px",
                fontWeight: 800,
                color: "#e11d48",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Brand Guide & Authenticity
            </span>
            <h2 style={{ margin: "6px 0 12px", fontSize: "22px", color: "#0f172a", fontWeight: 800 }}>
              {brandDisplayName} at LIORA
            </h2>

            <div style={{ fontSize: "14px", color: "#475569", lineHeight: 1.6, display: "flex", flexDirection: "column", gap: "10px" }}>
              <p style={{ margin: 0 }}>
                {brandInfo?.description ||
                  `Welcome to the official ${brandDisplayName} collection on LIORA Beauty & Wear. We are dedicated to providing 100% authentic cosmetic and skincare products imported from verified distributors.`}
              </p>
              <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                <strong style={{ color: "#0f172a" }}>✓ 100% Genuine Guarantee:</strong> Every batch is verified for quality and authenticity.
                <br />
                <strong style={{ color: "#0f172a" }}>✓ Fast Nationwide Delivery:</strong> Cash on delivery available across all 64 districts.
                <br />
                <strong style={{ color: "#0f172a" }}>✓ Wholesale Available:</strong> Order in bulk at wholesale rates for verified resellers.
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsGuideOpen(false)}
              style={{
                marginTop: "20px",
                width: "100%",
                padding: "12px",
                borderRadius: "10px",
                background: "#ff4d6d",
                color: "#ffffff",
                border: "none",
                fontWeight: 700,
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              Got it, let’s shop!
            </button>
          </div>
        </div>
      )}

      {/* Responsive styles */}
      <style jsx global>{`
        @media (min-width: 900px) {
          .jt-brand-sidebar-desktop {
            display: block !important;
          }
          .jt-brand-chips-mobile {
            display: none !important;
          }
        }
        @media (max-width: 899px) {
          .jt-brand-sidebar-desktop {
            display: none !important;
          }
          .jt-brand-chips-mobile {
            display: flex !important;
          }
        }
      `}</style>
    </main>
  );
}
