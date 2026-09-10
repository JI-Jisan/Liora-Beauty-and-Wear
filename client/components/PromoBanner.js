"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { API_BASE_URL, getImageUrl } from "@/lib/api";

const DEFAULT_SLIDES = [
  {
    id: "default-slide-1",
    badge: "✨ EID & SUMMER GLOW",
    title: "Korean Glass Skin & Authentic Skincare",
    subtitle: "COSRX, Beauty of Joseon & The Ordinary — 100% Authentic with Free Delivery Above ৳1999",
    buttonText: "Shop Skincare",
    buttonLink: "/products?search=skincare",
    image: "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=1600&auto=format&fit=crop&q=80",
    gradient: "linear-gradient(90deg, rgba(15, 23, 42, 0.92) 0%, rgba(15, 23, 42, 0.72) 50%, rgba(15, 23, 42, 0.25) 100%)",
  },
  {
    id: "default-slide-2",
    badge: "💎 LUXURY FRAGRANCE",
    title: "Royal Scents & Signature Body Mists",
    subtitle: "Long-lasting luxury perfumes curated from world-renowned perfumeries",
    buttonText: "Shop Perfumes",
    buttonLink: "/products?search=perfume",
    image: "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=1600&auto=format&fit=crop&q=80",
    gradient: "linear-gradient(90deg, rgba(30, 11, 38, 0.92) 0%, rgba(30, 11, 38, 0.72) 50%, rgba(30, 11, 38, 0.25) 100%)",
  },
];

export default function PromoBanner({ promoSlides = [] }) {
  const [sliderProducts, setSliderProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef(null);

  useEffect(() => {
    let isMounted = true;
    const fetchSliderProducts = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/products`);
        if (res.ok && isMounted) {
          const data = await res.json();
          const filtered = data.filter((p) => p.isSlider === true);
          setSliderProducts(filtered);
        }
      } catch (err) {
        console.error("Error fetching slider products", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchSliderProducts();
    return () => {
      isMounted = false;
    };
  }, []);

  // Merge custom slides with slider products
  const allSlides = useMemo(() => {
    const list = [];

    // 1. Custom uploaded slides from siteSettings
    if (Array.isArray(promoSlides) && promoSlides.length > 0) {
      promoSlides.forEach((s, idx) => {
        if (s && (s.image || s.title)) {
          list.push({
            id: s._id || `promo-slide-${idx}`,
            badge: s.badge || "SPECIAL OFFER",
            title: s.title || "Exclusive Offer",
            subtitle: s.subtitle || "",
            buttonText: s.buttonText || "Shop Now",
            buttonLink: s.buttonLink || "/products",
            image: getImageUrl(s.image),
            price: s.price,
            originalPrice: s.originalPrice,
          });
        }
      });
    }

    // 2. Slider products chosen via "Add to Slider"
    if (sliderProducts.length > 0) {
      sliderProducts.forEach((p) => {
        const discountPct =
          p.originalPrice > p.offerPrice
            ? Math.round(((p.originalPrice - p.offerPrice) / p.originalPrice) * 100)
            : 0;

        const optImg = p.image ? p.image.replace("/upload/", "/upload/f_auto,q_auto/") : "";

        list.push({
          id: `product-${p._id}`,
          badge: discountPct > 0 ? `🔥 ${discountPct}% OFF` : "💡 TRENDING",
          title: p.name,
          subtitle: p.category ? `Category: ${p.category}` : "Authentic Beauty & Wear",
          buttonText: "Order Now",
          buttonLink: `/product/${p._id}`,
          image: optImg,
          price: p.offerPrice,
          originalPrice: p.originalPrice > p.offerPrice ? p.originalPrice : null,
        });
      });
    }

    // 3. If neither exist, return default luxury slides
    if (list.length === 0) {
      return DEFAULT_SLIDES;
    }

    return list;
  }, [promoSlides, sliderProducts]);

  // Auto-slide logic (every 4.5 seconds unless hovered)
  useEffect(() => {
    if (allSlides.length <= 1 || isPaused) return;

    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % allSlides.length);
    }, 4500);

    return () => clearInterval(timer);
  }, [allSlides.length, isPaused]);

  // Safeguard index if slides list changes
  useEffect(() => {
    if (currentSlide >= allSlides.length) {
      setCurrentSlide(0);
    }
  }, [allSlides.length, currentSlide]);

  const handlePrev = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    setCurrentSlide((prev) => (prev === 0 ? allSlides.length - 1 : prev - 1));
  };

  const handleNext = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    setCurrentSlide((prev) => (prev + 1) % allSlides.length);
  };

  // Touch swipe handlers for mobile
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

  if (loading && allSlides.length === 0) {
    return (
      <div
        className="jt-full-banner-container"
        style={{ padding: "12px 16px", maxWidth: "1440px", margin: "0 auto 20px" }}
      >
        <div
          style={{
            borderRadius: "24px",
            minHeight: "320px",
            background: "linear-gradient(90deg,#f6e9ee 25%,#fdf5f8 50%,#f6e9ee 75%)",
            backgroundSize: "200% 100%",
            animation: "sk 1.2s ease-in-out infinite",
          }}
        />
      </div>
    );
  }

  const slide = allSlides[currentSlide] || allSlides[0];

  return (
    <div
      className="jt-full-banner-container"
      style={{ padding: "12px 16px", maxWidth: "1440px", margin: "0 auto 16px" }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className="jt-full-banner-card"
        style={{
          position: "relative",
          width: "100%",
          minHeight: "340px",
          borderRadius: "24px",
          overflow: "hidden",
          boxShadow: "0 14px 38px rgba(15, 23, 42, 0.16)",
          border: "1px solid rgba(226, 232, 240, 0.8)",
          display: "flex",
          alignItems: "center",
          background: "#0f172a",
        }}
      >
        {/* Background Image with smooth fade animation */}
        {slide.image && (
          <div
            key={slide.id + "-bg"}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundImage: `url(${slide.image})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              zIndex: 1,
              animation: "fadeInZoom 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards",
            }}
          />
        )}

        {/* Dark Luxury Gradient Overlay for crisp readability */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 2,
            background:
              slide.gradient ||
              "linear-gradient(90deg, rgba(15, 23, 42, 0.94) 0%, rgba(15, 23, 42, 0.78) 50%, rgba(15, 23, 42, 0.32) 80%, rgba(15, 23, 42, 0.15) 100%)",
          }}
        />

        {/* Content Layer */}
        <div
          style={{
            position: "relative",
            zIndex: 3,
            width: "100%",
            padding: "36px 42px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: "24px",
            flexWrap: "wrap",
          }}
        >
          {/* Left Text & CTA */}
          <div style={{ maxWidth: "680px", display: "flex", flexDirection: "column", gap: "12px" }}>
            {slide.badge && (
              <div>
                <span
                  style={{
                    background: "linear-gradient(135deg, #ff4d6d 0%, #e11d48 100%)",
                    color: "#ffffff",
                    fontWeight: "900",
                    fontSize: "12px",
                    padding: "5px 14px",
                    borderRadius: "999px",
                    letterSpacing: "0.5px",
                    display: "inline-block",
                    boxShadow: "0 4px 14px rgba(225, 29, 72, 0.4)",
                  }}
                >
                  {slide.badge}
                </span>
              </div>
            )}

            <h2
              style={{
                fontSize: "clamp(22px, 3.2vw, 36px)",
                fontWeight: "900",
                color: "#ffffff",
                margin: 0,
                lineHeight: "1.2",
                textShadow: "0 2px 10px rgba(0,0,0,0.35)",
              }}
            >
              {slide.title}
            </h2>

            {slide.subtitle && (
              <p
                style={{
                  fontSize: "14px",
                  color: "rgba(255, 255, 255, 0.9)",
                  margin: 0,
                  lineHeight: "1.5",
                  maxWidth: "540px",
                  textShadow: "0 1px 6px rgba(0,0,0,0.3)",
                }}
              >
                {slide.subtitle}
              </p>
            )}

            <div style={{ display: "flex", alignItems: "center", gap: "14px", marginTop: "8px", flexWrap: "wrap" }}>
              <Link
                href={slide.buttonLink || "/products"}
                style={{
                  background: "#ffffff",
                  color: "#0f172a",
                  padding: "11px 26px",
                  borderRadius: "12px",
                  fontWeight: "900",
                  fontSize: "14px",
                  textDecoration: "none",
                  boxShadow: "0 6px 18px rgba(0,0,0,0.25)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  transition: "transform 0.2s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
              >
                {slide.buttonText || "Shop Now"} →
              </Link>

              {slide.price && (
                <div
                  style={{
                    background: "rgba(15, 23, 42, 0.8)",
                    backdropFilter: "blur(10px)",
                    padding: "9px 16px",
                    borderRadius: "12px",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <strong style={{ color: "#ff4d6d", fontWeight: "900", fontSize: "16px" }}>
                    {slide.price} Tk
                  </strong>
                  {slide.originalPrice && (
                    <span style={{ color: "rgba(255, 255, 255, 0.6)", textDecoration: "line-through", fontSize: "12px" }}>
                      {slide.originalPrice} Tk
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Navigation Controls & Dots */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "10px" }}>
            {allSlides.length > 1 && (
              <>
                {/* Arrow buttons */}
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={handlePrev}
                    aria-label="Previous Slide"
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "50%",
                      background: "rgba(255, 255, 255, 0.2)",
                      backdropFilter: "blur(8px)",
                      border: "1px solid rgba(255, 255, 255, 0.3)",
                      color: "#ffffff",
                      cursor: "pointer",
                      fontSize: "14px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "background 0.2s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.4)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)")}
                  >
                    ❮
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    aria-label="Next Slide"
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "50%",
                      background: "rgba(255, 255, 255, 0.2)",
                      backdropFilter: "blur(8px)",
                      border: "1px solid rgba(255, 255, 255, 0.3)",
                      color: "#ffffff",
                      cursor: "pointer",
                      fontSize: "14px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "background 0.2s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.4)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)")}
                  >
                    ❯
                  </button>
                </div>

                {/* Dots indicator */}
                <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                  {allSlides.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCurrentSlide(idx)}
                      aria-label={`Slide ${idx + 1}`}
                      style={{
                        background: "transparent",
                        border: "none",
                        padding: "4px",
                        cursor: "pointer",
                      }}
                    >
                      <span
                        style={{
                          display: "block",
                          width: currentSlide === idx ? "26px" : "8px",
                          height: "8px",
                          borderRadius: "999px",
                          background: currentSlide === idx ? "#ff4d6d" : "rgba(255, 255, 255, 0.4)",
                          transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                        }}
                      />
                    </button>
                  ))}
                </div>

                {/* Slide index number */}
                <span style={{ fontSize: "11px", fontWeight: "700", color: "rgba(255, 255, 255, 0.7)" }}>
                  {String(currentSlide + 1).padStart(2, "0")} / {String(allSlides.length).padStart(2, "0")}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}