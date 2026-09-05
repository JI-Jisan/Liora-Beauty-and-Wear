"use client";

import { useState, useEffect, useMemo } from "react";
import ImageUpload from "@/components/ImageUpload";
import { getAuthHeaders } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function AdminBrands() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [form, setForm] = useState({ name: "", logo: "" });
  const [editingBrand, setEditingBrand] = useState(null);
  const [msg, setMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const load = () => {
    fetch("/api/brands?all=1", { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setItems(data);
      })
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    load();
  }, []);

  const add = async () => {
    setMsg("");
    setSuccessMsg("");
    const res = await fetch("/api/brands", {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(form),
    });

    if (res.status === 401) {
      setMsg("সেশন শেষ হয়ে গেছে। আবার লগইন করুন।");
      setTimeout(() => router.push("/admin/login"), 1200);
      return;
    }

    const d = await res.json();
    if (!res.ok) return setMsg(d.message || "ব্র্যান্ড তৈরি ব্যর্থ হয়েছে");
    setForm({ name: "", logo: "" });
    setSuccessMsg("ব্র্যান্ড সফলভাবে যোগ করা হয়েছে!");
    load();
  };

  const patch = async (id, data) => {
    setMsg("");
    const res = await fetch(`/api/brands/${id}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (res.status === 401) {
      setMsg("সেশন শেষ হয়ে গেছে। আবার লগইন করুন।");
      setTimeout(() => router.push("/admin/login"), 1200);
      return;
    }
    load();
  };

  const saveEdit = async () => {
    if (!editingBrand || !editingBrand.name.trim()) return;
    setIsSaving(true);
    setMsg("");
    setSuccessMsg("");

    try {
      const res = await fetch(`/api/brands/${editingBrand._id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: editingBrand.name.trim(),
          logo: editingBrand.logo || "",
          slug: editingBrand.slug ? editingBrand.slug.trim().toLowerCase() : undefined,
        }),
      });

      if (res.status === 401) {
        setMsg("সেশন শেষ হয়ে গেছে। আবার লগইন করুন।");
        setTimeout(() => router.push("/admin/login"), 1200);
        return;
      }

      const d = await res.json();
      if (!res.ok) {
        setMsg(d.message || "ব্র্যান্ড আপডেট ব্যর্থ হয়েছে");
        return;
      }

      setSuccessMsg(`"${editingBrand.name}" ব্র্যান্ড সফলভাবে আপডেট করা হয়েছে!`);
      setEditingBrand(null);
      load();
    } catch (err) {
      setMsg("আপডেট ব্যর্থ: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const remove = async (id) => {
    if (!confirm("সত্যিই মুছে ফেলবেন?")) return;
    setMsg("");
    setSuccessMsg("");
    const res = await fetch(`/api/brands/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    if (res.status === 401) {
      setMsg("সেশন শেষ হয়ে গেছে। আবার লগইন করুন।");
      setTimeout(() => router.push("/admin/login"), 1200);
      return;
    }
    const d = await res.json();
    if (d.message && !d.message.includes("successfully")) {
      setMsg(d.message);
    } else {
      setSuccessMsg("ব্র্যান্ড মুছে ফেলা হয়েছে");
    }
    load();
  };

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase().trim();
    return items.filter(
      (b) => b.name?.toLowerCase().includes(q) || b.slug?.toLowerCase().includes(q)
    );
  }, [items, searchQuery]);

  return (
    <div
      style={{
        maxWidth: 860,
        margin: "0 auto",
        padding: "20px 16px",
        boxSizing: "border-box",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "24px",
              fontWeight: "900",
              color: "#0f172a",
              margin: 0,
            }}
          >
            🏷️ ব্র্যান্ড ম্যানেজ (Brands)
          </h1>
          <p style={{ fontSize: "13px", color: "#64748b", margin: "4px 0 0" }}>
            ব্র্যান্ড তৈরি, নাম ও লোগো ইমেজ এডিট এবং ম্যানেজ করুন ({items.length}টি ব্র্যান্ড)
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/admin")}
          style={{
            padding: "8px 16px",
            background: "#f1f5f9",
            borderRadius: "8px",
            border: "1px solid #e2e8f0",
            color: "#334155",
            fontWeight: "700",
            fontSize: "13px",
            cursor: "pointer",
          }}
        >
          ← Dashboard
        </button>
      </div>

      {/* Alerts */}
      {msg && (
        <div
          style={{
            padding: "10px 14px",
            background: "#fef2f2",
            border: "1px solid #fecdd3",
            borderRadius: "8px",
            color: "#b91c1c",
            marginBottom: 16,
            fontWeight: "600",
            fontSize: "14px",
          }}
        >
          ⚠️ {msg}
        </div>
      )}

      {successMsg && (
        <div
          style={{
            padding: "10px 14px",
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: "8px",
            color: "#15803d",
            marginBottom: 16,
            fontWeight: "600",
            fontSize: "14px",
          }}
        >
          ✅ {successMsg}
        </div>
      )}

      {/* Add New Brand Box */}
      <div
        style={{
          marginBottom: 24,
          padding: 18,
          background: "#f8fafc",
          borderRadius: 12,
          border: "1px solid #e2e8f0",
        }}
      >
        <h3
          style={{
            margin: "0 0 12px",
            fontSize: "15px",
            fontWeight: "800",
            color: "#1e293b",
          }}
        >
          ➕ নতুন ব্র্যান্ড তৈরি করুন
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input
            placeholder="ব্র্যান্ডের নাম (e.g. 3W Clinic, Cosrx, Beauty Glazed)"
            value={form.name}
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              border: "1px solid #cbd5e1",
              fontSize: "14px",
              outline: "none",
            }}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />

          <div>
            <ImageUpload
              value={form.logo}
              onChange={(logo) => setForm({ ...form, logo })}
              label="ব্র্যান্ড লোগো ইমেজ (ঐচ্ছিক)"
            />
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <input
              placeholder="অথবা লোগো ইমেজ URL পেস্ট করুন"
              value={form.logo}
              onChange={(e) => setForm({ ...form, logo: e.target.value })}
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid #cbd5e1",
                fontSize: "13px",
              }}
            />
            {form.logo && (
              <button
                type="button"
                onClick={() => setForm({ ...form, logo: "" })}
                style={{
                  background: "none",
                  border: "none",
                  color: "#ef4444",
                  fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                মুছুন
              </button>
            )}
          </div>

          <button
            disabled={!form.name.trim()}
            onClick={add}
            style={{
              padding: "12px 20px",
              background: form.name.trim() ? "#0f172a" : "#cbd5e1",
              color: "white",
              border: "none",
              borderRadius: 8,
              cursor: form.name.trim() ? "pointer" : "not-allowed",
              fontWeight: "bold",
              fontSize: "14px",
            }}
          >
            ➕ ব্র্যান্ড যোগ করুন
          </button>
        </div>
      </div>

      {/* Brand Search Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <div style={{ position: "relative", flex: 1 }}>
          <input
            type="text"
            placeholder="🔍 ব্র্যান্ড খুঁজুন..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 14px",
              borderRadius: 8,
              border: "1px solid #cbd5e1",
              fontSize: "14px",
              boxSizing: "border-box",
            }}
          />
        </div>
        <span style={{ fontSize: "13px", color: "#64748b", whiteSpace: "nowrap" }}>
          মোট: <strong>{filteredItems.length}</strong>টি
        </span>
      </div>

      {/* Brand List */}
      <div
        style={{
          background: "white",
          borderRadius: 12,
          border: "1px solid #e2e8f0",
          overflow: "hidden",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        }}
      >
        {filteredItems.map((b) => (
          <div
            key={b._id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 14px",
              borderBottom: "1px solid #f1f5f9",
              opacity: b.isActive ? 1 : 0.6,
              background: b.isActive ? "#fff" : "#fafafa",
            }}
          >
            {/* Logo Thumbnail */}
            {b.logo ? (
              <img
                src={b.logo}
                alt={b.name}
                width={42}
                height={42}
                style={{
                  objectFit: "contain",
                  borderRadius: 8,
                  background: "#fff",
                  border: "1px solid #e2e8f0",
                  padding: 2,
                  flexShrink: 0,
                }}
              />
            ) : (
              <div
                style={{
                  width: 42,
                  height: 42,
                  background: "#1e293b",
                  color: "#fff",
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "800",
                  fontSize: "14px",
                  flexShrink: 0,
                }}
              >
                {b.name.slice(0, 2).toUpperCase()}
              </div>
            )}

            {/* Name and Slug */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontWeight: "700",
                  fontSize: "14px",
                  color: "#0f172a",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {b.name}
              </div>
              <small style={{ color: "#64748b", fontSize: "12px" }}>
                slug: /{b.slug}
              </small>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              {/* EDIT BUTTON */}
              <button
                type="button"
                onClick={() => setEditingBrand({ ...b })}
                style={{
                  padding: "6px 12px",
                  background: "#e0e7ff",
                  color: "#4338ca",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: "700",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                ✏️ এডিট
              </button>

              {/* HIDE / SHOW BUTTON */}
              <button
                type="button"
                onClick={() => patch(b._id, { isActive: !b.isActive })}
                style={{
                  padding: "6px 12px",
                  background: b.isActive ? "#f1f5f9" : "#fef2f2",
                  color: b.isActive ? "#334155" : "#ef4444",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: "600",
                }}
              >
                {b.isActive ? "লুকাও" : "দেখাও"}
              </button>

              {/* DELETE BUTTON */}
              <button
                type="button"
                onClick={() => remove(b._id)}
                style={{
                  padding: "6px 12px",
                  background: "transparent",
                  color: "#ef4444",
                  border: "1px solid #ef4444",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: "600",
                }}
              >
                মুছুন
              </button>
            </div>
          </div>
        ))}

        {filteredItems.length === 0 && (
          <div style={{ padding: 30, textAlign: "center", color: "#64748b" }}>
            কোনো ব্র্যান্ড পাওয়া যায়নি
          </div>
        )}
      </div>

      {/* EDIT BRAND MODAL */}
      {editingBrand && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 99999,
            padding: 16,
          }}
          onClick={() => !isSaving && setEditingBrand(null)}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: 16,
              maxWidth: 520,
              width: "100%",
              padding: 24,
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
              position: "relative",
              boxSizing: "border-box",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Title */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: "18px",
                  fontWeight: "800",
                  color: "#0f172a",
                }}
              >
                ✏️ ব্র্যান্ড এডিট করুন
              </h2>
              <button
                type="button"
                onClick={() => setEditingBrand(null)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "20px",
                  color: "#64748b",
                  cursor: "pointer",
                  padding: 4,
                }}
              >
                ✕
              </button>
            </div>

            {/* Edit Fields */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "13px",
                    fontWeight: "700",
                    color: "#334155",
                    marginBottom: 6,
                  }}
                >
                  ব্র্যান্ডের নাম
                </label>
                <input
                  type="text"
                  value={editingBrand.name}
                  onChange={(e) =>
                    setEditingBrand({ ...editingBrand, name: e.target.value })
                  }
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: "1px solid #cbd5e1",
                    fontSize: "14px",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "13px",
                    fontWeight: "700",
                    color: "#334155",
                    marginBottom: 6,
                  }}
                >
                  ব্র্যান্ডের লোগো ইমেজ
                </label>
                <ImageUpload
                  value={editingBrand.logo}
                  onChange={(logo) => setEditingBrand({ ...editingBrand, logo })}
                  label="নতুন লোগো আপলোড করুন"
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    color: "#64748b",
                    marginBottom: 4,
                  }}
                >
                  অথবা লোগো ইমেজ URL:
                </label>
                <input
                  type="text"
                  placeholder="https://... image url"
                  value={editingBrand.logo || ""}
                  onChange={(e) =>
                    setEditingBrand({ ...editingBrand, logo: e.target.value })
                  }
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "1px solid #cbd5e1",
                    fontSize: "13px",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* Action Buttons */}
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  marginTop: 10,
                  justifyContent: "flex-end",
                }}
              >
                <button
                  type="button"
                  onClick={() => setEditingBrand(null)}
                  disabled={isSaving}
                  style={{
                    padding: "10px 18px",
                    background: "#f1f5f9",
                    color: "#475569",
                    border: "none",
                    borderRadius: 8,
                    cursor: "pointer",
                    fontWeight: "700",
                    fontSize: "13px",
                  }}
                >
                  বাতিল
                </button>

                <button
                  type="button"
                  onClick={saveEdit}
                  disabled={isSaving || !editingBrand.name.trim()}
                  style={{
                    padding: "10px 22px",
                    background:
                      isSaving || !editingBrand.name.trim()
                        ? "#94a3b8"
                        : "#2563eb",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: 8,
                    cursor:
                      isSaving || !editingBrand.name.trim()
                        ? "not-allowed"
                        : "pointer",
                    fontWeight: "700",
                    fontSize: "13px",
                    boxShadow: "0 2px 6px rgba(37, 99, 235, 0.3)",
                  }}
                >
                  {isSaving ? "সংরক্ষণ হচ্ছে..." : "💾 পরিবর্তন সংরক্ষণ করুন"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
