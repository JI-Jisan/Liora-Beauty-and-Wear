"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getImageUrl } from "@/lib/api";

const DEFAULT_MINI_CARDS = [
  {
    _id: "mini-1",
    badge: "Limited Offer",
    title: "Special Discount",
    subtitle: "Update this slider anytime from admin panel.",
    buttonText: "Shop Now",
    buttonLink: "/products",
    image: "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=600&auto=format&fit=crop&q=80",
  },
  {
    _id: "mini-2",
    badge: "Limited Offer",
    title: "Special Discount",
    subtitle: "Update this slider anytime from admin panel.",
    buttonText: "Shop Now",
    buttonLink: "/products",
    image: "https://images.unsplash.com/photo-1541643600914-78b084683601?w=600&auto=format&fit=crop&q=80",
  },
];

export default function PromoBanner({ promoSlides = [] }) {
  const slides =
    Array.isArray(promoSlides) && promoSlides.length >= 2
      ? promoSlides
      : DEFAULT_MINI_CARDS;

  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

  useEffect(() => {
    if (slides.length <= 2) return;
    const interval = setInterval(() => {
      setActiveSlideIndex((prev) => (prev + 2) % slides.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [slides.length]);

  const displayCards = slides.slice(activeSlideIndex, activeSlideIndex + 2);
  const currentPair = displayCards.length < 2 ? slides.slice(0, 2) : displayCards;

  return (
    <section className="jt-mini-promo-section">
      <div className="jt-mini-promo-grid">
        {currentPair.map((slide, idx) => {
          const imageSrc =
            getImageUrl(slide.image) ||
            DEFAULT_MINI_CARDS[idx % DEFAULT_MINI_CARDS.length].image;

          return (
            <div key={slide._id || idx} className="jt-mini-promo-card">
              <img
                src={imageSrc}
                alt={slide.title || "Special Discount"}
                className="jt-mini-card-bg"
              />
              <div className="jt-mini-card-overlay" />

              <div className="jt-mini-card-content">
                <span className="jt-mini-badge">
                  {slide.badge || "Limited Offer"}
                </span>

                <h3 className="jt-mini-title">
                  {slide.title || "Special Discount"}
                </h3>

                <p className="jt-mini-desc">
                  {slide.subtitle || "Update this slider anytime from admin panel."}
                </p>

                <div className="jt-mini-bottom-row">
                  <Link
                    href={slide.buttonLink || "/products"}
                    className="jt-mini-shop-btn"
                  >
                    {slide.buttonText || "Shop Now"}
                  </Link>

                  <div className="jt-mini-progress-wrap">
                    <div className="jt-mini-progress-bar">
                      <div className="jt-mini-progress-fill" />
                    </div>
                    <span className="jt-mini-counter">01 / 02</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}