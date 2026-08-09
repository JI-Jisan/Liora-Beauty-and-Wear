"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import CartDrawer from "@/components/CartDrawer";
import { API_BASE_URL } from "@/lib/api";

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
  const [product, setProduct] = useState(null);
  const [allProducts, setAllProducts] = useState(DEMO_PRODUCTS);
  const [loading, setLoading] = useState(true);
  const [cartCount, setCartCount] = useState(0);
  const [cartItems, setCartItems] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

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
    Promise.resolve().then(() => {
      try {
        const savedCart = JSON.parse(localStorage.getItem("jt_cart")) || [];
        setCartItems(savedCart);

        const totalCount = savedCart.reduce((sum, item) => sum + item.quantity, 0);
        setCartCount(totalCount);
      } catch (e) {
        console.error(e);
      }
    });
  }, []);

  useEffect(() => {
    if (!params?.id) return;

    fetch(`${API_BASE_URL}/api/products`)
      .then((res) => res.json())
      .then((data) => {
        const productList = Array.isArray(data) && data.length > 0 ? data : DEMO_PRODUCTS;
        setAllProducts(productList);
        const found = productList.find((item) => item._id === params.id);
        setProduct(found || DEMO_PRODUCTS.find((item) => item._id === params.id) || null);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        const found = DEMO_PRODUCTS.find((item) => item._id === params.id);
        setProduct(found || null);
        setLoading(false);
      });
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
  const existingCart = JSON.parse(localStorage.getItem("jt_cart")) || [];

  const existingItem = existingCart.find((item) => item._id === product._id);

  let updatedCart;

  if (existingItem) {
    updatedCart = existingCart.map((item) =>
      item._id === product._id
        ? { ...item, quantity: item.quantity + 1 }
        : item
    );
  } else {
    updatedCart = [...existingCart, { ...product, quantity: 1 }];
  }

  localStorage.setItem("jt_cart", JSON.stringify(updatedCart));
  setCartItems(updatedCart);

  const totalCount = updatedCart.reduce((sum, item) => sum + item.quantity, 0);
  setCartCount(totalCount);

  setIsCartOpen(true);
};

const handleBuyNow = () => {
  const existingCart = JSON.parse(localStorage.getItem("jt_cart")) || [];
  const existingItem = existingCart.find((item) => item._id === product._id);

  let updatedCart;
  if (existingItem) {
    updatedCart = existingCart.map((item) =>
      item._id === product._id
        ? { ...item, quantity: item.quantity + 1 }
        : item
    );
  } else {
    updatedCart = [...existingCart, { ...product, quantity: 1 }];
  }

  localStorage.setItem("jt_cart", JSON.stringify(updatedCart));
  setCartItems(updatedCart);
  router.push("/checkout");
};

const increaseQty = (id) => {
  const updatedCart = cartItems.map((item) =>
    item._id === id ? { ...item, quantity: item.quantity + 1 } : item
  );

  setCartItems(updatedCart);
  localStorage.setItem("jt_cart", JSON.stringify(updatedCart));

  const totalCount = updatedCart.reduce((sum, item) => sum + item.quantity, 0);
  setCartCount(totalCount);
};

const decreaseQty = (id) => {
  const updatedCart = cartItems
    .map((item) =>
      item._id === id ? { ...item, quantity: item.quantity - 1 } : item
    )
    .filter((item) => item.quantity > 0);

  setCartItems(updatedCart);
  localStorage.setItem("jt_cart", JSON.stringify(updatedCart));

  const totalCount = updatedCart.reduce((sum, item) => sum + item.quantity, 0);
  setCartCount(totalCount);
};

const removeItem = (id) => {
  const updatedCart = cartItems.filter((item) => item._id !== id);

  setCartItems(updatedCart);
  localStorage.setItem("jt_cart", JSON.stringify(updatedCart));

  const totalCount = updatedCart.reduce((sum, item) => sum + item.quantity, 0);
  setCartCount(totalCount);
};

  if (loading) {
    return (
      <main style={{ padding: "40px", textAlign: "center" }}>
        <h2>Loading product...</h2>
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

  const imageSrc = product.image
    ? product.image.startsWith("http")
      ? product.image
      : product.image.startsWith("/uploads")
      ? `${API_BASE_URL}${product.image}`
      : `/images/${product.image}`
    : null;

  return (
    <main className="jt-details-page-wrap">
      <Header
        cartCount={cartCount}
        onOpenCart={() => setIsCartOpen(true)}
        searchTerm=""
        onSearchChange={() => {}}
        brandName={siteSettings.brandName}
        brandSubtitle={siteSettings.brandSubtitle}
      />

     <CartDrawer
        cartItems={cartItems}
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onIncrease={increaseQty}
        onDecrease={decreaseQty}
        onRemove={removeItem}
     />

      <section className="jt-details-top">
        <div className="jt-details-main">
          <div className="jt-details-gallery">
            <div className="jt-details-main-image-box">
              {imageSrc ? (
                <img
                  src={imageSrc}
                  alt={product.name}
                  className="jt-details-main-image"
                />
              ) : (
                <div className="jt-details-fallback">No Image</div>
              )}
            </div>
          </div>

         <div className="jt-details-info">
  <p className="jt-details-breadcrumb">
    Home / {product.category?.name || "Category"} / {product.name}
  </p>

  <h1>{product.name}</h1>

  <p className="jt-details-category-inline">
    Category: {product.category?.name || "No Category"}
  </p>

  <div className="jt-details-price-box">
    <span className="jt-details-offer-price">
      {product.offerPrice} Tk
    </span>
    <span className="jt-details-original-price">
      {product.originalPrice} Tk
    </span>
  </div>

  {product.discountBadge && (
    <div className="jt-details-badge">{product.discountBadge}</div>
  )}

  <p className="jt-details-stock">
    Stock Status: {product.stockStatus}
  </p>

  <div className="jt-details-action-row">
    <button
      className="jt-buy-now-btn"
      onClick={handleBuyNow}
      disabled={product.stockStatus === "Out of Stock"}
      style={{
        opacity: product.stockStatus === "Out of Stock" ? 0.6 : 1,
        cursor:
          product.stockStatus === "Out of Stock" ? "not-allowed" : "pointer",
      }}
    >
      {product.stockStatus === "Out of Stock" ? "Unavailable" : "Buy Now"}
    </button>

    <button
      className="jt-add-cart-btn"
      onClick={handleAddToCart}
      disabled={product.stockStatus === "Out of Stock"}
      style={{
        opacity: product.stockStatus === "Out of Stock" ? 0.6 : 1,
        cursor:
          product.stockStatus === "Out of Stock" ? "not-allowed" : "pointer",
      }}
    >
      {product.stockStatus === "Out of Stock" ? "Out of Stock" : "Add to Cart"}
    </button>
  </div>
</div>

          <aside className="jt-details-sidebox">
            <div className="jt-side-card">
              <h3>Delivery Options</h3>
              <p>
                <strong>Standard Delivery:</strong> 65 Tk
              </p>
              <p>
                <strong>Outside Dhaka:</strong> 110 Tk
              </p>
              <p>Cash on Delivery Available</p>
            </div>

            <div className="jt-side-card">
              <h3>Return & Warranty</h3>
              <p>Easy return available</p>
              <p>Warranty depends on product type</p>
            </div>
          </aside>
        </div>
      </section>

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