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
            badge: "Offer",
            title: "Default Offer",
            subtitle: "Add promo slides from admin panel.",
            buttonText: "Shop Now",
            buttonLink: "/products",
            image: "",
          },
        ];

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
    : "";

  return (
    <section className="jt-promo-banner">
      <div className="jt-promo-inner">
        <div className="jt-promo-left">
          <div className="jt-promo-badge">{currentSlide.badge}</div>

          <h2>{currentSlide.title}</h2>
          <p>{currentSlide.subtitle}</p>

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
                />
              ))}
            </div>
          )}
        </div>

        <div className="jt-promo-right">
          {imageSrc ? (
            <img
              src={imageSrc}
              alt={currentSlide.title}
              className="jt-promo-image"
            />
          ) : (
            <div className="jt-promo-image-fallback">
              <span>{currentSlide.badge}</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}