"use client";

import Link from "next/link";

const FEATURED_CATEGORIES = [
  {
    id: "cat-makeup",
    title: "Makeup",
    count: "340 products",
    image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&auto=format&fit=crop&q=80",
    query: "Beauty & Wear",
  },
  {
    id: "cat-skincare",
    title: "Skin Care",
    count: "215 products",
    image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&auto=format&fit=crop&q=80",
    query: "Skin Care",
  },
  {
    id: "cat-perfume",
    title: "Perfume",
    count: "148 products",
    image: "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=400&auto=format&fit=crop&q=80",
    query: "Perfume",
  },
  {
    id: "cat-watches",
    title: "Watches",
    count: "86 products",
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&auto=format&fit=crop&q=80",
    query: "Watches",
  },
  {
    id: "cat-lifestyle",
    title: "Fashion & Wear",
    count: "192 products",
    image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&auto=format&fit=crop&q=80",
    query: "Lifestyle",
  },
  {
    id: "cat-lipsticks",
    title: "All Lipsticks",
    count: "260 products",
    image: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=400&auto=format&fit=crop&q=80",
    query: "Beauty & Wear",
  },
];

export default function FeaturedCategories() {
  return (
    <section
      style={{
        background: "linear-gradient(180deg, #FFF0F3 0%, #FAF7F5 100%)",
        padding: "36px 16px 44px",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          textAlign: "center",
        }}
      >
        <h2
          style={{
            fontSize: "28px",
            color: "#0F172A",
            fontFamily: "Georgia, serif",
            fontWeight: "900",
            margin: "0 0 6px",
          }}
        >
          <span style={{ color: "#FF4D6D" }}>Featured</span> Categories
        </h2>

        <p
          style={{
            color: "#64748B",
            fontSize: "15px",
            margin: "0 0 28px",
            fontWeight: "500",
          }}
        >
          Explore our top authentic beauty, cosmetics & fashion collections
        </p>

        {/* 2-Column Mobile & 6-Column Desktop Grid */}
        <div className="jt-featured-cat-grid">
          {FEATURED_CATEGORIES.map((cat) => (
            <Link
              key={cat.id}
              href={`/products?search=${encodeURIComponent(cat.query)}`}
              style={{
                textDecoration: "none",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "10px",
                transition: "transform 0.2s ease",
              }}
              className="jt-cat-card"
            >
              <div
                style={{
                  width: "120px",
                  height: "120px",
                  borderRadius: "50%",
                  overflow: "hidden",
                  boxShadow: "0 8px 20px rgba(255, 77, 109, 0.15)",
                  border: "3px solid #FFFFFF",
                  background: "#FFFFFF",
                  position: "relative",
                }}
              >
                <img
                  src={cat.image}
                  alt={cat.title}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    transition: "transform 0.3s ease",
                  }}
                />
              </div>

              <div style={{ textAlign: "center" }}>
                <h4
                  style={{
                    margin: "0 0 2px",
                    color: "#0F172A",
                    fontSize: "16px",
                    fontWeight: "800",
                    lineHeight: "1.2",
                  }}
                >
                  {cat.title}
                </h4>
                <span
                  style={{
                    color: "#64748B",
                    fontSize: "13px",
                    fontWeight: "600",
                  }}
                >
                  {cat.count}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
