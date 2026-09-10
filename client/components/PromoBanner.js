"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import { getImageUrl } from "@/lib/api";

const DEFAULT_CAMPAIGN_BANNERS = [
  {
    id: "banner-brand-main",
    title: "LIORA Beauty & Wear - 100% Authentic & Premium Quality",
    image: "/hero-banner-main.jpg",
    link: "/products",
  },
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

export default function PromoBanner({ promoSlides = [], heroImage = "" }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  // Compile active banners:
  // If user has custom heroImage or custom promoSlides, include them in the carousel
  const banners = useMemo(() => {
    const list = [];

    // 1. If admin has a main hero image, put it first
    if (heroImage && heroImage.trim()) {
      list.push({
        id: "banner-hero-main-dynamic",
        title: "LIORA Beauty & Wear",
        image: getImageUrl(heroImage),
        link: "/products",
      });
    }

    // 2. Custom slides uploaded in admin panel
    if (Array.isArray(promoSlides) && promoSlides.length > 0) {
      promoSlides
        .filter((s) => s && s.image)
        .forEach((s, idx) => {
          list.push({
            id: s._id || `admin-banner-${idx}`,
            title: s.title || "Special Offer",
            image: getImageUrl(s.image),
            link: s.buttonLink || "/products",
          });
        });
    }

    // 3. If the list has fewer than 2 banners, fill with our luxury campaign banners
    if (list.length === 0) {
      return DEFAULT_CAMPAIGN_BANNERS;
    }

    // Append our high-end campaign banners so there is always an outstanding multi-slide carousel
    DEFAULT_CAMPAIGN_BANNERS.forEach((defBanner) => {
      const alreadyExists = list.some((item) => item.image === defBanner.image);
      if (!alreadyExists && list.length < 5) {
        list.push(defBanner);
      }
    });

    return list;
  }, [promoSlides, heroImage]);

  const total = banners.length;

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % total);
  }, [total]);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev === 0 ? total - 1 : prev - 1));
  }, [total]);

  // Auto-slide every 4 seconds with smooth horizontal glide
  useEffect(() => {
    if (total <= 1 || isPaused) return;

    const timer = setInterval(() => {
      nextSlide();
    }, 4000);

    return () => clearInterval(timer);
  }, [total, isPaused, nextSlide]);

  // Safeguard index
  useEffect(() => {
    if (currentSlide >= total) {
      setCurrentSlide(0);
    }
  }, [total, currentSlide]);

  // Touch Swipe Handlers for mobile
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 45) {
      if (diff > 0) {
        nextSlide();
      } else {
        prevSlide();
      }
    }
    touchStartX.current = 0;
    touchEndX.current = 0;
  };

  return (
    <section
      className="jt-shajgoj-slider-section"
      style={{
        maxWidth: "1440px",
        margin: "6px auto 18px",
        padding: "0 16px",
      }}
      aria-label="Promotional Banners"
    >
      <div
        className="jt-shajgoj-slider-container"
        style={{
          position: "relative",
          width: "100%",
          borderRadius: "20px",
          overflow: "hidden",
          boxShadow: "0 12px 36px rgba(15, 23, 42, 0.08)",
          backgroundColor: "#fdf2f4",
          aspectRatio: "16 / 6.6",
        }}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* TRUE HORIZONTAL CAROUSEL TRACK (SHAJGOJ / SWIPER STYLE GLIDE) */}
        <div
          className="jt-shajgoj-slider-track"
          style={{
            display: "flex",
            width: "100%",
            height: "100%",
            transform: `translateX(-${currentSlide * 100}%)`,
            transition: "transform 0.65s cubic-bezier(0.22, 1, 0.36, 1)",
            willChange: "transform",
          }}
        >
          {banners.map((banner, index) => (
            <div
              key={banner.id || index}
              style={{
                minWidth: "100%",
                width: "100%",
                height: "100%",
                flexShrink: 0,
                position: "relative",
              }}
            >
              <Link
                href={banner.link || "/products"}
                style={{
                  display: "block",
                  width: "100%",
                  height: "100%",
                  textDecoration: "none",
                }}
              >
                <img
                  src={banner.image}
                  alt={banner.title || "LIORA Promotion Banner"}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    objectPosition: "center",
                    display: "block",
                    userSelect: "none",
                  }}
                  loading={index === 0 ? "eager" : "lazy"}
                  draggable={false}
                />
              </Link>
            </div>
          ))}
        </div>

        {/* FLOATING PREV ARROW */}
        {total > 1 && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              prevSlide();
            }}
            aria-label="Previous Banner"
            style={{
              position: "absolute",
              left: "14px",
              top: "50%",
              transform: "translateY(-50%)",
              width: "42px",
              height: "42px",
              borderRadius: "50%",
              background: "rgba(255, 255, 255, 0.9)",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(255, 255, 255, 0.8)",
              color: "#0f172a",
              cursor: "pointer",
              fontSize: "16px",
              fontWeight: "900",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 6px 18px rgba(0, 0, 0, 0.16)",
              transition: "all 0.2s ease",
              zIndex: 10,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#ffffff";
              e.currentTarget.style.transform = "translateY(-50%) scale(1.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.9)";
              e.currentTarget.style.transform = "translateY(-50%) scale(1)";
            }}
          >
            ❮
          </button>
        )}

        {/* FLOATING NEXT ARROW */}
        {total > 1 && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              nextSlide();
            }}
            aria-label="Next Banner"
            style={{
              position: "absolute",
              right: "14px",
              top: "50%",
              transform: "translateY(-50%)",
              width: "42px",
              height: "42px",
              borderRadius: "50%",
              background: "rgba(255, 255, 255, 0.9)",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(255, 255, 255, 0.8)",
              color: "#0f172a",
              cursor: "pointer",
              fontSize: "16px",
              fontWeight: "900",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 6px 18px rgba(0, 0, 0, 0.16)",
              transition: "all 0.2s ease",
              zIndex: 10,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#ffffff";
              e.currentTarget.style.transform = "translateY(-50%) scale(1.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.9)";
              e.currentTarget.style.transform = "translateY(-50%) scale(1)";
            }}
          >
            ❯
          </button>
        )}

        {/* SHAJGOJ-STYLE BOTTOM DOTS INDICATOR */}
        {total > 1 && (
          <div
            style={{
              position: "absolute",
              bottom: "12px",
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              gap: "8px",
              alignItems: "center",
              background: "rgba(15, 23, 42, 0.35)",
              backdropFilter: "blur(8px)",
              padding: "5px 12px",
              borderRadius: "50px",
              zIndex: 10,
            }}
          >
            {banners.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentSlide(idx)}
                aria-label={`Slide ${idx + 1}`}
                style={{
                  background: "transparent",
                  border: "none",
                  padding: "3px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    display: "block",
                    width: currentSlide === idx ? "24px" : "8px",
                    height: "8px",
                    borderRadius: "10px",
                    background: currentSlide === idx ? "#ffffff" : "rgba(255, 255, 255, 0.5)",
                    transition: "all 0.35s cubic-bezier(0.22, 1, 0.36, 1)",
                    boxShadow: currentSlide === idx ? "0 2px 6px rgba(0,0,0,0.3)" : "none",
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