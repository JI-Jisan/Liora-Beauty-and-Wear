"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { API_BASE_URL } from "@/lib/api";

const DEMO_FLASH_PRODUCTS = [
  {
    _id: "demo-1",
    name: "Royal Oud Perfume 100ml",
    image: "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=600&auto=format&fit=crop&q=80",
    originalPrice: 2500,
    offerPrice: 1850,
    discountBadge: "26% OFF",
    stockStatus: "In Stock",
  },
  {
    _id: "demo-2",
    name: "Luxury Gold Watch",
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80",
    originalPrice: 3200,
    offerPrice: 2400,
    discountBadge: "25% OFF",
    stockStatus: "In Stock",
  },
];

export default function FlashSale({
  flashTitle = "Limited Time Special Offer",
  flashSubtitle = "Grab selected trending products before the timer runs out.",
  flashButtonText = "Shop Flash Sale",
  flashButtonLink = "/products",
  flashDurationHours = 6,
  onAddToCart,
}) {
  const [timeLeft, setTimeLeft] = useState({
    hours: "00",
    minutes: "00",
    seconds: "00",
  });
  const [flashProducts, setFlashProducts] = useState(DEMO_FLASH_PRODUCTS);
  const [addedIds, setAddedIds] = useState([]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/products`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const offers = data.filter((p) => p.offerPrice && p.offerPrice < p.originalPrice);
          if (offers.length >= 2) {
            setFlashProducts(offers.slice(0, 2));
          } else if (data.length >= 2) {
            setFlashProducts(data.slice(0, 2));
          }
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let targetTimestamp;
    try {
      const storedTime = localStorage.getItem("jt_flash_end_timestamp");
      const now = Date.now();

      if (storedTime && Number(storedTime) > now) {
        targetTimestamp = Number(storedTime);
      } else {
        targetTimestamp = now + flashDurationHours * 60 * 60 * 1000;
        localStorage.setItem("jt_flash_end_timestamp", String(targetTimestamp));
      }
    } catch {
      targetTimestamp = Date.now() + flashDurationHours * 60 * 60 * 1000;
    }

    const updateTimer = () => {
      const now = Date.now();
      const difference = targetTimestamp - now;

      if (difference <= 0) {
        setTimeLeft({
          hours: "00",
          minutes: "00",
          seconds: "00",
        });
        return;
      }

      const hours = String(
        Math.floor((difference / (1000 * 60 * 60)) % 24)
      ).padStart(2, "0");

      const minutes = String(
        Math.floor((difference / (1000 * 60)) % 60)
      ).padStart(2, "0");

      const seconds = String(
        Math.floor((difference / 1000) % 60)
      ).padStart(2, "0");

      setTimeLeft({ hours, minutes, seconds });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [flashDurationHours]);

  const handleQuickAdd = (prod) => {
    if (onAddToCart) {
      onAddToCart(prod);
      setAddedIds((prev) => [...prev, prod._id]);
      setTimeout(() => {
        setAddedIds((prev) => prev.filter((id) => id !== prod._id));
      }, 1800);
    }
  };

  return (
    <section className="jt-flash-sale">
      <div className="jt-flash-sale-inner">
        {/* Left Countdown Section */}
        <div className="jt-flash-left">
          <span className="jt-flash-badge">🔥 Flash Sale</span>
          <h2>{flashTitle}</h2>
          <p>{flashSubtitle}</p>

          <div className="jt-flash-timer">
            <div className="jt-time-box">
              <strong>{timeLeft.hours}</strong>
              <span>Hours</span>
            </div>

            <div className="jt-time-box">
              <strong>{timeLeft.minutes}</strong>
              <span>Minutes</span>
            </div>

            <div className="jt-time-box">
              <strong>{timeLeft.seconds}</strong>
              <span>Seconds</span>
            </div>
          </div>

          <Link href={flashButtonLink} className="jt-flash-btn">
            {flashButtonText}
          </Link>
        </div>

        {/* Right Featured Offer Products Showcase */}
        <div className="jt-flash-right">
          <div className="jt-flash-products-grid">
            {flashProducts.map((product) => {
              const imageSrc = product.image
                ? product.image.startsWith("http")
                  ? product.image
                  : product.image.startsWith("/uploads")
                  ? `${API_BASE_URL}${product.image}`
                  : `/images/${product.image}`
                : "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=600&auto=format&fit=crop&q=80";

              const isAdded = addedIds.includes(product._id);

              return (
                <div key={product._id} className="jt-flash-mini-card">
                  <div className="jt-flash-mini-img-wrap">
                    <img src={imageSrc} alt={product.name} />
                    {product.discountBadge && (
                      <span className="jt-flash-mini-badge">
                        {product.discountBadge}
                      </span>
                    )}
                  </div>

                  <div className="jt-flash-mini-content">
                    <h4>{product.name}</h4>
                    <div className="jt-flash-mini-price-row">
                      <span className="jt-flash-offer-price">
                        {product.offerPrice} Tk
                      </span>
                      {product.originalPrice > product.offerPrice && (
                        <span className="jt-flash-orig-price">
                          {product.originalPrice} Tk
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      className={`jt-flash-quick-btn ${isAdded ? "added" : ""}`}
                      onClick={() => handleQuickAdd(product)}
                    >
                      {isAdded ? "✓ Added" : "🛒 Add to Cart"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}