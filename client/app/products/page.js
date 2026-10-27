"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import ProductGrid from "@/components/ProductGrid";
import { API_BASE_URL } from "@/lib/api";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/components/AuthProvider";

function ProductsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isWholesale, isReseller } = useAuth();
  const homeHref = isWholesale ? "/wholesale" : isReseller ? "/reseller" : "/";
  const urlSearch = searchParams ? searchParams.get("search") || "" : "";
  const filterParam = searchParams ? searchParams.get("filter") || "" : "";
  const [searchTerm, setSearchTerm] = useState(urlSearch);
  const { addToCart } = useCart();

  useEffect(() => {
    if (urlSearch !== undefined) {
      setSearchTerm(urlSearch);
    }
  }, [urlSearch]);

  const [siteSettings, setSiteSettings] = useState({
    brandName: "LIORA Beauty & Wear",
    brandSubtitle: "Beauty. Style. You.",
  });

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/settings`)
      .then((res) => res.json())
      .then((data) =>
        setSiteSettings({
          brandName: data.brandName || "LIORA Beauty & Wear",
          brandSubtitle: data.brandSubtitle || "Beauty. Style. You.",
        })
      )
      .catch((err) => console.error(err));
  }, []);

  const handleClearSearch = () => {
    setSearchTerm("");
    router.push("/products");
  };

  const isSearching = Boolean(searchTerm && searchTerm.trim());

  return (
    <main className="jt-page" style={{ minHeight: "100vh", background: "#fcfaf8", display: "flex", flexDirection: "column" }}>
      <Header
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        brandName={siteSettings.brandName}
        brandSubtitle={siteSettings.brandSubtitle}
      />

      {/* ── LUXURY HERO SEARCH / CATALOG BANNER ── */}
      <section style={{ maxWidth: "1440px", margin: "16px auto 0", padding: "0 20px", width: "100%", boxSizing: "border-box" }}>
        {isSearching ? (
          <div
            style={{
              background: "linear-gradient(135deg, #fff1f2 0%, #fff7f8 50%, #fdf2f4 100%)",
              border: "1px solid #fecdd3",
              borderRadius: "22px",
              padding: "24px 28px",
              boxShadow: "0 4px 20px rgba(255, 77, 109, 0.06)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "16px",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Subtle background glow */}
            <div
              style={{
                position: "absolute",
                top: "-40px",
                right: "-40px",
                width: "180px",
                height: "180px",
                borderRadius: "50%",
                background: "radial-gradient(circle, rgba(254, 205, 211, 0.45) 0%, rgba(255, 255, 255, 0) 70%)",
                pointerEvents: "none",
              }}
            />

            <div style={{ zIndex: 1 }}>
              {/* Breadcrumb */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#64748b", marginBottom: "8px" }}>
                <Link href={homeHref} style={{ color: "#64748b", textDecoration: "none" }}>Home</Link>
                <span>/</span>
                <Link href="/products" style={{ color: "#64748b", textDecoration: "none" }}>Products</Link>
                <span>/</span>
                <span style={{ color: "#ff4d6d", fontWeight: 700 }}>Search Results</span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "3px 10px",
                    borderRadius: "20px",
                    fontSize: "11px",
                    fontWeight: 800,
                    letterSpacing: "0.5px",
                    textTransform: "uppercase",
                    background: "#ffffff",
                    color: "#ff4d6d",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
                  }}
                >
                  🔍 Search Results
                </span>
              </div>

              <h1
                style={{
                  margin: "4px 0 6px",
                  fontSize: "clamp(22px, 3.5vw, 30px)",
                  color: "#0f172a",
                  fontWeight: 800,
                  lineHeight: 1.25,
                  letterSpacing: "-0.5px",
                }}
              >
                Results for <span style={{ color: "#ff4d6d" }}>“{searchTerm.trim()}”</span>
              </h1>

              <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>
                Showing matching authentic cosmetics & skincare items in Bangladesh.
              </p>
            </div>

            {/* Clear button */}
            <button
              type="button"
              onClick={handleClearSearch}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "9px 18px",
                borderRadius: "999px",
                background: "#ffffff",
                border: "1px solid #fecdd3",
                color: "#e11d48",
                fontSize: "13.5px",
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.2s ease",
                boxShadow: "0 2px 8px rgba(225, 29, 72, 0.08)",
                zIndex: 1,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#fff1f2";
                e.currentTarget.style.borderColor = "#fda4af";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#ffffff";
                e.currentTarget.style.borderColor = "#fecdd3";
              }}
            >
              ✕ Clear Search
            </button>
          </div>
        ) : (
          <div
            style={{
              background: "linear-gradient(135deg, #fff1f2 0%, #fff7f8 50%, #fdf2f4 100%)",
              border: "1px solid #fecdd3",
              borderRadius: "22px",
              padding: "24px 28px",
              boxShadow: "0 4px 20px rgba(255, 77, 109, 0.06)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "16px",
            }}
          >
            <div>
              {/* Breadcrumb */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#64748b", marginBottom: "8px" }}>
                <Link href={homeHref} style={{ color: "#64748b", textDecoration: "none" }}>Home</Link>
                <span>/</span>
                <span style={{ color: "#ff4d6d", fontWeight: 700 }}>
                  {filterParam === "offers" ? "Special Offers" : "All Products"}
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "3px 10px",
                    borderRadius: "20px",
                    fontSize: "11px",
                    fontWeight: 800,
                    letterSpacing: "0.5px",
                    textTransform: "uppercase",
                    background: "#ffffff",
                    color: "#ff4d6d",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
                  }}
                >
                  {filterParam === "offers" ? "🏷️ Exclusive Discounts" : "✨ Official Beauty Catalog"}
                </span>
              </div>

              <h1
                style={{
                  margin: "4px 0 6px",
                  fontSize: "clamp(22px, 3.5vw, 30px)",
                  color: "#0f172a",
                  fontWeight: 800,
                  lineHeight: 1.25,
                  letterSpacing: "-0.5px",
                }}
              >
                {filterParam === "offers" ? "Special Deals & Offers" : "All Products & Collections"}
              </h1>

              <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>
                Browse 100% authentic skincare, makeup & personal care items with guaranteed nationwide delivery.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* ── PRODUCTS GRID ── */}
      <section style={{ maxWidth: "1440px", margin: "16px auto 40px", padding: "0 20px", flex: 1, width: "100%", boxSizing: "border-box" }}>
        <ProductGrid
          searchTerm={searchTerm}
          onAddToCart={addToCart}
          title=""
          subtitle=""
          showCategoryBar={!isSearching}
          showPagination={true}
        />
      </section>
    </main>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "80vh", padding: "60px 20px", textAlign: "center" }}>Loading products...</div>}>
      <ProductsPageContent />
    </Suspense>
  );
}