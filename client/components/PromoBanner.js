"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import { getImageUrl } from "@/lib/api";

const DEFAULT_CAMPAIGN_BANNERS = [
  {
    id: "banner-1111-swiss-cosmetics",
    title: "11.11 Mega Sale - Swiss Beauty & Cosmetics Up to 70% OFF",
    image: "https://res.cloudinary.com/dlgubaefs/image/upload/v1793647403/liora_store/banners/jaibi6bgdo6xodnr4tro.webp",
    link: "/brand/swiss-beauty",
  },
  {
    id: "banner-1111-beauty-saga",
    title: "11.11 Beauty Saga - Tresemme & Hair Care Up to 45% OFF",
    image: "https://res.cloudinary.com/dlgubaefs/image/upload/v1793647404/liora_store/banners/rhyy1m9sbuhbmhdywstn.webp",
    link: "/products?category=Hair+Care",
  },
  {
    id: "banner-1111-k-beauty-fest",
    title: "11.11 K-Beauty Festival - Korean Glass Skin Up to 50% OFF",
    image: "https://res.cloudinary.com/dlgubaefs/image/upload/v1793647405/liora_store/banners/embskiwgane2zn7wjwaz.webp",
    link: "/products?category=K-Beauty",
  },
];

export default function PromoBanner({ promoSlides = [] }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  // Compile active banners:
  // Strictly use active campaign banners (custom admin slides or default 11.11 campaign slides)
  const banners = useMemo(() => {
    if (Array.isArray(promoSlides) && promoSlides.length > 0) {
      const validSlides = promoSlides
        .filter((s) => s && s.image && typeof s.image === "string" && s.image.trim())
        .map((s, idx) => ({
          id: s._id || s.id || `admin-banner-${idx}`,
          title: s.title || "LIORA 11.11 Mega Campaign",
          image: getImageUrl(s.image),
          link: s.buttonLink || s.link || "/products",
        }));

      if (validSlides.length > 0) {
        return validSlides;
      }
    }

    // Default to 11.11 real-product campaign banners
    return DEFAULT_CAMPAIGN_BANNERS;
  }, [promoSlides]);

  const total = banners.length;

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % total);
  }, [total]);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev === 0 ? total - 1 : prev - 1));
  }, [total]);

  // Smooth continuous auto-sliding every 3.8s (never gets stuck)
  useEffect(() => {
    if (total <= 1) return;

    const timer = setInterval(() => {
      nextSlide();
    }, 3800);

    return () => clearInterval(timer);
  }, [total, nextSlide]);

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
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media (max-width: 768px) {
              .jt-shajgoj-slider-container {
                aspect-ratio: 16 / 8.5 !important;
                border-radius: 14px !important;
              }
              .jt-slider-prev-btn, .jt-slider-next-btn {
                width: 30px !important;
                height: 30px !important;
                font-size: 12px !important;
              }
            }
          `,
        }}
      />
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
            className="jt-slider-prev-btn"
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
            className="jt-slider-next-btn"
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