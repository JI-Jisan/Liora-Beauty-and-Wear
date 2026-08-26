'use client';
import { useState } from 'react';

export default function ImageUpload({ value, onChange, label = 'ছবি আপলোড' }) {
  const [busy, setBusy] = useState(false);

  const handle = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || '');
      
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || '';
      if (!cloudName) {
        alert('Cloudinary cloud name is missing!');
        return;
      }

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        { method: 'POST', body: fd }
      );
      const data = await res.json();
      if (data.secure_url) onChange(data.secure_url);
      else alert('আপলোড ব্যর্থ: ' + (data.error?.message || 'unknown'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{label}</label>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <div style={{
          width: 84, height: 84, borderRadius: 12, border: '1px dashed #e5e7eb',
          background: '#f8fafc', overflow: 'hidden', display: 'flex',
          alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          {value
            ? <img src={value} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ color: '#94a3b8', fontSize: 22 }}>＋</span>}
        </div>
        <div style={{ minWidth: 0 }}>
          <input type="file" accept="image/*" onChange={handle} disabled={busy} />
          {busy && <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>আপলোড হচ্ছে…</div>}
          {value && (
            <button type="button" onClick={() => onChange('')}
              style={{ marginTop: 6, fontSize: 12, background: 'none', border: 0, color: '#dc2626', cursor: 'pointer' }}>
              সরান
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
