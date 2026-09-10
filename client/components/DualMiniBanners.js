"use client";

import Link from "next/link";

export default function DualMiniBanners() {
  const banners = [
    {
      id: "korean-skincare",
      badge: "✨ BESTSELLER ROUTINE",
      badgeBg: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
      title: "Korean Glass Skin & Glow",
      subtitle: "Authentic COSRX, Beauty of Joseon & The Ordinary",
      discount: "Flat 20% OFF",
      buttonText: "Explore Routine →",
      link: "/products?search=COSRX",
      gradient: "linear-gradient(135deg, #064e3b 0%, #0f766e 60%, #115e59 100%)",
      decorIcon: "🧴",
    },
    {
      id: "luxury-fragrance",
      badge: "💎 LUXURY SCENTS",
      badgeBg: "linear-gradient(135deg, #f43f5e 0%, #be123c 100%)",
      title: "Exquisite Perfumes & Body Mists",
      subtitle: "Long-lasting elegance & signature notes for every moment",
      discount: "Up to 35% OFF",
      buttonText: "Discover Scents →",
      link: "/products?search=perfume",
      gradient: "linear-gradient(135deg, #4c0519 0%, #881337 60%, #4a044e 100%)",
      decorIcon: "✨",
    },
  ];

  return (
    <section className="jt-dual-banners-section" style={{ maxWidth: "1440px", margin: "14px auto 26px", padding: "0 16px" }}>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
        gap: "18px",
      }}>
        {banners.map((b) => (
          <Link
            key={b.id}
            href={b.link}
            style={{
              textDecoration: "none",
              color: "#ffffff",
              borderRadius: "20px",
              padding: "26px 28px",
              background: b.gradient,
              position: "relative",
              overflow: "hidden",
              boxShadow: "0 10px 25px rgba(15, 23, 42, 0.12)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              minHeight: "190px",
              transition: "transform 0.25s ease, box-shadow 0.25s ease",
              border: "1px solid rgba(255, 255, 255, 0.12)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-4px)";
              e.currentTarget.style.boxShadow = "0 16px 32px rgba(15, 23, 42, 0.2)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 10px 25px rgba(15, 23, 42, 0.12)";
            }}
          >
            {/* Watermark decorative icon */}
            <div style={{
              position: "absolute",
              right: "-10px",
              bottom: "-15px",
              fontSize: "110px",
              opacity: 0.12,
              pointerEvents: "none",
              userSelect: "none",
            }}>
              {b.decorIcon}
            </div>

            {/* Top Badge & Discount Pill */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", zIndex: 1, marginBottom: "12px" }}>
              <span style={{
                background: b.badgeBg,
                color: "#ffffff",
                fontSize: "11px",
                fontWeight: "800",
                padding: "4px 12px",
                borderRadius: "30px",
                letterSpacing: "0.5px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
              }}>
                {b.badge}
              </span>

              <span style={{
                background: "rgba(255, 255, 255, 0.2)",
                backdropFilter: "blur(6px)",
                color: "#ffffff",
                fontSize: "12px",
                fontWeight: "900",
                padding: "4px 10px",
                borderRadius: "10px",
                border: "1px solid rgba(255, 255, 255, 0.3)",
              }}>
                {b.discount}
              </span>
            </div>

            {/* Title & Subtitle */}
            <div style={{ zIndex: 1, marginBottom: "16px" }}>
              <h3 style={{
                fontSize: "20px",
                fontWeight: "900",
                margin: "0 0 6px",
                lineHeight: "1.25",
                color: "#ffffff",
              }}>
                {b.title}
              </h3>
              <p style={{
                fontSize: "13px",
                color: "rgba(255, 255, 255, 0.85)",
                margin: 0,
                lineHeight: "1.4",
              }}>
                {b.subtitle}
              </p>
            </div>

            {/* Action button */}
            <div style={{ zIndex: 1 }}>
              <span style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: "#ffffff",
                color: "#0f172a",
                fontSize: "12.5px",
                fontWeight: "800",
                padding: "8px 18px",
                borderRadius: "30px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              }}>
                {b.buttonText}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
