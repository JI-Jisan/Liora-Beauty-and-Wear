"use client";
import { QRCodeSVG } from "qrcode.react";

export default function OrderPrint({ order }) {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL || "https://liora-beauty-and-wear-seven.vercel.app";
  const verifyUrl = `${base}/order/verify?no=${order.orderNumber}&k=${order.accessToken}`;

  return (
    <div className="print-area">
      <div className="ph">
        <div>
          <h2 style={{ margin: 0 }}>LIORA Beauty &amp; Wear</h2>
          <p style={{ margin: "4px 0", fontSize: 12 }}>
            অর্ডার: <strong>{order.orderNumber}</strong><br />
            তারিখ: {new Date(order.createdAt).toLocaleDateString("bn-BD")}
          </p>
        </div>
        <div style={{ textAlign: "center" }}>
          <QRCodeSVG value={verifyUrl} size={96} level="M" />
          <p style={{ fontSize: 9, margin: "4px 0 0", maxWidth: 110 }}>
            স্ক্যান করে পণ্য মিলিয়ে নিন
          </p>
        </div>
      </div>

      <p style={{ fontSize: 12, marginTop: 10 }}>
        <strong>{order.customerName}</strong> · {order.phone}<br />
        {order.address}
      </p>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginTop: 8 }}>
        <thead>
          <tr>
            <th style={th}>পণ্য</th>
            <th style={th}>পরিমাণ</th>
            <th style={th}>দাম</th>
          </tr>
        </thead>
        <tbody>
          {order.items?.map((it, i) => (
            <tr key={i}>
              <td style={td}>{it.name}</td>
              <td style={{ ...td, textAlign: "center" }}>{it.quantity}</td>
              <td style={{ ...td, textAlign: "right" }}>৳{it.price * it.quantity}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ textAlign: "right", fontSize: 13, marginTop: 8 }}>
        <p style={{ margin: 2 }}>ডেলিভারি: ৳{order.deliveryCharge ?? 0}</p>
        <p style={{ margin: 2, fontSize: 15 }}><strong>মোট: ৳{order.total}</strong></p>
      </div>

      <p style={{ fontSize: 10, marginTop: 14, textAlign: "center", color: "#555" }}>
        বক্স খোলার আগে QR স্ক্যান করে তালিকা দেখে নিন। অভিযোগ থাকলে ২৪ ঘণ্টার মধ্যে জানান।
      </p>
    </div>
  );
}

const th = { borderBottom: "1px solid #000", textAlign: "left", padding: "4px 2px" };
const td = { borderBottom: "1px solid #eee", padding: "4px 2px" };
