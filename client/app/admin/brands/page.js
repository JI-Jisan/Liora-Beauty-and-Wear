"use client";

import { useState, useEffect } from "react";
import ImageUpload from "@/components/ImageUpload";
import { getAuthHeaders } from "@/lib/api";

import { useRouter } from "next/navigation";

export default function AdminBrands() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ name: '', logo: '' });
  const [msg, setMsg] = useState('');

  const load = () => fetch('/api/brands?all=1', { headers: getAuthHeaders() }).then(r => r.json()).then(setItems);
  useEffect(() => { load(); }, []);

  const add = async () => {
    const res = await fetch('/api/brands', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(form)
    });
    
    if (res.status === 401) {
      setMsg('সেশন শেষ হয়ে গেছে। আবার লগইন করুন।');
      setTimeout(() => router.push('/admin/login'), 1200);
      return;
    }

    const d = await res.json();
    if (!res.ok) return setMsg(d.message);
    setForm({ name: '', logo: '' }); 
    setMsg(''); 
    load();
  };

  const patch = async (id, data) => {
    const res = await fetch(`/api/brands/${id}`, {
      method: 'PUT', headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    if (res.status === 401) {
      setMsg('সেশন শেষ হয়ে গেছে। আবার লগইন করুন।');
      setTimeout(() => router.push('/admin/login'), 1200);
      return;
    }
    load();
  };

  const remove = async (id) => {
    if (!confirm('সত্যিই মুছে ফেলবেন?')) return;
    const res = await fetch(`/api/brands/${id}`, { 
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (res.status === 401) {
      setMsg('সেশন শেষ হয়ে গেছে। আবার লগইন করুন।');
      setTimeout(() => router.push('/admin/login'), 1200);
      return;
    }
    const d = await res.json();
    if (d.message && !d.message.includes('successfully')) setMsg(d.message);
    load();
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '16px 12px', boxSizing: 'border-box', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: "800", color: "#0f172a", margin: 0 }}>
            🏷️ ব্র্যান্ড ম্যানেজ (Brands)
          </h1>
          <p style={{ fontSize: "13px", color: "#64748b", margin: "4px 0 0" }}>
            ব্র্যান্ড তৈরি, লোগো আপলোড ও ম্যানেজ করুন
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/admin")}
          style={{
            padding: "8px 14px",
            background: "#f1f5f9",
            borderRadius: "8px",
            border: "none",
            color: "#334155",
            fontWeight: "700",
            fontSize: "13px",
            cursor: "pointer",
          }}
        >
          ← Dashboard
        </button>
      </div>

      {msg && <p style={{ color: '#ef4444', marginBottom: 16, fontWeight: "600" }}>{msg}</p>}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20, padding: 14, background: '#f8fafc', borderRadius: 12, border: "1px solid #e2e8f0" }}>
        <input 
          placeholder="ব্র্যান্ডের নাম (e.g. Skino)" 
          value={form.name}
          style={{ flex: 1, minWidth: "200px", padding: 10, borderRadius: 8, border: '1px solid #cbd5e1', fontSize: "14px" }}
          onChange={e => setForm({ ...form, name: e.target.value })} 
        />
        <div style={{ width: '100%', marginBottom: 8 }}>
          <ImageUpload 
            value={form.logo} 
            onChange={logo => setForm({ ...form, logo })} 
            label="ব্র্যান্ড লোগো (ঐচ্ছিক)" 
          />
        </div>
        <button 
          disabled={!form.name.trim()}
          onClick={add}
          style={{ width: "100%", padding: '12px 20px', background: form.name.trim() ? '#0f172a' : '#cbd5e1', color: 'white', border: 'none', borderRadius: 8, cursor: form.name.trim() ? 'pointer' : 'not-allowed', fontWeight: 'bold', fontSize: "14px" }}
        >
          ➕ ব্র্যান্ড যোগ করুন
        </button>
      </div>

      <div style={{ background: 'white', borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        {items.map(b => (
          <div key={b._id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: '1px solid #f1f5f9', opacity: b.isActive ? 1 : 0.5, flexWrap: 'wrap' }}>
            {b.logo ? (
              <img src={b.logo} alt="" width={38} height={38} style={{ objectFit: 'contain', borderRadius: 6, background: '#f1f5f9' }} />
            ) : (
              <div style={{ width: 38, height: 38, background: '#f1f5f9', borderRadius: 6 }} />
            )}
            
            <span style={{ flex: 1, fontWeight: '700', fontSize: "14px", minWidth: "120px" }}>
              {b.name}
              <small style={{ color: '#64748b', fontWeight: 'normal', marginLeft: 6, fontSize: "12px" }}>/{b.slug}</small>
            </span>
            
            <div style={{ display: "flex", gap: "6px" }}>
              <button 
                onClick={() => patch(b._id, { isActive: !b.isActive })}
                style={{ padding: '6px 12px', background: b.isActive ? '#f1f5f9' : '#fef2f2', color: b.isActive ? '#334155' : '#ef4444', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: "12px", fontWeight: "600" }}
              >
                {b.isActive ? 'লুকাও' : 'দেখাও'}
              </button>
              
              <button 
                onClick={() => remove(b._id)}
                style={{ padding: '6px 12px', background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', borderRadius: 6, cursor: 'pointer', fontSize: "12px", fontWeight: "600" }}
              >
                মুছুন
              </button>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>কোনো ব্র্যান্ড যোগ করা হয়নি</div>
        )}
      </div>
    </div>
  );
}
