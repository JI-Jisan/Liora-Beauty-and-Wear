"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { getImageUrl } from "@/lib/api";

const DEFAULT_GRAPHIC_BANNERS = [
  {
    id: "banner-korean-skincare",
    title: "Glowing Korean Skincare - Up to 30% OFF",
    image: "/banners/hero_korean_skincare.jpg",
    link: "/products?search=skincare",
  },
  {
    id: "banner-luxury-perfume",
    title: "Exclusive Luxury Perfumes - Royal Scents",
    image: "/banners/hero_luxury_perfume.jpg",
    link: "/products?search=perfume",
  },
  {
    id: "banner-makeup-glam",
    title: "Authentic Makeup & Glam - Flat 25% OFF",
    image: "/banners/hero_makeup_glam.jpg",
    link: "/products?search=makeup",
  },
];

export default function PromoBanner({ promoSlides = [] }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef(null);

  // Compile active banners: custom uploaded from admin or default graphic banners
  const banners = useMemo(() => {
    if (Array.isArray(promoSlides) && promoSlides.length > 0) {
      const customList = promoSlides
        .filter((s) => s && s.image)
        .map((s, idx) => ({
          id: s._id || `custom-banner-${idx}`,
          title: s.title || "LIORA Promotion",
          image: getImageUrl(s.image),
          link: s.buttonLink || "/products",
        }));

      if (customList.length > 0) return customList;
    }

    return DEFAULT_GRAPHIC_BANNERS;
  }, [promoSlides]);

  // Auto-slide every 4 seconds
  useEffect(() => {
    if (banners.length <= 1 || isPaused) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % banners.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [banners.length, isPaused]);

  // Safeguard bounds
  useEffect(() => {
    if (currentSlide >= banners.length) {
      setCurrentSlide(0);
    }
  }, [banners.length, currentSlide]);

  const handlePrev = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    setCurrentSlide((prev) => (prev === 0 ? banners.length - 1 : prev - 1));
  };

  const handleNext = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    setCurrentSlide((prev) => (prev + 1) % banners.length);
  };

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) handleNext();
      else handlePrev();
    }
    touchStartX.current = null;
  };

  const activeBanner = banners[currentSlide] || banners[0];

  return (
    <section
      className="jt-shajgoj-hero-slider"
      style={{
        maxWidth: "1440px",
        margin: "0 auto 16px",
        padding: "8px 16px",
        position: "relative",
      }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Full-bleed clickable graphic banner card */}
      <div
        style={{
          position: "relative",
          width: "100%",
          borderRadius: "20px",
          overflow: "hidden",
          boxShadow: "0 10px 30px rgba(15, 23, 42, 0.1)",
          backgroundColor: "#f8fafc",
          aspectRatio: "16 / 6.8",
        }}
      >
        <Link
          href={activeBanner.link || "/products"}
          style={{ display: "block", width: "100%", height: "100%" }}
        >
          <img
            key={activeBanner.id}
            src={activeBanner.image}
            alt={activeBanner.title || "LIORA Offer"}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
              transition: "opacity 0.4s ease-in-out",
            }}
          />
        </Link>

        {/* Previous arrow */}
        {banners.length > 1 && (
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Previous Slide"
            style={{
              position: "absolute",
              left: "16px",
              top: "50%",
              transform: "translateY(-50%)",
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              background: "rgba(255, 255, 255, 0.85)",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(255, 255, 255, 0.5)",
              color: "#0f172a",
              cursor: "pointer",
              fontSize: "16px",
              fontWeight: "900",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 14px rgba(0,0,0,0.15)",
              transition: "all 0.2s ease",
              zIndex: 10,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#ffffff";
              e.currentTarget.style.transform = "translateY(-50%) scale(1.08)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.85)";
              e.currentTarget.style.transform = "translateY(-50%) scale(1)";
            }}
          >
            ❮
          </button>
        )}

        {/* Next arrow */}
        {banners.length > 1 && (
          <button
            type="button"
            onClick={handleNext}
            aria-label="Next Slide"
            style={{
              position: "absolute",
              right: "16px",
              top: "50%",
              transform: "translateY(-50%)",
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              background: "rgba(255, 255, 255, 0.85)",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(255, 255, 255, 0.5)",
              color: "#0f172a",
              cursor: "pointer",
              fontSize: "16px",
              fontWeight: "900",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 14px rgba(0,0,0,0.15)",
              transition: "all 0.2s ease",
              zIndex: 10,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#ffffff";
              e.currentTarget.style.transform = "translateY(-50%) scale(1.08)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.85)";
              e.currentTarget.style.transform = "translateY(-50%) scale(1)";
            }}
          >
            ❯
          </button>
        )}

        {/* Dots indicator at bottom center */}
        {banners.length > 1 && (
          <div
            style={{
              position: "absolute",
              bottom: "14px",
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              gap: "8px",
              alignItems: "center",
              background: "rgba(15, 23, 42, 0.4)",
              backdropFilter: "blur(6px)",
              padding: "6px 12px",
              borderRadius: "30px",
              zIndex: 10,
            }}
          >
            {banners.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentSlide(idx)}
                aria-label={`Go to slide ${idx + 1}`}
                style={{
                  background: "transparent",
                  border: "none",
                  padding: "2px",
                  cursor: "pointer",
                  display: "flex",
                }}
              >
                <span
                  style={{
                    display: "block",
                    width: currentSlide === idx ? "24px" : "7px",
                    height: "7px",
                    borderRadius: "10px",
                    background: currentSlide === idx ? "#ffffff" : "rgba(255, 255, 255, 0.5)",
                    transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                  }}
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}