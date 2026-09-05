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
      {/* Official Brand Corner Badge - Leaves product 100% clean and visible while covering bottom watermark */}
      <div
        style={{
          position: "absolute",
          bottom: isDetails ? "12px" : "6px",
          right: isDetails ? "12px" : "6px",
          background: "rgba(255, 255, 255, 0.94)",
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
            width: isDetails ? "6px" : "4px",
            height: isDetails ? "6px" : "4px",
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
