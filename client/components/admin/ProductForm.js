"use client";

import { useEffect, useState, useMemo } from "react";
import { API_BASE_URL, getAuthHeaders } from "@/lib/api";
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

  const handleOfferPriceChange = (val) => {
    const num = Number(val);
    setForm((prev) => {
      const updated = { ...prev, offerPrice: val };
      if (!prev.originalPrice || Number(prev.originalPrice) < num) {
        updated.originalPrice = val;
      }
      return updated;
    });
  };

  const handleOriginalPriceChange = (val) => {
    setForm((prev) => {
      const updated = { ...prev, originalPrice: val };
      if (!prev.offerPrice) {
        updated.offerPrice = val;
      }
      return updated;
    });
  };

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
    if (e && typeof e.preventDefault === "function") e.preventDefault();
    if (saving) return;

    if (!form.image) return setError("মূল ছবি (Main Image) দিতে হবে");

    let offer = Number(form.offerPrice);
    let orig = Number(form.originalPrice);
    if (!orig && offer) orig = offer;
    if (!offer && orig) offer = orig;
    if (offer > orig) orig = offer;

    if (!offer || offer <= 0) return setError("সঠিক বিক্রয় মূল্য (Offer Price) দিন");

    setSaving(true);
    try {
      const headers = getAuthHeaders();
      const res = await fetch(
        editing
          ? `${API_BASE_URL}/api/products/${editing._id}`
          : `${API_BASE_URL}/api/products`,
        {
          method: editing ? "PUT" : "POST",
          headers,
          body: JSON.stringify({
            ...form,
            originalPrice: orig,
            offerPrice: offer,
            purchasePrice: Number(form.purchasePrice) || 0,
            stockQuantity: Math.max(0, parseInt(form.stockQuantity) || 0),
            category: form.category || null,
            brand: form.brand || null,
            images: form.images.filter(Boolean),
          }),
        }
      );
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || "সেভ হয়নি");

      setForm(EMPTY);
      if (typeof onSaved === "function") {
        onSaved(data);
      }
    } catch (err) {
      console.error("Product submit error:", err);
      setError(err.message || "সেভ হয়নি");
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
        <div className="img-grid">
          {slots.map((s, i) => (
            <div key={String(s.key)} className="img-slot">
              {s.url ? (
                <>
                  <img src={cld(s.url, 300, 300)} alt="" />
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
          <Field label="ক্রয় মূল্য (কেনা দাম)" hint="অপশনাল">
            <input type="number" min="0" style={inputStyle} value={form.purchasePrice}
                   placeholder="0"
                   onChange={e => setForm({ ...form, purchasePrice: e.target.value })} />
          </Field>
          <Field label="রেগুলার প্রাইস (আগের দাম)" hint="অফার দাম থেকে বেশি হলে ডিসকাউন্ট শো করবে">
            <input type="number" min="0" style={inputStyle} value={form.originalPrice}
                   placeholder="রেগুলার দাম"
                   onChange={e => handleOriginalPriceChange(e.target.value)} />
          </Field>
          <Field label="অফার প্রাইস / বিক্রয় মূল্য" required hint="গ্রাহক এই দামে কিনবে">
            <input type="number" min="0" style={inputStyle} value={form.offerPrice}
                   placeholder="বিক্রয় দাম"
                   onChange={e => handleOfferPriceChange(e.target.value)} />
          </Field>
          <Field label="স্টক" hint={Number(form.stockQuantity) <= 3 ? '⚠️ স্টক কম' : ''} required>
            <input type="number" min="0" style={inputStyle} value={form.stockQuantity}
                   placeholder="0"
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
            ['isFeatured', '⭐ Featured', 'ফিচার্ড সেকশনে দেখাবে'],
            ['isTrending', '🔥 Hot Deals / Trending', 'হোমপেজে "Hot Items & Deals" সেকশনে দেখাবে'],
            ['isNewArrival', '✨ New Arrival', 'নতুন পণ্য সেকশনে দেখাবে'],
            ['isSlider', '🖼️ Slider', 'হোম স্লাইডারে দেখাবে']
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

      {editing && editing._id && (
        <Card title="🎨 সোশ্যাল মিডিয়া মার্কেটিং ব্যানার (১০৮০×১০৮০)" desc="প্রাইজ আপডেট করলে ব্যানার অটো-আপডেট হয়ে যাবে">
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <img
              src={`${API_BASE_URL}/api/products/${editing._id}/banner`}
              alt="Marketing Banner"
              style={{ width: 110, height: 110, objectFit: 'cover', borderRadius: 12, border: '1px solid #e2e8f0', background: '#090d16' }}
            />
            <div style={{ flex: 1, minWidth: 200 }}>
              <p style={{ fontSize: 13, color: '#475569', marginBottom: 10, lineHeight: 1.5 }}>
                ফেসবুক ও ইনস্টাগ্রাম বিজ্ঞাপনের জন্য রেডি এইচডি ব্যানার। প্রাইস বা অফার আপডেট করে সেভ করলেই এই ব্যানার নতুন প্রাইস দিয়ে অটো রি-জেনারেট হবে।
              </p>
              <a
                href={`${API_BASE_URL}/api/products/${editing._id}/banner?download=1`}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '8px 15px', borderRadius: 8, background: '#0f172a',
                  color: '#fff', fontSize: 12.5, fontWeight: 700, textDecoration: 'none'
                }}
              >
                ⬇ এইচডি ব্যানার ডাউনলোড করুন
              </a>
            </div>
          </div>
        </Card>
      )}

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
