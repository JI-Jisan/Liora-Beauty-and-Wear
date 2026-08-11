"use client";

import { useEffect, useState } from "react";
import AdminOrders from "@/components/AdminOrders";
import { useRouter } from "next/navigation";
import { API_BASE_URL, getAuthHeaders } from "@/lib/api";

export default function AdminPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [imageFile, setImageFile] = useState(null);
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    type: "main",
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
        promoSlides: data.promoSlides || [],
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

  const handleImageChange = (e) => {
    setImageFile(e.target.files[0]);
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
    setImageFile(null);
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
    try {
      const res = await fetch(`${API_BASE_URL}/api/settings`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(settings),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.message || "Failed to save promo slides");
      }

      setMessage("Settings updated successfully");
      loadSettings();
    } catch (error) {
      setMessage(error.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(editingId ? "Updating..." : "Uploading...");

    try {
      let uploadedImageUrl = formData.image || "";

      if (imageFile) {
        const imageData = new FormData();
        imageData.append("image", imageFile);

        const uploadRes = await fetch(`${API_BASE_URL}/api/products/upload`, {
          method: "POST",
          headers: getAuthHeaders(true),
          body: imageData,
        });

        const uploadResult = await uploadRes.json();

        if (!uploadRes.ok) {
          throw new Error(uploadResult.message || "Image upload failed");
        }

        uploadedImageUrl = uploadResult.imageUrl;
      }

      const finalProduct = {
        ...formData,
        originalPrice: Number(formData.originalPrice),
        offerPrice: Number(formData.offerPrice),
        image: uploadedImageUrl,
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

      setMessage(editingId ? "Product updated successfully" : "Product added successfully");
      resetForm();
      loadProducts();
    } catch (error) {
      setMessage(error.message);
    }
  };

  const handleDeleteProduct = async (id) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this product?");
    if (!confirmDelete) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/products/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.message || "Delete failed");
      }

      setMessage("Product deleted successfully");
      loadProducts();
    } catch (error) {
      setMessage(error.message);
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
      image: product.image || "",
      isFeatured: product.isFeatured || false,
      isTrending: product.isTrending || false,
      isNewArrival: product.isNewArrival || false,
    });
    setImageFile(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!isAuthenticated) return null;

  return (
    <main id="top" className="jt-admin-dashboard">
      <aside className="jt-admin-sidebar">
        <h2>LIORA Beauty & Wear</h2>
        <ul>
          <li onClick={() => document.getElementById("top")?.scrollIntoView({ behavior: "smooth" })}>
            Dashboard
          </li>
          <li onClick={() => document.getElementById("category-section")?.scrollIntoView({ behavior: "smooth" })}>
            Categories
          </li>
          <li onClick={() => document.getElementById("product-section")?.scrollIntoView({ behavior: "smooth" })}>
            Products
          </li>
          <li onClick={() => document.getElementById("orders-section")?.scrollIntoView({ behavior: "smooth" })}>
            Orders
          </li>
          <li onClick={() => document.getElementById("branding-section")?.scrollIntoView({ behavior: "smooth" })}>
            Branding
          </li>
        </ul>
      </aside>

      <section className="jt-admin-main">
        <div
          className="jt-admin-top"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "20px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h1>Admin Dashboard</h1>
            <p>Manage products, categories and view orders</p>
          </div>

          <button
            onClick={handleLogout}
            style={{
              border: "none",
              background: "#ef4444",
              color: "white",
              padding: "12px 18px",
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
                placeholder="Category name"
                value={categoryForm.name}
                onChange={handleCategoryChange}
                required
              />

              <select
                name="type"
                value={categoryForm.type}
                onChange={handleCategoryChange}
              >
                <option value="main">Main</option>
                <option value="more">More</option>
              </select>

              <button type="submit">Add Category</button>
            </form>
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
                {categories.map((cat) => (
                  <option key={cat._id} value={cat._id}>
                    {cat.name}
                  </option>
                ))}
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

              <textarea
                name="description"
                placeholder="Product description"
                value={formData.description}
                onChange={handleChange}
              />

              <select
                name="stockStatus"
                value={formData.stockStatus}
                onChange={handleChange}
              >
                <option value="In Stock">In Stock</option>
                <option value="Limited Stock">Limited Stock</option>
                <option value="Out of Stock">Out of Stock</option>
              </select>

              <input type="file" accept="image/*" onChange={handleImageChange} />

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

          <div className="jt-admin-panel jt-admin-panel-wide">
            <h3>Manage Products</h3>

            {products.length === 0 ? (
              <p>No products found</p>
            ) : (
              <div className="jt-manage-products-list">
                {products.map((product) => {
                  const imageSrc = product.image
                    ? product.image.startsWith("http")
                      ? product.image
                      : product.image.startsWith("/uploads")
                        ? `${API_BASE_URL}${product.image}`
                        : `/images/${product.image}`
                    : null;

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

                        <div>
                          <h4>{product.name}</h4>
                          <p>Category: {product.category?.name || "No Category"}</p>
                          <p>
                            {product.offerPrice} Tk
                            <span style={{ marginLeft: "8px", textDecoration: "line-through", color: "#888" }}>
                              {product.originalPrice} Tk
                            </span>
                          </p>
                          <p>Status: {product.stockStatus}</p>
                        </div>
                      </div>

                      <div className="jt-manage-product-right">
                        <button
                          className="jt-edit-btn"
                          onClick={() => handleEditProduct(product)}
                        >
                          Edit
                        </button>

                        <button
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

            <h4>Homepage Promo Slider</h4>
            {settings.promoSlides.map((slide, index) => (
              <div
                key={index}
                style={{
                  border: "1px solid #d9dee7",
                  borderRadius: "12px",
                  padding: "14px",
                  marginBottom: "14px",
                  background: "#f9fbff",
                }}
              >
                <input
                  type="text"
                  placeholder="Badge"
                  value={slide.badge}
                  onChange={(e) =>
                    handleSlideChange(index, "badge", e.target.value)
                  }
                  style={{ width: "100%", marginBottom: "10px", padding: "10px" }}
                />

                <input
                  type="text"
                  placeholder="Title"
                  value={slide.title}
                  onChange={(e) =>
                    handleSlideChange(index, "title", e.target.value)
                  }
                  style={{ width: "100%", marginBottom: "10px", padding: "10px" }}
                />

                <textarea
                  placeholder="Subtitle"
                  value={slide.subtitle}
                  onChange={(e) =>
                    handleSlideChange(index, "subtitle", e.target.value)
                  }
                  style={{
                    width: "100%",
                    marginBottom: "10px",
                    padding: "10px",
                    minHeight: "90px",
                  }}
                />

                <input
                  type="text"
                  placeholder="Button Text"
                  value={slide.buttonText}
                  onChange={(e) =>
                    handleSlideChange(index, "buttonText", e.target.value)
                  }
                  style={{ width: "100%", marginBottom: "10px", padding: "10px" }}
                />

                <input
                  type="text"
                  placeholder="Button Link"
                  value={slide.buttonLink}
                  onChange={(e) =>
                    handleSlideChange(index, "buttonLink", e.target.value)
                  }
                  style={{ width: "100%", marginBottom: "10px", padding: "10px" }}
                />

                <input
                  type="text"
                  placeholder="Image URL or /uploads/filename"
                  value={slide.image}
                  onChange={(e) =>
                    handleSlideChange(index, "image", e.target.value)
                  }
                  style={{ width: "100%", marginBottom: "10px", padding: "10px" }}
                />

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
                style={{
                  border: "none",
                  background: "#1f9d67",
                  color: "white",
                  padding: "12px 16px",
                  borderRadius: "10px",
                  fontWeight: "700",
                  cursor: "pointer",
                }}
              >
                Save Settings
              </button>
            </div>
          </div>

          <div id="orders-section" className="jt-admin-panel jt-admin-panel-wide">
            <h3>Recent Orders</h3>
            <AdminOrders />
          </div>
        </div>
      </section>
    </main>
  );
}