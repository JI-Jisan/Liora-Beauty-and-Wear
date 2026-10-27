"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useCampus } from "@/context/CampusContext";
import { getImageUrl } from "@/lib/api";
import { cld } from "@/lib/cloudinary";

const QUICK_PROMPTS = [
  { icon: "☀️", label: "রোদে সানট্যান ও ড্যামেজ", query: "আশুলিয়া ক্যাম্পাসে কড়া রোদে সানট্যান আর মুখ কালচে হয়ে গেছে, কি রুটিন ফলো করব?" },
  { icon: "🧴", label: "ব্রণ ও দাগ দূর করার রুটিন", query: "মুখে খুব ব্রণ আর ব্রণের জেদি দাগ হচ্ছে, সমাধান কি?" },
  { icon: "💧", label: "তৈলাক্ত স্কিনের সানস্ক্রিন", query: "তৈলাক্ত ও সংবেদনশীল স্কিনের জন্য হালকা ও নন-স্টিকি সানস্ক্রিন সাজেস্ট কর।" },
  { icon: "❄️", label: "শীতের জন্য ড্রাই স্কিন কেয়ার", query: "ত্বক খুব খসখসে ও শুষ্ক হয়ে গেছে, ডিপ ময়েশ্চারাইজিং রুটিন চাই।" },
];

export default function SkinoraWidget() {
  const pathname = usePathname() || "";
  const { addToCart } = useCart();
  const { activeCoupon, getProductPrice } = useCampus();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      sender: "bot",
      text: "আসসালামু আলাইকুম! 🌸 আমি **Skinora**, LIORA Beauty & Wear-এর AI স্কিনকেয়ার কনসালট্যান্ট।\n\nআপনার স্কিন টাইপ কেমন বা কী ধরণের সমস্যা হচ্ছে আমাকে জানান (যেমন: ব্রণ, সানট্যান, অতিরিক্ত তেল বা শুষ্কতা)। আমি ডার্মাটোলজি অনুযায়ী সমাধান বুঝিয়ে বলব এবং আমাদের স্টোরের ১০০% আসল প্রোডাক্ট সাজেস্ট করব!",
      products: [],
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [addedItemIds, setAddedItemIds] = useState(new Set());

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto scroll to bottom
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, isLoading]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 250);
    }
  }, [isOpen]);

  // Don't show in admin or invoice routes
  if (pathname.startsWith("/admin") || pathname.startsWith("/invoice")) {
    return null;
  }

  const handleSend = async (queryText = null) => {
    const textToSend = (queryText || inputText).trim();
    if (!textToSend || isLoading) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: textToSend,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setIsLoading(true);

    try {
      // Build lightweight history context
      const historyContext = messages.slice(-5).map((m) => ({
        sender: m.sender,
        text: m.text,
      }));

      const res = await fetch("/api/skinora", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          history: historyContext,
          couponCode: activeCoupon?.code || "",
        }),
      });

      const data = await res.json();

      if (data.success && data.reply) {
        setMessages((prev) => [
          ...prev,
          {
            id: `bot-${Date.now()}`,
            sender: "bot",
            text: data.reply,
            products: data.products || [],
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `bot-err-${Date.now()}`,
            sender: "bot",
            text: data.reply || "দুঃখিত, কোনো একটি সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।",
            products: [],
          },
        ]);
      }
    } catch (err) {
      console.error("Skinora chat error:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-err-${Date.now()}`,
          sender: "bot",
          text: "সার্ভারের সাথে সংযোগে সমস্যা হচ্ছে। আপনার ইন্টারনেট কানেকশন চেক করে আবার চেষ্টা করুন।",
          products: [],
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToCart = (product) => {
    if (!product) return;
    const campusPricing = getProductPrice ? getProductPrice(product) : null;
    const itemToAdd = campusPricing?.hasDiscount
      ? {
          ...product,
          offerPrice: campusPricing.campusPrice,
          originalOfferPrice: product.offerPrice,
          isCampusSpecial: true,
          campusCode: activeCoupon?.code,
          campusName: activeCoupon?.short,
          campusDiscountPct: campusPricing.discountPct,
        }
      : product;

    addToCart(itemToAdd);
    setAddedItemIds((prev) => new Set([...prev, product._id]));
    setTimeout(() => {
      setAddedItemIds((prev) => {
        const next = new Set(prev);
        next.delete(product._id);
        return next;
      });
    }, 2500);
  };

  const resetChat = () => {
    setMessages([
      {
        id: "welcome-reset",
        sender: "bot",
        text: "চ্যাট রিসেট হয়েছে! 🌸 আপনার স্কিনের অন্য কোনো সমস্যা বা রুটিন সম্পর্কে জানতে চাইলে লিখুন।",
        products: [],
      },
    ]);
  };

  return (
    <>
      {/* ── 1. FLOATING TRIGGER BUTTON ── */}
      <div className="jt-skinora-float">
        {!isOpen && (
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            aria-label="Open Skinora AI Skincare Assistant"
            style={{
              background: "linear-gradient(135deg, #e11d48 0%, #be123c 50%, #881337 100%)",
              color: "#ffffff",
              border: "2px solid rgba(255, 255, 255, 0.4)",
              borderRadius: "50px",
              padding: "10px 18px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: "0 8px 24px rgba(225, 29, 72, 0.35), 0 2px 8px rgba(0, 0, 0, 0.12)",
              cursor: "pointer",
              transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
              transform: "scale(1)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.05) translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 12px 30px rgba(225, 29, 72, 0.45)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.boxShadow = "0 8px 24px rgba(225, 29, 72, 0.35)";
            }}
          >
            <span style={{ fontSize: "18px", animation: "skinoraSpin 3s infinite linear" }}>✨</span>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: "13px", fontWeight: "900", letterSpacing: "0.02em", lineHeight: 1.1 }}>
                Skinora AI
              </div>
              <div style={{ fontSize: "9.5px", opacity: 0.9, fontWeight: "600" }}>
                ফ্রি স্কিন কনসালট্যান্ট
              </div>
            </div>
            <span
              style={{
                background: "#10b981",
                width: 8,
                height: 8,
                borderRadius: "50%",
                boxShadow: "0 0 6px #10b981",
              }}
            />
          </button>
        )}
      </div>

      {/* ── 2. CHAT MODAL WINDOW ── */}
      {isOpen && (
        <div className="jt-skinora-modal">
          {/* Header */}
          <div
            style={{
              background: "linear-gradient(135deg, #fff1f2 0%, #ffe4e6 50%, #fecdd3 100%)",
              padding: "14px 16px",
              borderBottom: "1px solid #fecdd3",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #e11d48, #9f1239)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#ffffff",
                  fontSize: "18px",
                  boxShadow: "0 4px 10px rgba(225, 29, 72, 0.3)",
                }}
              >
                ✨
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "900", color: "#881337" }}>
                    Skinora AI
                  </h3>
                  <span
                    style={{
                      background: "#dcfce7",
                      color: "#15803d",
                      fontSize: "9.5px",
                      fontWeight: 800,
                      padding: "1px 6px",
                      borderRadius: "10px",
                    }}
                  >
                    ● Online
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: "11px", color: "#64748b", fontWeight: 600 }}>
                  LIORA-র এআই স্কিনকেয়ার কনসালট্যান্ট
                </p>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <button
                type="button"
                onClick={resetChat}
                title="নতুন করে শুরু করুন"
                style={{
                  background: "#ffffff",
                  border: "1px solid #fecdd3",
                  borderRadius: "8px",
                  width: 30,
                  height: 30,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "#64748b",
                  fontSize: "13px",
                }}
              >
                🔄
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="বন্ধ করুন"
                style={{
                  background: "#ffffff",
                  border: "1px solid #fecdd3",
                  borderRadius: "8px",
                  width: 30,
                  height: 30,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "#881337",
                  fontSize: "14px",
                  fontWeight: "900",
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Quick Prompt Chips */}
          <div
            style={{
              padding: "8px 12px",
              background: "#fafafa",
              borderBottom: "1px solid #f1f5f9",
              display: "flex",
              gap: "6px",
              overflowX: "auto",
              whiteSpace: "nowrap",
              scrollbarWidth: "none",
            }}
          >
            {QUICK_PROMPTS.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSend(p.query)}
                disabled={isLoading}
                style={{
                  background: "#ffffff",
                  border: "1px solid #fecdd3",
                  borderRadius: "20px",
                  padding: "4px 10px",
                  fontSize: "11px",
                  fontWeight: "700",
                  color: "#881337",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  flexShrink: 0,
                  transition: "all 0.15s ease",
                }}
              >
                <span>{p.icon}</span>
                <span>{p.label}</span>
              </button>
            ))}
          </div>

          {/* Messages Stream */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "14px 12px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              background: "#fcfcfd",
            }}
          >
            {messages.map((m) => {
              const isUser = m.sender === "user";
              return (
                <div
                  key={m.id}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: isUser ? "flex-end" : "flex-start",
                    gap: "6px",
                  }}
                >
                  <div
                    style={{
                      maxWidth: "88%",
                      padding: "10px 14px",
                      borderRadius: isUser ? "16px 16px 2px 16px" : "16px 16px 16px 2px",
                      background: isUser
                        ? "linear-gradient(135deg, #e11d48, #be123c)"
                        : "#ffffff",
                      color: isUser ? "#ffffff" : "#1e293b",
                      fontSize: "13px",
                      lineHeight: "1.55",
                      border: isUser ? "none" : "1px solid #f1f5f9",
                      boxShadow: isUser
                        ? "0 4px 12px rgba(225, 29, 72, 0.25)"
                        : "0 2px 8px rgba(0, 0, 0, 0.04)",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    }}
                  >
                    {m.text}
                  </div>

                  {/* Recommended Products Carousel / Grid */}
                  {!isUser && m.products && m.products.length > 0 && (
                    <div
                      style={{
                        width: "100%",
                        marginTop: "4px",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "11px",
                          fontWeight: "800",
                          color: "#881337",
                          marginBottom: "6px",
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <span>🛍️</span>
                        <span>আপনার জন্য সাজেস্টেড প্রোডাক্টস:</span>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          gap: "8px",
                          overflowX: "auto",
                          paddingBottom: "8px",
                          scrollbarWidth: "thin",
                        }}
                      >
                        {m.products.map((p) => {
                          const isAdded = addedItemIds.has(p._id);
                          const campusPricing = getProductPrice ? getProductPrice(p) : null;
                          const effectivePrice = campusPricing?.hasDiscount
                            ? campusPricing.campusPrice
                            : Number(p.offerPrice || p.originalPrice || 0);

                          return (
                            <div
                              key={p._id}
                              style={{
                                width: "160px",
                                flexShrink: 0,
                                background: "#ffffff",
                                border: "1px solid #fecdd3",
                                borderRadius: "12px",
                                overflow: "hidden",
                                display: "flex",
                                flexDirection: "column",
                                boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                              }}
                            >
                              <Link
                                href={`/products/${p._id}`}
                                style={{ textDecoration: "none", color: "inherit" }}
                              >
                                <div
                                  style={{
                                    width: "100%",
                                    height: "100px",
                                    background: "#f8fafc",
                                    position: "relative",
                                  }}
                                >
                                  <img
                                    src={cld(p.image, 250, 250) || getImageUrl(p.image)}
                                    alt={p.name}
                                    style={{
                                      width: "100%",
                                      height: "100%",
                                      objectFit: "cover",
                                    }}
                                  />
                                  {p.brand?.name && (
                                    <span
                                      style={{
                                        position: "absolute",
                                        bottom: 4,
                                        left: 4,
                                        background: "rgba(15, 23, 42, 0.75)",
                                        color: "#fff",
                                        fontSize: "9px",
                                        fontWeight: 800,
                                        padding: "1px 5px",
                                        borderRadius: "4px",
                                      }}
                                    >
                                      {p.brand.name}
                                    </span>
                                  )}
                                </div>

                                <div style={{ padding: "8px" }}>
                                  <div
                                    style={{
                                      fontSize: "11px",
                                      fontWeight: "700",
                                      color: "#0f172a",
                                      lineHeight: 1.3,
                                      height: "28px",
                                      overflow: "hidden",
                                      display: "-webkit-box",
                                      WebkitLineClamp: 2,
                                      WebkitBoxOrient: "vertical",
                                    }}
                                  >
                                    {p.name}
                                  </div>

                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "baseline",
                                      gap: "4px",
                                      marginTop: "4px",
                                    }}
                                  >
                                    <span
                                      style={{
                                        fontSize: "13px",
                                        fontWeight: "900",
                                        color: "#e11d48",
                                      }}
                                    >
                                      ৳{effectivePrice}
                                    </span>
                                    {p.originalPrice > effectivePrice && (
                                      <span
                                        style={{
                                          fontSize: "10px",
                                          color: "#94a3b8",
                                          textDecoration: "line-through",
                                        }}
                                      >
                                        ৳{p.originalPrice}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </Link>

                              <div style={{ padding: "0 8px 8px" }}>
                                <button
                                  type="button"
                                  onClick={() => handleAddToCart(p)}
                                  style={{
                                    width: "100%",
                                    background: isAdded ? "#10b981" : "#881337",
                                    color: "#ffffff",
                                    border: "none",
                                    borderRadius: "6px",
                                    padding: "5px 0",
                                    fontSize: "11px",
                                    fontWeight: "800",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: "3px",
                                    transition: "background 0.2s ease",
                                  }}
                                >
                                  {isAdded ? "✓ যোগ হয়েছে" : "+ Add to Cart"}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {isLoading && (
              <div
                style={{
                  alignSelf: "flex-start",
                  background: "#ffffff",
                  padding: "10px 14px",
                  borderRadius: "16px 16px 16px 2px",
                  border: "1px solid #f1f5f9",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "12px",
                  color: "#64748b",
                  fontWeight: 600,
                }}
              >
                <span style={{ fontSize: "14px", animation: "skinoraSpin 1.5s infinite linear" }}>✨</span>
                <span>Skinora সমাধান বিশ্লেষণ করছে...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <div
            style={{
              padding: "10px 12px",
              background: "#ffffff",
              borderTop: "1px solid #fecdd3",
            }}
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="আপনার স্কিনের সমস্যা বা প্রশ্ন লিখুন..."
                disabled={isLoading}
                style={{
                  flex: 1,
                  padding: "10px 14px",
                  borderRadius: "24px",
                  border: "1.5px solid #fecdd3",
                  fontSize: "13px",
                  color: "#0f172a",
                  outline: "none",
                  background: "#fafafa",
                  transition: "border 0.2s ease",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#e11d48")}
                onBlur={(e) => (e.target.style.borderColor = "#fecdd3")}
              />

              <button
                type="submit"
                disabled={!inputText.trim() || isLoading}
                aria-label="Send message to Skinora"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: !inputText.trim() || isLoading
                    ? "#e2e8f0"
                    : "linear-gradient(135deg, #e11d48, #be123c)",
                  color: "#ffffff",
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "16px",
                  cursor: !inputText.trim() || isLoading ? "not-allowed" : "pointer",
                  transition: "transform 0.15s ease",
                  flexShrink: 0,
                  boxShadow: !inputText.trim() || isLoading
                    ? "none"
                    : "0 4px 12px rgba(225, 29, 72, 0.3)",
                }}
              >
                ➔
              </button>
            </form>

            <div
              style={{
                textAlign: "center",
                fontSize: "10px",
                color: "#94a3b8",
                marginTop: "6px",
              }}
            >
              🔒 100% অথেনটিক কোরিয়ান ও গ্লোবাল স্কিনকেয়ার গ্যারান্টি • LIORA
            </div>
          </div>
        </div>
      )}

      {/* Embedded Global Keyframes & Responsive Classes */}
      <style jsx global>{`
        .jt-skinora-float {
          position: fixed;
          bottom: 84px;
          right: 20px;
          z-index: 9991;
        }
        .jt-skinora-modal {
          position: fixed;
          bottom: 20px;
          right: 20px;
          z-index: 9999;
          width: min(430px, calc(100vw - 28px));
          height: min(640px, calc(100vh - 40px));
          background: #ffffff;
          border-radius: 20px;
          box-shadow: 0 20px 50px rgba(15, 23, 42, 0.25), 0 4px 20px rgba(225, 29, 72, 0.15);
          border: 1.5px solid #fecdd3;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          animation: skinoraSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @media (max-width: 768px) {
          .jt-skinora-float {
            bottom: calc(125px + env(safe-area-inset-bottom, 8px));
            right: 14px;
          }
          .jt-skinora-modal {
            bottom: calc(68px + env(safe-area-inset-bottom, 8px));
            right: 12px;
            width: calc(100vw - 24px);
            height: calc(100vh - 120px);
          }
        }
        @keyframes skinoraSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes skinoraSlideUp {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </>
  );
}
