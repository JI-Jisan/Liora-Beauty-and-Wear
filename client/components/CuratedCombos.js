"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { API_BASE_URL, getImageUrl } from "@/lib/api";
import { getDiscount, getSaved } from "@/lib/price";
import { useCampus } from "@/context/CampusContext";

const FALLBACK_COMBOS = [
  {
    _id: "combo-demo-1",
    name: "Student Budget Glow Combo (Cleanser + Serum + Sunscreen)",
    image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&auto=format&fit=crop&q=80",
    offerPrice: 2150,
    originalPrice: 2850,
    category: { name: "Value Combo" },
  },
  {
    _id: "combo-demo-2",
    name: "Acne Clear Duo (Centella Foam + Salicylic Treatment)",
    image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&auto=format&fit=crop&q=80",
    offerPrice: 1690,
    originalPrice: 2200,
    category: { name: "Acne Combo" },
  },
  {
    _id: "combo-demo-3",
    name: "Glass Skin Hydration Pack (Rice Toner + Hyaluronic Cream)",
    image: "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=600&auto=format&fit=crop&q=80",
    offerPrice: 2450,
    originalPrice: 3100,
    category: { name: "Glow Combo" },
  },
  {
    _id: "combo-demo-4",
    name: "Daily Sun Protection Duo (SPF50 Sun Serum + Soothing Gel)",
    image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&auto=format&fit=crop&q=80",
    offerPrice: 1850,
    originalPrice: 2350,
    category: { name: "Sun Care Duo" },
  },
];

export default function CuratedCombos({ onAddToCart }) {
  const { activeCoupon, getProductPrice } = useCampus();
  const [combos, setCombos] = useState([]);
  const [addedIds, setAddedIds] = useState([]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/products?collection=combo&limit=4`)
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data?.products)
          ? data.products
          : Array.isArray(data)
          ? data
          : [];
        if (list.length > 0) {
          setCombos(list.slice(0, 4));
        } else {
          setCombos(FALLBACK_COMBOS);
        }
      })
      .catch(() => {
        setCombos(FALLBACK_COMBOS);
      });
  }, []);

  const handleQuickAdd = (item, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onAddToCart) {
      const campusPricing = getProductPrice(item);
      const itemToAdd = campusPricing?.hasDiscount
        ? {
            ...item,
            offerPrice: campusPricing.campusPrice,
            originalOfferPrice: item.offerPrice,
            isCampusSpecial: true,
            campusCode: activeCoupon?.code,
            campusName: activeCoupon?.short,
            campusDiscountPct: campusPricing.discountPct
          }
        : item;

      onAddToCart(itemToAdd);
      setAddedIds((prev) => [...prev, item._id]);
      setTimeout(() => {
        setAddedIds((prev) => prev.filter((id) => id !== item._id));
      }, 1500);
    }
  };

  return (
    <section className="jt-combos-section">
      <div className="jt-combos-inner">
        <div className="jt-combos-header">
          <div className="jt-combos-header-left">
            <span className="jt-combos-gift-icon">🎁</span>
            <div>
              <div className="jt-combos-tag-wrap">
                <span className="jt-combos-tag">VALUE PACKS & SAVINGS</span>
              </div>
              <h2 className="jt-combos-title">
                Curated <span className="jt-combos-highlight">Combos & Budget Bundles</span>
              </h2>
              <p className="jt-combos-subtitle">
                একাধিক স্কিনকেয়ার প্রোডাক্ট একসাথে কিনুন এবং বাঁচান সর্বোচ্চ ৫০০+ টাকা পর্যন্ত!
              </p>
            </div>
          </div>
          <Link href="/combo" className="jt-combos-view-all-btn">
            View All Combos &rarr;
          </Link>
        </div>

        <div className="jt-combos-grid">
          {combos.map((item) => {
            const imageSrc =
              getImageUrl(item.image) ||
              "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=500&auto=format&fit=crop&q=80";
            const discountPct = getDiscount(item);
            const savedTk = getSaved(item);
            const isAdded = addedIds.includes(item._id);
            const campusPricing = getProductPrice(item);

            return (
              <div key={item._id} className="jt-combo-card">
                <Link href={`/products/${item._id}`} className="jt-combo-card-link">
                  <div className="jt-combo-img-wrap">
                    <img
                      src={imageSrc}
                      alt={item.name}
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.src =
                          "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=500&auto=format&fit=crop&q=80";
                      }}
                    />
                    <span className="jt-combo-badge">🎁 BUNDLE SAVE</span>
                    {campusPricing?.hasDiscount ? (
                      <span
                        className="jt-combo-discount-tag"
                        style={{
                          background: activeCoupon?.tagColor || "#ff4d6d",
                          boxShadow: "0 4px 12px rgba(225,29,72,.35)"
                        }}
                      >
                        🎓 {activeCoupon?.short} -{campusPricing.discountPct}%
                      </span>
                    ) : discountPct > 0 ? (
                      <span className="jt-combo-discount-tag">
                        {discountPct}% OFF
                      </span>
                    ) : null}
                  </div>

                  <div className="jt-combo-content">
                    <h3 className="jt-combo-name" title={item.name}>
                      {item.name}
                    </h3>

                    {campusPricing?.hasDiscount ? (
                      <div>
                        <div className="jt-combo-price-box" style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
                          <strong className="jt-combo-offer-price" style={{ color: "#e11d48", fontWeight: 900 }}>
                            {campusPricing.campusPrice} Tk
                          </strong>
                          {campusPricing.mrp > campusPricing.campusPrice && (
                            <span className="jt-combo-orig-price" style={{ textDecoration: "line-through", color: "#94a3b8" }} title="Market Retail Price (MRP)">
                              MRP {campusPricing.mrp} Tk
                            </span>
                          )}
                        </div>
                        {item.offerPrice && campusPricing.mrp > item.offerPrice && item.offerPrice > campusPricing.campusPrice && (
                          <div style={{ fontSize: 11, color: "#64748b", margin: "2px 0" }}>
                            রেগুলার: <span style={{ textDecoration: "line-through" }}>{item.offerPrice} Tk</span>
                          </div>
                        )}
                        <div className="jt-combo-save-pill" style={{ background: "#dcfce7", color: "#16a34a", fontWeight: 800 }}>
                          {campusPricing.savedFromMrp > campusPricing.savedAmount ? (
                            <span>🎓 MRP থেকে মোট সেভ: ৳{campusPricing.savedFromMrp} ({campusPricing.savedFromMrpPct}% লাভ)</span>
                          ) : (
                            <span>🎓 {activeCoupon?.short} সেভিংস: ৳{campusPricing.savedAmount}</span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="jt-combo-price-box">
                          <strong className="jt-combo-offer-price">
                            {item.offerPrice} Tk
                          </strong>
                          {item.originalPrice > item.offerPrice && (
                            <span className="jt-combo-orig-price">
                              {item.originalPrice} Tk
                            </span>
                          )}
                        </div>
                        {savedTk > 0 && (
                          <div className="jt-combo-save-pill">
                            🎉 মোট ৳{savedTk} সাশ্রয়
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </Link>

                <div className="jt-combo-footer">
                  <button
                    type="button"
                    className={`jt-combo-add-btn ${isAdded ? "added" : ""}`}
                    onClick={(e) => handleQuickAdd(item, e)}
                  >
                    {isAdded ? "✓ Added to Cart" : "🛍️ Grab Combo"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
