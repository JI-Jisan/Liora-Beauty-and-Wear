"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { generateWholesalePdf, buildHierarchicalGroups } from "@/lib/wholesalePdf";

export default function DigitalQuotationPage({ params: paramsPromise }) {
  const params = use(paramsPromise);
  const quoteId = params?.id;

  const [quotation, setQuotation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  // Grouping Mode: 'brand' (Brand -> Category) | 'category' (Category -> Brand)
  const [groupByMode, setGroupByMode] = useState("brand");

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

  // Build Hierarchical Grouping (Brand -> Category or Category -> Brand)
  const isBrandFirst = groupByMode === "brand";
  const hierarchicalGroups = buildHierarchicalGroups(quotation.items || [], groupByMode);

  const handleDownloadPdf = async (customGroupBy = null) => {
    const targetGroup = customGroupBy || groupByMode;
    setIsDownloadingPdf(true);
    try {
      await generateWholesalePdf({
        items: quotation.items,
        clientInfo: quotation.clientInfo || {},
        quoteNumber: quotation.quoteNumber,
        groupBy: targetGroup,
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
      <div style={{ maxWidth: "1020px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "20px" }}>
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

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
            <button
              type="button"
              onClick={() => handleDownloadPdf()}
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
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              {isDownloadingPdf ? (
                "⏳ ডাউনলোড হচ্ছে..."
              ) : (
                `📥 PDF ডাউনলোড (${isBrandFirst ? "ব্র্যান্ড ➔ ক্যাটাগরি" : "ক্যাটাগরি ➔ ব্র্যান্ড"})`
              )}
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
            <div style={{ fontSize: "20px", fontWeight: "900", color: "#334155", marginTop: "4px" }}>
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

        {/* 2 GROUPING OPTIONS TOGGLE BAR */}
        <div
          style={{
            background: "#ffffff",
            padding: "16px 20px",
            borderRadius: "14px",
            border: "1.5px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
            boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
          }}
        >
          <div>
            <div style={{ fontSize: "14px", fontWeight: "900", color: "#0f172a", display: "flex", alignItems: "center", gap: "6px" }}>
              <span>🔄 ইনভয়েস প্রোডাক্ট বিন্যাস (2 Grouping Modes)</span>
            </div>
            <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
              {isBrandFirst
                ? "🏷️ ব্র্যান্ড অনুযায়ী ভাগ: প্রথমে ব্র্যান্ড (যেমন: Dove), এরপর সাবানের আইটেম আলাদা, শ্যাম্পুর আইটেম আলাদা।"
                : "📁 ক্যাটাগরি অনুযায়ী ভাগ: প্রথমে ক্যাটাগরি (যেমন: শ্যাম্পু), এরপর Dove ও অন্যান্য ব্র্যান্ড আলাদা।"}
            </div>
          </div>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => setGroupByMode("brand")}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: isBrandFirst ? "2px solid #e11d48" : "1.5px solid #cbd5e1",
                background: isBrandFirst ? "#fff1f2" : "#ffffff",
                color: isBrandFirst ? "#e11d48" : "#475569",
                fontWeight: "800",
                fontSize: "12.5px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                boxShadow: isBrandFirst ? "0 2px 8px rgba(225, 29, 72, 0.15)" : "none",
                transition: "all 0.15s ease",
              }}
            >
              <span>🏷️ ব্র্যান্ড ➔ ক্যাটাগরি</span>
              {isBrandFirst && <span style={{ fontSize: "10px", background: "#e11d48", color: "#fff", padding: "1px 6px", borderRadius: "10px" }}>Active</span>}
            </button>

            <button
              type="button"
              onClick={() => setGroupByMode("category")}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: !isBrandFirst ? "2px solid #0f172a" : "1.5px solid #cbd5e1",
                background: !isBrandFirst ? "#0f172a" : "#ffffff",
                color: !isBrandFirst ? "#ffffff" : "#475569",
                fontWeight: "800",
                fontSize: "12.5px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                boxShadow: !isBrandFirst ? "0 2px 8px rgba(15, 23, 42, 0.15)" : "none",
                transition: "all 0.15s ease",
              }}
            >
              <span>📁 ক্যাটাগরি ➔ ব্র্যান্ড</span>
              {!isBrandFirst && <span style={{ fontSize: "10px", background: "#e11d48", color: "#fff", padding: "1px 6px", borderRadius: "10px" }}>Active</span>}
            </button>
          </div>
        </div>

        {/* Hierarchical Products Display */}
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          {hierarchicalGroups.map((pGroup) => (
            <div
              key={pGroup.primaryName}
              style={{
                background: "#ffffff",
                borderRadius: "14px",
                border: "1px solid #cbd5e1",
                overflow: "hidden",
                boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              }}
            >
              {/* Primary Header Banner */}
              <div
                style={{
                  background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
                  color: "#ffffff",
                  padding: "12px 18px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "8px",
                }}
              >
                <div style={{ fontWeight: "900", fontSize: "14.5px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>{isBrandFirst ? "🏷️ BRAND:" : "📁 CATEGORY:"}</span>
                  <span style={{ letterSpacing: "0.5px" }}>{pGroup.primaryName.toUpperCase()}</span>
                  <span style={{ fontSize: "12px", color: "#94a3b8", fontWeight: "600" }}>
                    ({pGroup.items.length} আইটেম)
                  </span>
                </div>
                <div style={{ fontSize: "12.5px" }}>
                  <span>{pGroup.totalQty} Pcs</span>
                  <span style={{ margin: "0 8px", color: "#64748b" }}>|</span>
                  <span style={{ color: "#f43f5e", fontWeight: "800" }}>
                    সাবটোটাল: ৳{pGroup.subtotal.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Secondary Sub-groups (Categories under Brand OR Brands under Category) */}
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", padding: "12px" }}>
                {pGroup.secondaryGroups.map((sGroup) => (
                  <div
                    key={sGroup.secondaryName}
                    style={{
                      borderRadius: "10px",
                      border: "1px solid #e2e8f0",
                      overflow: "hidden",
                    }}
                  >
                    {/* Secondary Sub-header Bar */}
                    <div
                      style={{
                        background: "#f8fafc",
                        padding: "8px 14px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: "6px",
                        borderLeft: "4px solid #e11d48",
                        borderBottom: "1px solid #e2e8f0",
                      }}
                    >
                      <div style={{ fontSize: "12.5px", fontWeight: "800", color: "#1e293b" }}>
                        {isBrandFirst ? "📁 ক্যাটাগরি: " : "🏷️ ব্র্যান্ড: "}
                        <span style={{ color: "#0f172a" }}>{sGroup.secondaryName}</span>
                      </div>
                      <div style={{ fontSize: "11.5px", color: "#64748b", fontWeight: "700" }}>
                        <span>{sGroup.items.length} আইটেম</span>
                        <span style={{ margin: "0 6px" }}>•</span>
                        <span>{sGroup.totalQty} Pcs</span>
                        <span style={{ margin: "0 6px" }}>•</span>
                        <span style={{ color: "#e11d48", fontWeight: "800" }}>
                          ৳{sGroup.subtotal.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Table of items */}
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px", textAlign: "left" }}>
                        <thead style={{ background: "#ffffff", borderBottom: "1px solid #e2e8f0" }}>
                          <tr>
                            <th style={{ padding: "8px 10px", width: "45px", textAlign: "center", color: "#475569" }}>ছবি</th>
                            <th style={{ padding: "8px 10px", color: "#475569" }}>প্রোডাক্টের বিবরণ</th>
                            <th style={{ padding: "8px 10px", textAlign: "right", color: "#334155", width: "95px", fontWeight: "800" }}>
                              খুচরা MRP
                            </th>
                            <th style={{ padding: "8px 10px", textAlign: "center", color: "#166534", width: "85px", fontWeight: "800" }}>
                              ছাড় (% OFF)
                            </th>
                            <th style={{ padding: "8px 10px", textAlign: "right", color: "#0f172a", width: "110px", fontWeight: "900" }}>
                              পাইকারি দর
                            </th>
                            <th style={{ padding: "8px 10px", textAlign: "center", color: "#0f172a", width: "85px", fontWeight: "800" }}>
                              পরিমাণ
                            </th>
                            <th style={{ padding: "8px 10px", textAlign: "right", color: "#e11d48", width: "115px", fontWeight: "900" }}>
                              মোট টাকা
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {sGroup.items.map((it, idx) => (
                            <tr
                              key={idx}
                              style={{
                                background: idx % 2 === 0 ? "#ffffff" : "#fbfcfe",
                                borderBottom: "1px solid #f1f5f9",
                              }}
                            >
                              <td style={{ padding: "8px 10px", textAlign: "center" }}>
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
                              <td style={{ padding: "8px 10px" }}>
                                <div style={{ fontWeight: "800", color: "#0f172a" }}>{it.name}</div>
                                <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                                  {isBrandFirst ? it.categoryName : it.brandName}
                                </div>
                              </td>
                              {/* MRP - Clean, distinct styling, NO STRIKETHROUGH */}
                              <td style={{ padding: "8px 10px", textAlign: "right" }}>
                                <span
                                  style={{
                                    fontWeight: "800",
                                    color: "#334155",
                                    background: "#f1f5f9",
                                    padding: "3px 8px",
                                    borderRadius: "6px",
                                    border: "1px solid #e2e8f0",
                                    fontSize: "12px",
                                    display: "inline-block",
                                  }}
                                  title="খুচরা মার্কেট বিক্রয় মূল্য (MRP)"
                                >
                                  ৳{Number(it.originalPrice || 0).toLocaleString()}
                                </span>
                              </td>
                              {/* Discount % badge */}
                              <td style={{ padding: "8px 10px", textAlign: "center" }}>
                                <span
                                  style={{
                                    background: "#dcfce7",
                                    color: "#15803d",
                                    border: "1px solid #86efac",
                                    padding: "2px 7px",
                                    borderRadius: "6px",
                                    fontSize: "11px",
                                    fontWeight: "900",
                                    display: "inline-block",
                                  }}
                                >
                                  {it.discountPct}% OFF
                                </span>
                              </td>
                              {/* Wholesale Rate */}
                              <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: "900", color: "#0f172a", fontSize: "13px" }}>
                                ৳{Number(it.wholesalePrice || 0).toLocaleString()}
                              </td>
                              {/* Quantity */}
                              <td style={{ padding: "8px 10px", textAlign: "center" }}>
                                <span style={{ fontWeight: "800", color: "#0f172a", background: "#f1f5f9", padding: "3px 8px", borderRadius: "6px" }}>
                                  {it.quantity} Pcs
                                </span>
                              </td>
                              {/* Line Total */}
                              <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: "900", color: "#e11d48", fontSize: "13.5px" }}>
                                ৳{Number(it.lineTotal || it.wholesalePrice * it.quantity).toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
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
