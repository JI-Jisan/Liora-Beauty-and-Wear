"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { API_BASE_URL } from "@/lib/api";
import { buildTree } from "@/lib/categoryTree";
import Link from "next/link";

const MenuNode = ({ node, expandedIds, onToggle, onSelect }) => {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = !!expandedIds[node._id];

  return (
    <div style={{ marginLeft: node.level === 0 ? 0 : 16, marginBottom: 4 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 12px",
          background: node.level === 0 ? "#f8fafc" : "transparent",
          borderRadius: 8,
          border: node.level === 0 ? "1px solid #f1f5f9" : "none",
        }}
      >
        <div
          onClick={() => onSelect(node._id)}
          style={{
            cursor: "pointer",
            fontWeight: node.level === 0 ? 700 : 500,
            fontSize: node.level === 0 ? 14 : 13,
            color: node.level === 0 ? "#0f172a" : "#334155",
            flex: 1,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          {node.level === 0 ? "📁" : node.level === 1 ? "📂" : "📄"} {node.name}
        </div>
        
        {hasChildren && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggle(node._id);
            }}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              fontSize: "18px",
              color: "#94a3b8",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 32,
              height: 32,
              borderRadius: 4,
            }}
          >
            {isExpanded ? "−" : "+"}
          </button>
        )}
      </div>

      {hasChildren && isExpanded && (
        <div style={{ marginTop: 4, borderLeft: node.level === 0 ? "2px solid #e2e8f0" : "2px dashed #cbd5e1", marginLeft: 8 }}>
          {node.children.map((child) => (
            <MenuNode
              key={child._id}
              node={child}
              expandedIds={expandedIds}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default function CategoryDrawer({ isOpen, onClose, onSelectCategory }) {
  const router = useRouter();
  const [categories, setCategories] = useState([]);
  const [expandedIds, setExpandedIds] = useState({});
  const [activeTab, setActiveTab] = useState("CATEGORY"); // 'MENU' | 'CATEGORY'

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/categories`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setCategories(data);
          const initialExpanded = {};
          data.forEach((cat) => {
            if (cat.level === 0) initialExpanded[cat._id] = true;
          });
          setExpandedIds(initialExpanded);
        }
      })
      .catch((err) => console.error("Drawer category fetch error:", err));
  }, []);

  const categoryTree = useMemo(() => buildTree(categories), [categories]);

  const toggleExpand = (id) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
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
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(15, 23, 42, 0.65)",
          backdropFilter: "blur(4px)",
          zIndex: 99998,
        }}
      />

      {/* Drawer */}
      <aside
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: 320,
          maxWidth: "85vw",
          height: "100vh",
          background: "#ffffff",
          boxShadow: "10px 0 40px rgba(0, 0, 0, 0.3)",
          zIndex: 99999,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ display: "flex", borderBottom: "1px solid #e2e8f0" }}>
          <button
            onClick={() => setActiveTab("MENU")}
            style={{
              flex: 1,
              padding: "16px 0",
              background: "transparent",
              border: "none",
              borderBottom: activeTab === "MENU" ? "2px solid #ef4444" : "2px solid transparent",
              fontWeight: activeTab === "MENU" ? 800 : 600,
              color: activeTab === "MENU" ? "#ef4444" : "#64748b",
              cursor: "pointer",
            }}
          >
            MENU
          </button>
          <button
            onClick={() => setActiveTab("CATEGORY")}
            style={{
              flex: 1,
              padding: "16px 0",
              background: "transparent",
              border: "none",
              borderBottom: activeTab === "CATEGORY" ? "2px solid #ef4444" : "2px solid transparent",
              fontWeight: activeTab === "CATEGORY" ? 800 : 600,
              color: activeTab === "CATEGORY" ? "#ef4444" : "#64748b",
              cursor: "pointer",
            }}
          >
            CATEGORIES
          </button>
          <button
            onClick={onClose}
            style={{
              padding: "0 16px",
              background: "transparent",
              border: "none",
              fontSize: 20,
              color: "#94a3b8",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
          {activeTab === "MENU" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Link href="/" onClick={onClose} style={{ textDecoration: "none", color: "#334155", fontWeight: 700, padding: "10px 12px", background: "#f8fafc", borderRadius: 8 }}>🏠 Home</Link>
              <Link href="/products" onClick={onClose} style={{ textDecoration: "none", color: "#334155", fontWeight: 700, padding: "10px 12px", background: "#f8fafc", borderRadius: 8 }}>🛍️ All Products</Link>
              <Link href="/contact" onClick={onClose} style={{ textDecoration: "none", color: "#334155", fontWeight: 700, padding: "10px 12px", background: "#f8fafc", borderRadius: 8 }}>📞 Contact Us</Link>
              <Link href="/admin/login" onClick={onClose} style={{ textDecoration: "none", color: "#334155", fontWeight: 700, padding: "10px 12px", background: "#f8fafc", borderRadius: 8 }}>⚙️ Admin Login</Link>
            </div>
          ) : (
            <div>
              <div
                onClick={() => handleCategoryClick("all")}
                style={{
                  padding: "12px 16px",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontWeight: 800,
                  fontSize: 14,
                  color: "#0f172a",
                  marginBottom: 16,
                  background: "#f1f5f9",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                🛍️ Show All Products
              </div>
              
              {categoryTree.map((node) => (
                <MenuNode
                  key={node._id}
                  node={node}
                  expandedIds={expandedIds}
                  onToggle={toggleExpand}
                  onSelect={handleCategoryClick}
                />
              ))}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
