"use client";

import Link from "next/link";
import { useState, useEffect, useMemo, useRef } from "react";
import { API_BASE_URL, getImageUrl } from "@/lib/api";

const BEAUTY_CATEGORY_PRESETS = [
  { match: /lipstick|lip\s*stick|lip\s*color/i, icon: "💄", image: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=300&auto=format&fit=crop&q=80" },
  { match: /serum/i, icon: "💧", image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=300&auto=format&fit=crop&q=80" },
  { match: /sunscreen|sun\s*cream|sun\s*block/i, icon: "☀️", image: "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=300&auto=format&fit=crop&q=80" },
  { match: /cream|moisturiz/i, icon: "🧴", image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=300&auto=format&fit=crop&q=80" },
  { match: /wash|cleanser|facewash/i, icon: "🫧", image: "https://images.unsplash.com/photo-1556228722-d9b3be32c966?w=300&auto=format&fit=crop&q=80" },
  { match: /foundation|bb\s*cream|concealer/i, icon: "✨", image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=300&auto=format&fit=crop&q=80" },
  { match: /mask/i, icon: "🧖‍♀️", image: "https://images.unsplash.com/photo-1567928815116-24b5d259c7d4?w=300&auto=format&fit=crop&q=80" },
  { match: /shampoo|hair/i, icon: "✨", image: "https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=300&auto=format&fit=crop&q=80" },
  { match: /eye\s*shadow|eyeliner|kajal|mascara/i, icon: "👁️", image: "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=300&auto=format&fit=crop&q=80" },
  { match: /perfume|fragrance|mist/i, icon: "🌸", image: "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=300&auto=format&fit=crop&q=80" },
  { match: /toner/i, icon: "💧", image: "https://images.unsplash.com/photo-1608248597359-00994f9e30a5?w=300&auto=format&fit=crop&q=80" },
  { match: /blush|bronzer/i, icon: "🌸", image: "https://images.unsplash.com/photo-1515688594390-b649af70d282?w=300&auto=format&fit=crop&q=80" },
  { match: /powder/i, icon: "✨", image: "https://images.unsplash.com/photo-1503236823255-94609f598e71?w=300&auto=format&fit=crop&q=80" },
  { match: /bath|body/i, icon: "🛁", image: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=300&auto=format&fit=crop&q=80" },
  { match: /lotion/i, icon: "🧴", image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=300&auto=format&fit=crop&q=80" },
  { match: /nail/i, icon: "💅", image: "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=300&auto=format&fit=crop&q=80" },
];

const POPULAR_ORDER = [
  "Lipsticks",
  "Serum",
  "Face Cream",
  "Sunscreen",
  "Face Wash",
  "Face Mask",
  "Foundation",
  "Shampoo & Conditioner",
  "Cleanser",
  "Moisturizers",
  "Blush",
  "Eye Shadow",
  "Perfume",
  "Face Toner",
  "Lotion",
  "Bath & Body"
];

function getPreset(name) {
  const match = BEAUTY_CATEGORY_PRESETS.find((p) => p.match.test(name));
  return match || {
    icon: "✨",
    image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=300&auto=format&fit=crop&q=80",
  };
}

export default function FeaturedCategories() {
  const [categories, setCategories] = useState([]);
  const sliderRef = useRef(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/categories`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setCategories(data);
      })
      .catch((err) => console.error("Featured categories fetch error:", err));
  }, []);

  const featuredList = useMemo(() => {
    if (!categories || categories.length === 0) return [];

    // Prioritize popular curated categories
    const mapByName = new Map();
    categories.forEach((c) => {
      const key = c.name.trim().toLowerCase();
      if (!mapByName.has(key)) {
        mapByName.set(key, c);
      }
    });

    const chosen = [];
    const usedIds = new Set();

    // 1. First add matching popular categories in priority order
    for (const popName of POPULAR_ORDER) {
      const found = mapByName.get(popName.toLowerCase());
      if (found && !usedIds.has(String(found._id))) {
        chosen.push(found);
        usedIds.add(String(found._id));
      }
    }

    // 2. Add remaining categories if under 16
    for (const cat of categories) {
      if (chosen.length >= 16) break;
      if (!usedIds.has(String(cat._id))) {
        chosen.push(cat);
        usedIds.add(String(cat._id));
      }
    }

    return chosen.map((cat) => {
      const preset = getPreset(cat.name);
      return {
        id: cat._id,
        title: cat.name,
        badgeIcon: preset.icon,
        image: cat.image ? getImageUrl(cat.image) : preset.image,
      };
    });
  }, [categories]);

  const scroll = (direction) => {
    if (sliderRef.current) {
      const offset = direction === "left" ? -280 : 280;
      sliderRef.current.scrollBy({ left: offset, behavior: "smooth" });
    }
  };

  if (!featuredList.length) return null;

  return (
    <section className="jt-featured-cats-section">
      <div className="jt-cats-header-bar">
        <div className="jt-cats-header-left">
          <span className="jt-crown-icon">👑</span>
          <h2 className="jt-cats-header-title">
            Featured <span className="jt-highlight">Categories</span>
          </h2>
        </div>
        <Link href="/products" className="jt-cats-view-all-link">
          All Categories ({categories.length || "130+"}) →
        </Link>
      </div>

      <div className="jt-cats-slider-wrap">
        {/* Navigation Buttons for Desktop */}
        <button
          type="button"
          className="jt-cats-nav-btn jt-cats-nav-prev"
          onClick={() => scroll("left")}
          aria-label="Previous categories"
        >
          ‹
        </button>

        {/* Horizontal Swipe/Scroll List */}
        <div className="jt-cats-circle-slider" ref={sliderRef}>
          {featuredList.map((cat) => (
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
                  loading="lazy"
                />
                <span className="jt-avatar-top-badge">{cat.badgeIcon}</span>
              </div>

              <div className="jt-circle-cat-info">
                <h4>{cat.title}</h4>
                <span>Explore</span>
              </div>
            </Link>
          ))}

          {/* View All Card at End of Slider */}
          <Link href="/products" className="jt-circle-view-all-card">
            <div className="jt-circle-view-all-avatar">
              <span>➔</span>
              <strong>View All</strong>
            </div>
            <div className="jt-circle-cat-info">
              <h4>All Categories</h4>
              <span>{categories.length || "130+"}+</span>
            </div>
          </Link>
        </div>

        <button
          type="button"
          className="jt-cats-nav-btn jt-cats-nav-next"
          onClick={() => scroll("right")}
          aria-label="Next categories"
        >
          ›
        </button>
      </div>
    </section>
  );
}
