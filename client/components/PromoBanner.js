"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/api";

const DEFAULT_5_SLIDES = [
  {
    badge: "🔥 HOT DEAL - 26% OFF",
    title: "Royal Oud Perfume 100ml",
    subtitle: "Experience luxury oriental fragrances with long-lasting authentic scent.",
    buttonText: "Shop Perfumes",
    buttonLink: "/products?search=Perfume",
    price: "1,850 Tk",
    originalPrice: "2,500 Tk",
    image: "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=1400&auto=format&fit=crop&q=80",
  },
  {
    badge: "✨ EXCLUSIVE - 25% OFF",
    title: "Luxury Gold Chronograph Watch",
    subtitle: "Premium stainless steel quartz watch with water resistance & luxury design.",
    buttonText: "Shop Watches",
    buttonLink: "/products?search=Watch",
    price: "2,400 Tk",
    originalPrice: "3,200 Tk",
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1400&auto=format&fit=crop&q=80",
  },
  {
    badge: "🌿 BESTSELLER - 29% OFF",
    title: "Vitamin C Brightening Serum",
    subtitle: "Natural organic serum for glowing smooth skin & reducing dark spots.",
    buttonText: "Shop Skincare",
    buttonLink: "/products?search=Serum",
    price: "850 Tk",
    originalPrice: "1,200 Tk",
    image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=1400&auto=format&fit=crop&q=80",
  },
  {
    badge: "💡 TRENDING - 25% OFF",
    title: "Smart RGB LED Fan Light 30W",
    subtitle: "Multi-color remote control LED ceiling fan light with silent operation.",
    buttonText: "Shop Fan Light",
    buttonLink: "/products?search=Fan",
    price: "1,350 Tk",
    originalPrice: "1,800 Tk",
    image: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=1400&auto=format&fit=crop&q=80",
  },
  {
    badge: "🌸 NEW ARRIVAL - 34% OFF",
    title: "French Vanilla Long-Lasting Body Mist",
    subtitle: "Refreshing vanilla scent body mist for daily freshness & long lasting aroma.",
    buttonText: "Shop Body Mists",
    buttonLink: "/products?search=Vanilla",
    price: "990 Tk",
    originalPrice: "1,500 Tk",
    image: "https://images.unsplash.com/photo-1541643600914-78b084683601?w=1400&auto=format&fit=crop&q=80",
  },
];

export default function PromoBanner({ promoSlides = [] }) {
  const slides = promoSlides.length >= 3 ? promoSlides : DEFAULT_5_SLIDES;
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;

    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % slides.length);
    }, 3500);

    return () => clearInterval(interval);
  }, [slides.length]);

  const currentSlide = slides[activeIndex];

  const imageSrc = currentSlide.image
    ? currentSlide.image.startsWith("http")
      ? currentSlide.image
      : currentSlide.image.startsWith("/uploads")
      ? `${API_BASE_URL}${currentSlide.image}`
      : currentSlide.image
    : DEFAULT_5_SLIDES[activeIndex % DEFAULT_5_SLIDES.length].image;

  return (
    <section className="jt-full-banner-container">
      <div className="jt-full-banner-card">
        {/* Full-Cover Background Image */}
        <img
          key={activeIndex}
          src={imageSrc}
          alt={currentSlide.title}
          className="jt-full-banner-bg-image"
        />

        {/* Dark Gradient Overlay */}
        <div className="jt-full-banner-overlay" />

        {/* Banner Content Container */}
        <div className="jt-full-banner-content">
          <div className="jt-full-banner-left">
            <span className="jt-full-banner-badge">
              {currentSlide.badge || "Special Offer"}
            </span>

            <h2 className="jt-full-banner-title">{currentSlide.title}</h2>
            <p className="jt-full-banner-sub">{currentSlide.subtitle}</p>

            <div className="jt-full-banner-actions">
              <Link
                href={currentSlide.buttonLink || "/products"}
                className="jt-full-banner-btn"
              >
                {currentSlide.buttonText || "Shop Now"}
              </Link>

              {currentSlide.price && (
                <div className="jt-full-banner-price-tag">
                  <strong>{currentSlide.price}</strong>
                  {currentSlide.originalPrice && (
                    <span>{currentSlide.originalPrice}</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Dots Indicator & Navigation Controls */}
          <div className="jt-full-banner-right-controls">
            <div className="jt-full-banner-dots">
              {slides.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  className={`jt-full-banner-dot ${
                    activeIndex === index ? "active" : ""
                  }`}
                  onClick={() => setActiveIndex(index)}
                  aria-label={`Go to slide ${index + 1}`}
                >
                  <span className="jt-dot-inner" />
                </button>
              ))}
            </div>
            <span className="jt-slide-counter">
              0{activeIndex + 1} / 0{slides.length}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}