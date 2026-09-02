"use client";

import { useState, useEffect } from "react";
import { getAuthHeaders } from "@/lib/api";

export default function AdminMenus() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ label: '', href: '', icon: '' });

  const load = () => fetch('/api/menus?all=1', { headers: getAuthHeaders() }).then(r => r.json()).then(setItems);
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!form.label || !form.href) return;
    await fetch('/api/menus', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(form)
    });
    setForm({ label: '', href: '', icon: '' });
    load();
  };

  const patch = (id, data) =>
    fetch(`/api/menus/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    }).then(load);

  const move = (i, dir) => {
    const a = items[i], b = items[i + dir];
    if (!b) return;
    Promise.all([
      patch(a._id, { order: b.order }),
      patch(b._id, { order: a.order })
    ]);
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '16px 12px', boxSizing: 'border-box', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: "800", color: "#0f172a", margin: 0 }}>
            ☰ মেনু ম্যানেজ (Menus)
          </h1>
          <p style={{ fontSize: "13px", color: "#64748b", margin: "4px 0 0" }}>
            হেডার এবং নেভিগেশন মেনু আইটেম সাজান
          </p>
        </div>
        <a
          href="/admin"
          style={{
            padding: "8px 14px",
            background: "#f1f5f9",
            borderRadius: "8px",
            textDecoration: "none",
            color: "#334155",
            fontWeight: "700",
            fontSize: "13px",
          }}
        >
          ← Dashboard
        </a>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20, padding: 14, background: '#f8fafc', borderRadius: 12, border: "1px solid #e2e8f0" }}>
        <input 
          placeholder="Label (e.g. PRODUCTS)" 
          value={form.label}
          style={{ flex: 1, minWidth: "140px", padding: 10, borderRadius: 8, border: '1px solid #cbd5e1', fontSize: "14px" }}
          onChange={e => setForm({ ...form, label: e.target.value })} 
        />
        <input 
          placeholder="Href (e.g. /products)" 
          value={form.href}
          style={{ flex: 1, minWidth: "140px", padding: 10, borderRadius: 8, border: '1px solid #cbd5e1', fontSize: "14px" }}
          onChange={e => setForm({ ...form, href: e.target.value })} 
        />
        <input 
          placeholder="Icon (e.g. 🛍️)" 
          value={form.icon} 
          style={{ width: 80, padding: 10, borderRadius: 8, border: '1px solid #cbd5e1', fontSize: "14px" }}
          onChange={e => setForm({ ...form, icon: e.target.value })} 
        />
        <button 
          onClick={add}
          style={{ width: "100%", padding: '12px 20px', background: '#0f172a', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold', fontSize: "14px" }}
        >
          ➕ মেনু যোগ করুন
        </button>
      </div>

      <div style={{ background: 'white', borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        {items.map((m, i) => (
          <div key={m._id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: '1px solid #f1f5f9', flexWrap: 'wrap' }}>
            <span style={{ flex: 1, fontWeight: '700', display: 'flex', alignItems: 'center', gap: 8, minWidth: "140px", fontSize: "14px" }}>
              {m.icon && <span>{m.icon}</span>}
              {m.label} 
              <small style={{ color: '#64748b', fontWeight: 'normal', marginLeft: 6, fontSize: "12px" }}>{m.href}</small>
            </span>
            
            <div style={{ display: "flex", gap: "6px" }}>
              <button onClick={() => move(i, -1)} disabled={i === 0} style={{ padding: '6px 10px', background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: 6, cursor: 'pointer', fontWeight: "bold" }}>↑</button>
              <button onClick={() => move(i, 1)} disabled={i === items.length - 1} style={{ padding: '6px 10px', background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: 6, cursor: 'pointer', fontWeight: "bold" }}>↓</button>
              <button 
                onClick={() => patch(m._id, { isActive: !m.isActive })}
                style={{ padding: '6px 12px', background: m.isActive ? '#f1f5f9' : '#fef2f2', color: m.isActive ? '#334155' : '#ef4444', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: "12px", fontWeight: "600" }}
              >
                {m.isActive ? 'লুকাও' : 'দেখাও'}
              </button>
              <button 
                onClick={() => confirm('সত্যিই মুছে ফেলবেন?') && fetch(`/api/menus/${m._id}`, { method: 'DELETE', headers: getAuthHeaders() }).then(load)}
                style={{ padding: '6px 12px', background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', borderRadius: 6, cursor: 'pointer', fontSize: "12px" }}
              >
                মুছুন
              </button>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div style={{ padding: 20, textAlign: 'center', color: '#64748b' }}>কোনো মেনু যোগ করা হয়নি</div>
        )}
      </div>
    </div>
  );
}
