"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";

export default function AdminMenus() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ label: '', href: '', icon: '' });

  const load = () => fetch('/api/menus?all=1').then(r => r.json()).then(setItems);
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!form.label || !form.href) return;
    await fetch('/api/menus', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    setForm({ label: '', href: '', icon: '' });
    load();
  };

  const patch = (id, data) =>
    fetch(`/api/menus/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
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
    <>
      <Header />
      <div style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
        <h2 style={{ marginBottom: 20 }}>মেনু ম্যানেজ (Menus)</h2>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 24, padding: 16, background: '#f8fafc', borderRadius: 8 }}>
          <input 
            placeholder="Label (e.g. PRODUCTS)" 
            value={form.label}
            style={{ flex: 1, padding: 10, borderRadius: 6, border: '1px solid #cbd5e1' }}
            onChange={e => setForm({ ...form, label: e.target.value })} 
          />
          <input 
            placeholder="Href (e.g. /products)" 
            value={form.href}
            style={{ flex: 1, padding: 10, borderRadius: 6, border: '1px solid #cbd5e1' }}
            onChange={e => setForm({ ...form, href: e.target.value })} 
          />
          <input 
            placeholder="Icon (e.g. 🛍️)" 
            value={form.icon} 
            style={{ width: 100, padding: 10, borderRadius: 6, border: '1px solid #cbd5e1' }}
            onChange={e => setForm({ ...form, icon: e.target.value })} 
          />
          <button 
            onClick={add}
            style={{ padding: '10px 20px', background: '#0f172a', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 'bold' }}
          >
            যোগ করুন
          </button>
        </div>

        <div style={{ background: 'white', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          {items.map((m, i) => (
            <div key={m._id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ flex: 1, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 8 }}>
                {m.icon && <span>{m.icon}</span>}
                {m.label} 
                <small style={{ color: '#64748b', fontWeight: 'normal', marginLeft: 8 }}>{m.href}</small>
              </span>
              
              <button onClick={() => move(i, -1)} disabled={i === 0} style={{ padding: '4px 10px', cursor: 'pointer' }}>↑</button>
              <button onClick={() => move(i, 1)} disabled={i === items.length - 1} style={{ padding: '4px 10px', cursor: 'pointer' }}>↓</button>
              
              <button 
                onClick={() => patch(m._id, { isActive: !m.isActive })}
                style={{ padding: '6px 12px', background: m.isActive ? '#f1f5f9' : '#fef2f2', color: m.isActive ? '#334155' : '#ef4444', border: 'none', borderRadius: 4, cursor: 'pointer', width: 70 }}
              >
                {m.isActive ? 'লুকাও' : 'দেখাও'}
              </button>
              
              <button 
                onClick={() => confirm('সত্যিই মুছে ফেলবেন?') && fetch(`/api/menus/${m._id}`, { method: 'DELETE' }).then(load)}
                style={{ padding: '6px 12px', background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', borderRadius: 4, cursor: 'pointer' }}
              >
                মুছুন
              </button>
            </div>
          ))}
          {items.length === 0 && (
            <div style={{ padding: 20, textAlign: 'center', color: '#64748b' }}>কোনো মেনু যোগ করা হয়নি</div>
          )}
        </div>
      </div>
    </>
  );
}
