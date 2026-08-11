"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/api";

export default function PromoBanner({ promoSlides = [] }) {
  const slides =
    promoSlides.length > 0
      ? promoSlides
      : [
          {
            badge: "Limited Offer",
            title: "Special Discount",
            subtitle: "Update this slider anytime from admin panel.",
            buttonText: "Shop Now",
            buttonLink: "/products",
            image: "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=1200&auto=format&fit=crop&q=80",
          },
        ];

  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;

    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % slides.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [slides.length]);

  const currentSlide = slides[activeIndex];

  const imageSrc = currentSlide.image
    ? currentSlide.image.startsWith("http")
      ? currentSlide.image
      : currentSlide.image.startsWith("/uploads")
      ? `${API_BASE_URL}${currentSlide.image}`
      : currentSlide.image
    : "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=1200&auto=format&fit=crop&q=80";

  return (
    <section className="jt-promo-banner">
      <div className="jt-promo-inner">
        <div className="jt-promo-left">
          <span className="jt-promo-badge">
            ✨ {currentSlide.badge || "Exclusive Offer"}
          </span>

          <h2>{currentSlide.title}</h2>
          <p>{currentSlide.subtitle}</p>

          <div className="jt-promo-actions">
            <Link
              href={currentSlide.buttonLink || "/products"}
              className="jt-promo-btn"
            >
              {currentSlide.buttonText || "Shop Now"}
            </Link>

            {slides.length > 1 && (
              <div className="jt-promo-dots">
                {slides.map((_, index) => (
                  <button
                    key={index}
                    type="button"
                    className={`jt-promo-dot ${
                      activeIndex === index ? "active" : ""
                    }`}
                    onClick={() => setActiveIndex(index)}
                    aria-label={`Slide ${index + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="jt-promo-right">
          <div className="jt-promo-image-wrapper">
            <img
              src={imageSrc}
              alt={currentSlide.title}
              className="jt-promo-image"
            />
            <div className="jt-promo-glass-tag">
              <span>🔥 Special Deal</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}