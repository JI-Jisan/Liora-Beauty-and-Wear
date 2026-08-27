"use client";

import { useEffect, useState, use } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductGrid from "@/components/ProductGrid";
import { API_BASE_URL } from "@/lib/api";

export default function BrandProductsPage({ params }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Unbox params if using React 19+ in Next.js 15
  const unwrappedParams = use(params);
  const slug = unwrappedParams.slug;

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/products?brand=${slug}`)
      .then(r => r.json())
      .then(data => {
        setProducts(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch brand products", err);
        setLoading(false);
      });
  }, [slug]);

  return (
    <main className="jt-page" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />
      
      <section style={{ padding: "30px 20px 10px", flex: 1 }}>
        <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
          <h1 style={{ margin: "0 0 10px", fontSize: "32px", color: "#223a67", textTransform: 'capitalize' }}>
            {slug.replace(/-/g, ' ')} Products
          </h1>
          <p style={{ margin: "0 0 24px", color: "#6b7280", fontSize: "16px" }}>
            Explore the latest collection from {slug.replace(/-/g, ' ')}.
          </p>

          {loading ? (
            <div style={{ textAlign: "center", padding: "40px" }}>Loading products...</div>
          ) : (
            <ProductGrid 
              title="" 
              brand={slug} 
              category="" 
              type="" 
            />
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
}
