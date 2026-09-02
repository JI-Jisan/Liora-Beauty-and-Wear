"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { API_BASE_URL, getAuthHeaders } from "@/lib/api";

const CATEGORIES = [
  "Facebook Boosting",
  "Courier Return",
  "Courier Charge",
  "Packaging",
  "Transport",
  "Salary",
  "Mobile/Internet",
  "Other",
];

const OWNERS = ["Owner", "Partner"];

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState([]);
  const [total, setTotal] = useState(0);
  const [byCategory, setByCategory] = useState({});
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    category: "Facebook Boosting",
    amount: "",
    paidBy: "Owner",
    note: "",
  });

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/expenses`, { headers: getAuthHeaders() });
      const data = await res.json();
      setExpenses(data.expenses || []);
      setTotal(data.total || 0);
      setByCategory(data.byCategory || {});
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
      const res = await fetch(`${API_BASE_URL}/api/admin/expenses`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(`❌ ${data.message || "সেভ হয়নি"}`);
        return;
      }
      setMsg("✅ খরচ সফলভাবে যুক্ত হয়েছে!");
      setForm({
        ...form,
        amount: "",
        note: "",
      });
      load();
    } catch (err) {
      setMsg(`❌ ${err.message}`);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("আপনি কি নিশ্চিত এই খরচের রেকর্ডটি মুছতে চান?")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/expenses?id=${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        load();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "16px 12px", boxSizing: "border-box", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: "800", color: "#0f172a", margin: 0 }}>
            💸 Business Expenses (ব্যবসায়িক খরচ ট্র্যাকিং)
          </h1>
          <p style={{ fontSize: "14px", color: "#64748b", margin: "4px 0 0" }}>
            ফেসবুক বুস্টিং, কুরিয়ার রিটার্ন ক্ষতি, প্যাকেজিং ইত্যাদি সব খরচ হিসাব রাখুন আসল নিট লাভ জানার জন্য।
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

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 24 }}>
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "16px 20px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
          <p style={{ margin: 0, fontSize: 13, color: "#64748b", fontWeight: 600 }}>মোট খরচ (Total Expenses)</p>
          <h3 style={{ margin: "6px 0 0", fontSize: 24, color: "#ef4444", fontWeight: 800 }}>{total.toLocaleString()} Tk</h3>
        </div>
        {Object.entries(byCategory).map(([cat, amt]) => (
          <div key={cat} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "16px 20px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
            <p style={{ margin: 0, fontSize: 12, color: "#64748b", fontWeight: 600 }}>{cat}</p>
            <h3 style={{ margin: "6px 0 0", fontSize: 20, color: "#334155", fontWeight: 800 }}>{amt.toLocaleString()} Tk</h3>
          </div>
        ))}
      </div>

      {/* Add Expense Form */}
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: 20, marginBottom: 24, boxShadow: "0 2px 10px rgba(0,0,0,0.04)" }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 17, fontWeight: 700, color: "#1e293b" }}>➕ নতুন খরচের এন্ট্রি</h3>

        <form onSubmit={submit} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6 }}>
              খরচের তারিখ
            </label>
            <input
              type="date"
              required
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 14, boxSizing: "border-box" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6 }}>
              ক্যাটাগরি *
            </label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 14 }}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6 }}>
              টাকার পরিমাণ (Tk) *
            </label>
            <input
              required
              type="number"
              min="1"
              placeholder="e.g. 500"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 14, boxSizing: "border-box" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6 }}>
              খরচ পরিশোধকারী (Paid By)
            </label>
            <select
              value={form.paidBy}
              onChange={(e) => setForm({ ...form, paidBy: e.target.value })}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 14 }}
            >
              {OWNERS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>

          <div style={{ gridColumn: "span 2" }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6 }}>
              বিবরণ / নোট (ঐচ্ছিক)
            </label>
            <input
              placeholder="যেমন: Facebook Campaign 5-Day Boost"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 14, boxSizing: "border-box" }}
            />
          </div>

          <div style={{ gridColumn: "1 / -1", marginTop: 6 }}>
            <button
              type="submit"
              style={{
                width: "100%",
                padding: "12px",
                background: "#0284c7",
                color: "#fff",
                border: "none",
                borderRadius: 9,
                fontWeight: "700",
                fontSize: "15px",
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(2,132,199,0.25)",
              }}
            >
              💸 খরচ সেভ করুন
            </button>
          </div>
        </form>

        {msg && (
          <p style={{ margin: "14px 0 0", padding: "10px", background: msg.startsWith("✅") ? "#ecfdf5" : "#fef2f2", color: msg.startsWith("✅") ? "#065f46" : "#b91c1c", borderRadius: 8, fontWeight: 600, fontSize: 14 }}>
            {msg}
          </p>
        )}
      </div>

      {/* Expenses Table */}
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, overflow: "hidden", boxShadow: "0 2px 10px rgba(0,0,0,0.04)" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #e2e8f0" }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#1e293b" }}>📋 সমস্ত খরচের তালিকা</h3>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13.5px", textAlign: "left" }}>
            <thead style={{ background: "#f8fafc", color: "#475569", fontWeight: "700" }}>
              <tr>
                <th style={{ padding: "12px 16px" }}>তারিখ</th>
                <th style={{ padding: "12px 16px" }}>ক্যাটাগরি</th>
                <th style={{ padding: "12px 16px" }}>টাকার পরিমাণ</th>
                <th style={{ padding: "12px 16px" }}>টাকা দিয়েছে</th>
                <th style={{ padding: "12px 16px" }}>বিবরণ / নোট</th>
                <th style={{ padding: "12px 16px" }}>একশন</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e._id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "12px 16px" }}>{new Date(e.date).toLocaleDateString("bn-BD")}</td>
                  <td style={{ padding: "12px 16px", fontWeight: 600, color: "#0f172a" }}>{e.category}</td>
                  <td style={{ padding: "12px 16px", fontWeight: "700", color: "#ef4444" }}>{e.amount} Tk</td>
                  <td style={{ padding: "12px 16px" }}>{e.paidBy}</td>
                  <td style={{ padding: "12px 16px", color: "#64748b" }}>{e.note || "-"}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <button
                      onClick={() => handleDelete(e._id)}
                      style={{ background: "#fee2e2", color: "#dc2626", border: "none", padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: 12 }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {expenses.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} style={{ padding: "30px", textAlign: "center", color: "#64748b" }}>
                    কোনো খরচের রেকর্ড নেই।
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
