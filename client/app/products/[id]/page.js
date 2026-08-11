"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import { API_BASE_URL, getImageUrl } from "@/lib/api";
import { useCart } from "@/context/CartContext";

const DEMO_PRODUCTS = [
  {
    _id: "demo-1",
    name: "Royal Oud Perfume 100ml",
    description: "Premium long-lasting royal oud fragrance perfume for men and women. Made with authentic oriental woody notes.",
    image: "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=600&auto=format&fit=crop&q=80",
    originalPrice: 2500,
    offerPrice: 1850,
    discountBadge: "26% OFF",
    stockStatus: "In Stock",
    category: { _id: "cat-1", name: "Perfume" },
    isFeatured: true,
    isTrending: true,
    isNewArrival: true
  },
  {
    _id: "demo-2",
    name: "Luxury Gold Chronograph Watch",
    description: "Premium stainless steel quartz chronograph watch with water resistance and luxury design.",
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80",
    originalPrice: 3200,
    offerPrice: 2400,
    discountBadge: "25% OFF",
    stockStatus: "In Stock",
    category: { _id: "cat-2", name: "Watches" },
    isFeatured: true,
    isTrending: true
  },
  {
    _id: "demo-3",
    name: "Smart RGB LED Fan Light 30W",
    description: "Multi-color remote control LED ceiling fan light with low power consumption and super silent operation.",
    image: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600&auto=format&fit=crop&q=80",
    originalPrice: 1800,
    offerPrice: 1350,
    discountBadge: "25% OFF",
    stockStatus: "In Stock",
    category: { _id: "cat-3", name: "Fan Light" },
    isFeatured: true,
    isNewArrival: true
  },
  {
    _id: "demo-4",
    name: "Vitamin C Brightening Serum 30ml",
    description: "Natural organic vitamin C serum for glowing, smooth skin and reducing dark spots.",
    image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&auto=format&fit=crop&q=80",
    originalPrice: 1200,
    offerPrice: 850,
    discountBadge: "29% OFF",
    stockStatus: "In Stock",
    category: { _id: "cat-4", name: "Beauty Items" },
    isTrending: true,
    isNewArrival: true
  },
  {
    _id: "demo-5",
    name: "French Vanilla Long-Lasting Body Mist",
    description: "Refreshing vanilla scent body mist for daily freshness and long lasting aroma.",
    image: "https://images.unsplash.com/photo-1541643600914-78b084683601?w=600&auto=format&fit=crop&q=80",
    originalPrice: 1500,
    offerPrice: 990,
    discountBadge: "34% OFF",
    stockStatus: "In Stock",
    category: { _id: "cat-1", name: "Perfume" },
    isFeatured: true
  }
];

// ─── Auto-sliding image carousel ────────────────────────────────────────────
function ProductImageCarousel({ images, fallback, productName }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % images.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [images.length]);

  if (!images.length) return null;

  return (
    <div style={{ position: "relative", width: "100%", overflow: "hidden", background: "#f8f0eb" }}>
      {/* Slides */}
      <div
        style={{
          display: "flex",
          transform: `translateX(-${current * 100}%)`,
          transition: "transform 0.5s cubic-bezier(0.4,0,0.2,1)",
          willChange: "transform",
        }}
      >
        {images.map((src, i) => (
          <div key={i} style={{ flex: "0 0 100%", width: "100%", aspectRatio: "1 / 1", maxHeight: "480px" }}>
            <img
              src={src}
              alt={`${productName} - view ${i + 1}`}
              onError={(e) => { e.currentTarget.src = fallback; }}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
          </div>
        ))}
      </div>

      {/* Dot indicators */}
      {images.length > 1 && (
        <div style={{
          position: "absolute", bottom: "14px", left: "50%",
          transform: "translateX(-50%)",
          display: "flex", gap: "8px",
        }}>
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              style={{
                width: i === current ? "22px" : "8px",
                height: "8px",
                borderRadius: "50px",
                background: i === current ? "#e11d48" : "rgba(255,255,255,0.7)",
                border: "none",
                cursor: "pointer",
                padding: 0,
                transition: "all 0.3s",
              }}
            />
          ))}
        </div>
      )}

      {/* Image count badge */}
      {images.length > 1 && (
        <div style={{
          position: "absolute", top: "12px", right: "12px",
          background: "rgba(0,0,0,0.55)", color: "#fff",
          fontSize: "12px", fontWeight: "700",
          padding: "3px 10px", borderRadius: "50px",
        }}>
          {current + 1}/{images.length}
        </div>
      )}
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

export default function ProductDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { addToCart } = useCart();
  const [product, setProduct] = useState(null);
  const [allProducts, setAllProducts] = useState(DEMO_PRODUCTS);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
    const targetElement = document.getElementById(tabId);
    if (targetElement) {
      const headerOffset = 130;
      const elementPosition = targetElement.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      const tabs = ["overview", "ratings", "details", "recommendations"];
      const scrollPosition = window.scrollY + 160;

      for (let i = tabs.length - 1; i >= 0; i--) {
        const el = document.getElementById(tabs[i]);
        if (el) {
          const top = el.offsetTop - 170;
          if (window.scrollY >= top) {
            setActiveTab(tabs[i]);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const [siteSettings, setSiteSettings] = useState({
    brandName: "LIORA Beauty & Wear",
    brandSubtitle: "Beauty. Style. You.",
  });

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/settings`)
      .then((res) => res.json())
      .then((data) =>
        setSiteSettings({
          brandName: data.brandName || "LIORA Beauty & Wear",
          brandSubtitle: data.brandSubtitle || "Beauty. Style. You.",
        })
      )
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    if (!params?.id) return;

    // Fetch target single product directly from API
    fetch(`${API_BASE_URL}/api/products/${params.id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Product not found");
        return res.json();
      })
      .then((data) => {
        setProduct(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Single product fetch error:", err);
        const found = DEMO_PRODUCTS.find((item) => item._id === params.id);
        setProduct(found || null);
        setLoading(false);
      });

    // Fetch all products for related products section
    fetch(`${API_BASE_URL}/api/products`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setAllProducts(data);
        }
      })
      .catch((err) => console.error("All products fetch error:", err));
  }, [params]);

  const relatedProducts = useMemo(() => {
    if (!product) return [];
    return allProducts
      .filter(
        (item) =>
          item._id !== product._id &&
          item.category?.name === product.category?.name
      )
      .slice(0, 4);
  }, [allProducts, product]);

  const handleAddToCart = () => {
    if (product) {
      addToCart(product);
    }
  };

  const handleBuyNow = () => {
    if (product) {
      addToCart(product);
      router.push("/checkout");
    }
  };

  if (loading) {
    return (
      <main style={{ background: "#fdf8f5", minHeight: "100vh" }}>
        <style>{`
          @keyframes jt-shimmer {
            0% { background-position: -600px 0; }
            100% { background-position: 600px 0; }
          }
          .jt-skel {
            background: linear-gradient(90deg, #f0e8e0 25%, #fde8e8 50%, #f0e8e0 75%);
            background-size: 600px 100%;
            animation: jt-shimmer 1.4s infinite linear;
            border-radius: 10px;
          }
        `}</style>

        {/* Header skeleton */}
        <div style={{ background: "#fff", padding: "14px 20px", borderBottom: "1px solid #f0e8e0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div className="jt-skel" style={{ width: "110px", height: "36px" }} />
          <div className="jt-skel" style={{ width: "90px", height: "36px" }} />
        </div>

        {/* Product skeleton */}
        <div style={{ maxWidth: "960px", margin: "0 auto", padding: "28px 18px", display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Image skeleton */}
          <div className="jt-skel" style={{ width: "100%", height: "280px", borderRadius: "18px" }} />

          {/* Breadcrumb */}
          <div className="jt-skel" style={{ width: "55%", height: "14px" }} />

          {/* Title */}
          <div className="jt-skel" style={{ width: "80%", height: "30px" }} />

          {/* Category */}
          <div className="jt-skel" style={{ width: "35%", height: "14px" }} />

          {/* Price */}
          <div style={{ display: "flex", gap: "12px" }}>
            <div className="jt-skel" style={{ width: "100px", height: "32px" }} />
            <div className="jt-skel" style={{ width: "80px", height: "32px" }} />
          </div>

          {/* Buttons */}
          <div style={{ display: "flex", gap: "12px" }}>
            <div className="jt-skel" style={{ flex: 1, height: "50px", borderRadius: "50px" }} />
            <div className="jt-skel" style={{ flex: 1, height: "50px", borderRadius: "50px" }} />
          </div>

          {/* Description lines */}
          <div className="jt-skel" style={{ width: "100%", height: "14px" }} />
          <div className="jt-skel" style={{ width: "90%", height: "14px" }} />
          <div className="jt-skel" style={{ width: "75%", height: "14px" }} />
        </div>
      </main>
    );
  }

  if (!product) {
    return (
      <main style={{ padding: "40px", textAlign: "center" }}>
        <h2>Product not found</h2>
      </main>
    );
  }

  const getFallbackProductImage = (catName, pName) => {
    const text = `${catName || ""} ${pName || ""}`.toLowerCase();
    if (text.includes("perfume") || text.includes("oud") || text.includes("mist") || text.includes("chanel") || text.includes("pakhor")) {
      return "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=800&auto=format&fit=crop&q=80";
    }
    if (text.includes("watch") || text.includes("clock")) {
      return "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80";
    }
    if (text.includes("fan") || text.includes("light")) {
      return "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800&auto=format&fit=crop&q=80";
    }
    if (text.includes("serum") || text.includes("skin") || text.includes("beauty") || text.includes("vitamin")) {
      return "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&auto=format&fit=crop&q=80";
    }
    return "https://images.unsplash.com/photo-1541643600914-78b084683601?w=800&auto=format&fit=crop&q=80";
  };

  const catName = typeof product.category === "object" ? product.category?.name : product.category || "";
  const fallbackUrl = getFallbackProductImage(catName, product.name);
  // Build carousel images list
  const carouselImages = [
    getImageUrl(product.image) || fallbackUrl,
    getImageUrl(product.image2),
    getImageUrl(product.image3),
  ].filter(Boolean);

  return (
    <main className="jt-details-page-wrap">
      <Header
        searchTerm=""
        onSearchChange={() => {}}
        brandName={siteSettings.brandName}
        brandSubtitle={siteSettings.brandSubtitle}
        showProductTabs={true}
        activeProductTab={activeTab}
        onProductTabClick={handleTabClick}
      />

      {/* ── SECTION 1: OVERVIEW ── */}
      <div id="overview" style={{ maxWidth: "960px", margin: "0 auto", padding: "0 0 24px" }}>
        {/* ── CAROUSEL ── */}
        <ProductImageCarousel images={carouselImages} fallback={fallbackUrl} productName={product.name} />

        {/* ── PRODUCT INFO CARD ── */}
        <div style={{ padding: "0 14px" }}>

          {/* Breadcrumb Navigation */}
          <nav className="jt-breadcrumb-nav" aria-label="Breadcrumb" style={{ margin: "12px 0 10px", fontSize: "13px", color: "#64748b", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px" }}>
            <Link href="/" style={{ color: "#64748b", textDecoration: "none", fontWeight: "600" }}>Home</Link>
            <span style={{ color: "#cbd5e1" }}>/</span>
            {product.category?.name && (
              <>
                <Link href={`/products?category=${encodeURIComponent(product.category._id || product.category.name)}`} style={{ color: "#64748b", textDecoration: "none", fontWeight: "600" }}>
                  {product.category.name}
                </Link>
                <span style={{ color: "#cbd5e1" }}>/</span>
              </>
            )}
            <span style={{ color: "#0f172a", fontWeight: "700" }}>
              {product.name}
            </span>
          </nav>

          {/* Category pill */}
          <span style={{
            background: "#fff0f5", color: "#e11d48",
            fontSize: "11px", fontWeight: "700",
            padding: "3px 12px", borderRadius: "50px",
          }}>
            {product.category?.name || "Product"}
          </span>

          {/* Name */}
          <h1 style={{ margin: "10px 0 4px", fontSize: "clamp(18px, 5vw, 26px)", fontWeight: "900", color: "#0f172a", lineHeight: 1.3 }}>
            {product.name}
          </h1>

          {/* Rating row */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px", margin: "6px 0" }}>
            <div style={{ display: "flex", gap: "2px" }}>
              {[1, 2, 3, 4, 5].map((s) => (
                <span key={s} style={{ fontSize: "16px", color: (product.rating || 4.8) >= s ? "#f59e0b" : "#d1d5db" }}>
                  ★
                </span>
              ))}
            </div>
            <span style={{ fontSize: "13px", fontWeight: "700", color: "#f59e0b" }}>{product.rating || 4.8}</span>
            <span style={{ fontSize: "12px", color: "#94a3b8" }}>({product.reviewCount || 34} ratings & reviews)</span>
          </div>

          {/* Price */}
          <div style={{ display: "flex", alignItems: "baseline", gap: "10px", flexWrap: "wrap", margin: "10px 0" }}>
            <span style={{ fontSize: "clamp(24px, 7vw, 34px)", fontWeight: "900", color: "#e11d48" }}>
              {product.offerPrice} Tk
            </span>
            {product.originalPrice && (
              <span style={{ fontSize: "16px", color: "#94a3b8", textDecoration: "line-through" }}>
                {product.originalPrice} Tk
              </span>
            )}
            {product.discountBadge && (
              <span style={{
                background: "linear-gradient(135deg, #e11d48, #f97316)",
                color: "#fff", fontSize: "12px", fontWeight: "800",
                padding: "3px 10px", borderRadius: "50px",
              }}>
                {product.discountBadge}
              </span>
            )}
          </div>

          {/* Stock */}
          <p style={{
            margin: "0 0 14px",
            fontSize: "13px", fontWeight: "700",
            color: product.stockStatus === "Out of Stock" ? "#dc2626" : "#059669",
          }}>
            ● {product.stockStatus || "In Stock"}
          </p>

          {/* Buttons */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "14px" }}>
            <button
              onClick={handleBuyNow}
              disabled={product.stockStatus === "Out of Stock"}
              style={{
                background: product.stockStatus === "Out of Stock"
                  ? "#94a3b8"
                  : "linear-gradient(135deg, #e11d48 0%, #f97316 100%)",
                color: "#fff",
                border: "none",
                borderRadius: "50px",
                padding: "16px 24px",
                fontWeight: "900",
                fontSize: "16px",
                cursor: product.stockStatus === "Out of Stock" ? "not-allowed" : "pointer",
                width: "100%",
                boxShadow: product.stockStatus === "Out of Stock" ? "none" : "0 6px 20px rgba(225,29,72,0.35)",
                letterSpacing: "0.5px",
              }}
            >
              {product.stockStatus === "Out of Stock" ? "Unavailable" : "🛒 Buy Now"}
            </button>

            <button
              onClick={handleAddToCart}
              disabled={product.stockStatus === "Out of Stock"}
              style={{
                background: "transparent",
                color: "#e11d48",
                border: "2.5px solid #e11d48",
                borderRadius: "50px",
                padding: "14px 24px",
                fontWeight: "800",
                fontSize: "15px",
                cursor: product.stockStatus === "Out of Stock" ? "not-allowed" : "pointer",
                width: "100%",
              }}
            >
              {product.stockStatus === "Out of Stock" ? "Out of Stock" : "+ Add to Cart"}
            </button>
          </div>

          {/* Delivery bar */}
          <div style={{
            display: "flex", gap: "14px", flexWrap: "wrap",
            padding: "12px 16px",
            background: "#f8fafc",
            borderRadius: "14px",
            border: "1px solid #e2e8f0",
          }}>
            <span style={{ fontSize: "13px", color: "#64748b" }}>🚚 <strong>Dhaka:</strong> 65 Tk</span>
            <span style={{ fontSize: "13px", color: "#64748b" }}>📦 <strong>Outside:</strong> 110 Tk</span>
            <span style={{ fontSize: "13px", color: "#059669", fontWeight: "700" }}>✓ Cash on Delivery</span>
          </div>
        </div>
      </div>

      {/* ── SECTION 2: RATINGS & REVIEWS ── */}
      <section id="ratings" className="jt-details-bottom" style={{ paddingTop: "10px" }}>
        <div className="jt-details-description-card" style={{ background: "#ffffff", borderRadius: "16px", padding: "20px", boxShadow: "0 4px 18px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "800", color: "#0f172a", margin: 0 }}>Ratings & Reviews</h2>
            <span style={{ fontSize: "12px", color: "#e11d48", fontWeight: "700" }}>100% Authentic Customer Feedback</span>
          </div>

          {/* Rating Summary Header */}
          <div style={{ display: "flex", gap: "20px", alignItems: "center", background: "#fff0f3", padding: "16px", borderRadius: "14px", marginBottom: "16px", flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: "36px", fontWeight: "900", color: "#e11d48", lineHeight: 1 }}>
                {product.rating || 4.8}
              </div>
              <div style={{ color: "#f59e0b", fontSize: "16px", marginTop: "4px" }}>★★★★★</div>
              <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>out of 5.0</div>
            </div>

            <div style={{ flex: 1, minWidth: "180px", display: "flex", flexDirection: "column", gap: "4px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px" }}>
                <span style={{ color: "#64748b" }}>5 ★</span>
                <div style={{ flex: 1, height: "6px", background: "#fed7aa", borderRadius: "4px", overflow: "hidden" }}>
                  <div style={{ width: "88%", height: "100%", background: "#f97316" }}></div>
                </div>
                <span style={{ fontWeight: "700", color: "#0f172a" }}>88%</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px" }}>
                <span style={{ color: "#64748b" }}>4 ★</span>
                <div style={{ flex: 1, height: "6px", background: "#e2e8f0", borderRadius: "4px", overflow: "hidden" }}>
                  <div style={{ width: "9%", height: "100%", background: "#f97316" }}></div>
                </div>
                <span style={{ fontWeight: "700", color: "#0f172a" }}>9%</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px" }}>
                <span style={{ color: "#64748b" }}>3 ★</span>
                <div style={{ flex: 1, height: "6px", background: "#e2e8f0", borderRadius: "4px", overflow: "hidden" }}>
                  <div style={{ width: "3%", height: "100%", background: "#f97316" }}></div>
                </div>
                <span style={{ fontWeight: "700", color: "#0f172a" }}>3%</span>
              </div>
            </div>
          </div>

          {/* Filter Badges */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
            <span style={{ background: "#0f172a", color: "#fff", fontSize: "11px", fontWeight: "700", padding: "4px 12px", borderRadius: "50px" }}>All Reviews ({product.reviewCount || 34})</span>
            <span style={{ background: "#f1f5f9", color: "#475569", fontSize: "11px", fontWeight: "700", padding: "4px 12px", borderRadius: "50px" }}>Verified Purchase (30)</span>
            <span style={{ background: "#f1f5f9", color: "#475569", fontSize: "11px", fontWeight: "700", padding: "4px 12px", borderRadius: "50px" }}>With Photos (12)</span>
          </div>

          {/* Customer Reviews List */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ borderBottom: "1px solid #f1f5f9", paddingBottom: "10px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: "800", fontSize: "13px", color: "#0f172a" }}>Anika Rahman</span>
                <span style={{ fontSize: "11px", color: "#059669", background: "#ecfdf5", padding: "2px 8px", borderRadius: "4px", fontWeight: "700" }}>✓ Verified Purchase</span>
              </div>
              <div style={{ color: "#f59e0b", fontSize: "12px", margin: "2px 0 4px" }}>★★★★★</div>
              <p style={{ margin: 0, fontSize: "13px", color: "#334155", lineHeight: 1.4 }}>
                100% authentic product! Scent is long-lasting and packaging was very premium. Quick delivery within 2 days in Dhaka.
              </p>
            </div>

            <div style={{ borderBottom: "1px solid #f1f5f9", paddingBottom: "10px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: "800", fontSize: "13px", color: "#0f172a" }}>Tanvir Ahmed</span>
                <span style={{ fontSize: "11px", color: "#059669", background: "#ecfdf5", padding: "2px 8px", borderRadius: "4px", fontWeight: "700" }}>✓ Verified Purchase</span>
              </div>
              <div style={{ color: "#f59e0b", fontSize: "12px", margin: "2px 0 4px" }}>★★★★★</div>
              <p style={{ margin: 0, fontSize: "13px", color: "#334155", lineHeight: 1.4 }}>
                Great value for money! High quality build and original scent. Highly recommend LIORA Beauty & Wear.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 3: PRODUCT DETAILS ── */}
      <section id="details" className="jt-details-bottom">
        <div className="jt-details-description-card">
          <h2>Product Details</h2>
          <div className="jt-details-description-text">
            {product.description || "No description available."}
          </div>
        </div>
      </section>

      {/* ── SECTION 4: RECOMMENDATIONS ── */}
      <section id="recommendations" className="jt-related-section">
        <div className="jt-related-inner">
          <h2>You may also like</h2>

          <div className="jt-related-grid">
            {relatedProducts.length === 0 ? (
              <p className="jt-no-related">No related products found</p>
            ) : (
              relatedProducts.map((item) => {
                const relatedImage = item.image
                  ? item.image.startsWith("http")
                    ? item.image
                    : item.image.startsWith("/uploads")
                    ? `${API_BASE_URL}${item.image}`
                    : `/images/${item.image}`
                  : null;

                return (
                  <div key={item._id} className="jt-related-card">
                    <Link
                      href={`/products/${item._id}`}
                      className="jt-product-link"
                    >
                      <div className="jt-related-image-wrap">
                        {relatedImage ? (
                          <img
                            src={relatedImage}
                            alt={item.name}
                            className="jt-related-image"
                          />
                        ) : (
                          <div className="jt-details-fallback">No Image</div>
                        )}
                      </div>

                      <div className="jt-related-content">
                        <h4>{item.name}</h4>
                        <p className="jt-related-price">
                          {item.offerPrice} Tk
                          <span>{item.originalPrice} Tk</span>
                        </p>
                      </div>
                    </Link>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>
    </main>
  );
}