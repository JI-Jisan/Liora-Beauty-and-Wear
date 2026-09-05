"use client";

import Header from "@/components/Header";
import WhatsAppButton from "@/components/WhatsAppButton";
import Link from "next/link";

const BLOG_POSTS = [
  {
    id: "1",
    title: "Essential Skincare Routine for Glowing, Healthy Skin",
    excerpt: "Discover the morning and evening skincare steps recommended by beauty dermatologists to achieve a radiant glow in Bangladesh's climate.",
    category: "Skincare",
    date: "September 2026",
    readTime: "4 min read",
    image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&auto=format&fit=crop&q=80",
  },
  {
    id: "2",
    title: "How to Identify 100% Authentic Cosmetics & Avoid Fakes",
    excerpt: "A complete practical guide to checking barcodes, packaging authenticity, textures, and manufacturer batch codes before purchasing beauty items.",
    category: "Authenticity",
    date: "August 2026",
    readTime: "5 min read",
    image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&auto=format&fit=crop&q=80",
  },
  {
    id: "3",
    title: "Top Trending Lip Shades and Long-Lasting Application Hacks",
    excerpt: "Explore the season's hottest matte liquid lipstick shades and pro tips on prepping lips so your color stays flawless from day to night.",
    category: "Makeup",
    date: "August 2026",
    readTime: "3 min read",
    image: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=600&auto=format&fit=crop&q=80",
  },
];

export default function BlogPage() {
  return (
    <main className="jt-page" style={{ minHeight: "100vh", background: "#fdf8f9" }}>
      <Header />

      <section style={{ maxWidth: "1200px", margin: "20px auto 40px", padding: "0 16px" }}>
        {/* Banner */}
        <div
          style={{
            background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
            color: "#ffffff",
            borderRadius: "20px",
            padding: "36px 24px",
            textAlign: "center",
            marginBottom: "36px",
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.1)",
          }}
        >
          <span
            style={{
              background: "rgba(244, 63, 94, 0.2)",
              color: "#f43f5e",
              border: "1px solid rgba(244, 63, 94, 0.4)",
              fontSize: "11px",
              fontWeight: "800",
              padding: "4px 14px",
              borderRadius: "50px",
              letterSpacing: "1px",
              textTransform: "uppercase",
              display: "inline-block",
              marginBottom: "12px",
            }}
          >
            LIORA BEAUTY JOURNAL
          </span>
          <h1 style={{ margin: "0 0 8px", fontSize: "clamp(24px, 4vw, 36px)", fontWeight: "900" }}>
            Beauty Tips, Trends & Care Guides
          </h1>
          <p style={{ margin: 0, color: "#94a3b8", fontSize: "15px", maxWidth: "600px", marginInline: "auto" }}>
            Expert advice, product reviews, and step-by-step guides to elevate your daily beauty and styling rituals.
          </p>
        </div>

        {/* Blog Posts Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "24px",
          }}
        >
          {BLOG_POSTS.map((post) => (
            <article
              key={post.id}
              style={{
                background: "#ffffff",
                borderRadius: "16px",
                overflow: "hidden",
                border: "1px solid #f1f5f9",
                boxShadow: "0 2px 10px rgba(0, 0, 0, 0.04)",
                display: "flex",
                flexDirection: "column",
                transition: "transform 0.2s ease, box-shadow 0.2s ease",
              }}
            >
              <div style={{ width: "100%", height: "200px", overflow: "hidden", position: "relative" }}>
                <img
                  src={post.image}
                  alt={post.title}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
                <span
                  style={{
                    position: "absolute",
                    top: "12px",
                    left: "12px",
                    background: "#f43f5e",
                    color: "#ffffff",
                    fontSize: "11px",
                    fontWeight: "800",
                    padding: "3px 10px",
                    borderRadius: "20px",
                    textTransform: "uppercase",
                  }}
                >
                  {post.category}
                </span>
              </div>

              <div style={{ padding: "20px", display: "flex", flexDirection: "column", flex: 1 }}>
                <div style={{ display: "flex", gap: "10px", fontSize: "12px", color: "#94a3b8", marginBottom: "8px" }}>
                  <span>{post.date}</span>
                  <span>•</span>
                  <span>{post.readTime}</span>
                </div>
                <h3 style={{ margin: "0 0 10px", fontSize: "17px", fontWeight: "800", color: "#0f172a", lineHeight: "1.4" }}>
                  {post.title}
                </h3>
                <p style={{ margin: "0 0 16px", fontSize: "13.5px", color: "#64748b", lineHeight: "1.6", flex: 1 }}>
                  {post.excerpt}
                </p>
                <Link
                  href="/products"
                  style={{
                    color: "#f43f5e",
                    fontWeight: "800",
                    fontSize: "13px",
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  Shop Related Products →
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <WhatsAppButton />
    </main>
  );
}
