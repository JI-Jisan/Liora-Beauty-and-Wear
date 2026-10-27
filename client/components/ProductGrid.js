"use client";

import Link from "next/link";
import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import CategoryBar from "./CategoryBar";
import ProductWatermark from "./ProductWatermark";
import { API_BASE_URL, getImageUrl } from "@/lib/api";
import { cld } from "@/lib/cloudinary";
import { getDiscount, getSaved } from "@/lib/price";
import { useCart } from "@/context/CartContext";
import { useCampus } from "@/context/CampusContext";
import { useAuth } from "@/components/AuthProvider";

function getPaginationItems(current, total) {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  if (current <= 4) {
    return [1, 2, 3, 4, 5, "...", total];
  }
  if (current >= total - 3) {
    return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
  }
  return [1, "...", current - 1, current, current + 1, "...", total];
}

const getCategoryName = (category) => {
  if (!category) return "Beauty & Wear";
  if (typeof category === "object" && category.name) return category.name;
  if (typeof category === "string" && category.trim()) return category;
  return "Beauty & Wear";
};

const getProductBrandInfo = (product) => {
  if (!product) return null;
  if (product.brand && typeof product.brand === "object" && product.brand.name) {
    const name = product.brand.name.trim();
    const slug = product.brand.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    return { name, slug };
  }
  if (typeof product.brand === "string" && product.brand.trim()) {
    const name = product.brand.trim();
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    return { name, slug };
  }
  const name = (product.name || "").trim();
  if (!name) return null;

  const multiWord = [
    { name: "Swiss Beauty", slug: "swiss-beauty" },
    { name: "Beauty Glazed", slug: "beauty-glazed" },
    { name: "The Ordinary", slug: "the-ordinary" },
    { name: "The Face Shop", slug: "the-face-shop" },
    { name: "SKIN1004", slug: "skin1004", match: /^skin\s*1004\b/i },
    { name: "Dot & Key", slug: "dot-key", match: /^dot\s*&\s*key\b/i },
    { name: "Some By Mi", slug: "some-by-mi", match: /^some\s+by\s+mi\b/i },
    { name: "Chemist at Play", slug: "chemist-at-play", match: /^chemist\s+at\s+play\b/i },
    { name: "Nirvana Color", slug: "nirvana-color" },
    { name: "Earth Beauty", slug: "earth-beauty" },
    { name: "Wet n Wild", slug: "wet-n-wild", match: /^wet\s*n\s*wild\b/i },
    { name: "L.A. Girl", slug: "la-girl", match: /^l\.?a\.?\s*girl\b/i },
    { name: "Makeup Revolution", slug: "makeup-revolution" },
    { name: "Skin Cafe", slug: "skin-cafe" },
    { name: "3W Clinic", slug: "3w-clinic" },
    { name: "Bio Glow", slug: "bio-glow" },
    { name: "Pax Moly", slug: "pax-moly", match: /^pax\s*moly\b/i },
    { name: "Natura Republic", slug: "natura-republic" },
  ];

  for (const b of multiWord) {
    const re = b.match || new RegExp(`^${b.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (re.test(name)) {
      return { name: b.name, slug: b.slug };
    }
  }

  const firstWord = name.split(/\s+/)[0];
  if (firstWord && firstWord.length >= 2) {
    const cleanWord = firstWord.replace(/[^a-zA-Z0-9]/g, "");
    const ignored = new Set(["The", "A", "An", "New", "Pro", "Hot", "Best", "Sale", "Mini", "Big", "Original", "Combo", "Super", "Set", "Pack"]);
    if (cleanWord.length >= 2 && !ignored.has(cleanWord)) {
      return {
        name: cleanWord,
        slug: cleanWord.toLowerCase()
      };
    }
  }

  return null;
};

function ProductGridContent({
  onAddToCart,
  searchTerm: propSearchTerm,
  type = "all",
  title = "Products",
  subtitle = "",
  badge = "",
  badgeBg = "",
  brand = "",
  category: propCategory = "",
  collection = "",
  showCategoryBar = false,
  limit: propLimit = 24,
  showPagination = true,
}) {
  const router = useRouter();
  const gridRef = useRef(null);
  const searchParams = useSearchParams();
  const cartContext = useCart();
  const { activeCoupon, getProductPrice } = useCampus();
  const { isWholesale, isReseller } = useAuth();
  const [addedId, setAddedId] = useState(null);

  const handleAddToCart = (product, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setAddedId(product._id);
    setTimeout(() => {
      setAddedId((curr) => (curr === product._id ? null : curr));
    }, 1500);

    if (isWholesale) {
      const regularMrp = Number(product.originalPrice || product.offerPrice || 0);
      const baseCost = Number(product.purchasePrice || (regularMrp ? regularMrp * 0.70 : 100));
      const isExplicit = Number(product.wholesalePrice) > baseCost;
      const wsPrice = isExplicit ? Number(product.wholesalePrice) : Math.round(baseCost * 1.07);
      const minQty = Math.max(1, product.wholesaleMinQty || 3);
      if (typeof onAddToCart === "function") {
        onAddToCart({ ...product, price: wsPrice, quantity: minQty, orderType: "wholesale" });
      } else if (cartContext && typeof cartContext.addToCart === "function") {
        cartContext.addToCart(product, minQty, wsPrice);
      }
      return;
    }

    if (isReseller) {
      const resellerRate = product.resellerPrice > 0 ? product.resellerPrice : Math.round(product.offerPrice * 0.92);
      if (typeof onAddToCart === "function") {
        onAddToCart({ ...product, price: resellerRate, quantity: 1, orderType: "reseller" });
      } else if (cartContext && typeof cartContext.addToCart === "function") {
        cartContext.addToCart(product, 1, resellerRate);
      }
      return;
    }

    const campusPricing = getProductPrice(product);
    const itemToAdd = campusPricing?.hasDiscount
      ? {
          ...product,
          offerPrice: campusPricing.campusPrice,
          originalOfferPrice: product.offerPrice,
          isCampusSpecial: true,
          campusCode: activeCoupon?.code,
          campusName: activeCoupon?.short,
          campusDiscountPct: campusPricing.discountPct
        }
      : product;

    if (typeof onAddToCart === "function") {
      onAddToCart(itemToAdd);
    } else if (cartContext && typeof cartContext.addToCart === "function") {
      cartContext.addToCart(itemToAdd);
    }
  };
  const urlPage = parseInt(searchParams ? searchParams.get("page") : null, 10) || 1;
  const urlSearchTerm = searchParams ? searchParams.get("search") || "" : "";
  const activeSearchTerm = propSearchTerm !== undefined ? propSearchTerm : urlSearchTerm;

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [currentPage, setCurrentPage] = useState(urlPage);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [loading, setLoading] = useState(false);
  const PAGE_SIZE = propLimit || 24;

  const [prevUrlPage, setPrevUrlPage] = useState(urlPage);
  if (prevUrlPage !== urlPage) {
    setPrevUrlPage(urlPage);
    setCurrentPage(urlPage);
  }

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== currentPage) {
      setCurrentPage(newPage);
      if (typeof window !== "undefined") {
        const currentParams = new URLSearchParams(window.location.search);
        currentParams.set("page", String(newPage));
        router.push(`?${currentParams.toString()}`, { scroll: false });
      }
      if (gridRef.current) {
        const top = gridRef.current.getBoundingClientRect().top + window.scrollY - 80;
        window.scrollTo({ top, behavior: "smooth" });
      }
    }
  };

  const urlCategoryParam = searchParams ? searchParams.get("category") || "" : "";
  const [selectedCategoryState, setSelectedCategoryState] = useState("all");
  const activeCategory = propCategory || urlCategoryParam || selectedCategoryState;
  const activeBrand = brand || (searchParams ? searchParams.get("brand") || "" : "");

  const handleSelectCategory = (cat) => {
    setSelectedCategoryState(cat);
    setCurrentPage(1);
  };

  const [debouncedSearch, setDebouncedSearch] = useState(activeSearchTerm);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(activeSearchTerm);
    }, 250);
    return () => clearTimeout(timer);
  }, [activeSearchTerm]);

  const filterKey = `${activeCategory}_${activeBrand}_${debouncedSearch}_${type}_${collection}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (prevFilterKey !== filterKey) {
    setPrevFilterKey(filterKey);
    setCurrentPage(1);
  }

  useEffect(() => {
    let isMounted = true;
    queueMicrotask(() => {
      if (isMounted) {
        setLoading(true);
      }
    });

    const qs = new URLSearchParams();
    if (activeCategory && activeCategory !== "all") qs.set('category', activeCategory);
    if (activeBrand) qs.set('brand', activeBrand);
    if (collection) qs.set('collection', collection);
    if (type && type !== "all") qs.set('type', type);
    if (debouncedSearch && debouncedSearch.trim()) qs.set('search', debouncedSearch.trim());
    
    // Use pagination for main catalog or when type is all
    qs.set('paginate', '1');
    qs.set('page', String(currentPage));
    qs.set('limit', String(PAGE_SIZE));

    fetch(`${API_BASE_URL}/api/products?${qs.toString()}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        const rawList = Array.isArray(data?.products)
          ? data.products
          : Array.isArray(data)
          ? data
          : [];
        const sortedList = [...rawList].sort((a, b) => {
          const campA = Number(a.campusDiscountPct) || 0;
          const campB = Number(b.campusDiscountPct) || 0;
          if (campB !== campA) return campB - campA;
          return 0;
        });
        setProducts(sortedList);
        setTotalPages(data?.totalPages || 1);
        setTotalProducts(data?.total || rawList.length);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error("Products fetch error, using fallback:", err);
        setProducts([]);
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    fetch(`${API_BASE_URL}/api/categories`)
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (Array.isArray(data)) {
          setCategories(data);
        }
      })
      .catch((err) => console.error(err));

    return () => {
      isMounted = false;
    };
  }, [activeCategory, activeBrand, type, collection, debouncedSearch, currentPage, PAGE_SIZE, activeCoupon]);

  useEffect(() => {
    if (activeCoupon) {
      setProducts((prev) => [...prev].sort((a, b) => (Number(b.campusDiscountPct) || 0) - (Number(a.campusDiscountPct) || 0)));
    }
  }, [activeCoupon]);

  const filteredProducts = products;

  if (filteredProducts.length === 0 && !loading && type !== "all") {
    return null;
  }

  return (
    <section ref={gridRef} className="jt-product-section" style={{ maxWidth: "1400px", margin: "0 auto", width: "100%", boxSizing: "border-box", overflowX: "hidden" }}>
      {showCategoryBar && type === "all" && (
        <CategoryBar
          categories={categories}
          selectedCategory={activeCategory}
          onSelectCategory={handleSelectCategory}
        />
      )}

      {Boolean(title || badge) && (
        <div className="jt-section-head" style={{ textAlign: "center", marginBottom: "28px", padding: "0 16px" }}>
          {badge && (
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: badgeBg || "linear-gradient(135deg, #ff4d6d 0%, #ff758f 100%)",
              color: "#ffffff",
              padding: "5px 16px",
              borderRadius: "999px",
              fontSize: "12px",
              fontWeight: "800",
              letterSpacing: "0.8px",
              textTransform: "uppercase",
              marginBottom: "12px",
              boxShadow: "0 4px 12px rgba(255, 77, 109, 0.25)"
            }}>
              {badge}
            </div>
          )}
          {title && (
            <h3 style={{ fontSize: "28px", color: "#0F172A", margin: "0 0 8px", fontWeight: "900", letterSpacing: "-0.5px" }}>
              {title}
            </h3>
          )}
          {subtitle && (
            <p style={{ color: "#64748B", fontSize: "14px", margin: 0, maxWidth: "640px", marginLeft: "auto", marginRight: "auto" }}>
              {subtitle}
            </p>
          )}
        </div>
      )}

      <div className="jt-product-grid">
        {filteredProducts.map((product) => {
          const catName = getCategoryName(product.category);

          // Pick a unique fallback based on product name + category keywords
          const getSmartFallback = (cName, pName, id) => {
            const text = `${cName || ""} ${pName || ""}`.toLowerCase();
            // Specific product name matches first
            if (text.includes("oud")) return "https://images.unsplash.com/photo-1590156562745-5a03c5a2e21b?w=600&auto=format&fit=crop&q=80";
            if (text.includes("chanel") || text.includes("coco")) return "https://images.unsplash.com/photo-1557053910-d9eadeed1c58?w=600&auto=format&fit=crop&q=80";
            if (text.includes("vanilla") || text.includes("mist")) return "https://images.unsplash.com/photo-1541643600914-78b084683601?w=600&auto=format&fit=crop&q=80";
            if (text.includes("royal")) return "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=600&auto=format&fit=crop&q=80";
            if (text.includes("green") || text.includes("pakhor") || text.includes("attar")) return "https://images.unsplash.com/photo-1563170351-be82bc888aa4?w=600&auto=format&fit=crop&q=80";
            // Category matches
            if (text.includes("perfume") || text.includes("fragrance")) {
              const perfumePool = [
                "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=600&auto=format&fit=crop&q=80",
                "https://images.unsplash.com/photo-1557053910-d9eadeed1c58?w=600&auto=format&fit=crop&q=80",
                "https://images.unsplash.com/photo-1541643600914-78b084683601?w=600&auto=format&fit=crop&q=80",
                "https://images.unsplash.com/photo-1590156562745-5a03c5a2e21b?w=600&auto=format&fit=crop&q=80",
                "https://images.unsplash.com/photo-1563170351-be82bc888aa4?w=600&auto=format&fit=crop&q=80",
              ];
              // Use last char of product ID to pick different images
              const seed = id ? id.charCodeAt(id.length - 1) % perfumePool.length : 0;
              return perfumePool[seed];
            }
            if (text.includes("watch") || text.includes("clock")) return "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80";
            if (text.includes("fan") || text.includes("light") || text.includes("led")) return "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600&auto=format&fit=crop&q=80";
            if (text.includes("serum") || text.includes("vitamin") || text.includes("skin")) return "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&auto=format&fit=crop&q=80";
            if (text.includes("lipstick") || text.includes("makeup") || text.includes("cosmetic")) return "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=600&auto=format&fit=crop&q=80";
            return "https://images.unsplash.com/photo-1607522370275-f6fd2c0c6b8d?w=600&auto=format&fit=crop&q=80";
          };

          const fallbackUrl = getSmartFallback(catName, product.name, product._id);
          const imageSrc = getImageUrl(product.image) || fallbackUrl;
          const brandData = getProductBrandInfo(product);
          const campusPricing = getProductPrice(product);

          return (
            <div
              key={product._id}
              className="jt-product-card"
              style={{
                display: "flex",
                flexDirection: "column",
                height: "100%",
                width: "100%",
                minWidth: 0,
                boxSizing: "border-box",
                justifyContent: "space-between"
              }}
            >
              <div>
                <Link href={`/products/${product._id}`} className="jt-product-link" style={{ textDecoration: "none", display: "block" }}>
                  <div style={{ position: "relative", width: "100%", paddingBottom: "100%", overflow: "hidden", borderRadius: 10, background: "#ffffff", border: "1px solid #f1f5f9" }}>
                    {/* Standard Regular Discount Badge */}
                    {getDiscount(product) > 0 && !campusPricing?.hasDiscount && (
                      <div style={{
                        position: 'absolute', top: 8, left: 8, zIndex: 2,
                        background: 'linear-gradient(135deg,#ff3b6b,#e11d48)',
                        color: '#fff', borderRadius: 8, padding: '4px 7px',
                        lineHeight: 1, textAlign: 'center',
                        boxShadow: '0 4px 10px rgba(225,29,72,.3)'
                      }}>
                        <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: '-.3px' }}>
                          {getDiscount(product)}%
                        </div>
                        <div style={{ fontSize: 8, fontWeight: 700, opacity: .95, marginTop: 2 }}>
                          OFF
                        </div>
                      </div>
                    )}

                    {/* Campus Special Student Badge */}
                    {campusPricing?.hasDiscount && (
                      <div style={{
                        position: 'absolute', top: 8, left: 8, zIndex: 3,
                        background: activeCoupon?.tagColor || '#ff4d6d',
                        color: '#fff', borderRadius: 8, padding: '3px 8px',
                        lineHeight: 1.1, textAlign: 'center',
                        boxShadow: '0 4px 12px rgba(225,29,72,.35)'
                      }}>
                        <div style={{ fontSize: 13, fontWeight: 900, letterSpacing: '-.3px' }}>
                          -{campusPricing.savedFromMrpPct}%
                        </div>
                        <div style={{ fontSize: 7.5, fontWeight: 800, textTransform: 'uppercase', opacity: .95, marginTop: 1, letterSpacing: '0.04em' }}>
                          TOTAL OFF
                        </div>
                      </div>
                    )}

                    <img
                      src={cld(imageSrc, 500, 500)}
                      alt={product.name}
                      loading="lazy"
                      style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "contain", background: "#ffffff", padding: "4px", boxSizing: "border-box", display: "block" }}
                      onError={(e) => {
                        e.currentTarget.src = fallbackUrl;
                      }}
                    />
                    <ProductWatermark variant="card" />
                  </div>
                </Link>

                <div style={{ marginTop: 8 }}>
                  {brandData && (
                    <div style={{ marginBottom: 4 }}>
                      <Link
                        href={`/brands/${brandData.slug}`}
                        onClick={(e) => e.stopPropagation()}
                        className="jt-card-brand-pill"
                        title={`View all ${brandData.name} products`}
                      >
                        {brandData.name}
                      </Link>
                    </div>
                  )}

                  <Link href={`/products/${product._id}`} className="jt-product-link" style={{ textDecoration: "none" }}>
                    <h3 style={{ fontSize: 13.5, margin: "2px 0 2px", lineHeight: 1.35, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", height: 38, color: "#0f172a", fontWeight: 700 }}>
                      {product.name}
                    </h3>
                  </Link>

                  <p className="jt-card-cat-subtitle" style={{ fontSize: 12, color: "#64748b", margin: "0 0 6px", height: 18, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {catName}
                  </p>
                </div>
              </div>

              <div style={{ marginTop: "auto", paddingTop: 4 }}>
                <Link href={`/products/${product._id}`} className="jt-product-link" style={{ textDecoration: "none", display: "block" }}>
                  {isWholesale ? (() => {
                    const regularMrp = Number(product.originalPrice || product.offerPrice || 0);
                    const baseCost = Number(product.purchasePrice || (regularMrp ? regularMrp * 0.70 : 100));
                    const isExplicit = Number(product.wholesalePrice) > baseCost;
                    const wsPrice = isExplicit ? Number(product.wholesalePrice) : Math.round(baseCost * 1.07);
                    const profitPerPc = Math.max(0, regularMrp - wsPrice);
                    const minQty = Math.max(1, product.wholesaleMinQty || 3);

                    return (
                      <div>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap", margin: "0 0 2px" }}>
                          <p className="jt-price" style={{ margin: 0, fontSize: 17, fontWeight: 900, color: "#6d28d9" }}>
                            ৳{wsPrice} Tk
                          </p>
                          <span style={{
                            fontSize: 10,
                            fontWeight: 800,
                            background: "#ede9fe",
                            color: "#6d28d9",
                            padding: "1px 6px",
                            borderRadius: "4px",
                          }}>
                            🏬 পাইকারি (MOQ {minQty})
                          </span>
                          <span style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: product.stockStatus === "Out of Stock" ? "#ef4444" : "#0284c7",
                            marginLeft: "auto"
                          }}>
                            {product.stockStatus === "Out of Stock" ? "Stock out" : "In stock"}
                          </span>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: 18, marginBottom: 8, fontSize: 11.5 }}>
                          <span style={{ color: "#64748b" }}>
                            MRP: <span style={{ textDecoration: "line-through" }}>{regularMrp} Tk</span>
                          </span>
                          {profitPerPc > 0 && (
                            <span style={{ color: "#16a34a", fontWeight: 800 }}>
                              লাভ ৳{profitPerPc}/pc
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })() : isReseller ? (() => {
                    const resellerRate = product.resellerPrice > 0 ? product.resellerPrice : Math.round(product.offerPrice * 0.92);
                    const resellerProfit = Math.max(0, product.offerPrice - resellerRate);
                    return (
                      <div>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap", margin: "0 0 2px" }}>
                          <p className="jt-price" style={{ margin: 0, fontSize: 17, fontWeight: 900, color: "#be123c" }}>
                            ৳{resellerRate} Tk
                          </p>
                          <span style={{
                            fontSize: 10,
                            fontWeight: 800,
                            background: "#ffe4e6",
                            color: "#be123c",
                            padding: "1px 6px",
                            borderRadius: "4px",
                          }}>
                            🚀 রিসেলার রেট
                          </span>
                          <span style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: product.stockStatus === "Out of Stock" ? "#ef4444" : "#0284c7",
                            marginLeft: "auto"
                          }}>
                            {product.stockStatus === "Out of Stock" ? "Stock out" : "In stock"}
                          </span>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: 18, marginBottom: 8, fontSize: 11.5 }}>
                          <span style={{ color: "#64748b" }}>
                            খুচরা: {product.offerPrice} Tk
                          </span>
                          {resellerProfit > 0 && (
                            <span style={{ color: "#16a34a", fontWeight: 800 }}>
                              প্রফিট ৳{resellerProfit}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })() : campusPricing?.hasDiscount ? (
                    <div>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap", margin: "0 0 2px" }}>
                        <p className="jt-price" style={{ margin: 0, fontSize: 17, fontWeight: 900, color: "#e11d48" }}>
                          {campusPricing.campusPrice} Tk
                        </p>
                        {campusPricing.mrp > campusPricing.campusPrice && (
                          <span style={{ fontSize: 12, color: "#94a3b8", textDecoration: "line-through" }} title="Market Retail Price (MRP)">
                            MRP {campusPricing.mrp} Tk
                          </span>
                        )}
                        <span style={{
                          fontSize: 10,
                          fontWeight: 800,
                          background: activeCoupon?.tagColor || "#ff4d6d",
                          color: "#ffffff",
                          padding: "1px 6px",
                          borderRadius: "4px",
                        }}>
                          {activeCoupon?.short} -{campusPricing.discountPct}%
                        </span>
                        <span style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: product.stockStatus === "Out of Stock" ? "#ef4444" : "#0284c7",
                          marginLeft: "auto"
                        }}>
                          {product.stockStatus === "Out of Stock" ? "Stock out" : "In stock"}
                        </span>
                      </div>

                      {product.offerPrice && campusPricing.mrp > product.offerPrice && product.offerPrice > campusPricing.campusPrice && (
                        <div style={{ fontSize: 11, color: "#64748b", margin: "0 0 3px" }}>
                          রেগুলার প্রাইস: <span style={{ textDecoration: "line-through" }}>{product.offerPrice} Tk</span>
                        </div>
                      )}

                      <div style={{ minHeight: 18, marginBottom: 8, display: "flex", alignItems: "center" }}>
                        {campusPricing.savedFromMrp > campusPricing.savedAmount ? (
                          <span style={{ fontSize: 11.5, color: '#16a34a', fontWeight: 800 }}>
                            🎓 MRP থেকে মোট সেভ: ৳{campusPricing.savedFromMrp} ({campusPricing.savedFromMrpPct}% লাভ)
                          </span>
                        ) : (
                          <span style={{ fontSize: 11.5, color: '#16a34a', fontWeight: 800 }}>
                            🎓 {activeCoupon?.short} সেভিংস: ৳{campusPricing.savedAmount}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap", margin: "0 0 2px" }}>
                        <p className="jt-price" style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#ff4d6d" }}>
                          {product.offerPrice} Tk
                        </p>
                        {product.originalPrice > product.offerPrice && (
                          <span style={{ fontSize: 12, color: "#94a3b8", textDecoration: "line-through" }}>
                            {product.originalPrice} Tk
                          </span>
                        )}
                        <span style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: product.stockStatus === "Out of Stock" ? "#ef4444" : "#0284c7",
                          marginLeft: "auto"
                        }}>
                          {product.stockStatus === "Out of Stock" ? "Stock out" : "In stock"}
                        </span>
                      </div>

                      <div style={{ minHeight: 18, marginBottom: 8, display: "flex", alignItems: "center" }}>
                        {getSaved(product) > 0 ? (
                          <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 700 }}>
                            ৳{getSaved(product)} সাশ্রয়
                          </span>
                        ) : (
                          <span style={{ visibility: "hidden", fontSize: 11 }}>সাশ্রয়</span>
                        )}
                      </div>
                    </div>
                  )}
                </Link>

                <button
                  type="button"
                  onClick={(e) => handleAddToCart(product, e)}
                  disabled={product.stockStatus === "Out of Stock"}
                  className={`jt-add-to-cart-btn ${
                    product.stockStatus === "Out of Stock" ? "disabled" : ""
                  }`}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    transition: "all 0.25s ease",
                    ...(isWholesale
                      ? {
                          backgroundColor: addedId === product._id ? "#10b981" : "#6d28d9",
                          borderColor: addedId === product._id ? "#10b981" : "#6d28d9",
                          color: "#ffffff",
                        }
                      : isReseller
                      ? {
                          backgroundColor: addedId === product._id ? "#10b981" : "#be123c",
                          borderColor: addedId === product._id ? "#10b981" : "#be123c",
                          color: "#ffffff",
                        }
                      : addedId === product._id
                      ? {
                          backgroundColor: "#10b981",
                          borderColor: "#10b981",
                          color: "#ffffff",
                        }
                      : {}),
                  }}
                >
                  {product.stockStatus === "Out of Stock"
                    ? "Out of Stock"
                    : addedId === product._id
                    ? isWholesale
                      ? `✓ Added ${product.wholesaleMinQty || 3} pcs!`
                      : "✓ Added to Cart!"
                    : isWholesale
                    ? `+ Add MOQ (${product.wholesaleMinQty || 3} pcs)`
                    : isReseller
                    ? "+ Reseller কার্ট"
                    : "Add to Cart"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination Controls */}
      {showPagination && totalPages > 1 && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "16px",
            marginTop: "50px",
            padding: "20px 0",
          }}
        >
          {totalProducts > 0 && (
            <div style={{ fontSize: "14px", color: "#64748B", fontWeight: "600" }}>
              Showing {((currentPage - 1) * PAGE_SIZE) + 1}–{Math.min(currentPage * PAGE_SIZE, totalProducts)} of {totalProducts.toLocaleString()} products
            </div>
          )}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexWrap: "wrap",
              gap: "8px",
            }}
          >
            {/* Prev Button */}
            <button
              type="button"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              style={{
                padding: "8px 16px",
                fontSize: "14px",
                fontWeight: "700",
                color: currentPage <= 1 ? "#94a3b8" : "#1e293b",
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                cursor: currentPage <= 1 ? "not-allowed" : "pointer",
                transition: "all 0.2s",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
              }}
            >
              ← Prev
            </button>

            {/* Page Number Buttons */}
            {getPaginationItems(currentPage, totalPages).map((item, idx) => {
              if (item === "...") {
                return (
                  <span
                    key={`ellipsis-${idx}`}
                    style={{ padding: "0 6px", color: "#94a3b8", fontWeight: "700", userSelect: "none" }}
                  >
                    ...
                  </span>
                );
              }

              const isCurrent = item === currentPage;
              return (
                <button
                  key={`page-${item}`}
                  type="button"
                  onClick={() => handlePageChange(item)}
                  style={{
                    minWidth: "40px",
                    height: "40px",
                    padding: "0 10px",
                    fontSize: "14px",
                    fontWeight: isCurrent ? "800" : "600",
                    color: isCurrent ? "#ffffff" : "#334155",
                    background: isCurrent ? "linear-gradient(135deg, #be185d 0%, #9d174d 100%)" : "#ffffff",
                    border: isCurrent ? "none" : "1px solid #e2e8f0",
                    borderRadius: "8px",
                    cursor: "pointer",
                    boxShadow: isCurrent ? "0 4px 10px rgba(190, 24, 93, 0.3)" : "0 1px 2px rgba(0,0,0,0.05)",
                    transition: "all 0.2s ease",
                  }}
                >
                  {item}
                </button>
              );
            })}

            {/* Next Button */}
            <button
              type="button"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              style={{
                padding: "8px 16px",
                fontSize: "14px",
                fontWeight: "700",
                color: currentPage >= totalPages ? "#94a3b8" : "#1e293b",
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                cursor: currentPage >= totalPages ? "not-allowed" : "pointer",
                transition: "all 0.2s",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
              }}
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {filteredProducts.length === 0 && !loading && (
        <div
          style={{
            textAlign: "center",
            marginTop: "40px",
            color: "#64748B",
            fontWeight: "700",
          }}
        >
          No products match your search or filter.
        </div>
      )}
    </section>
  );
}

export default function ProductGrid(props) {
  return (
    <Suspense fallback={<div style={{ textAlign: "center", padding: "60px", color: "#64748B" }}>Loading products...</div>}>
      <ProductGridContent {...props} />
    </Suspense>
  );
}