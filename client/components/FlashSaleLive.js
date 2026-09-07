"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { API_BASE_URL, getImageUrl } from "@/lib/api";
import { getDiscount, getSaved } from "@/lib/price";

const FALLBACK_FLASH_PRODUCTS = [
  {
    _id: "flash-demo-1",
    name: "CeraVe Renewing SA Cleanser 473ml",
    image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&auto=format&fit=crop&q=80",
    category: { name: "Cleansers" },
    originalPrice: 2200,
    offerPrice: 1750,
  },
  {
    _id: "flash-demo-2",
    name: "The Ordinary Niacinamide 10% + Zinc 1% 30ml",
    image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&auto=format&fit=crop&q=80",
    category: { name: "Serums" },
    originalPrice: 1350,
    offerPrice: 1090,
  },
  {
    _id: "flash-demo-3",
    name: "Beauty of Joseon Relief Sun Rice + Probiotics SPF50+",
    image: "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=600&auto=format&fit=crop&q=80",
    category: { name: "Sunscreen" },
    originalPrice: 1750,
    offerPrice: 1440,
  },
  {
    _id: "flash-demo-4",
    name: "COSRX Advanced Snail 96 Mucin Power Essence",
    image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&auto=format&fit=crop&q=80",
    category: { name: "Essence" },
    originalPrice: 1850,
    offerPrice: 1490,
  },
];

export default function FlashSaleLive({ onAddToCart }) {
  const [timeLeft, setTimeLeft] = useState({
    hours: "05",
    minutes: "48",
    seconds: "20",
  });
  const [flashProducts, setFlashProducts] = useState([]);
  const [addedIds, setAddedIds] = useState([]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/products?paginate=1&limit=8`)
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data?.products)
          ? data.products
          : Array.isArray(data)
          ? data
          : [];
        const offers = list.filter(
          (p) => p.offerPrice && p.originalPrice && p.offerPrice < p.originalPrice
        );
        if (offers.length >= 2) {
          setFlashProducts(offers.slice(0, 4));
        } else if (list.length >= 2) {
          setFlashProducts(list.slice(0, 4));
        } else {
          setFlashProducts(FALLBACK_FLASH_PRODUCTS);
        }
      })
      .catch(() => {
        setFlashProducts(FALLBACK_FLASH_PRODUCTS);
      });
  }, []);

  useEffect(() => {
    let targetTimestamp;
    try {
      const storedTime = localStorage.getItem("liora_flash_end_time");
      const now = Date.now();
      if (storedTime && Number(storedTime) > now) {
        targetTimestamp = Number(storedTime);
      } else {
        targetTimestamp = now + 6 * 60 * 60 * 1000;
        localStorage.setItem("liora_flash_end_time", String(targetTimestamp));
      }
    } catch {
      targetTimestamp = Date.now() + 6 * 60 * 60 * 1000;
    }

    const updateTimer = () => {
      const now = Date.now();
      const diff = targetTimestamp - now;
      if (diff <= 0) {
        setTimeLeft({ hours: "00", minutes: "00", seconds: "00" });
        return;
      }
      const hours = String(Math.floor((diff / (1000 * 60 * 60)) % 24)).padStart(2, "0");
      const minutes = String(Math.floor((diff / (1000 * 60)) % 60)).padStart(2, "0");
      const seconds = String(Math.floor((diff / 1000) % 60)).padStart(2, "0");
      setTimeLeft({ hours, minutes, seconds });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleQuickAdd = (product, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onAddToCart) {
      onAddToCart(product);
      setAddedIds((prev) => [...prev, product._id]);
      setTimeout(() => {
        setAddedIds((prev) => prev.filter((id) => id !== product._id));
      }, 1500);
    }
  };

  return (
    <section className="jt-flash-live-section">
      <div className="jt-flash-live-inner">
        {/* Header Bar */}
        <div className="jt-flash-header">
          <div className="jt-flash-header-left">
            <span className="jt-flash-flame-icon">⚡</span>
            <div>
              <div className="jt-flash-badge-row">
                <span className="jt-flash-tag">LIMITED TIME FLASH SALE</span>
              </div>
              <h3 className="jt-flash-title">Grab Special Deals Before Time Runs Out!</h3>
            </div>
          </div>

          <div className="jt-flash-header-right">
            <div className="jt-flash-countdown-box">
              <span className="jt-countdown-label">Ends in:</span>
              <div className="jt-flash-timer-pills">
                <div className="jt-timer-unit">
                  <strong>{timeLeft.hours}</strong>
                  <span>HRS</span>
                </div>
                <span className="jt-timer-sep">:</span>
                <div className="jt-timer-unit">
                  <strong>{timeLeft.minutes}</strong>
                  <span>MIN</span>
                </div>
                <span className="jt-timer-sep">:</span>
                <div className="jt-timer-unit">
                  <strong>{timeLeft.seconds}</strong>
                  <span>SEC</span>
                </div>
              </div>
            </div>

            <Link href="/collection/flash-sales" className="jt-flash-see-all-btn">
              See All Deals &rarr;
            </Link>
          </div>
        </div>

        {/* Product Cards Row */}
        <div className="jt-flash-grid">
          {flashProducts.map((product) => {
            const catName =
              typeof product.category === "object"
                ? product.category?.name
                : product.category || "Beauty & Wear";
            const imageSrc =
              getImageUrl(product.image) ||
              "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=500&auto=format&fit=crop&q=80";
            const discountPct = getDiscount(product);
            const savedTk = getSaved(product);
            const isAdded = addedIds.includes(product._id);

            return (
              <div key={product._id} className="jt-flash-card">
                <Link
                  href={`/products/${product._id}`}
                  className="jt-flash-card-link"
                >
                  <div className="jt-flash-img-box">
                    <img
                      src={imageSrc}
                      alt={product.name}
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.src =
                          "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=500&auto=format&fit=crop&q=80";
                      }}
                    />
                    {discountPct > 0 && (
                      <span className="jt-flash-discount-badge">
                        -{discountPct}% OFF
                      </span>
                    )}
                  </div>

                  <div className="jt-flash-card-body">
                    <span className="jt-flash-card-cat">{catName}</span>
                    <h4 className="jt-flash-card-name" title={product.name}>
                      {product.name}
                    </h4>

                    <div className="jt-flash-price-row">
                      <strong className="jt-flash-offer-price">
                        {product.offerPrice} Tk
                      </strong>
                      {product.originalPrice > product.offerPrice && (
                        <span className="jt-flash-orig-price">
                          {product.originalPrice} Tk
                        </span>
                      )}
                    </div>

                    {savedTk > 0 && (
                      <div className="jt-flash-save-text">
                        ৳{savedTk} সাশ্রয়
                      </div>
                    )}
                  </div>
                </Link>

                <div className="jt-flash-action-wrap">
                  <button
                    type="button"
                    className={`jt-flash-add-btn ${isAdded ? "added" : ""}`}
                    onClick={(e) => handleQuickAdd(product, e)}
                  >
                    {isAdded ? "✓ Added to Cart" : "⚡ Quick Buy"}
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
