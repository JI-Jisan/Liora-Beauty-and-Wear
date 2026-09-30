"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import ProductGrid from "@/components/ProductGrid";
import { API_BASE_URL } from "@/lib/api";
import { useCart } from "@/context/CartContext";

export default function BrandProductsPage({ params }) {
  const unwrappedParams = use(params);
  const slug = (unwrappedParams?.slug || "").trim();
  const { addToCart } = useCart();
  const [searchTerm, setSearchTerm] = useState("");
  const [brandInfo, setBrandInfo] = useState(null);

  const brandDisplayName = brandInfo?.name || 
    decodeURIComponent(slug)
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());

  useEffect(() => {
    // Optionally fetch brand info for logo/official title
    fetch(`${API_BASE_URL}/api/brands`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const found = data.find(
            (b) => b.slug?.toLowerCase() === slug.toLowerCase() || b.name?.toLowerCase() === slug.toLowerCase()
          );
          if (found) setBrandInfo(found);
        }
      })
      .catch((err) => console.error("Error fetching brand info:", err));
  }, [slug]);

  return (
    <main className="jt-page" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Header searchTerm={searchTerm} onSearchChange={setSearchTerm} />

      {/* BRAND HERO BANNER */}
      <section style={{ maxWidth: "1400px", margin: "16px auto 0", padding: "0 16px", width: "100%", boxSizing: "border-box" }}>
        <div
          style={{
            background: "linear-gradient(135deg, #fff1f2 0%, #ffe4e6 50%, #fecdd3 100%)",
            border: "1px solid #fecdd3",
            borderRadius: "20px",
            padding: "28px 24px",
            boxShadow: "0 4px 20px rgba(255, 77, 109, 0.08)",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          {/* Breadcrumb */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#64748b" }}>
            <Link href="/" style={{ color: "#64748b", textDecoration: "none" }}>Home</Link>
            <span>/</span>
            <Link href="/brands" style={{ color: "#64748b", textDecoration: "none" }}>Brands</Link>
            <span>/</span>
            <span style={{ color: "#ff4d6d", fontWeight: 700 }}>{brandDisplayName}</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              {brandInfo?.logo ? (
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: "16px",
                    background: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                    padding: 6,
                    overflow: "hidden",
                  }}
                >
                  <img
                    src={brandInfo.logo.includes("/upload/") ? brandInfo.logo.replace("/upload/", "/upload/f_auto,q_auto,w_160/") : brandInfo.logo}
                    alt={brandDisplayName}
                    style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                  />
                </div>
              ) : (
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: "16px",
                    background: "linear-gradient(135deg, #ff4d6d 0%, #f43f5e 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#ffffff",
                    fontSize: "24px",
                    fontWeight: 800,
                    boxShadow: "0 4px 12px rgba(255, 77, 109, 0.25)",
                  }}
                >
                  {brandDisplayName.charAt(0)}
                </div>
              )}

              <div>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "3px 10px",
                    borderRadius: "20px",
                    fontSize: "11px",
                    fontWeight: 700,
                    letterSpacing: "0.5px",
                    textTransform: "uppercase",
                    background: "#ffffff",
                    color: "#ff4d6d",
                    marginBottom: "4px",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
                  }}
                >
                  💎 100% Genuine Brand
                </span>
                <h1 style={{ margin: "2px 0 0", fontSize: "28px", color: "#1e293b", fontWeight: 800, textTransform: "capitalize" }}>
                  {brandDisplayName}
                </h1>
              </div>
            </div>

            <p style={{ margin: 0, color: "#64748b", fontSize: "14px", maxWidth: "420px" }}>
              Shop authentic {brandDisplayName} skincare, cosmetics & beauty essentials at best guaranteed prices with fast nationwide delivery.
            </p>
          </div>
        </div>
      </section>

      {/* PRODUCTS CATALOG SECTION */}
      <section style={{ maxWidth: "1400px", margin: "20px auto 40px", padding: "0 16px", flex: 1, width: "100%", boxSizing: "border-box" }}>
        <ProductGrid
          brand={slug}
          searchTerm={searchTerm}
          onAddToCart={addToCart}
          title=""
          showCategoryBar={false}
          showPagination={true}
        />
      </section>
    </main>
  );
}
