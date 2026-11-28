"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import { getImageUrl } from "@/lib/api";

const DEFAULT_CAMPAIGN_BANNERS = [
  {
    id: "banner-asol-utsob-master",
    isNative: true,
    badge: "✨ LIORA OFFICIAL CAMPAIGN • আসল উৎসব",
    title: "LIORA আসল উৎসব",
    tagline: "নকল নয়, শুধু আসলের উৎসব!",
    subtitle: "CeraVe, COSRX, The Ordinary, Anua সহ বিশ্বখ্যাত ব্র্যান্ডের আসল স্কিনকেয়ারে আকর্ষণীয় ছাড়",
    bgGradient: "linear-gradient(135deg, #2b030d 0%, #4c0519 35%, #881337 70%, #be123c 100%)",
    freeDeliveryText: "🚚 ফ্রি ডেলিভারি: ঢাকায় ৳১,৯৯৯ | সারাদেশে ৳২,৯৯৯",
    codText: "💵 সারা বাংলাদেশে ক্যাশ অন ডেলিভারি (COD)",
    buttonText: "আসল অফার দেখুন ➜",
    link: "/products",
    icon: "🌸",
    sideTitle: "১০০% আসল পণ্য",
    sideSubtitle: "আমদানি: কোরিয়া • ইউকে • ইউএসএ",
    sidePill: "🛡️ নকল নয়, শুধু আসলের নিশ্চয়তা",
  },
  {
    id: "banner-asol-winter-combo",
    isNative: true,
    badge: "❄️ WINTER GLOW SPECIAL",
    title: "শীতের ৩-ধাপের আসল কম্বো",
    tagline: "সাশ্রয় করুন ৫০০+ টাকা পর্যন্ত!",
    subtitle: "ক্লিনজার + ডিপ ময়েশ্চারাইজার + সানস্ক্রিন — এক কম্বোতে শীতের পূর্ণ যত্ন",
    bgGradient: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 35%, #312e81 70%, #4338ca 100%)",
    freeDeliveryText: "🚚 কম্বো অর্ডারে বিশেষ ডেলিভারি সুবিধা",
    codText: "✨ শীতের পারফেক্ট গ্লো কেয়ার",
    buttonText: "শীতের কম্বো কিনুন ➜",
    link: "/combo",
    icon: "🎁",
    sideTitle: "৩-ধাপের কম্বো সেট",
    sideSubtitle: "ক্লিনজার + ক্রিম + সানস্ক্রিন",
    sidePill: "💰 সাশ্রয় ৫০০+ টাকা পর্যন্ত",
  },
  {
    id: "banner-asol-budget-under499",
    isNative: true,
    badge: "👛 পকেট ফ্রেন্ডলি আসল স্কিনকেয়ার",
    title: "৪৯৯ টাকার নিচে আসল বাজেট শপ",
    tagline: "কম বাজেটেও ১০০% আসল স্কিনকেয়ার",
    subtitle: "লিপবাম, শিট মাস্ক, মিনি ট্রাভেল কেয়ার ও ট্রেন্ডিং মেকআপ কালেকশন",
    bgGradient: "linear-gradient(135deg, #022c22 0%, #064e3b 35%, #047857 70%, #059669 100%)",
    freeDeliveryText: "⚡ প্রথম অর্ডারেও নিশ্চিন্ত কেনাকাটা",
    codText: "💵 ক্যাশ অন ডেলিভারি সুবিধা",
    buttonText: "বাজেট কালেকশন ➜",
    link: "/products?maxPrice=499&budget=under-499",
    icon: "🛍️",
    sideTitle: "৳৪৯৯ এর নিচে আসল",
    sideSubtitle: "বাজেট ফ্রেন্ডলি খাঁটি কেয়ার",
    sidePill: "🎉 সাশ্রয়ী বিউটি শপিং",
  },
  {
    id: "banner-asol-kbeauty-glow",
    isNative: true,
    badge: "🌸 100% ORIGINAL K-BEAUTY",
    title: "কোরিয়ান গ্লাস স্কিন আসল ফেস্ট",
    tagline: "শতভাগ অরিজিনাল K-Beauty কেয়ার",
    subtitle: "ভাইরাল স্নেল মিউসিন, রাইস টোনার ও সান সিরামে আকর্ষণীয় ছাড়",
    bgGradient: "linear-gradient(135deg, #2e0854 0%, #4a044e 35%, #701a75 70%, #a21caf 100%)",
    freeDeliveryText: "🚚 ফ্রি ডেলিভারি: ঢাকায় ৳১৯৯৯ | সারাদেশে ৳২৯৯৯",
    codText: "✨ সরাসরি কোরিয়ান অথেনটিক ফর্মুলা",
    buttonText: "K-Beauty ব্রাউজ করুন ➜",
    link: "/products?category=K-Beauty",
    icon: "✨",
    sideTitle: "কোরিয়ান গ্লাস স্কিন",
    sideSubtitle: "COSRX • Beauty of Joseon • Anua",
    sidePill: "🌟 শতভাগ অরিজিনাল",
  },
];

export default function PromoBanner({ promoSlides = [] }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  // Compile active banners:
  // Strictly use active campaign banners (custom admin slides or default Asol Utsob campaign slides)
  const banners = useMemo(() => {
    if (Array.isArray(promoSlides) && promoSlides.length > 0) {
      const validSlides = promoSlides
        .filter((s) => s && s.image && typeof s.image === "string" && s.image.trim() && !s.image.includes("1111") && !String(s.title || "").includes("11.11") && !String(s.id || "").includes("1111"))
        .map((s, idx) => ({
          id: s._id || s.id || `admin-banner-${idx}`,
          title: s.title || "LIORA Campaign",
          image: getImageUrl(s.image),
          link: s.buttonLink || s.link || "/products",
        }));

      if (validSlides.length > 0) {
        return validSlides;
      }
    }

    // Default to LIORA আসল উৎসব native studio campaign banners
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
    }, 4000);

    return () => clearInterval(timer);
  }, [total, nextSlide]);

  // Safeguard index
  useEffect(() => {
    if (currentSlide >= total && total > 0) {
      setTimeout(() => setCurrentSlide(0), 0);
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
        margin: "8px auto 20px",
        padding: "0 16px",
      }}
      aria-label="Promotional Banners"
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .jt-slider-prev-btn, .jt-slider-next-btn {
              opacity: 0.35;
              transition: opacity 0.25s ease, transform 0.2s ease, background 0.2s ease !important;
            }
            .jt-shajgoj-slider-container:hover .jt-slider-prev-btn,
            .jt-shajgoj-slider-container:hover .jt-slider-next-btn {
              opacity: 0.95;
            }
            @media (max-width: 768px) {
              .jt-shajgoj-slider-section {
                padding: 0 10px !important;
                margin: 6px auto 14px !important;
              }
              .jt-shajgoj-slider-container {
                aspect-ratio: 16 / 9 !important;
                border-radius: 12px !important;
              }
              .jt-slider-prev-btn, .jt-slider-next-btn {
                display: none !important;
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
          borderRadius: "18px",
          overflow: "hidden",
          boxShadow: "0 12px 36px rgba(15, 23, 42, 0.09)",
          backgroundColor: "#18060d",
          aspectRatio: "16 / 9",
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
              {banner.isNative ? (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    background: banner.bgGradient || "linear-gradient(135deg, #2b030d 0%, #4c0519 35%, #881337 70%, #be123c 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "clamp(14px, 3.5vw, 32px) clamp(16px, 5vw, 44px)",
                    boxSizing: "border-box",
                    position: "relative",
                    overflow: "hidden",
                    color: "#ffffff",
                  }}
                >
                  {/* Background Ambient Glows & Patterns */}
                  <div
                    style={{
                      position: "absolute",
                      top: "-25%",
                      right: "5%",
                      width: "360px",
                      height: "360px",
                      background: "radial-gradient(circle, rgba(251, 113, 133, 0.22) 0%, rgba(0,0,0,0) 70%)",
                      borderRadius: "50%",
                      pointerEvents: "none",
                    }}
                  />

                  {/* Left Content Area */}
                  <div style={{ maxWidth: "620px", zIndex: 2, display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(255, 255, 255, 0.15)", backdropFilter: "blur(8px)", border: "1px solid rgba(255, 255, 255, 0.25)", padding: "3px 12px", borderRadius: "999px", width: "fit-content" }}>
                      <span style={{ fontSize: "11px", fontWeight: "800", color: "#fef08a", letterSpacing: "0.5px" }}>
                        {banner.badge || "✨ LIORA OFFICIAL CAMPAIGN"}
                      </span>
                    </div>

                    <h2
                      style={{
                        margin: 0,
                        fontSize: "clamp(20px, 4vw, 36px)",
                        fontWeight: "900",
                        lineHeight: 1.15,
                        color: "#ffffff",
                        letterSpacing: "-0.5px",
                        textShadow: "0 2px 10px rgba(0,0,0,0.3)",
                      }}
                    >
                      {banner.title}
                    </h2>

                    <div
                      style={{
                        fontSize: "clamp(14px, 2.6vw, 20px)",
                        fontWeight: "800",
                        color: "#fecdd3",
                        letterSpacing: "-0.2px",
                      }}
                    >
                      {banner.tagline}
                    </div>

                    <p
                      style={{
                        margin: 0,
                        fontSize: "clamp(11.5px, 1.8vw, 13.5px)",
                        color: "rgba(255, 255, 255, 0.88)",
                        lineHeight: 1.4,
                        maxWidth: "500px",
                      }}
                    >
                      {banner.subtitle}
                    </p>

                    {/* Delivery & Trust Badges */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "4px" }}>
                      {banner.freeDeliveryText && (
                        <span style={{ background: "rgba(0, 0, 0, 0.28)", border: "1px solid rgba(255, 255, 255, 0.25)", padding: "3px 9px", borderRadius: "6px", fontSize: "10.5px", fontWeight: "700", color: "#86efac" }}>
                          {banner.freeDeliveryText}
                        </span>
                      )}
                      {banner.codText && (
                        <span style={{ background: "rgba(0, 0, 0, 0.28)", border: "1px solid rgba(255, 255, 255, 0.25)", padding: "3px 9px", borderRadius: "6px", fontSize: "10.5px", fontWeight: "700", color: "#fed7aa" }}>
                          {banner.codText}
                        </span>
                      )}
                    </div>

                    <div style={{ marginTop: "6px" }}>
                      <Link
                        href={banner.link || "/products"}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          background: "#ffffff",
                          color: "#881337",
                          padding: "8px 20px",
                          borderRadius: "10px",
                          fontSize: "13px",
                          fontWeight: "900",
                          textDecoration: "none",
                          boxShadow: "0 4px 14px rgba(0, 0, 0, 0.25)",
                        }}
                      >
                        {banner.buttonText || "অফার দেখুন ➜"}
                      </Link>
                    </div>
                  </div>

                  {/* Right Showcase Graphic */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      zIndex: 2,
                      flexShrink: 0,
                    }}
                  >
                    <div
                      style={{
                        background: "rgba(255, 255, 255, 0.12)",
                        border: "1.5px solid rgba(255, 255, 255, 0.25)",
                        borderRadius: "16px",
                        padding: "clamp(12px, 2.5vw, 20px)",
                        backdropFilter: "blur(10px)",
                        textAlign: "center",
                        minWidth: "140px",
                        maxWidth: "240px",
                        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.25)",
                      }}
                    >
                      <div style={{ fontSize: "clamp(32px, 5vw, 48px)", marginBottom: "4px" }}>
                        {banner.icon || "✨"}
                      </div>
                      <strong style={{ display: "block", fontSize: "clamp(13px, 1.8vw, 16px)", color: "#ffffff", fontWeight: "900" }}>
                        {banner.sideTitle || "১০০% অথেনটিক"}
                      </strong>
                      <span style={{ display: "block", fontSize: "11px", color: "#fecdd3", marginTop: "2px" }}>
                        {banner.sideSubtitle || "কোরিয়া • ইউকে • ইউএসএ"}
                      </span>
                      <div style={{ marginTop: "8px", paddingTop: "6px", borderTop: "1px dashed rgba(255,255,255,0.25)", fontSize: "10px", color: "#fde047", fontWeight: "800" }}>
                        {banner.sidePill || "নকল নয়, শুধু আসল"}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
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
                      objectFit: "contain",
                      backgroundColor: "#110307",
                      display: "block",
                      userSelect: "none",
                    }}
                    loading={index === 0 ? "eager" : "lazy"}
                    draggable={false}
                  />
                </Link>
              )}
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
              left: "16px",
              top: "50%",
              transform: "translateY(-50%)",
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              background: "rgba(255, 255, 255, 0.85)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              border: "1px solid rgba(255, 255, 255, 0.9)",
              color: "#0f172a",
              cursor: "pointer",
              fontSize: "15px",
              fontWeight: "900",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 6px 18px rgba(0, 0, 0, 0.2)",
              zIndex: 10,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#ffffff";
              e.currentTarget.style.transform = "translateY(-50%) scale(1.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.85)";
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
              right: "16px",
              top: "50%",
              transform: "translateY(-50%)",
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              background: "rgba(255, 255, 255, 0.85)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              border: "1px solid rgba(255, 255, 255, 0.9)",
              color: "#0f172a",
              cursor: "pointer",
              fontSize: "15px",
              fontWeight: "900",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 6px 18px rgba(0, 0, 0, 0.2)",
              zIndex: 10,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#ffffff";
              e.currentTarget.style.transform = "translateY(-50%) scale(1.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.85)";
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
              background: "rgba(15, 23, 42, 0.4)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
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