"use client";

import { useState } from "react";
import { getImageUrl } from "@/lib/api";

const DEFAULT_HERO_IMAGE =
  "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=1200&auto=format&fit=crop&q=80";

export default function Hero({
  heroImage = "",
}) {
  const [activeSlide, setActiveSlide] = useState(0);

  const scrollToSection = (id) => {
    const section = document.getElementById(id);
    if (section) {
      section.scrollIntoView({ behavior: "smooth" });
    }
  };

  const imageSrc = getImageUrl(heroImage) || DEFAULT_HERO_IMAGE;

  return (
    <div className="jt-hero-wrapper">
      <section className="jt-hero-card">
        {/* Full Frame Banner Image (Uploaded from Admin Panel) */}
        <div className="jt-full-banner-container">
          <img
            src={imageSrc}
            alt="LIORA Beauty & Wear Banner"
            className="jt-full-banner-img"
            onError={(e) => {
              e.currentTarget.src = DEFAULT_HERO_IMAGE;
            }}
          />

          {/* Action Buttons Overlay at Bottom Left */}
          <div className="jt-hero-overlay-actions">
            <button
              type="button"
              className="jt-hero-shop-btn"
              onClick={() => scrollToSection("shop-products")}
            >
              <span className="jt-btn-icon">🛍️</span> Shop Now
            </button>

            <button
              type="button"
              className="jt-hero-offers-btn"
              onClick={() => scrollToSection("view-offers")}
            >
              <span className="jt-btn-icon">🏷️</span> View Offers
            </button>
          </div>

          {/* Carousel Dots Indicator at Bottom Center */}
          <div className="jt-hero-dots-row">
            <button
              type="button"
              className={`jt-hero-dot ${activeSlide === 0 ? "active" : ""}`}
              onClick={() => setActiveSlide(0)}
              aria-label="Slide 1"
            />
            <button
              type="button"
              className={`jt-hero-dot ${activeSlide === 1 ? "active" : ""}`}
              onClick={() => setActiveSlide(1)}
              aria-label="Slide 2"
            />
            <button
              type="button"
              className={`jt-hero-dot ${activeSlide === 2 ? "active" : ""}`}
              onClick={() => setActiveSlide(2)}
              aria-label="Slide 3"
            />
          </div>
        </div>
      </section>

      {/* 3-Pillar Trust Badges Bar Below Hero (STRICTLY 1 HORIZONTAL ROW SIDE-BY-SIDE ON ALL DEVICES) */}
      <div className="jt-trust-badges-bar">
        <div className="jt-trust-item">
          <span className="jt-trust-icon">🚚</span>
          <div className="jt-trust-text-box">
            <strong>Cash on Delivery</strong>
            <span>Available</span>
          </div>
        </div>

        <div className="jt-trust-item">
          <span className="jt-trust-icon">🛡️</span>
          <div className="jt-trust-text-box">
            <strong>100% Authentic</strong>
            <span>Products</span>
          </div>
        </div>

        <div className="jt-trust-item">
          <span className="jt-trust-icon">🔄</span>
          <div className="jt-trust-text-box">
            <strong>Easy Returns</strong>
            <span>&amp; Refunds</span>
          </div>
        </div>
      </div>
    </div>
  );
}