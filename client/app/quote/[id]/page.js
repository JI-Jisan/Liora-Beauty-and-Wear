"use client";

import { useEffect, useState, use } from "react";
import Image from "next/image";
import Link from "next/link";
import { generateWholesalePdf } from "@/lib/wholesalePdf";

export default function DigitalQuotationPage({ params: paramsPromise }) {
  const params = use(paramsPromise);
  const quoteId = params?.id;

  const [quotation, setQuotation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  useEffect(() => {
    if (!quoteId) return;

    async function loadQuote() {
      setLoading(true);
      try {
        const res = await fetch(`/api/quotations/${quoteId}`);
        const data = await res.json();
        if (res.ok && data.quotation) {
          setQuotation(data.quotation);
        } else {
          setError(data.message || "কোটেশন বা ইনভয়েস পাওয়া যায়নি!");
        }
      } catch (err) {
        setError("ডাটা লোড করতে সমস্যা হয়েছে: " + err.message);
      } finally {
        setLoading(false);
      }
    }

    loadQuote();
  }, [quoteId]);

  if (loading) {
    return (
      <div style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "36px", marginBottom: "12px" }}>⏳</div>
          <h2 style={{ fontSize: "18px", color: "#0f172a", margin: 0 }}>ইনভয়েস লোড হচ্ছে...</h2>
          <p style={{ color: "#64748b", fontSize: "13px", marginTop: "4px" }}>দয়া করে অপেক্ষা করুন</p>
        </div>
      </div>
    );
  }

  if (error || !quotation) {
    return (
      <div style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc", padding: "20px" }}>
        <div style={{ background: "#ffffff", padding: "32px", borderRadius: "16px", border: "1px solid #e2e8f0", maxWidth: "450px", textAlign: "center", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
          <div style={{ fontSize: "40px", marginBottom: "12px" }}>⚠️</div>
          <h2 style={{ fontSize: "18px", color: "#dc2626", margin: "0 0 8px" }}>ইনভয়েস পাওয়া যায়নি</h2>
          <p style={{ color: "#64748b", fontSize: "13px", lineHeight: "1.5", margin: "0 0 20px" }}>
            {error || "অনুরোধকৃত পাইকারি কোটেশন বা ইনভয়েসটি খুঁজে পাওয়া যায়নি বা মুছে ফেলা হয়েছে।"}
          </p>
          <Link
            href="/"
            style={{
              display: "inline-block",
              background: "#0f172a",
              color: "#ffffff",
              padding: "10px 20px",
              borderRadius: "8px",
              fontWeight: "700",
              fontSize: "13px",
              textDecoration: "none",
            }}
          >
            ← ওয়েবসাইটে ফিরে যান
          </Link>
        </div>
      </div>
    );
  }

  // Brand-wise Grouping
  const brandGroups = {};
  (quotation.items || []).forEach((item) => {
    const b = item.brandName || "Other Brands";
    if (!brandGroups[b]) brandGroups[b] = [];
    brandGroups[b].push(item);
  });

  const brandNames = Object.keys(brandGroups).sort((a, b) => a.localeCompare(b));

  const handleDownloadPdf = async () => {
    setIsDownloadingPdf(true);
    try {
      await generateWholesalePdf({
        items: quotation.items,
        clientInfo: quotation.clientInfo || {},
        quoteNumber: quotation.quoteNumber,
      });
    } catch (e) {
      alert("PDF ডাউনলোড ব্যর্থ: " + e.message);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleWhatsAppConfirm = () => {
    const text = encodeURIComponent(
      `Hello LIORA, I would like to confirm Wholesale Billing Invoice #${quotation.quoteNumber} (Total Amount: Tk ${Number(quotation.totalWholesaleSum || 0).toLocaleString()} for ${quotation.totalQty || 0} Pcs). Please process delivery.`
    );
    window.open(`https://wa.me/8801837223147?text=${text}`, "_blank");
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", padding: "24px 16px" }}>
      <div style={{ maxWidth: "980px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "20px" }}>
        {/* Top Header Card */}
        <div
          style={{
            background: "#ffffff",
            padding: "24px",
            borderRadius: "16px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 4px 16px rgba(15, 23, 42, 0.05)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <img
              src="/liora-logo.svg"
              alt="LIORA"
              style={{ height: "36px", width: "auto" }}
              onError={(e) => {
                e.target.style.display = "none";
              }}
            />
            <div>
              <div style={{ fontSize: "20px", fontWeight: "900", color: "#0f172a" }}>
                LIORA <span style={{ color: "#e11d48", fontSize: "14px", fontWeight: "700" }}>BEAUTY & WEAR</span>
              </div>
              <div style={{ fontSize: "12px", color: "#64748b" }}>
                Official Wholesale B2B Billing Invoice & Quotation
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              style={{
                background: "#e11d48",
                color: "#ffffff",
                border: "none",
                padding: "10px 18px",
                borderRadius: "8px",
                fontWeight: "800",
                fontSize: "13px",
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(225, 29, 72, 0.25)",
              }}
            >
              {isDownloadingPdf ? "⏳ ডাউনলোড হচ্ছে..." : "📥 PDF ইনভয়েস ডাউনলোড"}
            </button>

            <button
              type="button"
              onClick={handleWhatsAppConfirm}
              style={{
                background: "#16a34a",
                color: "#ffffff",
                border: "none",
                padding: "10px 18px",
                borderRadius: "8px",
                fontWeight: "800",
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              💬 WhatsApp এ নিশ্চিত করুন
            </button>
          </div>
        </div>

        {/* Invoice Meta & Client Details Box */}
        <div
          style={{
            background: "#ffffff",
            padding: "20px 24px",
            borderRadius: "14px",
            border: "1px solid #e2e8f0",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "16px",
          }}
        >
          <div>
            <div style={{ fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase" }}>
              ইনভয়েস রেফারেন্স নং
            </div>
            <div style={{ fontSize: "18px", fontWeight: "900", color: "#0f172a", marginTop: "2px" }}>
              #{quotation.quoteNumber}
            </div>
            <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
              তারিখ: {new Date(quotation.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </div>
          </div>

          <div>
            <div style={{ fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase" }}>
              বিল গ্রহীতা / কাস্টমার
            </div>
            <div style={{ fontSize: "16px", fontWeight: "900", color: "#0f172a", marginTop: "2px" }}>
              {quotation.clientInfo?.clientName || "Valued Wholesale Partner"}
            </div>
            <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
              {quotation.clientInfo?.clientPhone} {quotation.clientInfo?.clientAddress ? `• ${quotation.clientInfo.clientAddress}` : ""}
            </div>
          </div>

          <div>
            <div style={{ fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase" }}>
              স্ট্যাটাস ও ভ্যালিডিটি
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
              <span
                style={{
                  background: quotation.status === "Converted" ? "#dcfce7" : "#eff6ff",
                  color: quotation.status === "Converted" ? "#15803d" : "#2563eb",
                  padding: "4px 10px",
                  borderRadius: "6px",
                  fontWeight: "800",
                  fontSize: "12px",
                }}
              >
                {quotation.status}
              </span>
              <span style={{ fontSize: "11.5px", color: "#64748b" }}>৭ দিন মেয়াদী</span>
            </div>
          </div>
        </div>

        {/* Summary Metric Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "12px",
          }}
        >
          <div style={{ background: "#ffffff", padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: "11.5px", color: "#64748b", fontWeight: "700" }}>মোট আইটেম ও সংখ্যা</div>
            <div style={{ fontSize: "20px", fontWeight: "900", color: "#0f172a", marginTop: "4px" }}>
              {quotation.totalItems} আইটেম • <span style={{ color: "#e11d48" }}>{quotation.totalQty} Pcs</span>
            </div>
          </div>

          <div style={{ background: "#ffffff", padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: "11.5px", color: "#64748b", fontWeight: "700" }}>খুচরা মার্কেট মূল্য (MRP)</div>
            <div style={{ fontSize: "20px", fontWeight: "900", color: "#64748b", marginTop: "4px" }}>
              ৳{Number(quotation.totalMarketSum || 0).toLocaleString()}
            </div>
          </div>

          <div style={{ background: "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)", padding: "16px", borderRadius: "12px", border: "1px solid #86efac" }}>
            <div style={{ fontSize: "11.5px", color: "#166534", fontWeight: "700" }}>মোট সাশ্রয় (Savings)</div>
            <div style={{ fontSize: "20px", fontWeight: "900", color: "#15803d", marginTop: "4px" }}>
              ৳{Number(quotation.totalSavings || 0).toLocaleString()}
            </div>
          </div>

          <div style={{ background: "#ffffff", padding: "16px", borderRadius: "12px", border: "1.5px solid #fda4af" }}>
            <div style={{ fontSize: "11.5px", color: "#9f1239", fontWeight: "700" }}>সর্বমোট প্রদেয় পাইকারি বিল</div>
            <div style={{ fontSize: "22px", fontWeight: "900", color: "#e11d48", marginTop: "4px" }}>
              ৳{Number(quotation.totalWholesaleSum || 0).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Brand-Wise Products Tables */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {brandNames.map((bName) => {
            const bItems = brandGroups[bName];
            const bQty = bItems.reduce((acc, it) => acc + (it.quantity || 1), 0);
            const bSubtotal = bItems.reduce((acc, it) => acc + (it.lineTotal || it.wholesalePrice * it.quantity), 0);

            return (
              <div
                key={bName}
                style={{
                  background: "#ffffff",
                  borderRadius: "14px",
                  border: "1px solid #cbd5e1",
                  overflow: "hidden",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
                }}
              >
                {/* Brand Banner */}
                <div
                  style={{
                    background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
                    color: "#ffffff",
                    padding: "10px 16px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "8px",
                  }}
                >
                  <div style={{ fontWeight: "900", fontSize: "14px" }}>
                    🏷️ BRAND: {bName.toUpperCase()}{" "}
                    <span style={{ fontSize: "11.5px", color: "#94a3b8", fontWeight: "600" }}>
                      ({bItems.length} আইটেম)
                    </span>
                  </div>
                  <div style={{ fontSize: "12.5px" }}>
                    <span>{bQty} Pcs</span>
                    <span style={{ margin: "0 8px", color: "#64748b" }}>|</span>
                    <span style={{ color: "#f43f5e", fontWeight: "800" }}>
                      সাবটোটাল: ৳{bSubtotal.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Table */}
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px", textAlign: "left" }}>
                    <thead style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                      <tr>
                        <th style={{ padding: "10px 12px", width: "45px", textAlign: "center", color: "#475569" }}>ছবি</th>
                        <th style={{ padding: "10px 12px", color: "#475569" }}>প্রোডাক্টের বিবরণ</th>
                        <th style={{ padding: "10px 12px", textAlign: "right", color: "#475569", width: "90px" }}>খুচরা MRP</th>
                        <th style={{ padding: "10px 12px", textAlign: "right", color: "#0f172a", width: "110px", fontWeight: "800" }}>পাইকারি দর</th>
                        <th style={{ padding: "10px 12px", textAlign: "center", color: "#0f172a", width: "90px", fontWeight: "800" }}>পরিমাণ</th>
                        <th style={{ padding: "10px 12px", textAlign: "right", color: "#e11d48", width: "120px", fontWeight: "900" }}>মোট টাকা</th>
                        <th style={{ padding: "10px 12px", textAlign: "center", color: "#166534", width: "70px" }}>ছাড়</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bItems.map((it, idx) => (
                        <tr
                          key={idx}
                          style={{
                            background: idx % 2 === 0 ? "#ffffff" : "#fbfcfe",
                            borderBottom: "1px solid #f1f5f9",
                          }}
                        >
                          <td style={{ padding: "8px 12px", textAlign: "center" }}>
                            {it.image ? (
                              <img
                                src={it.image}
                                alt=""
                                style={{
                                  width: "36px",
                                  height: "36px",
                                  objectFit: "contain",
                                  borderRadius: "6px",
                                  border: "1px solid #e2e8f0",
                                }}
                              />
                            ) : (
                              <div
                                style={{
                                  width: "36px",
                                  height: "36px",
                                  borderRadius: "6px",
                                  background: "#f1f5f9",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: "10px",
                                  color: "#94a3b8",
                                }}
                              >
                                📦
                              </div>
                            )}
                          </td>
                          <td style={{ padding: "8px 12px" }}>
                            <div style={{ fontWeight: "800", color: "#0f172a" }}>{it.name}</div>
                            {it.categoryName && (
                              <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                                {it.categoryName}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: "8px 12px", textAlign: "right", color: "#94a3b8" }}>
                            <span style={{ textDecoration: "line-through" }}>৳{Number(it.originalPrice || 0).toLocaleString()}</span>
                          </td>
                          <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: "800", color: "#0f172a" }}>
                            ৳{Number(it.wholesalePrice || 0).toLocaleString()}
                          </td>
                          <td style={{ padding: "8px 12px", textAlign: "center" }}>
                            <span style={{ fontWeight: "800", color: "#0f172a", background: "#f1f5f9", padding: "3px 8px", borderRadius: "6px" }}>
                              {it.quantity} Pcs
                            </span>
                          </td>
                          <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: "900", color: "#e11d48", fontSize: "13.5px" }}>
                            ৳{Number(it.lineTotal || it.wholesalePrice * it.quantity).toLocaleString()}
                          </td>
                          <td style={{ padding: "8px 12px", textAlign: "center" }}>
                            <span style={{ background: "#dcfce7", color: "#15803d", padding: "2px 6px", borderRadius: "4px", fontSize: "11px", fontWeight: "800" }}>
                              {it.discountPct}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Help & Branding */}
        <div
          style={{
            background: "#ffffff",
            padding: "20px",
            borderRadius: "14px",
            border: "1px solid #e2e8f0",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <div style={{ fontWeight: "800", color: "#0f172a", fontSize: "14px" }}>
            LIORA Beauty & Wear • Wholesale B2B Distribution Desk
          </div>
          <div style={{ fontSize: "12px", color: "#64748b" }}>
            যেকোনো জিজ্ঞাসা বা বাল্ক অর্ডারের জন্য যোগাযোগ করুন: <strong>+8801837223147</strong> (WhatsApp / কল) | ঢাকা, বাংলাদেশ
          </div>
        </div>
      </div>
    </div>
  );
}
