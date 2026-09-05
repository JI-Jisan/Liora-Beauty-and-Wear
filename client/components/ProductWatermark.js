"use client";

export default function ProductWatermark({ variant = "card" }) {
  const isDetails = variant === "details";

  return (
    <div
      className="jt-product-watermark-layer"
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        userSelect: "none",
        zIndex: 3,
        overflow: "hidden",
      }}
      aria-hidden="true"
    >
      {/* 1. Subtle Center Diagonal Brand Watermark */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%) rotate(-22deg)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        <span
          style={{
            fontFamily: "Georgia, 'Playfair Display', serif",
            fontSize: isDetails ? "38px" : "20px",
            fontWeight: "900",
            letterSpacing: isDetails ? "6px" : "3.5px",
            color: "rgba(244, 63, 94, 0.24)", // Subtle Liora Rose Watermark
            textTransform: "uppercase",
            lineHeight: 1,
            textShadow: "0 1px 2px rgba(255,255,255,0.6)",
          }}
        >
          LIORA
        </span>
        <span
          style={{
            fontSize: isDetails ? "11px" : "7px",
            fontWeight: "800",
            letterSpacing: isDetails ? "3px" : "1.8px",
            color: "rgba(15, 23, 42, 0.20)",
            textTransform: "uppercase",
            marginTop: isDetails ? "4px" : "2px",
          }}
        >
          BEAUTY &amp; WEAR
        </span>
      </div>

      {/* 2. Official Brand Corner Badge (Covers any bottom corner competitor marks) */}
      <div
        style={{
          position: "absolute",
          bottom: isDetails ? "14px" : "6px",
          right: isDetails ? "14px" : "6px",
          background: "rgba(255, 255, 255, 0.92)",
          backdropFilter: "blur(4px)",
          border: "1px solid rgba(244, 63, 94, 0.35)",
          borderRadius: "6px",
          padding: isDetails ? "4px 10px" : "2px 6px",
          display: "flex",
          alignItems: "center",
          gap: isDetails ? "5px" : "3px",
          boxShadow: "0 2px 6px rgba(0, 0, 0, 0.08)",
        }}
      >
        <span
          style={{
            width: isDetails ? "7px" : "5px",
            height: isDetails ? "7px" : "5px",
            borderRadius: "50%",
            background: "#f43f5e",
            display: "inline-block",
          }}
        />
        <span
          style={{
            fontSize: isDetails ? "11px" : "8px",
            fontWeight: "900",
            letterSpacing: "0.5px",
            color: "#0f172a",
            textTransform: "uppercase",
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          LIORA <span style={{ color: "#f43f5e" }}>AUTHENTIC</span>
        </span>
      </div>
    </div>
  );
}
