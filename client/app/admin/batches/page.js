"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { API_BASE_URL, getAuthHeaders } from "@/lib/api";

const OWNERS = ["Owner", "Partner"];

export default function BatchesPage() {
  const [products, setProducts] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState({
    product: "",
    qty: "",
    unitCost: "",
    purchaseDate: new Date().toISOString().slice(0, 10),
    ownerName: "Owner",
    locationName: "Owner",
    supplier: "",
    note: "",
  });

  const load = async () => {
    setLoading(true);
    try {
      const [pRes, bRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/products`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE_URL}/api/admin/batches`, { headers: getAuthHeaders() }),
      ]);
      const p = await pRes.json();
      const b = await bRes.json();
      setProducts(Array.isArray(p) ? p : p.products || []);
      setBatches(b.batches || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setMsg("⏳ সেভ হচ্ছে...");
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/batches`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(`❌ ${data.message || "সেভ হয়নি"}`);
        return;
      }
      setMsg("✅ নতুন ব্যাচ সফলভাবে যোগ হয়েছে!");
      setForm({
        ...form,
        qty: "",
        unitCost: "",
        note: "",
        supplier: "",
      });
      load();
    } catch (err) {
      setMsg(`❌ ${err.message}`);
    }
  };

  const totalRemainingStock = batches.reduce((sum, b) => sum + (b.remaining || 0), 0);
  const totalStockValue = batches.reduce((sum, b) => sum + (b.remaining || 0) * (b.unitCost || 0), 0);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "16px 12px", boxSizing: "border-box", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: "800", color: "#0f172a", margin: 0 }}>
            📦 Stock In (মাল কেনার ব্যাচ এন্ট্রি)
          </h1>
          <p style={{ fontSize: "14px", color: "#64748b", margin: "4px 0 0" }}>
            প্রতিবার নতুন মূল্যে মাল কিনলে নতুন ব্যাচ যোগ করুন। FIFO অনুযায়ী স্বয়ংক্রিয়ভাবে স্টক ও লাভ হিসাব হবে।
          </p>
        </div>
        <Link
          href="/admin"
          style={{
            padding: "8px 16px",
            background: "#f1f5f9",
            borderRadius: "8px",
            textDecoration: "none",
            color: "#334155",
            fontWeight: "600",
            fontSize: "14px",
          }}
        >
          ← Admin Dashboard
        </Link>
      </div>

      {/* Summary KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 24 }}>
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "16px 20px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
          <p style={{ margin: 0, fontSize: 13, color: "#64748b", fontWeight: 600 }}>মোট অবশিষ্ট স্টক (Available)</p>
          <h3 style={{ margin: "6px 0 0", fontSize: 24, color: "#2563eb", fontWeight: 800 }}>{totalRemainingStock} pcs</h3>
        </div>
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "16px 20px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
          <p style={{ margin: 0, fontSize: 13, color: "#64748b", fontWeight: 600 }}>মোট স্টক ভ্যালু (কেনা দাম)</p>
          <h3 style={{ margin: "6px 0 0", fontSize: 24, color: "#10b981", fontWeight: 800 }}>{totalStockValue.toLocaleString()} Tk</h3>
        </div>
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "16px 20px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
          <p style={{ margin: 0, fontSize: 13, color: "#64748b", fontWeight: 600 }}>মোট ব্যাচ সংখ্যা</p>
          <h3 style={{ margin: "6px 0 0", fontSize: 24, color: "#8b5cf6", fontWeight: 800 }}>{batches.length} টি</h3>
        </div>
      </div>

      {/* Add Batch Form */}
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: 20, marginBottom: 24, boxShadow: "0 2px 10px rgba(0,0,0,0.04)" }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 17, fontWeight: 700, color: "#1e293b" }}>➕ নতুন মাল কেনার ব্যাচ যোগ করুন</h3>

        <form onSubmit={submit} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
          <div style={{ gridColumn: "span 2" }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6 }}>
              প্রোডাক্ট নির্বাচন করুন *
            </label>
            <select
              required
              value={form.product}
              onChange={(e) => setForm({ ...form, product: e.target.value })}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 14 }}
            >
              <option value="">প্রোডাক্ট সিলেক্ট করুন</option>
              {products.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name} (বর্তমান স্টক: {p.stockQuantity || 0})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6 }}>
              পরিমাণ (পিস) *
            </label>
            <input
              required
              type="number"
              min="1"
              placeholder="e.g. 10"
              value={form.qty}
              onChange={(e) => setForm({ ...form, qty: e.target.value })}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 14, boxSizing: "border-box" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6 }}>
              প্রতি পিস কেনা দাম (Tk) *
            </label>
            <input
              required
              type="number"
              min="0"
              step="0.01"
              placeholder="e.g. 120"
              value={form.unitCost}
              onChange={(e) => setForm({ ...form, unitCost: e.target.value })}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 14, boxSizing: "border-box" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6 }}>
              কেনার তারিখ
            </label>
            <input
              type="date"
              value={form.purchaseDate}
              onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 14, boxSizing: "border-box" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6 }}>
              টাকা দিয়েছে কে?
            </label>
            <select
              value={form.ownerName}
              onChange={(e) => setForm({ ...form, ownerName: e.target.value, locationName: e.target.value })}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 14 }}
            >
              {OWNERS.map((o) => (
                <option key={o} value={o}>
                  টাকা দিয়েছে: {o}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6 }}>
              মাল কার কাছে আছে?
            </label>
            <select
              value={form.locationName}
              onChange={(e) => setForm({ ...form, locationName: e.target.value })}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 14 }}
            >
              {OWNERS.map((o) => (
                <option key={o} value={o}>
                  মাল আছে: {o}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6 }}>
              সাপ্লায়ার / নোট
            </label>
            <input
              placeholder="সাপ্লায়ার নাম বা বিবরণ"
              value={form.supplier}
              onChange={(e) => setForm({ ...form, supplier: e.target.value, note: e.target.value })}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 14, boxSizing: "border-box" }}
            />
          </div>

          <div style={{ gridColumn: "1 / -1", marginTop: 8 }}>
            <button
              type="submit"
              style={{
                width: "100%",
                padding: "12px",
                background: "#e91e63",
                color: "#fff",
                border: "none",
                borderRadius: 9,
                fontWeight: "700",
                fontSize: "15px",
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(233,30,99,0.25)",
              }}
            >
              📦 নতুন ব্যাচ সংরক্ষণ করুন
            </button>
          </div>
        </form>

        {msg && (
          <p style={{ margin: "14px 0 0", padding: "10px", background: msg.startsWith("✅") ? "#ecfdf5" : "#fef2f2", color: msg.startsWith("✅") ? "#065f46" : "#b91c1c", borderRadius: 8, fontWeight: 600, fontSize: 14 }}>
            {msg}
          </p>
        )}
      </div>

      {/* Batches Table */}
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, overflow: "hidden", boxShadow: "0 2px 10px rgba(0,0,0,0.04)" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #e2e8f0" }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#1e293b" }}>📋 সমস্ত পারচেজ ব্যাচ তালিকা (FIFO Order)</h3>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13.5px", textAlign: "left" }}>
            <thead style={{ background: "#f8fafc", color: "#475569", fontWeight: "700" }}>
              <tr>
                <th style={{ padding: "12px 16px" }}>তারিখ</th>
                <th style={{ padding: "12px 16px" }}>প্রোডাক্টের নাম</th>
                <th style={{ padding: "12px 16px" }}>কেনা দাম</th>
                <th style={{ padding: "12px 16px" }}>কিনেছি</th>
                <th style={{ padding: "12px 16px" }}>অবশিষ্ট</th>
                <th style={{ padding: "12px 16px" }}>টাকা দিয়েছে</th>
                <th style={{ padding: "12px 16px" }}>মাল আছে</th>
                <th style={{ padding: "12px 16px" }}>স্টক ভ্যালু</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((b) => (
                <tr key={b._id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "12px 16px" }}>{new Date(b.purchaseDate).toLocaleDateString("bn-BD")}</td>
                  <td style={{ padding: "12px 16px", fontWeight: 600, color: "#0f172a" }}>{b.productName}</td>
                  <td style={{ padding: "12px 16px" }}>{b.unitCost} Tk</td>
                  <td style={{ padding: "12px 16px" }}>{b.qty}</td>
                  <td style={{ padding: "12px 16px", fontWeight: "700", color: b.remaining === 0 ? "#94a3b8" : "#2563eb" }}>
                    {b.remaining} {b.remaining === 0 ? "(শেষ)" : "পিস"}
                  </td>
                  <td style={{ padding: "12px 16px" }}>{b.ownerName}</td>
                  <td style={{ padding: "12px 16px" }}>{b.locationName}</td>
                  <td style={{ padding: "12px 16px", fontWeight: 600, color: "#10b981" }}>
                    {(b.remaining * b.unitCost).toLocaleString()} Tk
                  </td>
                </tr>
              ))}
              {batches.length === 0 && !loading && (
                <tr>
                  <td colSpan={8} style={{ padding: "30px", textAlign: "center", color: "#64748b" }}>
                    কোনো ব্যাচ পাওয়া যায়নি।
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
