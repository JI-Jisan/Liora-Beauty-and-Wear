"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { API_BASE_URL } from "@/lib/api";

export default function PromoBanner() {
  const [sliderProducts, setSliderProducts] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);

  // স্লাইডারের জন্য প্রোডাক্ট ফেচ করা
  useEffect(() => {
    const fetchSliderProducts = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/products`);
        const data = await res.json();
        // অ্যাডমিন থেকে যেগুলোতে isSlider: true করা হয়েছে, শুধু সেগুলো ফিল্টার করা
        const filtered = data.filter(product => product.isSlider === true);
        setSliderProducts(filtered);
      } catch (err) {
        console.error("Error fetching slider products", err);
      }
    };
    fetchSliderProducts();
  }, []);

  // অটোমেটিক স্লাইড হওয়ার লজিক (প্রতি ৪ সেকেন্ড পর পর)
  useEffect(() => {
    if (sliderProducts.length > 1) {
      const interval = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % sliderProducts.length);
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [sliderProducts.length]);

  if (sliderProducts.length === 0) return null; // অ্যাডমিন থেকে প্রোডাক্ট সিলেক্ট না করলে স্লাইডার হাইড থাকবে

  const product = sliderProducts[currentSlide];

  // ডিসকাউন্ট পার্সেন্টেজ বের করা
  const discountPct = product.originalPrice > product.offerPrice 
    ? Math.round(((product.originalPrice - product.offerPrice) / product.originalPrice) * 100) 
    : 0;

  return (
    <div style={{ margin: "20px", borderRadius: "16px", overflow: "hidden", position: "relative", background: "linear-gradient(135deg, #1e222d 0%, #3a3f4e 100%)", color: "#fff", minHeight: "220px", display: "flex", alignItems: "center" }}>
      
      {/* প্রোডাক্টের ব্যাকগ্রাউন্ড ইমেজ (আবছা বা ডার্ক ইফেক্ট) */}
      <div 
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundImage: `url(${product.image})`, backgroundSize: "cover", backgroundPosition: "center", opacity: 0.2, zIndex: 0 }}
      ></div>

      <div style={{ position: "relative", zIndex: 1, padding: "24px", width: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", height: "100%" }}>
        
        {/* টপ ব্যাজ (Trending & Discount) */}
        <div>
          <span style={{ background: "linear-gradient(90deg, #ff416c 0%, #ff4b2b 100%)", padding: "6px 12px", borderRadius: "20px", fontSize: "11px", fontWeight: "800", letterSpacing: "1px", display: "inline-block", marginBottom: "12px", boxShadow: "0 4px 15px rgba(255, 65, 108, 0.4)" }}>
            💡 TRENDING {discountPct > 0 ? `- ${discountPct}% OFF` : ""}
          </span>
          <h2 style={{ fontSize: "22px", fontWeight: "900", margin: "0 0 8px", lineHeight: "1.2" }}>
            {product.name}
          </h2>
          <p style={{ color: "#cbd5e1", fontSize: "13px", margin: "0 0 20px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {product.description || "Grab this premium product at the best price today."}
          </p>
        </div>

        {/* বটম সেকশন (Price, Button & Indicator) */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
            <Link href={`/product/${product._id}`} style={{ background: "#ffffff", color: "#0f172a", textDecoration: "none", padding: "10px 18px", borderRadius: "8px", fontWeight: "800", fontSize: "13px" }}>
              Shop Now
            </Link>
            
            <div style={{ background: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(255,255,255,0.1)", padding: "8px 14px", borderRadius: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ color: "#ff4b2b", fontWeight: "900", fontSize: "15px" }}>{product.offerPrice} Tk</span>
              {product.originalPrice > product.offerPrice && (
                <span style={{ color: "#94a3b8", textDecoration: "line-through", fontSize: "12px" }}>{product.originalPrice} Tk</span>
              )}
            </div>
          </div>

          {/* স্লাইড ইন্ডিকেটর (01 / 05) */}
          <div style={{ textAlign: "right" }}>
            <div style={{ display: "flex", gap: "6px", marginBottom: "6px", justifyContent: "flex-end" }}>
              {sliderProducts.map((_, idx) => (
                <div key={idx} style={{ width: currentSlide === idx ? "16px" : "6px", height: "6px", background: currentSlide === idx ? "#ff4b2b" : "rgba(255,255,255,0.3)", borderRadius: "10px", transition: "all 0.3s" }}></div>
              ))}
            </div>
            <span style={{ fontSize: "11px", fontWeight: "700", color: "#cbd5e1", letterSpacing: "1px" }}>
              {String(currentSlide + 1).padStart(2, '0')} / {String(sliderProducts.length).padStart(2, '0')}
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}