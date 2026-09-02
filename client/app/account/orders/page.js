"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth, getIdToken } from "@/components/AuthProvider";

export default function MyOrders() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState(null);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push("/login"); return; }
    (async () => {
      const token = await getIdToken();
      const res = await fetch("/api/my-orders", { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setOrders(res.ok ? data.orders : []);
    })();
  }, [user, loading, router]);

  if (loading || orders === null) return <p style={{ padding: 24 }}>লোড হচ্ছে...</p>;

  return (
    <div style={{ maxWidth: 720, margin: "24px auto", padding: 16 }}>
      <h2>আমার অর্ডার</h2>
      {orders.length === 0 && <p>এখনো কোনো অর্ডার নেই।</p>}
      {orders.map((o) => (
        <div key={o.orderNumber} style={{ border: "1px solid #eee", borderRadius: 10, padding: 14, marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <strong>{o.orderNumber}</strong>
            <span>{o.status}</span>
          </div>
          <p style={{ margin: "6px 0", color: "#666", fontSize: 14 }}>
            {new Date(o.createdAt).toLocaleDateString("bn-BD")} · {o.items?.length || 0} আইটেম · ৳{o.total}
          </p>
          <Link href={`/order/verify?no=${o.orderNumber}&k=${o.accessToken}`}>বিস্তারিত দেখুন →</Link>
        </div>
      ))}
    </div>
  );
}
