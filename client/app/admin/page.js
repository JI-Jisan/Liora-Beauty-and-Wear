"use client";

import { useEffect, useState, useMemo } from "react";
import AdminOrders from "@/components/AdminOrders";
import { useRouter } from "next/navigation";
import { API_BASE_URL, getAuthHeaders, getImageUrl } from "@/lib/api";

export default function AdminPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState(null);

  // Slide-out Drawer State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Manage Products Advanced Controls State
  const [productSearch, setProductSearch] = useState("");
  const [productCategoryFilter, setProductCategoryFilter] = useState("all");
  const [productStockFilter, setProductStockFilter] = useState("all");
  const [productSortBy, setProductSortBy] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    type: "main",
    parentCategory: "",
  });



  const [settings, setSettings] = useState({
    brandName: "",
    brandSubtitle: "",
    heroTitle: "",
    heroText: "",
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

  const [formData, setFormData] = useState({
    name: "",
    category: "",
    originalPrice: "",
    offerPrice: "",
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
      const res = await fetch(`${API_BASE_URL}/api/products`);
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
    }
  }, [router]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };



  const handleCategoryChange = (e) => {
    const { name, value } = e.target;
    setCategoryForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const resetForm = () => {
    setFormData({
      name: "",
      category: "",
      originalPrice: "",
      offerPrice: "",
      discountBadge: "",
      description: "",
      stockStatus: "In Stock",
      image: "",
      isFeatured: false,
      isTrending: false,
      isNewArrival: false,
    });
    setEditingId(null);
  };

  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE_URL}/api/categories`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(categoryForm),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.message || "Category add failed");
      }

      setMessage("Category added successfully");
      setCategoryForm({
        name: "",
        type: "main",
        parentCategory: "",
      });

      loadCategories();
    } catch (error) {
      setMessage(error.message);
    }
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

  const handleSlideImageUpload = (index, file) => {
    if (!file) return;

    setMessage("⏳ Resizing & optimizing image...");

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 1400;
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        // Compress to optimized JPEG string
        const compressedBase64 = canvas.toDataURL("image/jpeg", 0.82);
        handleSlideChange(index, "image", compressedBase64);
        setMessage("✅ Image optimized & attached! Now click '💾 Save Settings' below.");
      };
      img.onerror = () => {
        setMessage("❌ Failed to process image file.");
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
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

  const handleProductImageUpload = (file, fieldName = "image") => {
    if (!file) return;
    const label = fieldName === "image" ? "Image 1" : fieldName === "image2" ? "Image 2" : "Image 3";
    setMessage(`⏳ Reading ${label}...`);

    const reader = new FileReader();

    reader.onload = (e) => {
      const rawBase64 = e.target.result;

      // Immediately set raw base64 so preview works 100% reliably
      setFormData((prev) => ({ ...prev, [fieldName]: rawBase64 }));

      // Process canvas optimization in background
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 900;
          let width = img.width;
          let height = img.height;

          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);

          const compressedBase64 = canvas.toDataURL("image/jpeg", 0.85);
          if (compressedBase64 && compressedBase64.length > 100) {
            setFormData((prev) => ({ ...prev, [fieldName]: compressedBase64 }));
          }
          setMessage(`✅ ${label} attached & optimized!`);
        } catch {
          setMessage(`✅ ${label} attached!`);
        }
      };
      img.onerror = () => {
        setMessage(`✅ ${label} attached!`);
      };
      img.src = rawBase64;
    };

    reader.onerror = () => {
      setMessage(`❌ Failed to read ${label} file.`);
    };

    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(editingId ? "⏳ Updating product..." : "⏳ Saving product...");

    try {
      const finalProduct = {
        ...formData,
        originalPrice: Number(formData.originalPrice),
        offerPrice: Number(formData.offerPrice),
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

  const handleDeleteCategory = async (id) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this category?");
    if (!confirmDelete) return;

    setCategories((prev) => prev.filter((c) => c._id !== id));

    try {
      const res = await fetch(`${API_BASE_URL}/api/categories/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (!res.ok) throw new Error("Delete failed");
      setMessage("✓ Category deleted successfully");
      loadCategories();
    } catch (error) {
      setMessage(`❌ Category Delete Error: ${error.message}`);
      loadCategories();
    }
  };

  const handleClearAllCategories = async () => {
    const confirmClear = window.confirm("Are you sure you want to delete ALL categories to start fresh?");
    if (!confirmClear) return;

    setCategories([]);

    try {
      const res = await fetch(`${API_BASE_URL}/api/categories/clear-all`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (!res.ok) throw new Error("Clear failed");
      setMessage("✓ All categories deleted successfully");
      loadCategories();
    } catch (error) {
      setMessage(`❌ Clear Categories Error: ${error.message}`);
      loadCategories();
    }
  };

  const handleEditProduct = (product) => {
    setEditingId(product._id);
    setFormData({
      name: product.name || "",
      category: product.category?._id || "",
      originalPrice: product.originalPrice || "",
      offerPrice: product.offerPrice || "",
      discountBadge: product.discountBadge || "",
      description: product.description || "",
      stockStatus: product.stockStatus || "In Stock",
      image: product.image || (product.images && product.images[0]) || "",
      image2: product.image2 || (product.images && product.images[1]) || "",
      image3: product.image3 || (product.images && product.images[2]) || "",
      rating: product.rating || "",
      reviewCount: product.reviewCount || "",
      isFeatured: product.isFeatured || false,
      isTrending: product.isTrending || false,
      isNewArrival: product.isNewArrival || false,
    });
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
            onClick={() => {
              document.getElementById("top")?.scrollIntoView({ behavior: "smooth" });
              setIsSidebarOpen(false);
            }}
          >
            📊 Dashboard
          </li>
          <li
            onClick={() => {
              document.getElementById("category-section")?.scrollIntoView({ behavior: "smooth" });
              setIsSidebarOpen(false);
            }}
          >
            📁 Categories
          </li>
          <li
            onClick={() => {
              document.getElementById("product-section")?.scrollIntoView({ behavior: "smooth" });
              setIsSidebarOpen(false);
            }}
          >
            🛍️ Products
          </li>
          <li
            onClick={() => {
              document.getElementById("orders-section")?.scrollIntoView({ behavior: "smooth" });
              setIsSidebarOpen(false);
            }}
          >
            📦 Orders
          </li>
          <li
            onClick={() => {
              document.getElementById("branding-section")?.scrollIntoView({ behavior: "smooth" });
              setIsSidebarOpen(false);
            }}
          >
            ✨ Branding & Flash Sale
          </li>
        </ul>
      </aside>

      <section className="jt-admin-main">
        <div className="jt-admin-top">
          <div className="jt-admin-top-left">
            <button
              type="button"
              className="jt-admin-menu-toggle-btn"
              onClick={() => setIsSidebarOpen(true)}
              title="Open Navigation Menu"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
              <span>Menu</span>
            </button>

            <div>
              <h1>Admin Dashboard</h1>
              <p>Manage products, categories and view orders</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            style={{
              border: "none",
              background: "#ef4444",
              color: "white",
              padding: "10px 18px",
              borderRadius: "10px",
              fontWeight: "700",
              cursor: "pointer",
            }}
          >
            Logout
          </button>
        </div>

        <div className="jt-admin-grid">
          <div id="category-section" className="jt-admin-panel">
            <h3>Add Category</h3>
            <form className="jt-admin-panel-form" onSubmit={handleCategorySubmit}>
              <input
                type="text"
                name="name"
                placeholder="Category name (e.g. Face Care)"
                value={categoryForm.name}
                onChange={handleCategoryChange}
                required
              />

              <div style={{ marginBottom: "6px" }}>
                <label style={{ fontSize: "12px", fontWeight: "700", color: "#64748b", display: "block", marginBottom: "4px" }}>
                  📁 Parent Category (কোন ক্যাটাগরির ভেতরে থাকবে)
                </label>
                <select
                  name="parentCategory"
                  value={categoryForm.parentCategory || ""}
                  onChange={handleCategoryChange}
                  style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                >
                  <option value="">📁 None (Main Parent Category)</option>
                  {categories.map((cat) => (
                    <option key={cat._id} value={cat._id}>
                      📁 Inside: {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <select
                name="type"
                value={categoryForm.type}
                onChange={handleCategoryChange}
              >
                <option value="main">Main Header Navigation</option>
                <option value="more">More Dropdown Menu</option>
              </select>

              <button type="submit">Add Category</button>
            </form>

            {/* Existing Categories Tree List */}
            <div style={{ marginTop: "20px", borderTop: "1px solid #e2e8f0", paddingTop: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                <h4 style={{ margin: 0, fontSize: "13px", fontWeight: "800", color: "#0f172a" }}>
                  📁 Existing Categories List ({categories.length})
                </h4>

                {categories.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAllCategories}
                    style={{
                      background: "#dc2626",
                      color: "#ffffff",
                      border: "none",
                      padding: "4px 10px",
                      borderRadius: "6px",
                      fontSize: "11px",
                      fontWeight: "800",
                      cursor: "pointer",
                    }}
                  >
                    🗑️ Clear All
                  </button>
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "280px", overflowY: "auto" }}>
                {categories.length === 0 ? (
                  <span style={{ fontSize: "12px", color: "#94a3b8" }}>No categories created yet.</span>
                ) : (
                  categories.map((c) => {
                    const parentName = c.parentCategory?.name;
                    return (
                      <div key={c._id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                        <span style={{ fontSize: "13px", fontWeight: "700", color: "#334155" }}>
                          {parentName ? `📁 ${parentName} ➔ ${c.name}` : `📁 ${c.name}`}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(c._id)}
                          style={{
                            background: "#fee2e2",
                            color: "#dc2626",
                            border: "1px solid #fca5a5",
                            padding: "3px 8px",
                            borderRadius: "6px",
                            fontSize: "11px",
                            fontWeight: "800",
                            cursor: "pointer",
                          }}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div id="product-section" className="jt-admin-panel jt-admin-panel-wide">
            <h3>{editingId ? "Edit Product" : "Add Product"}</h3>

            <form className="jt-admin-panel-form jt-admin-product-form" onSubmit={handleSubmit}>
              <input
                type="text"
                name="name"
                placeholder="Product name"
                value={formData.name}
                onChange={handleChange}
                required
              />

              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
              >
                <option value="">Select category</option>
                {categories.map((cat) => {
                  const parentName = cat.parentCategory?.name;
                  const label = parentName ? `${parentName} ➔ ${cat.name}` : cat.name;
                  return (
                    <option key={cat._id} value={cat._id}>
                      {label}
                    </option>
                  );
                })}
              </select>

              <input
                type="number"
                name="originalPrice"
                placeholder="Original price"
                value={formData.originalPrice}
                onChange={handleChange}
                required
              />

              <input
                type="number"
                name="offerPrice"
                placeholder="Offer price"
                value={formData.offerPrice}
                onChange={handleChange}
                required
              />

              <input
                type="text"
                name="discountBadge"
                placeholder="Discount badge (example: 30% OFF)"
                value={formData.discountBadge}
                onChange={handleChange}
              />

              <div style={{ margin: "10px 0 4px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                  <label style={{ fontSize: "12px", fontWeight: "800", color: "#334155" }}>
                    📝 Product Description (পণ্যের বিবরণ)
                  </label>

                  <div style={{ display: "flex", gap: "6px" }}>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData((prev) => ({
                          ...prev,
                          description: prev.description ? `${prev.description} **Bold Text**` : "**Bold Text**",
                        }));
                      }}
                      style={{
                        padding: "3px 10px", background: "#ffffff", border: "1px solid #cbd5e1",
                        borderRadius: "6px", fontSize: "11px", fontWeight: "800", cursor: "pointer",
                        color: "#0f172a", boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                      }}
                      title="Add bold text"
                    >
                      <b>B</b> Bold
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setFormData((prev) => ({
                          ...prev,
                          description: prev.description ? `${prev.description}\n• Bullet Point 1\n• Bullet Point 2` : "• Bullet Point 1\n• Bullet Point 2",
                        }));
                      }}
                      style={{
                        padding: "3px 10px", background: "#ffffff", border: "1px solid #cbd5e1",
                        borderRadius: "6px", fontSize: "11px", fontWeight: "800", cursor: "pointer",
                        color: "#0f172a", boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                      }}
                      title="Add bullet points"
                    >
                      • List
                    </button>
                  </div>
                </div>

                <textarea
                  name="description"
                  placeholder="Product description... (Bold করতে **bold text** অথবা <b>bold text</b> লিখুন)"
                  value={formData.description}
                  onChange={handleChange}
                  rows={5}
                  style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                />
                <span style={{ fontSize: "11px", color: "#64748b", display: "block", marginTop: "4px" }}>
                  💡 টিপস: <b>B Bold</b> বাটনে চাপ দিলে বা টেক্সটের চারপাশে <b>**bold**</b> অথবা <b>&lt;b&gt;bold&lt;/b&gt;</b> লিখলে ওয়েবসাইটে লেখাটি <b>বোল্ড</b> হয়ে দেখাবে!
                </span>
              </div>

              <select
                name="stockStatus"
                value={formData.stockStatus}
                onChange={handleChange}
              >
                <option value="In Stock">In Stock</option>
                <option value="Limited Stock">Limited Stock</option>
                <option value="Out of Stock">Out of Stock</option>
              </select>

              {/* Image 1 */}
              <div style={{ background: "#ffffff", padding: "14px", borderRadius: "10px", border: "1px solid #cbd5e1", margin: "10px 0" }}>
                <label style={{ fontWeight: "800", display: "block", marginBottom: "8px", fontSize: "14px", color: "#0f172a" }}>
                  📷 Product Main Photo (Image 1):
                </label>
                <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap", marginBottom: "8px" }}>
                  <input
                    type="file"
                    accept="image/*"
                    id="product-file-input-1"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleProductImageUpload(e.target.files[0], "image");
                      }
                    }}
                  />
                  <label
                    htmlFor="product-file-input-1"
                    style={{
                      background: "#0f172a",
                      color: "#ffffff",
                      padding: "8px 16px",
                      borderRadius: "8px",
                      fontWeight: "800",
                      fontSize: "12px",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      boxShadow: "0 2px 6px rgba(15,23,42,0.15)"
                    }}
                  >
                    📁 Upload Main Photo from Phone / Computer
                  </label>
                </div>

                <input
                  type="text"
                  name="image"
                  placeholder="Or paste Main Image URL / Base64"
                  value={formData.image || ""}
                  onChange={handleChange}
                  style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px" }}
                />

                {formData.image && (
                  <div style={{ marginTop: "10px", display: "flex", alignItems: "center", gap: "10px" }}>
                    <img
                      src={getImageUrl(formData.image)}
                      alt="Product Preview 1"
                      style={{ width: "80px", height: "80px", objectFit: "cover", borderRadius: "8px", border: "2px solid #0f172a" }}
                    />
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, image: "" }))}
                      style={{ background: "#fee2e2", color: "#dc2626", border: "none", padding: "4px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: "800", cursor: "pointer" }}
                    >
                      🗑️ Clear Main Image
                    </button>
                  </div>
                )}
              </div>

              {/* Image 2 */}
              <div style={{ background: "#ffffff", padding: "14px", borderRadius: "10px", border: "1px solid #cbd5e1", margin: "6px 0" }}>
                <label style={{ fontWeight: "800", display: "block", marginBottom: "8px", fontSize: "14px", color: "#0f172a" }}>
                  📷 Product Photo 2 (Optional - Slider / Carousel):
                </label>
                <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap", marginBottom: "8px" }}>
                  <input
                    type="file"
                    accept="image/*"
                    id="product-file-input-2"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleProductImageUpload(e.target.files[0], "image2");
                      }
                    }}
                  />
                  <label
                    htmlFor="product-file-input-2"
                    style={{ background: "#475569", color: "#fff", padding: "8px 14px", borderRadius: "8px", fontWeight: "700", fontSize: "12px", cursor: "pointer" }}
                  >
                    📁 Upload Image 2
                  </label>
                  <input
                    type="text"
                    name="image2"
                    placeholder="Or paste Image 2 URL"
                    value={formData.image2 || ""}
                    onChange={handleChange}
                    style={{ flex: 1, padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px" }}
                  />
                </div>
                {formData.image2 && (
                  <div style={{ marginTop: "6px", display: "flex", alignItems: "center", gap: "10px" }}>
                    <img
                      src={getImageUrl(formData.image2)}
                      alt="Image 2 Preview"
                      style={{ width: "70px", height: "70px", objectFit: "cover", borderRadius: "8px", border: "2px solid #475569" }}
                    />
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, image2: "" }))}
                      style={{ background: "#fee2e2", color: "#dc2626", border: "none", padding: "4px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: "800", cursor: "pointer" }}
                    >
                      🗑️ Clear Image 2
                    </button>
                  </div>
                )}
              </div>

              {/* Image 3 */}
              <div style={{ background: "#ffffff", padding: "14px", borderRadius: "10px", border: "1px solid #cbd5e1", margin: "6px 0" }}>
                <label style={{ fontWeight: "800", display: "block", marginBottom: "8px", fontSize: "14px", color: "#0f172a" }}>
                  📷 Product Photo 3 (Optional - Slider / Carousel):
                </label>
                <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap", marginBottom: "8px" }}>
                  <input
                    type="file"
                    accept="image/*"
                    id="product-file-input-3"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleProductImageUpload(e.target.files[0], "image3");
                      }
                    }}
                  />
                  <label
                    htmlFor="product-file-input-3"
                    style={{ background: "#7c3aed", color: "#fff", padding: "8px 14px", borderRadius: "8px", fontWeight: "700", fontSize: "12px", cursor: "pointer" }}
                  >
                    📁 Upload Image 3
                  </label>
                  <input
                    type="text"
                    name="image3"
                    placeholder="Or paste Image 3 URL"
                    value={formData.image3 || ""}
                    onChange={handleChange}
                    style={{ flex: 1, padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px" }}
                  />
                </div>
                {formData.image3 && (
                  <div style={{ marginTop: "6px", display: "flex", alignItems: "center", gap: "10px" }}>
                    <img
                      src={getImageUrl(formData.image3)}
                      alt="Image 3 Preview"
                      style={{ width: "70px", height: "70px", objectFit: "cover", borderRadius: "8px", border: "2px solid #7c3aed" }}
                    />
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, image3: "" }))}
                      style={{ background: "#fee2e2", color: "#dc2626", border: "none", padding: "4px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: "800", cursor: "pointer" }}
                    >
                      🗑️ Clear Image 3
                    </button>
                  </div>
                )}
              </div>

              {/* Rating & Reviews */}
              <div style={{ display: "flex", gap: "10px" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: "12px", fontWeight: "700", color: "#64748b", display: "block", marginBottom: "4px" }}>⭐ Rating (0-5)</label>
                  <input type="number" name="rating" min="0" max="5" step="0.1" placeholder="e.g. 4.5"
                    value={formData.rating || ""} onChange={handleChange}
                    style={{ width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: "12px", fontWeight: "700", color: "#64748b", display: "block", marginBottom: "4px" }}>💬 Review Count</label>
                  <input type="number" name="reviewCount" min="0" placeholder="e.g. 128"
                    value={formData.reviewCount || ""} onChange={handleChange}
                    style={{ width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px" }} />
                </div>
              </div>

              <label>
                <input
                  type="checkbox"
                  name="isFeatured"
                  checked={formData.isFeatured}
                  onChange={handleChange}
                />
                Featured
              </label>

              <label>
                <input
                  type="checkbox"
                  name="isTrending"
                  checked={formData.isTrending}
                  onChange={handleChange}
                />
                Trending
              </label>

              <label>
                <input
                  type="checkbox"
                  name="isNewArrival"
                  checked={formData.isNewArrival}
                  onChange={handleChange}
                />
                New Arrival
              </label>

              <button type="submit">
                {editingId ? "Update Product" : "Add Product"}
              </button>

              {editingId && (
                <button
                  type="button"
                  className="jt-cancel-btn"
                  onClick={resetForm}
                >
                  Cancel Edit
                </button>
              )}
            </form>

            {message && <p style={{ marginTop: "14px", fontWeight: "700" }}>{message}</p>}
          </div>

          <div id="product-section" className="jt-admin-panel jt-admin-panel-wide">
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
                <div className="jt-manage-products-list">
                  {paginatedProducts.map((product) => {
                    const imageSrc = getImageUrl(product.image);

                    return (
                      <div key={product._id} className="jt-manage-product-card">
                        <div className="jt-manage-product-left">
                          {imageSrc ? (
                            <img
                              src={imageSrc}
                              alt={product.name}
                              className="jt-manage-product-image"
                            />
                          ) : (
                            <div className="jt-manage-product-image jt-manage-product-placeholder">
                              No Image
                            </div>
                          )}

                          <div className="jt-manage-product-details">
                            <div className="jt-manage-product-title-row">
                              <h4>{product.name}</h4>
                              <span className="jt-cat-pill">
                                {product.category?.name || "Uncategorized"}
                              </span>
                            </div>

                            <p className="jt-manage-product-price">
                              <strong>{product.offerPrice} Tk</strong>
                              {product.originalPrice > product.offerPrice && (
                                <span className="jt-old-price">
                                  {product.originalPrice} Tk
                                </span>
                              )}
                              {product.discountBadge && (
                                <span className="jt-disc-badge">
                                  {product.discountBadge}
                                </span>
                              )}
                            </p>

                            <div className="jt-manage-product-flags">
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

                              {product.isFeatured && (
                                <span className="jt-flag-tag featured">⭐ Featured</span>
                              )}
                              {product.isTrending && (
                                <span className="jt-flag-tag trending">🔥 Trending</span>
                              )}
                              {product.isNewArrival && (
                                <span className="jt-flag-tag new-arrival">✨ New</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="jt-manage-product-right">
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
              </>
            )}
          </div>

          <div id="branding-section" className="jt-admin-panel jt-admin-panel-wide">
            <h3>Flash Sale & Promo Settings</h3>

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

          <div id="orders-section" className="jt-admin-panel jt-admin-panel-wide">
            <h3>Recent Orders</h3>
            <AdminOrders />
          </div>
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
    </main>
  );
}