'use client';
import { useState } from 'react';
import { uploadToCloudinary } from '@/lib/cloudinary';

export default function ImageUpload({ value, onChange, label = 'ছবি আপলোড' }) {
  const [busy, setBusy] = useState(false);

  const handle = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const url = await uploadToCloudinary(file);
      if (url) onChange(url);
      else alert('আপলোড ব্যর্থ: url পাওয়া যায়নি');
    } catch (err) {
      alert('আপলোড ব্যর্থ: ' + err.message);
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
