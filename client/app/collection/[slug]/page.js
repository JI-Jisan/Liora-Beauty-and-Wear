"use client";

import { use, useEffect, useState } from "react";
import Header from "@/components/Header";
import ProductGrid from "@/components/ProductGrid";
import WhatsAppButton from "@/components/WhatsAppButton";
import { useCart } from "@/context/CartContext";

const CAMPAIGN_METADATA = {
  combo: {
    title: "Combo Offers & Value Packs",
    tag: "VALUE PACKS • EXTRA SAVINGS",
    icon: "🎁",
    desc: "Shop curated beauty and fashion bundles at special discounted package prices.",
    bgGradient: "linear-gradient(135deg, #7c3aed 0%, #9333ea 50%, #c026d3 100%)",
    badgeBg: "rgba(255, 255, 255, 0.2)",
  },
  "combo-offer": {
    title: "Combo Offers & Value Packs",
    tag: "VALUE PACKS • EXTRA SAVINGS",
    icon: "🎁",
    desc: "Shop curated beauty and fashion bundles at special discounted package prices.",
    bgGradient: "linear-gradient(135deg, #7c3aed 0%, #9333ea 50%, #c026d3 100%)",
    badgeBg: "rgba(255, 255, 255, 0.2)",
  },
  clearance: {
    title: "Clearance Sale",
    tag: "FINAL STOCK • UP TO 60% OFF",
    icon: "🔥",
    desc: "Huge discounts on last remaining stock! Grab authentic premium items before they sell out forever.",
    bgGradient: "linear-gradient(135deg, #b91c1c 0%, #dc2626 50%, #ea580c 100%)",
    badgeBg: "rgba(255, 255, 255, 0.22)",
  },
  "clearance-sale": {
    title: "Clearance Sale",
    tag: "FINAL STOCK • UP TO 60% OFF",
    icon: "🔥",
    desc: "Huge discounts on last remaining stock! Grab authentic premium items before they sell out forever.",
    bgGradient: "linear-gradient(135deg, #b91c1c 0%, #dc2626 50%, #ea580c 100%)",
    badgeBg: "rgba(255, 255, 255, 0.22)",
  },
  "flash-sales": {
    title: "Flash Sales",
    tag: "LIMITED TIME ONLY • HURRY!",
    icon: "⚡",
    desc: "Special promotional price drops for a limited time. Genuine cosmetics and wear at unbeatable prices.",
    bgGradient: "linear-gradient(135deg, #9f1239 0%, #e11d48 50%, #f43f5e 100%)",
    badgeBg: "rgba(255, 255, 255, 0.2)",
  },
  "flash-sale": {
    title: "Flash Sales",
    tag: "LIMITED TIME ONLY • HURRY!",
    icon: "⚡",
    desc: "Special promotional price drops for a limited time. Genuine cosmetics and wear at unbeatable prices.",
    bgGradient: "linear-gradient(135deg, #9f1239 0%, #e11d48 50%, #f43f5e 100%)",
    badgeBg: "rgba(255, 255, 255, 0.2)",
  },
};

export default function CollectionPage({ params }) {
  const unwrappedParams = use(params);
  const slug = (unwrappedParams?.slug || "").toLowerCase().trim();
  const [searchTerm, setSearchTerm] = useState("");
  const { addToCart } = useCart();

  const campaign = CAMPAIGN_METADATA[slug] || {
    title: slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) + " Collection",
    tag: "SPECIAL COLLECTION",
    icon: "✨",
    desc: `Browse the exclusive ${slug.replace(/-/g, " ")} products catalog.`,
    bgGradient: "linear-gradient(135deg, #0f172a 0%, #334155 100%)",
    badgeBg: "rgba(255, 255, 255, 0.15)",
  };

  return (
    <main className="jt-page" style={{ minHeight: "100vh" }}>
      <Header searchTerm={searchTerm} onSearchChange={setSearchTerm} />

      {/* HERO CAMPAIGN BANNER */}
      <section style={{ maxWidth: "1400px", margin: "16px auto 0", padding: "0 16px" }}>
        <div
          style={{
            background: campaign.bgGradient,
            color: "#ffffff",
            borderRadius: "20px",
            padding: "36px 24px",
            textAlign: "center",
            boxShadow: "0 8px 30px rgba(0, 0, 0, 0.12)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Decorative background glow */}
          <div
            style={{
              position: "absolute",
              top: "-50%",
              right: "-20%",
              width: "350px",
              height: "350px",
              background: "radial-gradient(circle, rgba(255,255,255,0.18) 0%, transparent 70%)",
              borderRadius: "50%",
              pointerEvents: "none",
            }}
          />

          <span
            style={{
              display: "inline-block",
              background: campaign.badgeBg,
              color: "#ffffff",
              backdropFilter: "blur(4px)",
              border: "1px solid rgba(255, 255, 255, 0.3)",
              fontSize: "11.5px",
              fontWeight: "800",
              letterSpacing: "1px",
              padding: "5px 14px",
              borderRadius: "50px",
              marginBottom: "14px",
              textTransform: "uppercase",
            }}
          >
            {campaign.tag}
          </span>

          <h1
            style={{
              fontSize: "clamp(24px, 5vw, 38px)",
              fontWeight: "900",
              margin: "0 0 10px",
              color: "#ffffff",
              letterSpacing: "0.5px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            <span>{campaign.icon}</span>
            <span>{campaign.title}</span>
          </h1>

          <p
            style={{
              fontSize: "clamp(13px, 3vw, 16px)",
              color: "rgba(255, 255, 255, 0.9)",
              maxWidth: "680px",
              margin: "0 auto",
              lineHeight: "1.6",
            }}
          >
            {campaign.desc}
          </p>
        </div>
      </section>

      {/* PRODUCTS CATALOG SECTION */}
      <section style={{ maxWidth: "1400px", margin: "20px auto 40px", padding: "0 16px" }}>
        <ProductGrid
          collection={slug}
          searchTerm={searchTerm}
          onAddToCart={addToCart}
          title=""
          hideHeader={true}
        />
      </section>

      <WhatsAppButton />
    </main>
  );
}
