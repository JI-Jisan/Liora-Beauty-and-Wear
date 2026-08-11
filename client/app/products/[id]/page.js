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

export default function ProductDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { addToCart } = useCart();
  const [product, setProduct] = useState(null);
  const [allProducts, setAllProducts] = useState(DEMO_PRODUCTS);
  const [loading, setLoading] = useState(true);

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
  const imageSrc = getImageUrl(product.image) || fallbackUrl;

  return (
    <main className="jt-details-page-wrap">
      <Header
        searchTerm=""
        onSearchChange={() => {}}
        brandName={siteSettings.brandName}
        brandSubtitle={siteSettings.brandSubtitle}
      />

      {/* Compact product card — image left + info right, all visible without scrolling */}
      <div style={{
        maxWidth: "960px",
        margin: "0 auto",
        padding: "16px 14px 0",
      }}>
        {/* Breadcrumb */}
        <p style={{ fontSize: "12px", color: "#94a3b8", margin: "0 0 10px" }}>
          Home / {product.category?.name || "Category"} / {product.name}
        </p>

        {/* Main card: image + info side by side */}
        <div style={{
          display: "flex",
          gap: "16px",
          alignItems: "flex-start",
          background: "#fff",
          borderRadius: "16px",
          padding: "14px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.07)",
          flexWrap: "wrap",
        }}>
          {/* Image — square, compact */}
          <div style={{
            flex: "0 0 auto",
            width: "min(42vw, 180px)",
            height: "min(42vw, 180px)",
            borderRadius: "12px",
            overflow: "hidden",
            background: "#f8f0eb",
          }}>
            <img
              src={imageSrc}
              alt={product.name}
              onError={(e) => { e.currentTarget.src = fallbackUrl; }}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>

          {/* Info panel */}
          <div style={{ flex: 1, minWidth: "160px", display: "flex", flexDirection: "column", gap: "8px" }}>
            {/* Category pill */}
            <span style={{
              background: "#fff0f5",
              color: "#e11d48",
              fontSize: "11px",
              fontWeight: "700",
              padding: "3px 10px",
              borderRadius: "50px",
              alignSelf: "flex-start",
            }}>
              {product.category?.name || "Product"}
            </span>

            {/* Name */}
            <h1 style={{ margin: 0, fontSize: "clamp(15px, 4vw, 20px)", fontWeight: "900", color: "#0f172a", lineHeight: 1.3 }}>
              {product.name}
            </h1>

            {/* Price row */}
            <div style={{ display: "flex", alignItems: "baseline", gap: "8px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "clamp(20px, 5vw, 26px)", fontWeight: "900", color: "#e11d48" }}>
                {product.offerPrice} Tk
              </span>
              {product.originalPrice && (
                <span style={{ fontSize: "14px", color: "#94a3b8", textDecoration: "line-through" }}>
                  {product.originalPrice} Tk
                </span>
              )}
              {product.discountBadge && (
                <span style={{
                  background: "#e11d48",
                  color: "#fff",
                  fontSize: "11px",
                  fontWeight: "800",
                  padding: "2px 8px",
                  borderRadius: "50px",
                }}>
                  {product.discountBadge}
                </span>
              )}
            </div>

            {/* Stock status */}
            <p style={{
              margin: 0,
              fontSize: "12px",
              fontWeight: "700",
              color: product.stockStatus === "Out of Stock" ? "#dc2626" : "#059669",
            }}>
              ● {product.stockStatus || "In Stock"}
            </p>

            {/* Action buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "4px" }}>
              <button
                onClick={handleBuyNow}
                disabled={product.stockStatus === "Out of Stock"}
                style={{
                  background: product.stockStatus === "Out of Stock" ? "#94a3b8" : "#0f172a",
                  color: "#fff",
                  border: "none",
                  borderRadius: "50px",
                  padding: "12px 18px",
                  fontWeight: "800",
                  fontSize: "14px",
                  cursor: product.stockStatus === "Out of Stock" ? "not-allowed" : "pointer",
                  width: "100%",
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
                  border: "2px solid #e11d48",
                  borderRadius: "50px",
                  padding: "10px 18px",
                  fontWeight: "800",
                  fontSize: "14px",
                  cursor: product.stockStatus === "Out of Stock" ? "not-allowed" : "pointer",
                  width: "100%",
                }}
              >
                {product.stockStatus === "Out of Stock" ? "Out of Stock" : "+ Add to Cart"}
              </button>
            </div>
          </div>
        </div>

        {/* Delivery info bar */}
        <div style={{
          display: "flex",
          gap: "8px",
          flexWrap: "wrap",
          margin: "12px 0 0",
          padding: "10px 14px",
          background: "#fff",
          borderRadius: "12px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
        }}>
          <span style={{ fontSize: "12px", color: "#64748b" }}>🚚 <strong>Dhaka:</strong> 65 Tk</span>
          <span style={{ fontSize: "12px", color: "#64748b" }}>📦 <strong>Outside:</strong> 110 Tk</span>
          <span style={{ fontSize: "12px", color: "#059669", fontWeight: "700" }}>✓ Cash on Delivery</span>
        </div>
      </div>

      <section className="jt-details-bottom">
        <div className="jt-details-description-card">
          <h2>Product Details</h2>
          <div className="jt-details-description-text">
            {product.description || "No description available."}
          </div>
        </div>
      </section>

      <section className="jt-related-section">
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