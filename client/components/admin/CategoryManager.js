"use client";
import { useEffect, useMemo, useState } from "react";
import { buildTree, flattenWithPath } from "@/lib/categoryTree";

// Config fallback if not available
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

export default function CategoryManager() {
  const [cats, setCats] = useState([]);
  const [name, setName] = useState("");
  const [parent, setParent] = useState("");
  const [type, setType] = useState("main");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const token = () => (typeof window !== "undefined" ? localStorage.getItem("jt_admin_token") : "");

  const load = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/categories`, { cache: "no-store" });
      const data = await res.json();
      setCats(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const tree = useMemo(() => buildTree(cats), [cats]);
  const options = useMemo(() => flattenWithPath(tree), [tree]);

  const add = async (e) => {
    e.preventDefault();
    setMsg("");
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ name, parent: parent || null, type }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "যোগ করা যায়নি");
      setName("");
      await load();
      setMsg("✅ যোগ হয়েছে");
    } catch (err) {
      setMsg("❌ " + err.message);
    } finally {
      setBusy(false);
    }
  };

  const del = async (id, label) => {
    if (!confirm(`"${label}" এবং এর ভিতরের সব সাব-ক্যাটাগরি মুছে যাবে। নিশ্চিত?`)) return;
    setMsg("");
    const res = await fetch(`${API_BASE_URL}/api/categories/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token()}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setMsg("❌ " + (data.message || `Error ${res.status}`));
    await load();
    setMsg("🗑️ ডিলিট হয়েছে");
  };

  const Row = ({ node, depth = 0 }) => (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 12px",
          marginLeft: depth * 22,
          background: depth === 0 ? "#fff7f8" : "#fff",
          border: "1px solid #f1e3e6",
          borderRadius: 8,
          marginBottom: 6,
        }}
      >
        <span style={{ fontWeight: depth === 0 ? 700 : 500, flex: 1, fontSize: depth === 0 ? 15 : 14 }}>
          {depth > 0 && <span style={{ color: "#cbd5e1", marginRight: 6 }}>└</span>}
          {node.name}
          {node.children.length > 0 && (
            <span style={{ color: "#94a3b8", fontSize: 12, marginLeft: 6 }}>({node.children.length})</span>
          )}
        </span>
        <button
          type="button"
          onClick={() => {
            setParent(String(node._id));
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          style={{
            fontSize: 12,
            padding: "4px 10px",
            border: "1px solid #22c55e",
            color: "#16a34a",
            background: "#f0fdf4",
            borderRadius: 6,
            cursor: "pointer",
          }}
        >
          + সাব
        </button>
        <button
          type="button"
          onClick={() => del(node._id, node.name)}
          style={{
            fontSize: 12,
            padding: "4px 10px",
            border: "1px solid #ef4444",
            color: "#dc2626",
            background: "#fef2f2",
            borderRadius: 6,
            cursor: "pointer",
          }}
        >
          Delete
        </button>
      </div>
      {node.children.map((c) => (
        <Row key={c._id} node={c} depth={depth + 1} />
      ))}
    </>
  );

  return (
    <div style={{ background: "#fff", padding: 18, borderRadius: 12 }}>
      <h3 style={{ marginTop: 0 }}>ক্যাটাগরি ম্যানেজ</h3>
      <form onSubmit={add} style={{ display: "grid", gap: 10, marginBottom: 18 }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="ক্যাটাগরির নাম (যেমন Foundation)"
          style={{ padding: 12, border: "1px solid #e2e8f0", borderRadius: 8 }}
        />
        <select
          value={parent}
          onChange={(e) => setParent(e.target.value)}
          style={{ padding: 12, border: "1px solid #e2e8f0", borderRadius: 8 }}
        >
          <option value="">📁 None — মূল ক্যাটাগরি হিসেবে</option>
          {options.map((o) => (
            <option key={o._id} value={o._id}>
              {"— ".repeat(o.level)}
              {o.path}
            </option>
          ))}
        </select>
        {!parent && (
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            style={{ padding: 12, border: "1px solid #e2e8f0", borderRadius: 8 }}
          >
            <option value="main">Main Header Navigation</option>
            <option value="more">More Menu</option>
          </select>
        )}
        <button
          disabled={busy}
          type="submit"
          style={{
            padding: 12,
            background: "#ef4444",
            color: "#fff",
            border: 0,
            borderRadius: 8,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {busy ? "..." : "Add Category"}
        </button>
        {msg && <div style={{ fontSize: 13, color: msg.startsWith("❌") ? "#dc2626" : "#16a34a" }}>{msg}</div>}
      </form>

      <div style={{ fontWeight: 700, marginBottom: 10 }}>বর্তমান ক্যাটাগরি ({cats.length})</div>
      {tree.map((n) => (
        <Row key={n._id} node={n} />
      ))}
    </div>
  );
}
