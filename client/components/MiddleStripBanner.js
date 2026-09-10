"use client";

import Link from "next/link";

export default function MiddleStripBanner() {
  return (
    <section
      className="jt-middle-strip-banner-wrapper"
      style={{
        maxWidth: "1440px",
        margin: "24px auto 32px",
        padding: "0 16px",
      }}
    >
      <div
        style={{
          borderRadius: "22px",
          background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #311042 100%)",
          border: "1px solid rgba(244, 63, 94, 0.3)",
          boxShadow: "0 14px 36px rgba(15, 23, 42, 0.2)",
          padding: "24px 32px",
          position: "relative",
          overflow: "hidden",
          color: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "20px",
        }}
      >
        {/* Glow ambient circle */}
        <div
          style={{
            position: "absolute",
            top: "-40px",
            right: "20%",
            width: "220px",
            height: "220px",
            background: "radial-gradient(circle, rgba(244, 63, 94, 0.25) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        {/* Left text & badge */}
        <div style={{ position: "relative", zIndex: 1, maxWidth: "680px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px", flexWrap: "wrap" }}>
            <span
              style={{
                background: "linear-gradient(90deg, #f43f5e 0%, #e11d48 100%)",
                color: "#ffffff",
                padding: "4px 12px",
                borderRadius: "20px",
                fontSize: "11px",
                fontWeight: "900",
                letterSpacing: "0.5px",
                textTransform: "uppercase",
              }}
            >
              🌟 100% Authentic Guaranteed
            </span>
            <span
              style={{
                background: "rgba(255, 255, 255, 0.12)",
                color: "#fecdd3",
                padding: "4px 10px",
                borderRadius: "20px",
                fontSize: "11.5px",
                fontWeight: "700",
              }}
            >
              🚚 Free Delivery Above ৳1999
            </span>
          </div>

          <h3
            style={{
              fontSize: "clamp(18px, 2.6vw, 24px)",
              fontWeight: "900",
              margin: "0 0 6px",
              lineHeight: "1.3",
              color: "#ffffff",
            }}
          >
            Direct Authentic Imports From Korea, UK & USA
          </h3>
          <p
            style={{
              fontSize: "13px",
              color: "rgba(255, 255, 255, 0.8)",
              margin: 0,
              lineHeight: "1.5",
            }}
          >
            Say goodbye to replica cosmetics. Every bottle & jar at LIORA is verified authentic with Cash on Delivery nationwide.
          </p>
        </div>

        {/* Right CTA Buttons */}
        <div
          style={{
            position: "relative",
            zIndex: 1,
            display: "flex",
            alignItems: "center",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <Link
            href="/products?search=combo"
            style={{
              background: "linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)",
              color: "#ffffff",
              textDecoration: "none",
              padding: "12px 24px",
              borderRadius: "50px",
              fontWeight: "800",
              fontSize: "13.5px",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: "0 6px 18px rgba(244, 63, 94, 0.4)",
              transition: "transform 0.2s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
          >
            🎁 Exclusive Combos
          </Link>

          <Link
            href="/products"
            style={{
              background: "rgba(255, 255, 255, 0.1)",
              border: "1.5px solid rgba(255, 255, 255, 0.25)",
              color: "#ffffff",
              textDecoration: "none",
              padding: "11px 20px",
              borderRadius: "50px",
              fontWeight: "700",
              fontSize: "13px",
              backdropFilter: "blur(6px)",
            }}
          >
            All Products →
          </Link>
        </div>
      </div>
    </section>
  );
}
