"use client";

import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/api";
import { uploadToCloudinary, cld } from "@/lib/cloudinary";

const EMPTY = {
  name: "", category: "", purchasePrice: "", originalPrice: "", offerPrice: "",
  stockQuantity: "", discountBadge: "", description: "",
  image: "", images: ["", "", ""],
  isFeatured: false, isTrending: false, isNewArrival: false, isSlider: false,
};

export default function ProductForm({ editing, onSaved, onCancel }) {
  const [form, setForm] = useState(EMPTY);
  const [categories, setCategories] = useState([]);
  const [uploading, setUploading] = useState(null); // 'main' | 0 | 1 | 2
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/categories`)
      .then((r) => r.json())
      .then((d) => setCategories(Array.isArray(d) ? d : []))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    if (!editing) return setForm(EMPTY);
    const extra = Array.isArray(editing.images) ? editing.images : [];
    setForm({
      name: editing.name || "",
      category: editing.category?._id || editing.category || "",
      purchasePrice: editing.purchasePrice ?? "",
      originalPrice: editing.originalPrice ?? "",
      offerPrice: editing.offerPrice ?? "",
      stockQuantity: editing.stockQuantity ?? "",
      discountBadge: editing.discountBadge || "",
      description: editing.description || "",
      image: editing.image || "",
      images: [extra[0] || "", extra[1] || "", extra[2] || ""],
      isFeatured: !!editing.isFeatured,
      isTrending: !!editing.isTrending,
      isNewArrival: !!editing.isNewArrival,
      isSlider: !!editing.isSlider,
    });
  }, [editing]);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleFile = async (file, slot) => {
    if (!file) return;
    setError("");
    setUploading(slot);
    try {
      const url = await uploadToCloudinary(file);
      if (slot === "main") set("image", url);
      else setForm((p) => {
        const imgs = [...p.images];
        imgs[slot] = url;
        return { ...p, images: imgs };
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(null);
    }
  };

  const clearSlot = (slot) => {
    if (slot === "main") set("image", "");
    else setForm((p) => {
      const imgs = [...p.images];
      imgs[slot] = "";
      return { ...p, images: imgs };
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    if (saving) return;

    if (!form.image) return setError("মূল ছবি (Main Image) দিতে হবে");
    if (Number(form.offerPrice) > Number(form.originalPrice))
      return setError("Offer Price, Original Price এর চেয়ে বেশি হতে পারে না");

    setSaving(true);
    try {
      const token = localStorage.getItem("jt_admin_token");
      const res = await fetch(
        editing
          ? `${API_BASE_URL}/api/products/${editing._id}`
          : `${API_BASE_URL}/api/products`,
        {
          method: editing ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            ...form,
            category: form.category || null,
            images: form.images.filter(Boolean),
          }),
        }
      );
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || "সেভ হয়নি");

      setForm(EMPTY);
      onSaved?.(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const slots = [
    { key: "main", url: form.image, label: "মূল ছবি *" },
    { key: 0, url: form.images[0], label: "ছবি ২" },
    { key: 1, url: form.images[1], label: "ছবি ৩" },
    { key: 2, url: form.images[2], label: "ছবি ৪" },
  ];

  return (
    <form onSubmit={submit} style={{ maxWidth: 720 }}>
      <h3>{editing ? "প্রোডাক্ট এডিট" : "নতুন প্রোডাক্ট"}</h3>

      {/* ---- ছবি আপলোড গ্রিড ---- */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
          gap: 12, margin: "16px 0",
        }}
      >
        {slots.map((s) => (
          <div key={String(s.key)}>
            <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>
              {s.label}
            </label>
            <div
              style={{
                position: "relative", width: "100%", aspectRatio: "1 / 1",
                border: "2px dashed #cbd5e1", borderRadius: 10,
                overflow: "hidden", background: "#f8fafc",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              {s.url ? (
                <>
                  <img
                    src={cld(s.url, 300, 300)}
                    alt=""
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                  <button
                    type="button"
                    onClick={() => clearSlot(s.key)}
                    style={{
                      position: "absolute", top: 4, right: 4, width: 24, height: 24,
                      borderRadius: "50%", border: "none", background: "rgba(0,0,0,.6)",
                      color: "#fff", cursor: "pointer", lineHeight: 1,
                    }}
                  >
                    ×
                  </button>
                </>
              ) : (
                <span style={{ fontSize: 12, color: "#94a3b8" }}>
                  {uploading === s.key ? "আপলোড হচ্ছে..." : "+ ছবি দিন"}
                </span>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => { handleFile(e.target.files?.[0], s.key); e.target.value = ""; }}
                disabled={uploading !== null}
                style={{
                  position: "absolute", inset: 0, opacity: 0,
                  cursor: "pointer", width: "100%", height: "100%",
                }}
              />
            </div>
            <input
              type="url"
              placeholder="অথবা ছবির লিংক পেস্ট করুন"
              value={s.url}
              onChange={(e) =>
                s.key === "main"
                  ? set("image", e.target.value)
                  : setForm((p) => {
                      const imgs = [...p.images];
                      imgs[s.key] = e.target.value;
                      return { ...p, images: imgs };
                    })
              }
              style={{ width: "100%", marginTop: 6, fontSize: 11, padding: "6px 8px", border: "1px solid #e2e8f0", borderRadius: 6 }}
            />
          </div>
        ))}
      </div>

      {/* ---- টেক্সট ফিল্ড ---- */}
      <div style={{ display: "grid", gap: 10 }}>
        <input
          placeholder="প্রোডাক্টের নাম *" value={form.name}
          onChange={(e) => set("name", e.target.value)} required
        />

        <select value={form.category} onChange={(e) => set("category", e.target.value)}>
          <option value="">-- ক্যাটাগরি নির্বাচন করুন --</option>
          {categories.map((c) => (
            <option key={c._id} value={c._id}>{c.name}</option>
          ))}
        </select>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          <input type="number" min="0" placeholder="ক্রয়মূল্য *" value={form.purchasePrice}
            onChange={(e) => set("purchasePrice", e.target.value)} required />
          <input type="number" min="0" placeholder="Original Price *" value={form.originalPrice}
            onChange={(e) => set("originalPrice", e.target.value)} required />
          <input type="number" min="0" placeholder="Offer Price *" value={form.offerPrice}
            onChange={(e) => set("offerPrice", e.target.value)} required />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <input type="number" min="0" placeholder="স্টক সংখ্যা *" value={form.stockQuantity}
            onChange={(e) => set("stockQuantity", e.target.value)} required />
          <input placeholder="ব্যাজ (যেমন: 20% OFF)" value={form.discountBadge}
            onChange={(e) => set("discountBadge", e.target.value)} />
        </div>

        <textarea
          rows={5} placeholder="বিবরণ" value={form.description}
          onChange={(e) => set("description", e.target.value)}
        />

        <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
          {[
            ["isFeatured", "Featured"], ["isTrending", "Trending"],
            ["isNewArrival", "New Arrival"], ["isSlider", "হোম স্লাইডারে"],
          ].map(([k, label]) => (
            <label key={k} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input type="checkbox" checked={form[k]} onChange={(e) => set(k, e.target.checked)} />
              {label}
            </label>
          ))}
        </div>
      </div>

      {error && (
        <p style={{ color: "#dc2626", fontWeight: 600, marginTop: 12 }}>{error}</p>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <button
          type="submit" disabled={saving || uploading !== null}
          style={{
            padding: "12px 24px", background: "#ef4444", color: "#fff",
            border: "none", borderRadius: 10, fontWeight: 700, cursor: "pointer",
          }}
        >
          {saving ? "সেভ হচ্ছে..." : editing ? "আপডেট করুন" : "প্রোডাক্ট যোগ করুন"}
        </button>
        {editing && (
          <button type="button" onClick={onCancel}
            style={{ padding: "12px 24px", borderRadius: 10, border: "1px solid #cbd5e1", background: "#fff" }}>
            বাতিল
          </button>
        )}
      </div>
    </form>
  );
}
