"use client";

import { useState } from "react";
import { getImageUrl } from "@/lib/api";

const DEFAULT_HERO_IMAGE =
  "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=80";

export default function Hero({
  heroText = "Shop 100% authentic cosmetics, perfumes, skincare, and fashion wear in one place.",
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
        <div className="jt-hero-grid">
          {/* Left Text & CTA Content */}
          <div className="jt-hero-left">
            <div className="jt-hero-trusted-pill">
              <span>Bangladesh&apos;s Trusted Online Shop</span>
            </div>

            <h1 className="jt-hero-main-title">
              Beauty That <br />
              <span className="jt-hero-highlight-italic">Inspires Confidence</span> <br />
              &amp; Style That Speaks <br />
              Elegance
            </h1>

            <p className="jt-hero-desc">{heroText}</p>

            <div className="jt-hero-btn-row">
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
          </div>

          {/* Right Product Showcase Banner Image */}
          <div className="jt-hero-right">
            <div className="jt-hero-image-frame">
              <img
                src={imageSrc}
                alt="LIORA Beauty & Wear Showcase"
                className="jt-hero-main-img"
                onError={(e) => {
                  e.currentTarget.src = DEFAULT_HERO_IMAGE;
                }}
              />
            </div>
          </div>
        </div>

        {/* Bottom Carousel Dots Indicator */}
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