"use client";

import { useEffect, useState, useMemo } from "react";
import AdminOrders from "@/components/AdminOrders";
import { useRouter } from "next/navigation";
import { API_BASE_URL, getAuthHeaders, getImageUrl } from "@/lib/api";
import ProductForm from "@/components/admin/ProductForm";
import CategoryManager from "@/components/admin/CategoryManager";

export default function AdminPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [message, setMessage] = useState("");
  const [editingProduct, setEditingProduct] = useState(null);

  // Slide-out Drawer State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  // Active Tab State (কোন পেজটি এখন দেখাবে তার জন্য)
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  // Report states
  const [reportFilter, setReportFilter] = useState("30"); // ডিফল্ট ৩০ দিন (মান্থলি)
  const [reportData, setReportData] = useState([]);
  const [stockCategoryFilter, setStockCategoryFilter] = useState("all");

  // Manage Products Advanced Controls State
  const [productSearch, setProductSearch] = useState("");
  const [productCategoryFilter, setProductCategoryFilter] = useState("all");
  const [productStockFilter, setProductStockFilter] = useState("all");
  const [productSortBy, setProductSortBy] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;



  const [settings, setSettings] = useState({
    brandName: "",
    brandSubtitle: "",
    heroTitle: "",
    heroText: "",
    heroImage: "",
    offerText: "",
    promoSlides: [],
    flashTitle: "",
    flashSubtitle: "",
    flashButtonText: "",
    flashButtonLink: "",
    flashDurationHours: 6,
  });

  const handleLogout = () => {
    localStorage.removeItem("jt_admin_logged_in");
    localStorage.removeItem("jt_admin_token");
    localStorage.removeItem("jt_admin_user");
    router.push("/admin/login");
  };

  const uploadToCloudinary = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "liora_store");

    const res = await fetch("https://api.cloudinary.com/v1_1/dlgubaefs/image/upload", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      throw new Error("Failed to upload image to Cloudinary");
    }

    const data = await res.json();
    return data.secure_url;
  };

  const [formData, setFormData] = useState({
    name: "",
    category: "",
    purchasePrice: "",
    originalPrice: "",
    offerPrice: "",
    stockQuantity: "",
    discountBadge: "",
    description: "",
    stockStatus: "In Stock",
    image: "",
    image2: "",
    image3: "",
    rating: "",
    reviewCount: "",
    isFeatured: false,
    isTrending: false,
    isNewArrival: false,
  });

  const loadCategories = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/categories`);
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadProducts = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/products`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadSettings = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/settings`);
      const data = await res.json();

      setSettings({
        brandName: data.brandName || "",
        brandSubtitle: data.brandSubtitle || "",
        heroTitle: data.heroTitle || "",
        heroText: data.heroText || "",
        heroImage: data.heroImage || "",
        offerText: data.offerText || "",
        promoSlides: Array.isArray(data.promoSlides) ? data.promoSlides : [],
        flashTitle: data.flashTitle || "Limited Time Special Offer",
        flashSubtitle:
          data.flashSubtitle ||
          "Grab selected trending products before the timer runs out.",
        flashButtonText: data.flashButtonText || "Shop Flash Sale",
        flashButtonLink: data.flashButtonLink || "/products",
        flashDurationHours: data.flashDurationHours || 6,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const loadReports = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/reports`);
      if (res.ok) {
        const data = await res.json();
        setReportData(data.orders || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const isLoggedIn = localStorage.getItem("jt_admin_logged_in");
    const token = localStorage.getItem("jt_admin_token");

    if (isLoggedIn !== "true" || !token) {
      router.push("/admin/login");
    } else {
      setIsAuthenticated(true);
      loadCategories();
      loadProducts();
      loadSettings();
      loadReports();
    }
  }, [router]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const resetForm = () => {
    setFormData({
      name: "",
      category: "",
      purchasePrice: "",
      originalPrice: "",
      offerPrice: "",
      stockQuantity: "",
      discountBadge: "",
      description: "",
      stockStatus: "In Stock",
      stockStatus: "In Stock",
      image: "",
      isFeatured: false,
      isTrending: false,
      isNewArrival: false,
    });
    setEditingProduct(null);
  };

  const handleSlideChange = (index, field, value) => {
    const updatedSlides = settings.promoSlides.map((slide, i) =>
      i === index ? { ...slide, [field]: value } : slide
    );

    setSettings((prev) => ({
      ...prev,
      promoSlides: updatedSlides,
    }));
  };

  const handleSlideImageUpload = async (index, file) => {
    if (!file) return;
    setMessage("⏳ Uploading slide image to Cloudinary...");

    try {
      const imageUrl = await uploadToCloudinary(file);
      handleSlideChange(index, "image", imageUrl);
      setMessage("✅ Slide image uploaded! Now click '💾 Save Settings' below.");
    } catch (error) {
      setMessage("❌ Failed to upload slide image.");
      console.error(error);
    }
  };

  const addSlide = () => {
    setSettings({
      ...settings,
      promoSlides: [
        ...settings.promoSlides,
        {
          badge: "",
          title: "",
          subtitle: "",
          buttonText: "",
          buttonLink: "",
          image: "",
        },
      ],
    });
  };

  const handleHeroImageUpload = async (file) => {
    if (!file) return;
    setMessage("⏳ Uploading hero image to Cloudinary...");

    try {
      const imageUrl = await uploadToCloudinary(file);
      setSettings((prev) => ({ ...prev, heroImage: imageUrl }));
      setMessage("✅ Hero banner image uploaded! Click '💾 Save Settings' below.");
    } catch (error) {
      setMessage("❌ Failed to upload hero image.");
      console.error(error);
    }
  };

  const removeSlide = (index) => {
    const updatedSlides = settings.promoSlides.filter((_, i) => i !== index);

    setSettings({
      ...settings,
      promoSlides: updatedSlides,
    });
  };

  const savePromoSlides = async () => {
    setIsSavingSettings(true);
    setMessage("⏳ Saving settings to MongoDB server...");
    try {
      const res = await fetch(`${API_BASE_URL}/api/settings`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(settings),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.message || "Failed to save settings");
      }

      setMessage("✅ Settings & Cover Images saved successfully!");
      if (result.promoSlides) {
        setSettings(result);
      }
    } catch (error) {
      setMessage(`❌ Save Failed: ${error.message}`);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleProductImageUpload = async (file, fieldName = "image") => {
    if (!file) return;
    const label = fieldName === "image" ? "Image 1" : fieldName === "image2" ? "Image 2" : "Image 3";
    setMessage(`⏳ Uploading ${label} to Cloudinary...`);

    try {
      const imageUrl = await uploadToCloudinary(file);
      setFormData((prev) => ({ ...prev, [fieldName]: imageUrl }));
      setMessage(`✅ ${label} uploaded successfully!`);
    } catch (error) {
      setMessage(`❌ Failed to upload ${label}.`);
      console.error(error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(editingId ? "⏳ Updating product..." : "⏳ Saving product...");

    try {
      const finalProduct = {
        ...formData,
        purchasePrice: Number(formData.purchasePrice),
        originalPrice: Number(formData.originalPrice),
        offerPrice: Number(formData.offerPrice),
        stockQuantity: Number(formData.stockQuantity),
        image: formData.image || "",
        image2: formData.image2 || "",
        image3: formData.image3 || "",
        images: [formData.image, formData.image2, formData.image3].filter(Boolean),
      };

      const url = editingId
        ? `${API_BASE_URL}/api/products/${editingId}`
        : `${API_BASE_URL}/api/products`;

      const method = editingId ? "PUT" : "POST";

      const productRes = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(finalProduct),
      });

      const productResult = await productRes.json();

      if (!productRes.ok) {
        throw new Error(productResult.message || "Save failed");
      }

      setMessage(
        editingId
          ? "✅ Product updated successfully!"
          : "✅ Product added successfully!"
      );
      resetForm();
      loadProducts();
    } catch (error) {
      setMessage(`❌ Product Save Failed: ${error.message}`);
    }
  };

  const handleDeleteProduct = async (id) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this product?");
    if (!confirmDelete) return;

    // Optimistically update local UI state
    setProducts((prev) => prev.filter((p) => p._id !== id));

    try {
      const res = await fetch(`${API_BASE_URL}/api/products/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.message || "Delete failed");
      }

      setMessage("✓ Product deleted successfully");
      loadProducts();
    } catch (error) {
      setMessage(`❌ Delete Error: ${error.message}`);
      loadProducts();
    }
  };

  const handleClearAllProducts = async () => {
    const confirmClear = window.confirm("Are you sure you want to delete ALL products to start adding your real products?");
    if (!confirmClear) return;

    setProducts([]);

    try {
      const res = await fetch(`${API_BASE_URL}/api/products/clear-all`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        throw new Error("Clear failed");
      }

      setMessage("✓ All products deleted successfully! You can now add your real products.");
      loadProducts();
    } catch (error) {
      setMessage(`❌ Clear Error: ${error.message}`);
      loadProducts();
    }
  };

  const handleToggleSlider = async (product) => {
    try {
      // আমরা নতুন /slider রাউট বাদ দিয়ে, আপনার আগে থেকে কাজ করা "Edit Product" রাউট ব্যবহার করছি
      const res = await fetch(`${API_BASE_URL}/api/products/${product._id}`, {
        method: "PUT", // আপনার সিস্টেমে প্রোডাক্ট আপডেটের লিগ্যাল মেথড
        headers: getAuthHeaders(),
        body: JSON.stringify({ ...product, isSlider: !product.isSlider })
      });
      
      if (res.ok) {
        // UI আপডেট 
        setProducts(products.map(p => 
          p._id === product._id ? { ...p, isSlider: !product.isSlider } : p
        ));
        alert(!product.isSlider ? "✅ স্লাইডারে সফলভাবে যুক্ত হয়েছে!" : "❌ স্লাইডার থেকে রিমুভ করা হয়েছে!");
      } else {
        const errorData = await res.json();
        alert(`⚠️ সার্ভার এরর: ${errorData.message}`);
      }
    } catch (error) {
      alert("⚠️ নেটওয়ার্ক বা ফেচ এরর: " + error.message);
    }
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setActiveTab("add-product");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };



  // Filter & Sort Products for Manage Products section
  const filteredAndSortedProducts = useMemo(() => {
    const safeProducts = Array.isArray(products) ? products : [];
    let result = [...safeProducts];

    if (productSearch && typeof productSearch === "string" && productSearch.trim()) {
      const keyword = productSearch.trim().toLowerCase();
      result = result.filter(
        (p) =>
          (p && p.name && String(p.name).toLowerCase().includes(keyword)) ||
          (p && p.description && String(p.description).toLowerCase().includes(keyword)) ||
          (p && p.category && typeof p.category === "object" && p.category.name && String(p.category.name).toLowerCase().includes(keyword))
      );
    }

    if (productCategoryFilter && productCategoryFilter !== "all") {
      result = result.filter((p) => {
        if (!p) return false;
        const catId = p.category?._id || p.category;
        const catName = p.category?.name || p.category;
        return (
          catId === productCategoryFilter ||
          catName === productCategoryFilter
        );
      });
    }

    if (productStockFilter && productStockFilter !== "all") {
      result = result.filter((p) => p && p.stockStatus === productStockFilter);
    }

    if (productSortBy === "price-low") {
      result.sort((a, b) => (Number(a?.offerPrice) || 0) - (Number(b?.offerPrice) || 0));
    } else if (productSortBy === "price-high") {
      result.sort((a, b) => (Number(b?.offerPrice) || 0) - (Number(a?.offerPrice) || 0));
    } else if (productSortBy === "name") {
      result.sort((a, b) => String(a?.name || "").localeCompare(String(b?.name || "")));
    } else {
      result.sort(
        (a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0)
      );
    }

    return result;
  }, [
    products,
    productSearch,
    productCategoryFilter,
    productStockFilter,
    productSortBy,
  ]);

  const totalPages =
    Math.ceil(filteredAndSortedProducts.length / itemsPerPage) || 1;

  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedProducts.slice(start, start + itemsPerPage);
  }, [filteredAndSortedProducts, currentPage, itemsPerPage]);

  // Fetch Reports Logic
  useEffect(() => {
    if (activeTab === "reports") {
      const fetchReports = async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/api/admin/reports`, { 
            headers: {
              Authorization: `Bearer ${localStorage.getItem("jt_admin_token")}`
            }
          });
          const data = await res.json();
          setReportData(data.orders || []);
        } catch (err) {
          console.error("Failed to fetch reports", err);
        }
      };
      fetchReports();
    }
  }, [activeTab]);

  // Excel-like Calculation based on selected Time Filter
  let totalRevenue = 0;
  let totalCost = 0;
  let totalProfit = 0;
  const soldItems = [];

  const now = new Date();
  const filteredOrders = reportData.filter((order) => {
    if (reportFilter === "all") return true;
    const days = parseInt(reportFilter);
    const cutoffDate = new Date();
    cutoffDate.setDate(now.getDate() - days);
    return new Date(order.createdAt) >= cutoffDate;
  });

  filteredOrders.forEach((order) => {
    (order.items || []).forEach((item) => {
      const buyPrice = Number(item.purchasePrice || 0);
      const sellPrice = Number(item.offerPrice || item.price || 0);
      const origPrice = Number(item.originalPrice || sellPrice);
      const qty = Number(item.quantity || 1);

      const rowRevenue = sellPrice * qty;
      const rowCost = buyPrice * qty;
      const rowProfit = rowRevenue - rowCost;

      // শতকরা হিসাব (Percentage Calculation)
      const discountPct = origPrice > 0 ? Math.round(((origPrice - sellPrice) / origPrice) * 100) : 0;
      const profitPct = buyPrice > 0 ? Math.round(((sellPrice - buyPrice) / buyPrice) * 100) : (rowProfit > 0 ? 100 : 0);

      totalRevenue += rowRevenue;
      totalCost += rowCost;
      totalProfit += rowProfit;

      soldItems.push({
        date: new Date(order.createdAt).toLocaleDateString(),
        orderId: order.orderNumber,
        name: item.name,
        category: item.categoryName || "Product", // ক্যাটাগরি নাম
        buyPrice,
        sellPrice,
        qty,
        discountPct,
        profitPct,
        rowProfit,
      });
    });
  });

  const overallProfitPct = totalCost > 0 ? Math.round((totalProfit / totalCost) * 100) : 0;

  // Stock Calculation Logic
  let totalStockItems = 0;
  let outOfStockCount = 0;
  let lowStockCount = 0;
  let totalStockValue = 0; // গোডাউনে মোট কত টাকার মাল আছে (কেনার দাম অনুযায়ী)

  // products স্টেট থেকে ডেটা ফিল্টার করা
  const filteredStock = (products || []).filter((p) => {
    if (stockCategoryFilter === "all") return true;
    const catId = p.category?._id || p.category;
    return catId === stockCategoryFilter;
  });

  filteredStock.forEach((p) => {
    const qty = Number(p.stockQuantity || 0);
    const buyPrice = Number(p.purchasePrice || 0);
    
    totalStockItems += qty;
    totalStockValue += (qty * buyPrice);
    
    if (qty === 0) outOfStockCount++;
    else if (qty <= 5) lowStockCount++;
  });

  if (!isAuthenticated) return null;

  return (
    <main id="top" className="jt-admin-dashboard">
      {/* Backdrop Overlay for Slide-out Drawer */}
      <div
        className={`jt-admin-sidebar-overlay ${isSidebarOpen ? "open" : ""}`}
        onClick={() => setIsSidebarOpen(false)}
      />

      {/* Slide-out Navigation Drawer */}
      <aside className={`jt-admin-sidebar ${isSidebarOpen ? "open" : ""}`}>
        <div className="jt-admin-sidebar-header">
          <h2>LIORA Beauty & Wear</h2>
          <button
            type="button"
            className="jt-admin-sidebar-close"
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Close Sidebar"
          >
            ✕
          </button>
        </div>

        <ul>
          <li
            className={activeTab === "dashboard" ? "active-tab" : ""}
            onClick={() => {
              setActiveTab("dashboard");
              setIsSidebarOpen(false);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            📊 Dashboard
          </li>
          <li
            className={activeTab === "categories" ? "active-tab" : ""}
            onClick={() => {
              setActiveTab("categories");
              setIsSidebarOpen(false);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            📁 Categories
          </li>
          <li
            onClick={() => {
              router.push("/admin/brands");
            }}
          >
            🏷️ Brands
          </li>
          <li
            onClick={() => {
              router.push("/admin/menus");
            }}
          >
            ☰ Menus
          </li>
          <li
            className={activeTab === "add-product" ? "active-tab" : ""}
            onClick={() => {
              setActiveTab("add-product");
              setIsSidebarOpen(false);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            ➕ Add Product
          </li>
          <li
            className={activeTab === "manage-products" ? "active-tab" : ""}
            onClick={() => {
              setActiveTab("manage-products");
              setIsSidebarOpen(false);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            🛍️ Manage Products
          </li>
          <li
            className={activeTab === "orders" ? "active-tab" : ""}
            onClick={() => {
              setActiveTab("orders");
              setIsSidebarOpen(false);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            📦 Orders
          </li>
          <li
            className={activeTab === "branding" ? "active-tab" : ""}
            onClick={() => {
              setActiveTab("branding");
              setIsSidebarOpen(false);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            ✨ Branding & Flash Sale
          </li>
          <li
            className={activeTab === "reports" ? "active-tab" : ""}
            onClick={() => {
              setActiveTab("reports");
              setIsSidebarOpen(false);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            📈 Profit & Reports
          </li>
          <li
            className={activeTab === "stock" ? "active-tab" : ""}
            onClick={() => {
              setActiveTab("stock");
              setIsSidebarOpen(false);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            📋 Inventory / Stock
          </li>
        </ul>
      </aside>

      <section className="jt-admin-main">
        {/* Modern Admin Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#ffffff", padding: "14px 16px", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)", marginBottom: "24px" }}>
          
          <button
            type="button"
            onClick={() => setIsSidebarOpen(true)}
            style={{ background: "#0f172a", color: "#ffffff", border: "none", padding: "8px 14px", borderRadius: "10px", fontWeight: "700", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}
          >
            ☰ Menu
          </button>

          <h1 style={{ fontSize: "16px", margin: 0, fontWeight: "900", color: "#0f172a", textAlign: "center", letterSpacing: "0.5px" }}>
            LIORA ADMIN
          </h1>

          <button
            onClick={handleLogout}
            style={{ background: "#fee2e2", color: "#dc2626", border: "none", padding: "8px 14px", borderRadius: "10px", fontWeight: "800", fontSize: "13px", cursor: "pointer" }}
          >
            Logout
          </button>

        </div>

        <div className="jt-admin-grid">
          
          {/* Dashboard Tab - Premium Look */}
          {activeTab === "dashboard" && (
            <div style={{ background: "transparent", border: "none", padding: 0, boxShadow: "none" }} className="jt-admin-panel">
              <h2 style={{ marginBottom: "16px", color: "#0f172a", fontSize: "18px", fontWeight: "800" }}>Welcome, Admin! 🚀</h2>
              
              {/* 2-Column Grid on Mobile */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px" }}>
                
                {/* Add Product Box */}
                <div 
                  onClick={() => { setActiveTab("add-product"); window.scrollTo(0,0); }}
                  style={{ background: "#ffffff", padding: "20px 10px", borderRadius: "16px", border: "1px solid #e2e8f0", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
                >
                  <div style={{ fontSize: "28px", marginBottom: "8px" }}>➕</div>
                  <h3 style={{ margin: "0", fontSize: "14px", color: "#334155", fontWeight: "800" }}>Add Product</h3>
                </div>

                {/* Manage Products Box */}
                <div 
                  onClick={() => { setActiveTab("manage-products"); window.scrollTo(0,0); }}
                  style={{ background: "#ffffff", padding: "20px 10px", borderRadius: "16px", border: "1px solid #e2e8f0", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
                >
                  <div style={{ fontSize: "28px", marginBottom: "8px" }}>🛍️</div>
                  <h3 style={{ margin: "0", fontSize: "14px", color: "#334155", fontWeight: "800" }}>Manage Products</h3>
                </div>

                {/* Orders Box */}
                <div 
                  onClick={() => { setActiveTab("orders"); window.scrollTo(0,0); }}
                  style={{ background: "#ffffff", padding: "20px 10px", borderRadius: "16px", border: "1px solid #e2e8f0", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
                >
                  <div style={{ fontSize: "28px", marginBottom: "8px" }}>📦</div>
                  <h3 style={{ margin: "0", fontSize: "14px", color: "#334155", fontWeight: "800" }}>Orders</h3>
                </div>

                {/* Profit Reports Box */}
                <div 
                  onClick={() => { setActiveTab("reports"); window.scrollTo(0,0); }}
                  style={{ background: "#ffffff", padding: "20px 10px", borderRadius: "16px", border: "1px solid #e2e8f0", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
                >
                  <div style={{ fontSize: "28px", marginBottom: "8px" }}>📈</div>
                  <h3 style={{ margin: "0", fontSize: "14px", color: "#334155", fontWeight: "800" }}>Reports</h3>
                </div>

                {/* Categories Box */}
                <div 
                  onClick={() => { setActiveTab("categories"); window.scrollTo(0,0); }}
                  style={{ background: "#ffffff", padding: "20px 10px", borderRadius: "16px", border: "1px solid #e2e8f0", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
                >
                  <div style={{ fontSize: "28px", marginBottom: "8px" }}>📁</div>
                  <h3 style={{ margin: "0", fontSize: "14px", color: "#334155", fontWeight: "800" }}>Categories</h3>
                </div>

                {/* Brands Box */}
                <div 
                  onClick={() => { router.push("/admin/brands"); }}
                  style={{ background: "#ffffff", padding: "20px 10px", borderRadius: "16px", border: "1px solid #e2e8f0", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
                >
                  <div style={{ fontSize: "28px", marginBottom: "8px" }}>🏷️</div>
                  <h3 style={{ margin: "0", fontSize: "14px", color: "#334155", fontWeight: "800" }}>Brands</h3>
                </div>

                {/* Menus Box */}
                <div 
                  onClick={() => { router.push("/admin/menus"); }}
                  style={{ background: "#ffffff", padding: "20px 10px", borderRadius: "16px", border: "1px solid #e2e8f0", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
                >
                  <div style={{ fontSize: "28px", marginBottom: "8px" }}>☰</div>
                  <h3 style={{ margin: "0", fontSize: "14px", color: "#334155", fontWeight: "800" }}>Menus</h3>
                </div>

                {/* Inventory Box */}
                <div 
                  onClick={() => { setActiveTab("stock"); window.scrollTo(0,0); }}
                  style={{ background: "#ffffff", padding: "20px 10px", borderRadius: "16px", border: "1px solid #e2e8f0", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
                >
                  <div style={{ fontSize: "28px", marginBottom: "8px" }}>📋</div>
                  <h3 style={{ margin: "0", fontSize: "14px", color: "#334155", fontWeight: "800" }}>Inventory</h3>
                </div>
                
                {/* Branding Box */}
                <div 
                  onClick={() => { setActiveTab("branding"); window.scrollTo(0,0); }}
                  style={{ background: "#ffffff", padding: "20px 10px", borderRadius: "16px", border: "1px solid #e2e8f0", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gridColumn: "span 2", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
                >
                  <div style={{ fontSize: "28px", marginBottom: "8px" }}>✨</div>
                  <h3 style={{ margin: "0", fontSize: "14px", color: "#334155", fontWeight: "800" }}>Branding & Settings</h3>
                </div>

              </div>
            </div>
          )}

          {/* Categories Tab */}
          {activeTab === "categories" && (
            <div id="category-section" className="jt-admin-panel">
              <CategoryManager />
            </div>
          )}

          {/* 1. Add / Edit Product Tab */}
          {activeTab === "add-product" && (
            <div id="add-product-section" className="jt-admin-panel jt-admin-panel-wide">
              <ProductForm
                editing={editingProduct}
                onCancel={() => {
                  setEditingProduct(null);
                  setActiveTab("manage-products");
                }}
                onSaved={() => {
                  setEditingProduct(null);
                  loadProducts();
                  setActiveTab("manage-products");
                }}
              />
            </div>
          )}

          {/* 2. Manage Products Tab */}
          {activeTab === "manage-products" && (
            <div id="manage-products-section" className="jt-admin-panel jt-admin-panel-wide">
            <div className="jt-manage-products-header">
              <h3>Manage Products ({products.length})</h3>
              <span className="jt-products-count-badge">
                Showing {filteredAndSortedProducts.length} of {products.length} Products
              </span>
            </div>

            {/* Advanced Controls Bar */}
            <div className="jt-manage-products-toolbar">
              {/* Search Bar */}
              <div className="jt-products-search-box">
                <input
                  type="text"
                  placeholder="🔍 Search products by name, category..."
                  value={productSearch}
                  onChange={(e) => {
                    setProductSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>

              {/* Category Filter */}
              <div className="jt-products-filter-select">
                <select
                  value={productCategoryFilter}
                  onChange={(e) => {
                    setProductCategoryFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <option value="all">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat._id} value={cat._id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Stock Status Filter */}
              <div className="jt-products-filter-select">
                <select
                  value={productStockFilter}
                  onChange={(e) => {
                    setProductStockFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <option value="all">All Stock Status</option>
                  <option value="In Stock">In Stock</option>
                  <option value="Limited Stock">Limited Stock</option>
                  <option value="Out of Stock">Out of Stock</option>
                </select>
              </div>

              {/* Sort By Dropdown */}
              <div className="jt-products-filter-select">
                <select
                  value={productSortBy}
                  onChange={(e) => setProductSortBy(e.target.value)}
                >
                  <option value="newest">Sort: Newest First</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="name">Name: A to Z</option>
                </select>
              </div>

              {/* Clear All Products Button */}
              {products.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllProducts}
                  style={{
                    background: "#dc2626",
                    color: "#ffffff",
                    border: "none",
                    padding: "8px 16px",
                    borderRadius: "10px",
                    fontWeight: "800",
                    fontSize: "13px",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  🗑️ Clear All Products ({products.length})
                </button>
              )}
            </div>

            {/* Product Cards List */}
            {filteredAndSortedProducts.length === 0 ? (
              <div className="jt-admin-empty-products">
                <p>No products match your search or filter criteria.</p>
              </div>
            ) : (
              <>
                <div className="plist">
                  {paginatedProducts.map((product) => {
                    const imageSrc = getImageUrl(product.image);

                    return (
                      <div key={product._id} className="pcard">
                        <div className="pcard-thumb">
                          {imageSrc ? (
                            <img src={imageSrc} alt={product.name} />
                          ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#94a3b8' }}>No Image</div>
                          )}
                        </div>

                        <div className="pcard-body">
                          <h3 className="pcard-title">{product.name}</h3>
                          
                          <div className="pcard-badges">
                            <span className="jt-cat-pill">{product.category?.name || "Uncategorized"}</span>
                            <span
                              className={`jt-stock-tag ${
                                product.stockStatus === "In Stock"
                                  ? "in-stock"
                                  : product.stockStatus === "Limited Stock"
                                  ? "limited-stock"
                                  : "out-stock"
                              }`}
                            >
                              {product.stockStatus}
                            </span>
                            {product.isFeatured && <span className="jt-flag-tag featured">⭐ Featured</span>}
                            {product.isTrending && <span className="jt-flag-tag trending">🔥 Trending</span>}
                            {product.isNewArrival && <span className="jt-flag-tag new-arrival">✨ New</span>}
                          </div>

                          <div>
                            <strong>{product.offerPrice} Tk</strong>
                            {product.originalPrice > product.offerPrice && (
                              <span className="jt-old-price" style={{ marginLeft: 6 }}>{product.originalPrice} Tk</span>
                            )}
                            {product.discountBadge && (
                              <span className="jt-disc-badge" style={{ marginLeft: 6 }}>{product.discountBadge}</span>
                            )}
                          </div>

                          <div className="pcard-actions">
                            <button
                              type="button"
                              onClick={() => handleToggleSlider(product)}
                              style={{
                                background: product.isSlider ? "#16a34a" : "#f1f5f9",
                                color: product.isSlider ? "#ffffff" : "#334155",
                                cursor: "pointer",
                                fontWeight: "700"
                              }}
                            >
                              {product.isSlider ? "✅ In Slider" : "🖼️ Slider"}
                            </button>

                            <button
                              type="button"
                              className="jt-edit-btn"
                              onClick={() => handleEditProduct(product)}
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              className="jt-delete-btn"
                              onClick={() => handleDeleteProduct(product._id)}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="jt-admin-pagination">
                    <button
                      type="button"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    >
                      « Previous
                    </button>

                    <div className="jt-pagination-pages">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                        (page) => (
                          <button
                            key={page}
                            type="button"
                            className={currentPage === page ? "active" : ""}
                            onClick={() => setCurrentPage(page)}
                          >
                            {page}
                          </button>
                        )
                      )}
                    </div>

                    <button
                      type="button"
                      disabled={currentPage === totalPages}
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                      }
                    >
                      Next »
                    </button>
                  </div>
                )}
                <div style={{ paddingBottom: 'calc(72px + env(safe-area-inset-bottom))' }} />
              </>
            )}
          </div>
          )}

          {/* Branding Tab */}
          {activeTab === "branding" && (
            <div id="branding-section" className="jt-admin-panel jt-admin-panel-wide">
            <h3>Homepage Hero Banner & Settings</h3>

            {/* HERO BANNER IMAGE UPLOAD CONTROL */}
            <div style={{ background: "#fff0f5", padding: "18px", borderRadius: "16px", border: "1.5px solid #fecdd3", marginBottom: "24px" }}>
              <h4 style={{ margin: "0 0 8px", color: "#e11d48", fontSize: "16px", fontWeight: "900", display: "flex", alignItems: "center", gap: "8px" }}>
                🖼️ Homepage Main Hero Banner Image (হোমপেজ মেইন ব্যানার ছবি)
              </h4>
              <p style={{ fontSize: "13px", color: "#64748b", margin: "0 0 8px" }}>
                Upload or change the primary showcase image displayed in the homepage hero banner.
              </p>

              <div style={{ background: "#ffffff", padding: "6px 12px", borderRadius: "8px", border: "1px solid #fecdd3", display: "inline-block", fontSize: "12px", color: "#e11d48", fontWeight: "700", marginBottom: "14px" }}>
                💡 <strong>Recommended Aspect Ratio:</strong> 4:3 (e.g. 800×600 px or 1200×900 px) or 16:9 (e.g. 1200×675 px)
              </div>

              {settings.heroImage && (
                <div style={{ marginBottom: "14px", width: "100%", maxWidth: "320px", borderRadius: "14px", overflow: "hidden", border: "2px solid #e11d48", boxShadow: "0 4px 14px rgba(225, 29, 72, 0.15)" }}>
                  <img src={getImageUrl(settings.heroImage)} alt="Hero Banner Preview" style={{ width: "100%", height: "auto", display: "block" }} />
                </div>
              )}

              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center", marginBottom: "14px" }}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleHeroImageUpload(e.target.files[0])}
                  style={{ fontSize: "13px" }}
                />
                <span style={{ fontSize: "12px", color: "#94a3b8", fontWeight: "700" }}>OR Image URL:</span>
                <input
                  type="text"
                  placeholder="Paste Image URL"
                  value={settings.heroImage || ""}
                  onChange={(e) => setSettings({ ...settings, heroImage: e.target.value })}
                  style={{ flex: 1, minWidth: "220px", padding: "9px 14px", borderRadius: "10px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                />
              </div>

              <div style={{ marginTop: "10px" }}>
                <label style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a", display: "block", marginBottom: "6px" }}>
                  Hero Description Text (ব্যানারের বর্ণনা):
                </label>
                <textarea
                  placeholder="Hero Description Text"
                  value={settings.heroText || ""}
                  onChange={(e) => setSettings({ ...settings, heroText: e.target.value })}
                  style={{ width: "100%", padding: "10px", borderRadius: "10px", border: "1px solid #cbd5e1", fontSize: "13px", minHeight: "70px" }}
                />
              </div>

              <button
                type="button"
                onClick={savePromoSlides}
                disabled={isSavingSettings}
                style={{
                  marginTop: "12px",
                  background: "linear-gradient(135deg, #e11d48 0%, #f97316 100%)",
                  color: "#ffffff",
                  border: "none",
                  padding: "10px 22px",
                  borderRadius: "10px",
                  fontWeight: "800",
                  fontSize: "14px",
                  cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(225, 29, 72, 0.3)"
                }}
              >
                {isSavingSettings ? "⏳ Saving..." : "💾 Save Hero Banner Settings"}
              </button>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <input
                type="text"
                placeholder="Flash Title"
                value={settings.flashTitle}
                onChange={(e) =>
                  setSettings({ ...settings, flashTitle: e.target.value })
                }
                style={{ width: "100%", marginBottom: "10px", padding: "10px" }}
              />

              <textarea
                placeholder="Flash Subtitle"
                value={settings.flashSubtitle}
                onChange={(e) =>
                  setSettings({ ...settings, flashSubtitle: e.target.value })
                }
                style={{ width: "100%", marginBottom: "10px", padding: "10px" }}
              />

              <input
                type="text"
                placeholder="Button Text"
                value={settings.flashButtonText}
                onChange={(e) =>
                  setSettings({ ...settings, flashButtonText: e.target.value })
                }
                style={{ width: "100%", marginBottom: "10px", padding: "10px" }}
              />

              <input
                type="text"
                placeholder="Button Link"
                value={settings.flashButtonLink}
                onChange={(e) =>
                  setSettings({ ...settings, flashButtonLink: e.target.value })
                }
                style={{ width: "100%", marginBottom: "10px", padding: "10px" }}
              />

              <input
                type="number"
                placeholder="Duration (hours)"
                value={settings.flashDurationHours}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    flashDurationHours: Number(e.target.value),
                  })
                }
                style={{ width: "100%", marginBottom: "10px", padding: "10px" }}
              />
            </div>

            <h4>Homepage Promo Slider Settings</h4>
            {settings.promoSlides.map((slide, index) => (
              <div
                key={index}
                style={{
                  border: "1px solid #cbd5e1",
                  borderRadius: "14px",
                  padding: "16px",
                  marginBottom: "16px",
                  background: "#f8fafc",
                  boxShadow: "0 2px 10px rgba(15, 23, 42, 0.03)"
                }}
              >
                {/* Select Product Dropdown to Auto-fill info */}
                <div style={{ marginBottom: "14px", background: "#e0e7ff", padding: "12px 14px", borderRadius: "10px", border: "1px solid #c7d2fe" }}>
                  <label style={{ fontWeight: "800", display: "block", marginBottom: "6px", color: "#3730a3", fontSize: "13px" }}>
                    🛍️ Select Product (Auto-fills Title, Subtitle, Price, Badge & Link):
                  </label>
                  <select
                    value={slide.productId || ""}
                    onChange={(e) => {
                      const selectedProdId = e.target.value;
                      const prod = products.find((p) => p._id === selectedProdId);
                      if (prod) {
                        const offerPriceVal = prod.offerPrice || prod.originalPrice;
                        const origPriceVal = prod.offerPrice && prod.originalPrice > prod.offerPrice ? prod.originalPrice : null;
                        const discountPct = origPriceVal ? Math.round((1 - offerPriceVal / origPriceVal) * 100) : null;

                        const updatedSlides = settings.promoSlides.map((s, i) =>
                          i === index
                            ? {
                                ...s,
                                productId: prod._id,
                                title: prod.name,
                                subtitle: prod.description || `Special deal on ${prod.name}`,
                                price: `${offerPriceVal} Tk`,
                                originalPrice: origPriceVal ? `${origPriceVal} Tk` : "",
                                badge: discountPct ? `🔥 ${discountPct}% OFF` : "🔥 SPECIAL OFFER",
                                buttonText: "Shop Now",
                                buttonLink: `/products/${prod._id}`,
                              }
                            : s
                        );
                        setSettings((prev) => ({ ...prev, promoSlides: updatedSlides }));
                      } else {
                        handleSlideChange(index, "productId", "");
                      }
                    }}
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #a5b4fc", fontWeight: "700", background: "white", fontSize: "13px" }}
                  >
                    <option value="">-- Choose a Product (Optional) --</option>
                    {products.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name} ({p.offerPrice || p.originalPrice} Tk)
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
                  <div>
                    <label style={{ fontSize: "12px", fontWeight: "700", color: "#475569" }}>Badge Tag:</label>
                    <input
                      type="text"
                      placeholder="e.g. 🔥 HOT DEAL - 25% OFF"
                      value={slide.badge || ""}
                      onChange={(e) =>
                        handleSlideChange(index, "badge", e.target.value)
                      }
                      style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: "12px", fontWeight: "700", color: "#475569" }}>Offer Price:</label>
                    <input
                      type="text"
                      placeholder="e.g. 1,350 Tk"
                      value={slide.price || ""}
                      onChange={(e) =>
                        handleSlideChange(index, "price", e.target.value)
                      }
                      style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
                  <div>
                    <label style={{ fontSize: "12px", fontWeight: "700", color: "#475569" }}>Original Price (Strikethrough):</label>
                    <input
                      type="text"
                      placeholder="e.g. 1,800 Tk"
                      value={slide.originalPrice || ""}
                      onChange={(e) =>
                        handleSlideChange(index, "originalPrice", e.target.value)
                      }
                      style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: "12px", fontWeight: "700", color: "#475569" }}>Button Link:</label>
                    <input
                      type="text"
                      placeholder="e.g. /products/id"
                      value={slide.buttonLink || ""}
                      onChange={(e) =>
                        handleSlideChange(index, "buttonLink", e.target.value)
                      }
                      style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                    />
                  </div>
                </div>

                <label style={{ fontSize: "12px", fontWeight: "700", color: "#475569" }}>Product Title:</label>
                <input
                  type="text"
                  placeholder="Product Title"
                  value={slide.title || ""}
                  onChange={(e) =>
                    handleSlideChange(index, "title", e.target.value)
                  }
                  style={{ width: "100%", marginBottom: "10px", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                />

                <label style={{ fontSize: "12px", fontWeight: "700", color: "#475569" }}>Subtitle / Description:</label>
                <textarea
                  placeholder="Subtitle or short description"
                  value={slide.subtitle || ""}
                  onChange={(e) =>
                    handleSlideChange(index, "subtitle", e.target.value)
                  }
                  style={{
                    width: "100%",
                    marginBottom: "10px",
                    padding: "10px",
                    minHeight: "75px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1"
                  }}
                />

                <label style={{ fontSize: "12px", fontWeight: "700", color: "#475569" }}>Button Label:</label>
                <input
                  type="text"
                  placeholder="Button Text (e.g. Shop Now)"
                  value={slide.buttonText || ""}
                  onChange={(e) =>
                    handleSlideChange(index, "buttonText", e.target.value)
                  }
                  style={{ width: "100%", marginBottom: "12px", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                />

                <div style={{ marginTop: "10px", marginBottom: "14px", background: "#ffffff", padding: "14px", borderRadius: "10px", border: "1px solid #cbd5e1" }}>
                  <label style={{ fontWeight: "700", display: "block", marginBottom: "8px", fontSize: "14px", color: "#0f172a" }}>
                    🖼️ Cover Image File Upload:
                  </label>

                  <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap", marginBottom: "10px" }}>
                    <input
                      type="file"
                      accept="image/*"
                      id={`slide-file-input-${index}`}
                      style={{ display: "none" }}
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleSlideImageUpload(index, e.target.files[0]);
                        }
                      }}
                    />
                    <label
                      htmlFor={`slide-file-input-${index}`}
                      style={{
                        background: "#0f172a",
                        color: "#ffffff",
                        padding: "10px 18px",
                        borderRadius: "10px",
                        fontWeight: "800",
                        fontSize: "13px",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                        boxShadow: "0 2px 8px rgba(15, 23, 42, 0.15)"
                      }}
                    >
                      📁 Upload Image from Computer / Phone
                    </label>

                    <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "600" }}>Or paste URL below</span>
                  </div>

                  <input
                    type="text"
                    placeholder="Image URL or Base64 String"
                    value={slide.image || ""}
                    onChange={(e) =>
                      handleSlideChange(index, "image", e.target.value)
                    }
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                  />

                  {slide.image && (
                    <div style={{ marginTop: "10px" }}>
                      <span style={{ fontSize: "12px", fontWeight: "800", color: "#047857" }}>
                        ✓ Image Preview:
                      </span>
                      <img
                        src={
                          slide.image.startsWith("http") || slide.image.startsWith("data:")
                            ? slide.image
                            : slide.image.startsWith("/uploads")
                            ? `${API_BASE_URL}${slide.image}`
                            : slide.image
                        }
                        alt="Slide Cover Preview"
                        style={{
                          width: "100%",
                          maxHeight: "160px",
                          objectFit: "cover",
                          borderRadius: "10px",
                          marginTop: "6px",
                          border: "2px solid #0f172a"
                        }}
                      />
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => removeSlide(index)}
                  style={{
                    border: "none",
                    background: "#ef4444",
                    color: "white",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontWeight: "700",
                  }}
                >
                  Delete Slide
                </button>
              </div>
            ))}

            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "10px" }}>
              <button
                type="button"
                onClick={addSlide}
                style={{
                  border: "none",
                  background: "#223a67",
                  color: "white",
                  padding: "12px 16px",
                  borderRadius: "10px",
                  fontWeight: "700",
                  cursor: "pointer",
                }}
              >
                + Add Slide
              </button>

              <button
                type="button"
                onClick={savePromoSlides}
                disabled={isSavingSettings}
                style={{
                  border: "none",
                  background: isSavingSettings ? "#94a3b8" : "#1f9d67",
                  color: "white",
                  padding: "12px 22px",
                  borderRadius: "10px",
                  fontWeight: "800",
                  cursor: isSavingSettings ? "wait" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  boxShadow: "0 4px 12px rgba(31, 157, 103, 0.2)"
                }}
              >
                {isSavingSettings ? "⏳ Saving..." : "💾 Save Settings"}
              </button>
            </div>

            {message && (
              <div
                style={{
                  marginTop: "16px",
                  padding: "12px 18px",
                  borderRadius: "10px",
                  background: message.includes("❌") ? "#fef2f2" : "#f0fdf4",
                  border: `1px solid ${message.includes("❌") ? "#fca5a5" : "#86efac"}`,
                  color: message.includes("❌") ? "#991b1b" : "#166534",
                  fontWeight: "700",
                  fontSize: "14px"
                }}
              >
                {message}
              </div>
            )}
          </div>
          )}

          {/* Orders Tab */}
          {activeTab === "orders" && (
            <div id="orders-section" className="jt-admin-panel jt-admin-panel-wide">
              <h3>Recent Orders</h3>
              <AdminOrders />
            </div>
          )}

          {/* Analytics & Profit Reports Tab */}
          {activeTab === "reports" && (
            <div className="jt-admin-panel jt-admin-panel-wide" style={{ padding: "20px" }}>
              <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "10px" }}>
                <div>
                  <h2 style={{ margin: "0 0 6px", color: "#0f172a", fontSize: "22px", fontWeight: "800" }}>📊 Sales & Profit Report</h2>
                  <p style={{ margin: 0, color: "#64748b", fontSize: "13px" }}>আপনার ব্যবসার রিয়েল-টাইম লাভ-ক্ষতির এক্সেল শিট ভিউ</p>
                </div>
                
                <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                  <select 
                    value={reportFilter} 
                    onChange={(e) => setReportFilter(e.target.value)}
                    style={{ padding: "10px 14px", borderRadius: "8px", border: "1px solid #cbd5e1", fontWeight: "800", background: "#f8fafc", cursor: "pointer", color: "#0f172a" }}
                  >
                    <option value="1">📅 Today (আজকের হিসাব)</option>
                    <option value="7">📅 Last 7 Days (উইকলি)</option>
                    <option value="30">📅 Last 30 Days (মান্থলি)</option>
                    <option value="180">📅 Last 6 Months (ষান্মাসিক)</option>
                    <option value="365">📅 Last 1 Year (বাৎসরিক)</option>
                    <option value="all">📅 All Time (শুরু থেকে সব)</option>
                  </select>

                  <button
                    onClick={() => window.print()}
                    style={{ background: "#0f172a", color: "#fff", border: "none", padding: "10px 18px", borderRadius: "8px", fontWeight: "800", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
                  >
                    🖨️ Download PDF / Print
                  </button>
                </div>
              </div>

              {/* Summary Cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "14px", marginBottom: "24px" }}>
                <div style={{ background: "#f0fdf4", border: "1px solid #86efac", padding: "16px", borderRadius: "10px" }}>
                  <span style={{ fontSize: "13px", fontWeight: "700", color: "#166534" }}>💵 Total Revenue (বিক্রি)</span>
                  <h2 style={{ margin: "6px 0 0", color: "#15803d", fontSize: "22px" }}>{totalRevenue} Tk</h2>
                </div>
                <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", padding: "16px", borderRadius: "10px" }}>
                  <span style={{ fontSize: "13px", fontWeight: "700", color: "#991b1b" }}>📦 Total Cost (কেনা দাম)</span>
                  <h2 style={{ margin: "6px 0 0", color: "#b91c1c", fontSize: "22px" }}>{totalCost} Tk</h2>
                </div>
                <div style={{ background: "#eff6ff", border: "1px solid #93c5fd", padding: "16px", borderRadius: "10px" }}>
                  <span style={{ fontSize: "13px", fontWeight: "800", color: "#1e40af" }}>✨ Net Profit (নিট লাভ)</span>
                  <h2 style={{ margin: "6px 0 0", color: "#2563eb", fontSize: "22px" }}>{totalProfit} Tk</h2>
                </div>
                <div style={{ background: "#fdf4ff", border: "1px solid #f9a8d4", padding: "16px", borderRadius: "10px" }}>
                  <span style={{ fontSize: "13px", fontWeight: "700", color: "#86198f" }}>📈 Total Profit % (মার্জিন)</span>
                  <h2 style={{ margin: "6px 0 0", color: "#a21caf", fontSize: "22px" }}>{overallProfitPct}%</h2>
                </div>
              </div>

              {/* Excel-like Table View */}
              <div style={{ overflowX: "auto", background: "#fff", border: "1px solid #cbd5e1", borderRadius: "8px" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", textAlign: "left", minWidth: "800px" }}>
                  <thead style={{ background: "#f1f5f9" }}>
                    <tr>
                      <th style={{ padding: "12px 10px", border: "1px solid #cbd5e1", color: "#334155" }}>Date</th>
                      <th style={{ padding: "12px 10px", border: "1px solid #cbd5e1", color: "#334155" }}>Order ID</th>
                      <th style={{ padding: "12px 10px", border: "1px solid #cbd5e1", color: "#334155" }}>Product Name</th>
                      <th style={{ padding: "12px 10px", border: "1px solid #cbd5e1", color: "#334155", textAlign: "right" }}>Buy Price</th>
                      <th style={{ padding: "12px 10px", border: "1px solid #cbd5e1", color: "#334155", textAlign: "right" }}>Sell Price</th>
                      <th style={{ padding: "12px 10px", border: "1px solid #cbd5e1", color: "#334155", textAlign: "center" }}>Qty</th>
                      <th style={{ padding: "12px 10px", border: "1px solid #cbd5e1", color: "#334155", textAlign: "center" }}>Disc. %</th>
                      <th style={{ padding: "12px 10px", border: "1px solid #cbd5e1", color: "#334155", textAlign: "center" }}>Profit %</th>
                      <th style={{ padding: "12px 10px", border: "1px solid #cbd5e1", color: "#334155", textAlign: "right" }}>Net Profit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {soldItems.length === 0 ? (
                      <tr><td colSpan="9" style={{ padding: "30px", textAlign: "center", color: "#64748b", fontWeight: "700" }}>No sales data found for the selected period.</td></tr>
                    ) : (
                      soldItems.map((item, idx) => (
                        <tr key={idx} style={{ background: idx % 2 === 0 ? "#ffffff" : "#f8fafc" }}>
                          <td style={{ padding: "10px", border: "1px solid #cbd5e1", color: "#475569" }}>{item.date}</td>
                          <td style={{ padding: "10px", border: "1px solid #cbd5e1", color: "#2563eb", fontWeight: "700" }}>{item.orderId}</td>
                          <td style={{ padding: "10px", border: "1px solid #cbd5e1", fontWeight: "700", color: "#0f172a" }}>{item.name}</td>
                          <td style={{ padding: "10px", border: "1px solid #cbd5e1", textAlign: "right", color: "#64748b" }}>{item.buyPrice} Tk</td>
                          <td style={{ padding: "10px", border: "1px solid #cbd5e1", textAlign: "right", color: "#0f172a", fontWeight: "800" }}>{item.sellPrice} Tk</td>
                          <td style={{ padding: "10px", border: "1px solid #cbd5e1", textAlign: "center", fontWeight: "700" }}>{item.qty}</td>
                          <td style={{ padding: "10px", border: "1px solid #cbd5e1", textAlign: "center", color: "#ea580c", fontWeight: "700" }}>{item.discountPct}%</td>
                          <td style={{ padding: "10px", border: "1px solid #cbd5e1", textAlign: "center", color: "#16a34a", fontWeight: "800" }}>{item.profitPct}%</td>
                          <td style={{ padding: "10px", border: "1px solid #cbd5e1", textAlign: "right", color: "#2563eb", fontWeight: "900" }}>{item.rowProfit} Tk</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Inventory & Stock Management Tab */}
          {activeTab === "stock" && (
            <div className="jt-admin-panel jt-admin-panel-wide" style={{ padding: "20px" }}>
              <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "10px" }}>
                <div>
                  <h2 style={{ margin: "0 0 6px", color: "#0f172a", fontSize: "22px", fontWeight: "800" }}>📋 Inventory & Stock Report</h2>
                  <p style={{ margin: 0, color: "#64748b", fontSize: "13px" }}>আপনার গোডাউনের রিয়েল-টাইম স্টক এবং ভ্যালুয়েশন রিপোর্ট</p>
                </div>
                
                <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                  {/* Category Filter */}
                  <select 
                    value={stockCategoryFilter} 
                    onChange={(e) => setStockCategoryFilter(e.target.value)}
                    style={{ padding: "10px 14px", borderRadius: "8px", border: "1px solid #cbd5e1", fontWeight: "800", background: "#f8fafc", cursor: "pointer", color: "#0f172a" }}
                  >
                    <option value="all">📁 All Categories (সব ক্যাটাগরি)</option>
                    {categories.map((cat) => (
                      <option key={cat._id} value={cat._id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={() => window.print()}
                    style={{ background: "#0f172a", color: "#fff", border: "none", padding: "10px 18px", borderRadius: "8px", fontWeight: "800", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
                  >
                    🖨️ Download PDF / Print
                  </button>
                </div>
              </div>

              {/* Stock Summary Cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "14px", marginBottom: "24px" }}>
                <div style={{ background: "#f8fafc", border: "1px solid #cbd5e1", padding: "16px", borderRadius: "10px" }}>
                  <span style={{ fontSize: "13px", fontWeight: "700", color: "#475569" }}>📦 Total Products (ধরণ)</span>
                  <h2 style={{ margin: "6px 0 0", color: "#0f172a", fontSize: "22px" }}>{filteredStock.length} Items</h2>
                </div>
                <div style={{ background: "#eff6ff", border: "1px solid #93c5fd", padding: "16px", borderRadius: "10px" }}>
                  <span style={{ fontSize: "13px", fontWeight: "700", color: "#1e40af" }}>🔢 Total Units (মোট পিস)</span>
                  <h2 style={{ margin: "6px 0 0", color: "#2563eb", fontSize: "22px" }}>{totalStockItems} Pcs</h2>
                </div>
                <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", padding: "16px", borderRadius: "10px" }}>
                  <span style={{ fontSize: "13px", fontWeight: "800", color: "#991b1b" }}>⚠️ Low / Out of Stock</span>
                  <h2 style={{ margin: "6px 0 0", color: "#dc2626", fontSize: "22px" }}>{lowStockCount + outOfStockCount} Items</h2>
                </div>
                <div style={{ background: "#f0fdf4", border: "1px solid #86efac", padding: "16px", borderRadius: "10px" }}>
                  <span style={{ fontSize: "13px", fontWeight: "700", color: "#166534" }}>💰 Total Asset Value</span>
                  <h2 style={{ margin: "6px 0 0", color: "#15803d", fontSize: "22px" }}>{totalStockValue} Tk</h2>
                </div>
              </div>

              {/* Excel-like Stock Table */}
              <div style={{ overflowX: "auto", background: "#fff", border: "1px solid #cbd5e1", borderRadius: "8px" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", textAlign: "left", minWidth: "800px" }}>
                  <thead style={{ background: "#f1f5f9" }}>
                    <tr>
                      <th style={{ padding: "12px 10px", border: "1px solid #cbd5e1", color: "#334155" }}>Product Name</th>
                      <th style={{ padding: "12px 10px", border: "1px solid #cbd5e1", color: "#334155" }}>Category</th>
                      <th style={{ padding: "12px 10px", border: "1px solid #cbd5e1", color: "#334155", textAlign: "right" }}>Buy Price</th>
                      <th style={{ padding: "12px 10px", border: "1px solid #cbd5e1", color: "#334155", textAlign: "right" }}>Sell Price</th>
                      <th style={{ padding: "12px 10px", border: "1px solid #cbd5e1", color: "#334155", textAlign: "center" }}>In Stock (Qty)</th>
                      <th style={{ padding: "12px 10px", border: "1px solid #cbd5e1", color: "#334155", textAlign: "center" }}>Status</th>
                      <th style={{ padding: "12px 10px", border: "1px solid #cbd5e1", color: "#334155", textAlign: "right" }}>Total Asset Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStock.length === 0 ? (
                      <tr><td colSpan="7" style={{ padding: "30px", textAlign: "center", color: "#64748b", fontWeight: "700" }}>No products found in this category.</td></tr>
                    ) : (
                      filteredStock.map((item, idx) => {
                        const qty = Number(item.stockQuantity || 0);
                        const buyPrice = Number(item.purchasePrice || 0);
                        const assetValue = qty * buyPrice;
                        
                        let statusColor = "#16a34a"; // Green
                        let statusText = "In Stock";
                        if (qty === 0) {
                          statusColor = "#dc2626"; // Red
                          statusText = "Out of Stock";
                        } else if (qty <= 5) {
                          statusColor = "#ea580c"; // Orange
                          statusText = "Low Stock";
                        }

                        return (
                          <tr key={item._id} style={{ background: idx % 2 === 0 ? "#ffffff" : "#f8fafc" }}>
                            <td style={{ padding: "10px", border: "1px solid #cbd5e1", fontWeight: "700", color: "#0f172a" }}>{item.name}</td>
                            <td style={{ padding: "10px", border: "1px solid #cbd5e1", color: "#475569" }}>
                              {categories.find(c => c._id === (item.category?._id || item.category))?.name || "Unknown"}
                            </td>
                            <td style={{ padding: "10px", border: "1px solid #cbd5e1", textAlign: "right", color: "#64748b" }}>{buyPrice} Tk</td>
                            <td style={{ padding: "10px", border: "1px solid #cbd5e1", textAlign: "right", color: "#0f172a", fontWeight: "800" }}>{item.offerPrice || item.originalPrice} Tk</td>
                            <td style={{ padding: "10px", border: "1px solid #cbd5e1", textAlign: "center", fontWeight: "900", color: qty === 0 ? "#dc2626" : "#2563eb", fontSize: "15px" }}>
                              {qty}
                            </td>
                            <td style={{ padding: "10px", border: "1px solid #cbd5e1", textAlign: "center", fontWeight: "800", color: statusColor }}>
                              {statusText}
                            </td>
                            <td style={{ padding: "10px", border: "1px solid #cbd5e1", textAlign: "right", color: "#2563eb", fontWeight: "900" }}>{assetValue} Tk</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Floating Scroll To Top Button */}
      <button
        type="button"
        className="jt-admin-floating-top-btn"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        title="Scroll to Top"
      >
        ↑ Top
      </button>
      {/* CSS For Seamless PDF Print Alignment */}
      <style jsx global>{`
        @media print {
          /* প্রিন্ট করার সময় ফালতু জিনিস হাইড করা */
          .jt-admin-top, 
          .jt-admin-sidebar, 
          .jt-admin-menu-toggle-btn,
          .jt-admin-floating-top-btn,
          footer,
          .mobile-bottom-nav,
          nav,
          button {
            display: none !important;
          }
          
          /* মার্জিন ও প্যাডিং রিসেট করে পেজের শুরুতে আনা */
          body {
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          
          .jt-admin-main {
            margin: 0 !important;
            padding: 0 !important;
          }

          .jt-admin-panel {
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 20px 0 !important;
            page-break-inside: avoid;
          }
        }
      `}</style>
    </main>
  );
}