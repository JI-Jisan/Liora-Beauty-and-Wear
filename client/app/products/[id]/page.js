"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import { API_BASE_URL, getImageUrl } from "@/lib/api";
import { useCart } from "@/context/CartContext";
import { cld } from "@/lib/cloudinary";
import { getDiscount, getSaved } from "@/lib/price";


// ─── Auto-sliding image carousel ────────────────────────────────────────────
function ProductImageCarousel({ product, fallback }) {
  const [current, setCurrent] = useState(0);

  const gallery = [product.image, ...(product.images || [])].filter(Boolean);
  if (!gallery.length && fallback) {
    gallery.push(fallback);
  }

  useEffect(() => {
    if (gallery.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % gallery.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [gallery.length]);

  if (!gallery.length) return null;

  return (
    <div style={{ padding: "0 14px", marginTop: "14px", marginBottom: "14px" }}>
      <div style={{ position: "relative", width: "100%", aspectRatio: "1 / 1", overflow: "hidden", borderRadius: 16, background: "#f8fafc" }}>
        {gallery.map((url, i) => (
          <img
            key={i}
            src={cld(url, 900, 900)}
            alt={`${product.name} ${i + 1}`}
            style={{
              position: "absolute", inset: 0, width: "100%", height: "100%",
              objectFit: "cover",
              opacity: i === current ? 1 : 0,
              transition: "opacity .4s ease",
            }}
          />
        ))}

        {gallery.length > 1 && (
          <div style={{ position: "absolute", bottom: 12, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 8 }}>
            {gallery.map((_, i) => (
              <button
                key={i} type="button" onClick={() => setCurrent(i)}
                aria-label={`ছবি ${i + 1}`}
                style={{
                  width: i === current ? 20 : 8, height: 8, borderRadius: 4, border: "none",
                  background: i === current ? "#ef4444" : "rgba(255,255,255,.7)",
                  transition: "width .3s", cursor: "pointer",
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* নিচে thumbnail সারি */}
      {gallery.length > 1 && (
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          {gallery.map((url, i) => (
            <button key={i} type="button" onClick={() => setCurrent(i)}
              style={{
                width: 64, height: 64, padding: 0, borderRadius: 8, overflow: "hidden",
                border: i === current ? "2px solid #ef4444" : "1px solid #e2e8f0",
                cursor: "pointer", background: "none",
              }}>
              <img src={cld(url, 160, 160)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProductDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { addToCart } = useCart();
  const [product, setProduct] = useState(null);
  const [allProducts, setAllProducts] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
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
      const tabs = ["overview", "ratings", "recommendations"];

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
    deliveryInside: 65,
    deliveryOutside: 110,
  });

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/settings`)
      .then((res) => res.json())
      .then((data) =>
        setSiteSettings({
          brandName: data.brandName || "LIORA Beauty & Wear",
          brandSubtitle: data.brandSubtitle || "Beauty. Style. You.",
          deliveryInside: data.deliveryInside ?? 65,
          deliveryOutside: data.deliveryOutside ?? 110,
        })
      )
      .catch((err) => console.error(err));

    fetch(`${API_BASE_URL}/api/categories`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setAllCategories(data);
      })
      .catch((err) => console.error("Category fetch error:", err));
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
        setProduct(null);
        setLoading(false);
      });

    // Fetch all products for related products section
    fetch(`${API_BASE_URL}/api/products`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
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
        <ProductImageCarousel product={product} fallback={fallbackUrl} />

        {/* ── PRODUCT INFO CARD ── */}
        <div style={{ padding: "0 14px" }}>

          {/* Dynamic Nested Breadcrumb Navigation */}
          {(() => {
            const cat = product?.category;
            // Build trail from ancestors + self
            let trail = [...(cat?.ancestors || []), cat].filter(Boolean);
            
            // Fallback for older products or if populate didn't work completely
            if (trail.length <= 1 && cat) {
              const buildTrail = (allCats, catId) => {
                const map = new Map(allCats.map(c => [String(c._id), c]));
                const out = [];
                let cur = map.get(String(catId));
                while (cur) { out.unshift(cur); cur = cur.parent ? map.get(String(cur.parent)) : null; }
                return out;
              };
              const fallbackTrail = buildTrail(allCategories, cat._id);
              if (fallbackTrail.length > 0) trail = fallbackTrail;
            }

            return (
              <nav style={{
                display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'nowrap',
                overflowX: 'auto', whiteSpace: 'nowrap', fontSize: 14, padding: '10px 0'
              }}>
                <Link href="/" style={{ color: '#6b7280', textDecoration: "none" }}>Home</Link>
                {trail.map(c => (
                  <span key={c._id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: '#c9c9c9' }}>/</span>
                    <Link href={`/products?category=${c._id}`} style={{ color: '#6b7280', textDecoration: "none" }}>{c.name}</Link>
                  </span>
                ))}
                <span style={{ color: '#c9c9c9' }}>/</span>
                <span style={{ color: '#111', fontWeight: 600 }}>{product.name}</span>
              </nav>
            );
          })()}

          {/* Name */}
          <h1 style={{ margin: "10px 0 4px", fontSize: "clamp(18px, 5vw, 26px)", fontWeight: "900", color: "#0f172a", lineHeight: 1.3 }}>
            {product.name}
          </h1>

          {/* Brand */}
          {product.brand && (
            <div style={{ marginBottom: "8px", fontSize: "14px" }}>
              <span style={{ color: "#64748b" }}>Brand: </span>
              <Link href={`/brands/${product.brand.slug}`} style={{ color: "#e11d48", fontWeight: "600", textDecoration: "none" }}>
                {product.brand.name}
              </Link>
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: "6px", margin: "6px 0" }}>
            {product.reviewCount > 0 && (
              <>
                <div style={{ display: "flex", gap: "2px" }}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <span key={s} style={{ fontSize: "16px", color: (product.rating || 0) >= s ? "#f59e0b" : "#d1d5db" }}>
                      ★
                    </span>
                  ))}
                </div>
                <span style={{ fontSize: "13px", fontWeight: "700", color: "#f59e0b" }}>{product.rating.toFixed(1)}</span>
                <span style={{ fontSize: "12px", color: "#94a3b8" }}>({product.reviewCount} ratings & reviews)</span>
              </>
            )}
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
            {getDiscount(product) > 0 && (
              <span style={{
                background: "linear-gradient(135deg, #e11d48, #f97316)",
                color: "#fff", fontSize: "12px", fontWeight: "800",
                padding: "3px 10px", borderRadius: "50px",
              }}>
                {getDiscount(product)}% OFF
              </span>
            )}
            {getSaved(product) > 0 && (
              <span style={{ fontSize: 13, color: '#16a34a', fontWeight: 700, width: "100%", display: "block", marginTop: 4 }}>
                ৳{getSaved(product)} সাশ্রয়
              </span>
            )}
          </div>

          {/* Stock */}
          {product.stockQuantity > 0 ? (
            <p style={{
              margin: "0 0 14px",
              fontSize: "13px", fontWeight: "700",
              color: product.stockQuantity <= 5 ? "#d97706" : "#059669"
            }}>
              ● {product.stockQuantity <= 5
                ? `তাড়াতাড়ি করুন! মাত্র ${product.stockQuantity} টি বাকি`
                : `স্টকে আছে`}
            </p>
          ) : (
            <p style={{
              margin: "0 0 14px",
              fontSize: "13px", fontWeight: "700",
              color: "#dc2626"
            }}>
              ● স্টক শেষ
            </p>
          )}

          {/* Buttons */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "14px" }}>
            <button
              onClick={handleBuyNow}
              disabled={product.stockQuantity <= 0}
              style={{
                background: product.stockQuantity <= 0
                  ? "#94a3b8"
                  : "linear-gradient(135deg, #e11d48 0%, #f97316 100%)",
                color: "#fff",
                border: "none",
                borderRadius: "50px",
                padding: "16px 24px",
                fontWeight: "900",
                fontSize: "16px",
                cursor: product.stockQuantity <= 0 ? "not-allowed" : "pointer",
                width: "100%",
                boxShadow: product.stockQuantity <= 0 ? "none" : "0 6px 20px rgba(225,29,72,0.35)",
                letterSpacing: "0.5px",
              }}
            >
              {product.stockQuantity <= 0 ? "Unavailable" : "🛒 Buy Now"}
            </button>

            <button
              onClick={handleAddToCart}
              disabled={product.stockQuantity <= 0}
              style={{
                background: "transparent",
                color: "#e11d48",
                border: "2.5px solid #e11d48",
                borderRadius: "50px",
                padding: "14px 24px",
                fontWeight: "800",
                fontSize: "15px",
                cursor: product.stockQuantity <= 0 ? "not-allowed" : "pointer",
                width: "100%",
              }}
            >
              {product.stockQuantity > 0 ? "+ Add to Cart" : "স্টক শেষ"}
            </button>
          </div>

          <div style={{
            display: "flex", gap: "14px", flexWrap: "wrap",
            padding: "12px 16px",
            background: "#f8fafc",
            borderRadius: "14px",
            border: "1px solid #e2e8f0",
            marginBottom: "16px",
          }}>
            <span style={{ fontSize: "13px", color: "#64748b" }}>🚚 <strong>Dhaka:</strong> {siteSettings.deliveryInside} Tk</span>
            <span style={{ fontSize: "13px", color: "#64748b" }}>📦 <strong>Outside:</strong> {siteSettings.deliveryOutside} Tk</span>
            <span style={{ fontSize: "13px", color: "#059669", fontWeight: "700" }}>✓ Cash on Delivery</span>
          </div>

          <div style={{
            padding: "18px",
            background: "#fff0f5",
            borderRadius: "16px",
            border: "1px solid #fecdd3",
            marginTop: "14px",
            boxShadow: "0 4px 14px rgba(225, 29, 72, 0.05)",
          }}>
            <h3 style={{ margin: "0 0 10px", fontSize: "15px", fontWeight: "800", color: "#9f1239", display: "flex", alignItems: "center", gap: "6px" }}>
              📝 Product Description (পণ্যের বিবরণ)
            </h3>
            <div style={{
              whiteSpace: "pre-wrap",
              lineHeight: "1.7",
              fontSize: "15px",
              color: "#1e293b",
              fontWeight: "500",
            }}>
              {product.description || ""}
            </div>
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
            {product.reviewCount > 0 && (
              <div>
                <div style={{ fontSize: "36px", fontWeight: "900", color: "#e11d48", lineHeight: 1 }}>
                  {product.rating.toFixed(1)}
                </div>
                <div style={{ color: "#f59e0b", fontSize: "16px", marginTop: "4px" }}>★★★★★</div>
                <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>out of 5.0</div>
              </div>
            )}

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

          {product.reviewCount > 0 && (
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
              <span style={{ background: "#0f172a", color: "#fff", fontSize: "11px", fontWeight: "700", padding: "4px 12px", borderRadius: "50px" }}>All Reviews ({product.reviewCount})</span>
            </div>
          )}


        </div>
      </section>

      {/* ── SECTION 3: RECOMMENDATIONS ── */}
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