"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { API_BASE_URL } from "@/lib/api";

export default function CategoryDrawer({ isOpen, onClose, onSelectCategory }) {
  const router = useRouter();
  const [categories, setCategories] = useState([]);
  const [expandedIds, setExpandedIds] = useState({});

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/categories`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setCategories(data);
          const initialExpanded = {};
          data.forEach((cat) => {
            if (!cat.parentCategory) {
              initialExpanded[cat._id] = true;
            }
          });
          setExpandedIds(initialExpanded);
        }
      })
      .catch((err) => console.error("Drawer category fetch error:", err));
  }, []);

  const categoryTree = useMemo(() => {
    if (!categories || categories.length === 0) return [];

    const map = {};
    const roots = [];

    categories.forEach((cat) => {
      map[cat._id] = { ...cat, children: [] };
    });

    categories.forEach((cat) => {
      const parentId = typeof cat.parentCategory === "object" ? cat.parentCategory?._id : cat.parentCategory;
      if (parentId && map[parentId]) {
        map[parentId].children.push(map[cat._id]);
      } else {
        roots.push(map[cat._id]);
      }
    });

    return roots;
  }, [categories]);

  const toggleExpand = (id, e) => {
    e.stopPropagation();
    setExpandedIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleCategoryClick = (catId) => {
    if (onSelectCategory) {
      onSelectCategory(catId);
    } else {
      router.push(`/products?category=${encodeURIComponent(catId)}`);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className="jt-drawer-backdrop"
        onClick={onClose}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(15, 23, 42, 0.65)",
          backdropFilter: "blur(4px)",
          zIndex: 99998,
        }}
      />

      {/* Left Category Drawer Panel */}
      <aside
        className="jt-left-category-drawer"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "310px",
          maxWidth: "85vw",
          height: "100vh",
          background: "#ffffff",
          boxShadow: "10px 0 40px rgba(0, 0, 0, 0.3)",
          zIndex: 99999,
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px",
            background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 4px 14px rgba(0,0,0,0.15)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "20px" }}>📁</span>
            <div>
              <h4 style={{ margin: 0, fontSize: "16px", fontWeight: "900", letterSpacing: "0.5px" }}>
                CATEGORIES
              </h4>
              <span style={{ fontSize: "11px", color: "#94a3b8" }}>Folder Hierarchy View</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: "rgba(255, 255, 255, 0.15)",
              border: "none",
              color: "#ffffff",
              width: "34px",
              height: "34px",
              borderRadius: "50%",
              cursor: "pointer",
              fontSize: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: "900",
            }}
          >
            ✕
          </button>
        </div>

        {/* Body Category Tree */}
        <div style={{ padding: "16px 14px", flex: 1 }}>
          <div
            onClick={() => handleCategoryClick("all")}
            style={{
              padding: "12px 16px",
              borderRadius: "12px",
              cursor: "pointer",
              fontWeight: "800",
              fontSize: "14px",
              color: "#0f172a",
              marginBottom: "12px",
              background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
              border: "1px solid #cbd5e1",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
            }}
          >
            <span>🛍️</span> Show All Products
          </div>

          <div className="jt-drawer-tree-container" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {categoryTree.map((motherCat) => {
              const hasChildren = motherCat.children && motherCat.children.length > 0;
              const isExpanded = !!expandedIds[motherCat._id];

              return (
                <div key={motherCat._id} style={{ borderRadius: "12px", overflow: "hidden", border: "1px solid #f1f5f9" }}>
                  {/* Mother Category Row */}
                  <div
                    onClick={() => handleCategoryClick(motherCat._id)}
                    style={{
                      padding: "12px 14px",
                      background: "#f8fafc",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      fontWeight: "800",
                      fontSize: "14px",
                      color: "#0f172a",
                      borderBottom: isExpanded && hasChildren ? "1px solid #e2e8f0" : "none",
                    }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      📁 {motherCat.name}
                    </span>

                    {hasChildren && (
                      <button
                        type="button"
                        onClick={(e) => toggleExpand(motherCat._id, e)}
                        style={{
                          background: "#ffffff",
                          border: "1px solid #cbd5e1",
                          borderRadius: "6px",
                          cursor: "pointer",
                          fontSize: "12px",
                          color: "#475569",
                          padding: "2px 8px",
                          fontWeight: "700",
                        }}
                      >
                        {isExpanded ? "▼" : "▶"}
                      </button>
                    )}
                  </div>

                  {/* Children Sub-categories (1st Level) */}
                  {hasChildren && isExpanded && (
                    <div style={{ padding: "8px 12px 12px 24px", background: "#ffffff", display: "flex", flexDirection: "column", gap: "4px" }}>
                      {motherCat.children.map((childCat) => {
                        const hasSubChildren = childCat.children && childCat.children.length > 0;
                        const isChildExpanded = !!expandedIds[childCat._id];

                        return (
                          <div key={childCat._id} style={{ borderLeft: "2px solid #cbd5e1", paddingLeft: "10px", margin: "2px 0" }}>
                            <div
                              onClick={() => handleCategoryClick(childCat._id)}
                              style={{
                                padding: "8px 10px",
                                borderRadius: "8px",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                fontWeight: "700",
                                fontSize: "13px",
                                color: "#334155",
                                background: "#f1f5f9",
                              }}
                            >
                              <span>📂 {childCat.name}</span>
                              {hasSubChildren && (
                                <button
                                  type="button"
                                  onClick={(e) => toggleExpand(childCat._id, e)}
                                  style={{
                                    background: "#ffffff",
                                    border: "none",
                                    cursor: "pointer",
                                    fontSize: "11px",
                                    color: "#64748b",
                                    padding: "2px 6px",
                                    borderRadius: "4px",
                                  }}
                                >
                                  {isChildExpanded ? "▼" : "▶"}
                                </button>
                              )}
                            </div>

                            {/* Grandchildren Sub-categories (2nd Level) */}
                            {hasSubChildren && isChildExpanded && (
                              <div style={{ paddingLeft: "14px", marginTop: "4px", borderLeft: "2px dashed #94a3b8", display: "flex", flexDirection: "column", gap: "2px" }}>
                                {childCat.children.map((grandChild) => (
                                  <div
                                    key={grandChild._id}
                                    onClick={() => handleCategoryClick(grandChild._id)}
                                    style={{
                                      padding: "6px 10px",
                                      borderRadius: "6px",
                                      cursor: "pointer",
                                      fontSize: "12px",
                                      fontWeight: "600",
                                      color: "#475569",
                                      background: "#fafafa",
                                    }}
                                  >
                                    📄 {grandChild.name}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </aside>
    </>
  );
}
