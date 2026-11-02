"use client";

import Link from "next/link";

export default function DualMiniBanners() {
  const miniBanners = [
    {
      id: "mini-1111-mega-glam",
      title: "11.11 Mega Glam - Lip & Eye Essentials Up to 65% OFF",
      image: "https://res.cloudinary.com/dlgubaefs/image/upload/v1793650523/liora_store/banners/xeccuyphskavxkotm1rv.webp",
      link: "/products?category=Lipsticks",
    },
    {
      id: "mini-1111-glass-skin",
      title: "11.11 Glass Skin Fest - Authentic K-Beauty Skincare Up to 50% OFF",
      image: "https://res.cloudinary.com/dlgubaefs/image/upload/v1793650523/liora_store/banners/ymyco2upsy8vns0kwpp5.webp",
      link: "/products?category=K-Beauty",
    },
  ];

  return (
    <section
      className="jt-dual-banners-section"
      style={{
        maxWidth: "1440px",
        margin: "12px auto 24px",
        padding: "0 16px",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "16px",
        }}
      >
        {miniBanners.map((banner) => (
          <Link
            key={banner.id}
            href={banner.link}
            style={{
              display: "block",
              borderRadius: "18px",
              overflow: "hidden",
              boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
              transition: "transform 0.25s ease, box-shadow 0.25s ease",
              aspectRatio: "16 / 9",
              backgroundColor: "#f1f5f9",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-4px)";
              e.currentTarget.style.boxShadow = "0 14px 30px rgba(15, 23, 42, 0.16)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 8px 24px rgba(15, 23, 42, 0.08)";
            }}
          >
            <img
              src={banner.image}
              alt={banner.title}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
          </Link>
        ))}
      </div>
    </section>
  );
}
