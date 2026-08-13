"use client";

import Link from "next/link";
import { getImageUrl } from "@/lib/api";

const DEFAULT_HERO_IMAGE = "/hero-banner-main.jpg";

export default function Hero({
  heroImage = "",
}) {
  const imageSrc = getImageUrl(heroImage) || DEFAULT_HERO_IMAGE;

  return (
    <div className="jt-hero-wrapper">
      <section className="jt-hero-card">
        {/* Full Frame Banner Image (Uploaded from Admin Panel) */}
        <Link href="/products" className="jt-full-banner-container" style={{ textDecoration: "none" }}>
          <img
            src={imageSrc}
            alt="LIORA Beauty & Wear Hero Banner"
            className="jt-full-banner-img"
            onError={(e) => {
              e.currentTarget.src = DEFAULT_HERO_IMAGE;
            }}
          />
        </Link>
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