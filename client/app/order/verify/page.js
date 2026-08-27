"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { cld } from "@/lib/cloudinary";

export default function VerifyOrderPage() {
  const sp = useSearchParams();
  const [order, setOrder] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    fetch(`/api/orders/view?no=${sp.get("no")}&k=${sp.get("k")}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setOrder)
      .catch(() => setErr("লিঙ্কটি সঠিক নয়"));
  }, [sp]);

  if (err) return <p style={{ padding: 40, textAlign: "center" }}>{err}</p>;
  if (!order) return <p style={{ padding: 40, textAlign: "center" }}>লোড হচ্ছে...</p>;

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: 16 }}>
      <h1 style={{ fontSize: 20, fontWeight: 900 }}>আপনার অর্ডার মিলিয়ে নিন</h1>
      <p style={{ color: "#64748b", fontSize: 14 }}>
        #{order.orderNumber} • {order.customerName}
      </p>

      {order.items.map((it, i) => (
        <div key={i} style={{
          display: "grid", gridTemplateColumns: "84px minmax(0,1fr)",
          gap: 12, padding: 12, marginTop: 12,
          border: "1px solid #e2e8f0", borderRadius: 14, background: "#fff",
        }}>
          <img
            src={cld(it.image, 200, 200)} alt=""
            style={{ width: 84, height: 84, objectFit: "cover", borderRadius: 10 }}
          />
          <div style={{ minWidth: 0 }}>
            <strong style={{ fontSize: 15 }}>{it.productName}</strong>
            <p style={{ margin: "6px 0 0", fontSize: 14, color: "#475569" }}>
              পরিমাণ: <b>{it.quantity}</b> টি × {it.price} Tk
            </p>
          </div>
        </div>
      ))}

      <div style={{ marginTop: 16, padding: 14, background: "#f8fafc", borderRadius: 14 }}>
        <p style={{ margin: 0 }}>সাবটোটাল: {order.subtotal} Tk</p>
        <p style={{ margin: "4px 0" }}>ডেলিভারি: {order.deliveryCharge} Tk</p>
        <p style={{ margin: 0, fontWeight: 900, fontSize: 18, color: "#e11d48" }}>
          মোট: {order.total} Tk
        </p>
      </div>

      <p style={{ marginTop: 14, fontSize: 13, color: "#64748b" }}>
        কিছু না মিললে ডেলিভারিম্যানকে জানান বা আমাদের কল করুন।
      </p>
    </main>
  );
}
