"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { API_BASE_URL } from "@/lib/api";

const PRESET_BRANDS = [
  {
    name: "The Ordinary",
    slug: "the-ordinary",
    country: "Canada",
    logoText: "The Ordinary.",
    bg: "#f8fafc",
  },
  {
    name: "COSRX",
    slug: "cosrx",
    country: "Korea",
    logoText: "COSRX",
    bg: "#fff1f2",
  },
  {
    name: "CeraVe",
    slug: "cerave",
    country: "USA",
    logoText: "CeraVe",
    bg: "#eff6ff",
  },
  {
    name: "Beauty of Joseon",
    slug: "beauty-of-joseon",
    country: "Korea",
    logoText: "BOJ",
    bg: "#fdf4ff",
  },
  {
    name: "Anua",
    slug: "anua",
    country: "Korea",
    logoText: "anua",
    bg: "#f0fdf4",
  },
  {
    name: "SKIN1004",
    slug: "skin1004",
    country: "Korea",
    logoText: "SKIN1004",
    bg: "#fffbeb",
  },
  {
    name: "Simple",
    slug: "simple",
    country: "UK",
    logoText: "Simple.",
    bg: "#f0fdfa",
  },
  {
    name: "AXIS-Y",
    slug: "axis-y",
    country: "Korea",
    logoText: "AXIS - Y",
    bg: "#faf5ff",
  },
];

export default function BrandScroller() {
  const [brands, setBrands] = useState([]);
  const scrollerRef = useRef(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/brands`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setBrands(data);
        } else {
          setBrands(PRESET_BRANDS);
        }
      })
      .catch(() => {
        setBrands(PRESET_BRANDS);
      });
  }, []);

  const displayList = brands.length > 0 ? brands : PRESET_BRANDS;

  const scroll = (direction) => {
    if (scrollerRef.current) {
      const offset = direction === "left" ? -280 : 280;
      scrollerRef.current.scrollBy({ left: offset, behavior: "smooth" });
    }
  };

  return (
    <section className="jt-brands-section">
      <div className="jt-brands-header">
        <div className="jt-brands-header-left">
          <span className="jt-brands-crown">👑</span>
          <div>
            <h2 className="jt-brands-title">
              Top Authentic <span className="jt-brands-highlight">Brands</span>
            </h2>
            <p className="jt-brands-subtitle">
              ১০০% জেনুইন ও ভেরিফায়েড ইন্টারন্যাশনাল স্কিনকেয়ার ও বিউটি ব্র্যান্ড
            </p>
          </div>
        </div>
        <Link href="/brands" className="jt-brands-view-all">
          All Brands &rarr;
        </Link>
      </div>

      <div className="jt-brands-scroll-wrap">
        <button
          type="button"
          className="jt-brands-arrow jt-brands-arrow-left"
          onClick={() => scroll("left")}
          aria-label="Previous brands"
        >
          ‹
        </button>

        <div className="jt-brands-track" ref={scrollerRef}>
          {displayList.map((b, idx) => {
            const logoSrc = b.logo
              ? b.logo.includes("/upload/")
                ? b.logo.replace("/upload/", "/upload/f_auto,q_auto,w_200/")
                : b.logo
              : null;

            return (
              <Link
                key={b._id || b.slug || idx}
                href={`/brands/${b.slug}`}
                className="jt-brand-card"
              >
                <div className="jt-brand-logo-container">
                  {logoSrc ? (
                    <img
                      src={logoSrc}
                      alt={b.name}
                      className="jt-brand-logo-img"
                      loading="lazy"
                    />
                  ) : (
                    <span className="jt-brand-fallback-text">
                      {b.logoText || b.name}
                    </span>
                  )}
                </div>
                <div className="jt-brand-meta">
                  <span className="jt-brand-name">{b.name}</span>
                  <span className="jt-brand-explore">View Products &rarr;</span>
                </div>
              </Link>
            );
          })}
        </div>

        <button
          type="button"
          className="jt-brands-arrow jt-brands-arrow-right"
          onClick={() => scroll("right")}
          aria-label="Next brands"
        >
          ›
        </button>
      </div>
    </section>
  );
}
