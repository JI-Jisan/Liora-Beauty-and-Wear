"use client";

import Link from "next/link";

const CONCERNS = [
  {
    id: "acne",
    title: "Acne & Blemishes",
    subtitle: "ব্রণ ও অ্যাকনে কেয়ার",
    icon: "🌿",
    gradient: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
    accent: "#16a34a",
    border: "#bbf7d0",
    link: "/products?search=acne",
  },
  {
    id: "glow",
    title: "Glass Skin & Glow",
    subtitle: "উজ্জ্বলতা ও গ্লোয়িং ত্বক",
    icon: "✨",
    gradient: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)",
    accent: "#d97706",
    border: "#fde68a",
    link: "/products?search=glow",
  },
  {
    id: "dark-spots",
    title: "Dark Spots & Melasma",
    subtitle: "মেছতা ও দাগ দূরীকরণ",
    icon: "🎯",
    gradient: "linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)",
    accent: "#9333ea",
    border: "#e9d5ff",
    link: "/products?search=spot",
  },
  {
    id: "sun-protection",
    title: "Sun & Tan Defense",
    subtitle: "রোদে পোড়া দাগ রোধ",
    icon: "☀️",
    gradient: "linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)",
    accent: "#ea580c",
    border: "#fed7aa",
    link: "/products?search=sunscreen",
  },
  {
    id: "dry-skin",
    title: "Deep Hydration",
    subtitle: "শুষ্ক ত্বকের ময়েশ্চারাইজিং",
    icon: "💧",
    gradient: "linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%)",
    accent: "#0d9488",
    border: "#99f6e4",
    link: "/products?search=moisturiz",
  },
  {
    id: "hair-care",
    title: "Hair Fall & Repair",
    subtitle: "চুল পড়া রোধ ও যত্ন",
    icon: "💇‍♀️",
    gradient: "linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)",
    accent: "#e11d48",
    border: "#fecdd3",
    link: "/products?search=hair",
  },
];

export default function ShopByConcern() {
  return (
    <section className="jt-concern-section">
      <div className="jt-concern-header-bar">
        <div className="jt-concern-header-left">
          <span className="jt-concern-crown">🎯</span>
          <div>
            <h2 className="jt-concern-title">
              Shop by <span className="jt-highlight">Concern</span>
            </h2>
            <p className="jt-concern-subtitle">
              আপনার ত্বকের সমস্যা অনুযায়ী সঠিক স্কিন কেয়ার বেছে নিন
            </p>
          </div>
        </div>
        <Link href="/products" className="jt-concern-view-all">
          Explore All Concerns &rarr;
        </Link>
      </div>

      <div className="jt-concern-grid">
        {CONCERNS.map((item) => (
          <Link
            key={item.id}
            href={item.link}
            className="jt-concern-card"
            style={{
              background: item.gradient,
              borderColor: item.border,
            }}
          >
            <div
              className="jt-concern-icon-wrap"
              style={{
                borderColor: item.border,
                color: item.accent,
              }}
            >
              <span>{item.icon}</span>
            </div>

            <div className="jt-concern-info">
              <h4 style={{ color: item.accent }}>{item.title}</h4>
              <p>{item.subtitle}</p>
              <span className="jt-concern-explore-btn">
                Browse Products &rarr;
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
