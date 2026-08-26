"use client";

import { useEffect, useState, useMemo } from "react";
import { API_BASE_URL } from "@/lib/api";
import { uploadToCloudinary, cld } from "@/lib/cloudinary";
import { buildTree, flattenWithPath } from "@/lib/categoryTree";
import { Card, Field, inputStyle, T } from "@/app/admin/ui";

const EMPTY = {
  name: "", category: "", brand: "", purchasePrice: "", originalPrice: "", offerPrice: "",
  stockQuantity: "", description: "",
  image: "", images: ["", "", ""],
  isFeatured: false, isTrending: false, isNewArrival: false, isSlider: false,
};

export default function ProductForm({ editing, onSaved, onCancel }) {
  const [form, setForm] = useState(EMPTY);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [uploading, setUploading] = useState(null); // 'main' | 0 | 1 | 2
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/categories`)
      .then((r) => r.json())
      .then((d) => setCategories(Array.isArray(d) ? d : []))
      .catch(() => setCategories([]));
      
    fetch(`${API_BASE_URL}/api/brands?all=1`)
      .then((r) => r.json())
      .then((d) => setBrands(Array.isArray(d) ? d : []))
      .catch(() => setBrands([]));
  }, []);

  useEffect(() => {
    if (!editing) return setForm(EMPTY);
    const extra = Array.isArray(editing.images) ? editing.images : [];
    setForm({
      name: editing.name || "",
      category: editing.category?._id || editing.category || "",
      brand: editing.brand?._id || editing.brand || "",
      purchasePrice: editing.purchasePrice ?? "",
      originalPrice: editing.originalPrice ?? "",
      offerPrice: editing.offerPrice ?? "",
      stockQuantity: editing.stockQuantity || "",
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
            brand: form.brand || null,
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

  const options = useMemo(() => flattenWithPath(buildTree(categories)), [categories]);

  return (
    <div className="admin-form" style={{
      maxWidth: 860, margin: '0 auto', padding: 16,
      boxSizing: 'border-box', background: T.bg
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        {editing && onCancel && (
          <button onClick={onCancel} style={{
            border: T.border, background: '#fff', borderRadius: 10,
            width: 34, height: 34, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>←</button>
        )}
        <div>
          <h2 style={{ margin: 0, fontSize: 19, fontWeight: 800, color: T.text }}>
            {editing ? "প্রোডাক্ট এডিট" : "নতুন প্রোডাক্ট"}
          </h2>
          <p style={{ margin: '2px 0 0', fontSize: 12.5, color: T.muted }}>
            {form.name || 'ফরম পূরণ করুন'}
          </p>
        </div>
      </div>

      <Card title="ছবি" desc="প্রথম ছবিটি মূল ছবি হিসেবে দেখানো হবে">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 12 }}>
          {slots.map((s, i) => (
            <div key={String(s.key)} style={{
              position: 'relative', aspectRatio: '1', borderRadius: 12,
              overflow: 'hidden', border: T.border, background: '#fafbfc',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
            }}>
              {s.url ? (
                <>
                  <img src={cld(s.url, 300, 300)} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  {i === 0 && (
                    <span style={{
                      position: 'absolute', bottom: 6, left: 6, fontSize: 10, fontWeight: 700,
                      background: T.brand, color: '#fff', padding: '3px 7px', borderRadius: 6
                    }}>মূল</span>
                  )}
                  <button type="button" onClick={() => clearSlot(s.key)} style={{
                    position: 'absolute', top: 6, right: 6, width: 24, height: 24,
                    borderRadius: '50%', border: 'none', cursor: 'pointer',
                    background: 'rgba(15,23,42,.62)', color: '#fff', fontSize: 13, lineHeight: 1
                  }}>×</button>
                </>
              ) : (
                <>
                  <label style={{ 
                    cursor: 'pointer', width: '100%', height: '100%', 
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
                    color: T.muted, fontSize: 12 
                  }}>
                    <span style={{ fontSize: 20 }}>+</span>
                    {uploading === s.key ? "আপলোড..." : s.label}
                    <input
                      type="file" accept="image/*"
                      onChange={(e) => { handleFile(e.target.files?.[0], s.key); e.target.value = ""; }}
                      disabled={uploading !== null}
                      style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
                    />
                  </label>
                </>
              )}
            </div>
          ))}
        </div>
      </Card>

      <Card title="মূল তথ্য">
        <div style={{ display: 'grid', gap: 14 }}>
          <Field label="প্রোডাক্টের নাম" required>
            <input style={inputStyle} value={form.name}
                   onChange={e => setForm({ ...form, name: e.target.value })} />
          </Field>

          <div style={{ display: 'grid', gap: 14,
                        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
            <Field label="ক্যাটাগরি" required>
              <select style={inputStyle} value={form.category}
                      onChange={e => setForm({ ...form, category: e.target.value })}>
                <option value="">নির্বাচন করুন</option>
                {options.map(c => <option key={c._id} value={c._id}>{" ".repeat(c.level)}{c.path || c.name}</option>)}
              </select>
            </Field>

            <Field label="ব্র্যান্ড" hint="অপশনাল">
              <select style={inputStyle} value={form.brand || ''}
                      onChange={e => setForm({ ...form, brand: e.target.value })}>
                <option value="">ব্র্যান্ড নেই</option>
                {brands.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
              </select>
            </Field>
          </div>
        </div>
      </Card>

      <Card title="দাম ও স্টক">
        <div style={{ display: 'grid', gap: 14,
                      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
          <Field label="ক্রয় মূল্য" required>
            <input type="number" min="0" style={inputStyle} value={form.purchasePrice}
                   onChange={e => setForm({ ...form, purchasePrice: e.target.value })} />
          </Field>
          <Field label="রেগুলার প্রাইস" required>
            <input type="number" min="0" style={inputStyle} value={form.originalPrice}
                   onChange={e => setForm({ ...form, originalPrice: e.target.value })} />
          </Field>
          <Field label="অফার প্রাইস" required>
            <input type="number" min="0" style={inputStyle} value={form.offerPrice}
                   onChange={e => setForm({ ...form, offerPrice: e.target.value })} />
          </Field>
          <Field label="স্টক" hint={Number(form.stockQuantity) <= 3 ? '⚠️ স্টক কম' : ''} required>
            <input type="number" min="0" style={inputStyle} value={form.stockQuantity}
                   onChange={e => setForm({ ...form, stockQuantity: e.target.value })} />
          </Field>
        </div>

        {form.offerPrice > 0 && form.purchasePrice > 0 && (
          <p style={{ margin: '12px 0 0', fontSize: 12.5, color: T.muted }}>
            লাভ <strong style={{ color: '#12805c' }}>
            {form.offerPrice - form.purchasePrice} Tk</strong> ({Math.round((form.offerPrice - form.purchasePrice) / form.offerPrice * 100)}%)
          </p>
        )}
      </Card>

      <Card title="বিবরণ ও ব্যবহারবিধি">
        <textarea rows={7} value={form.description}
          onChange={e => setForm({ ...form, description: e.target.value })}
          style={{ ...inputStyle, resize: 'vertical', maxWidth: '100%',
                   lineHeight: 1.7, fontFamily: 'inherit' }} />
      </Card>

      <Card title="ডিসপ্লে সেটিংস" desc="হোম পেজে কোথায় দেখাবে">
        <div style={{ display: 'grid', gap: 10 }}>
          {[
            ['isFeatured', 'Featured', 'ফিচার্ড সেকশনে'],
            ['isTrending', 'Trending', 'ট্রেন্ডিং সেকশনে'],
            ['isNewArrival', 'New Arrival', 'নতুন পণ্য সেকশনে'],
            ['isSlider', 'Slider', 'হোম স্লাইডারে']
          ].map(([key, title, sub]) => (
            <label key={key} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '11px 12px',
              border: form[key] ? '1px solid rgba(225,29,99,.35)' : T.border,
              background: form[key] ? 'rgba(225,29,99,.04)' : '#fff',
              borderRadius: 10, cursor: 'pointer'
            }}>
              <input type="checkbox" checked={!!form[key]}
                     onChange={e => setForm({ ...form, [key]: e.target.checked })}
                     style={{ width: 17, height: 17, accentColor: T.brand }} />
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 13.5, fontWeight: 600 }}>{title}</span>
                <span style={{ fontSize: 11.5, color: T.muted }}>{sub}</span>
              </span>
            </label>
          ))}
        </div>
      </Card>

      {error && (
        <p style={{ color: "#dc2626", fontWeight: 600, marginTop: 12, textAlign: 'center' }}>{error}</p>
      )}

      <div style={{
        position: 'sticky', bottom: 0, display: 'flex', gap: 10,
        padding: '12px 0 calc(64px + env(safe-area-inset-bottom))',
        background: `linear-gradient(to top, ${T.bg} 80%, transparent)`,
        marginTop: 16
      }}>
        <button onClick={submit} disabled={saving || uploading !== null} style={{
          flex: 1, padding: '13px 18px', border: 'none', borderRadius: 11,
          background: (saving || uploading !== null) ? '#f5a3bf' : T.brand, color: '#fff',
          fontSize: 14.5, fontWeight: 700, cursor: (saving || uploading !== null) ? 'not-allowed' : 'pointer',
          boxShadow: '0 4px 12px rgba(225,29,99,.22)'
        }}>{saving ? 'সেভ হচ্ছে...' : editing ? 'আপডেট করুন' : 'প্রোডাক্ট যোগ করুন'}</button>

        {editing && onCancel && (
          <button onClick={onCancel} style={{
            padding: '13px 20px', borderRadius: 11, border: T.border,
            background: '#fff', color: T.muted, fontSize: 14, fontWeight: 600, cursor: 'pointer'
          }}>বাতিল</button>
        )}
      </div>
    </div>
  );
}
