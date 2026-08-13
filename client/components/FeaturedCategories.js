"use client";

import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
import { API_BASE_URL, getImageUrl } from "@/lib/api";

const DEFAULT_FEATURED_CATS = [
  {
    id: "cat-skincare",
    title: "Body & Skin Care",
    count: "50+ Products",
    badgeIcon: "🧴",
    image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&auto=format&fit=crop&q=80",
  },
  {
    id: "cat-makeup",
    title: "Makeup Items",
    count: "120+ Products",
    badgeIcon: "💄",
    image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&auto=format&fit=crop&q=80",
  },
  {
    id: "cat-bags",
    title: "Ladies Bags",
    count: "80+ Products",
    badgeIcon: "👜",
    image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400&auto=format&fit=crop&q=80",
  },
  {
    id: "cat-dress",
    title: "Ladies Dress",
    count: "150+ Products",
    badgeIcon: "👗",
    image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&auto=format&fit=crop&q=80",
  },
  {
    id: "cat-jewellery",
    title: "Jewellery Sets & Accessories",
    count: "200+ Products",
    badgeIcon: "💍",
    image: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=400&auto=format&fit=crop&q=80",
  },
  {
    id: "cat-shoes",
    title: "Ladies Shoes",
    count: "120+ Products",
    badgeIcon: "👠",
    image: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400&auto=format&fit=crop&q=80",
  },
  {
    id: "cat-necklaces",
    title: "Jewellery Earrings & Necklaces",
    count: "180+ Products",
    badgeIcon: "📿",
    image: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400&auto=format&fit=crop&q=80",
  },
];

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
    if (!categories || categories.length === 0) return DEFAULT_FEATURED_CATS;

    return categories.map((cat, idx) => {
      const catId = String(cat._id).toLowerCase();
      const catName = String(cat.name).trim().toLowerCase();

      const countNum = products.filter((p) => {
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

      const fallbackObj = DEFAULT_FEATURED_CATS[idx % DEFAULT_FEATURED_CATS.length];

      return {
        id: cat._id,
        title: cat.name,
        count: countNum > 0 ? `${countNum}+ Products` : fallbackObj.count,
        badgeIcon: fallbackObj.badgeIcon,
        image: cat.image ? getImageUrl(cat.image) : fallbackObj.image,
      };
    });
  }, [categories, products]);

  return (
    <section className="jt-featured-cats-section">
      <div className="jt-featured-cats-container">
        {/* Crown Icon Header */}
        <div className="jt-cats-header-wrap">
          <span className="jt-crown-icon">👑</span>
          <h2 className="jt-cats-header-title">
            Featured <span className="jt-highlight">Categories</span>
          </h2>
          <div className="jt-cats-header-divider">
            <span className="jt-divider-line" />
            <span className="jt-heart-icon">💖</span>
            <span className="jt-divider-line" />
          </div>
        </div>

        {/* Categories Grid Showcase */}
        <div className="jt-cats-circle-grid">
          {displayCategories.map((cat) => (
            <Link
              key={cat.id}
              href={`/products?category=${encodeURIComponent(cat.id)}`}
              className="jt-circle-cat-card"
            >
              <div className="jt-circle-avatar-wrap">
                <img
                  src={cat.image}
                  alt={cat.title}
                  className="jt-circle-avatar-img"
                />
                <span className="jt-avatar-top-badge">{cat.badgeIcon || "✨"}</span>
              </div>

              <div className="jt-circle-cat-info">
                <h4>{cat.title}</h4>
                <span>{cat.count}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
