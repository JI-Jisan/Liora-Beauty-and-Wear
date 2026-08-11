"use client";

import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
import { API_BASE_URL, getImageUrl } from "@/lib/api";

const CATEGORY_DEFAULT_IMAGES = {
  "skin care": "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&auto=format&fit=crop&q=80",
  "face care": "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400&auto=format&fit=crop&q=80",
  "serum": "https://images.unsplash.com/photo-1608248597261-833258657640?w=400&auto=format&fit=crop&q=80",
  "beauty & wear": "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&auto=format&fit=crop&q=80",
  "perfume": "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=400&auto=format&fit=crop&q=80",
  "watches": "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&auto=format&fit=crop&q=80",
};

const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&auto=format&fit=crop&q=80";

export default function FeaturedCategories() {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/categories`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setCategories(data);
      })
      .catch((err) => console.error("Featured categories fetch error:", err));

    fetch(`${API_BASE_URL}/api/products`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setProducts(data);
      })
      .catch((err) => console.error("Featured products fetch error:", err));
  }, []);

  const displayCategories = useMemo(() => {
    if (!categories || categories.length === 0) return [];

    return categories.map((cat) => {
      const catId = String(cat._id).toLowerCase();
      const catName = String(cat.name).trim().toLowerCase();

      const count = products.filter((p) => {
        let current = p.category;
        while (current) {
          if (typeof current === "object") {
            const pCatId = String(current._id || "").toLowerCase();
            const pCatName = String(current.name || "").trim().toLowerCase();
            if (pCatId === catId || pCatName === catName) return true;
            current = current.parentCategory;
          } else if (typeof current === "string") {
            if (current.toLowerCase() === catId || current.toLowerCase() === catName) return true;
            break;
          } else {
            break;
          }
        }
        return false;
      }).length;

      const img = cat.image
        ? getImageUrl(cat.image)
        : CATEGORY_DEFAULT_IMAGES[catName] || DEFAULT_IMAGE;

      return {
        id: cat._id,
        title: cat.name,
        count: `${count} ${count === 1 ? "product" : "products"}`,
        image: img,
      };
    });
  }, [categories, products]);

  if (!displayCategories || displayCategories.length === 0) return null;

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

        {/* Dynamic Category Circles Grid */}
        <div className="jt-featured-cat-grid">
          {displayCategories.map((cat) => (
            <Link
              key={cat.id}
              href={`/products?category=${encodeURIComponent(cat.id)}`}
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
                    fontSize: "12px",
                    color: "#94A3B8",
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
