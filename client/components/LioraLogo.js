"use client";

export default function LioraLogo({ className = "", style = {} }) {
  return (
    <img
      src="/liora-logo.svg"
      alt="LIORA Beauty & Wear Logo"
      className={`jt-liora-logo-img ${className}`}
      style={{
        height: "65px",
        width: "auto",
        objectFit: "contain",
        display: "block",
        cursor: "pointer",
        ...style,
      }}
    />
  );
}
