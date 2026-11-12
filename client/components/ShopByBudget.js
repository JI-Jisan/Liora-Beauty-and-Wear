"use client";

import Link from "next/link";

const BUDGET_TIERS = [
  {
    id: "under-499",
    icon: "👛",
    title: "পকেট ফ্রেন্ডলি",
    priceRange: "৳৪৯৯ এর নিচে",
    tagline: "লিপবাম, শিট মাস্ক, মিনি কেয়ার ও লিপলাইনার",
    badge: "বাজেট স্পেশাল",
    badgeBg: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
    bgGradient: "linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)",
    borderColor: "#bbf7d0",
    hoverBorder: "#10b981",
    priceColor: "#047857",
    href: "/products?maxPrice=499&budget=under-499",
  },
  {
    id: "500-999",
    icon: "🔥",
    title: "মোস্ট পপুলার",
    priceRange: "৳৫০০ – ৳৯৯৯",
    tagline: "লিপস্টিক, ব্রাইটনিং ফেসওয়াশ ও ময়েশ্চারাইজার",
    badge: "হট সেলার",
    badgeBg: "linear-gradient(135deg, #ff4d6d 0%, #e11d48 100%)",
    bgGradient: "linear-gradient(135deg, #fff1f2 0%, #ffffff 100%)",
    borderColor: "#fecdd3",
    hoverBorder: "#ff4d6d",
    priceColor: "#be123c",
    href: "/products?minPrice=500&maxPrice=999&budget=500-999",
  },
  {
    id: "1000-1999",
    icon: "🌸",
    title: "প্রিমিয়াম স্কিনকেয়ার",
    priceRange: "৳১,০০০ – ৳১,৯৯৯",
    tagline: "কোরিয়ান সিরাম, সানস্ক্রিন, টোনার ও ফাউন্ডেশন",
    badge: "টপ রেটেড",
    badgeBg: "linear-gradient(135deg, #ec4899 0%, #be185d 100%)",
    bgGradient: "linear-gradient(135deg, #fdf2f8 0%, #ffffff 100%)",
    borderColor: "#fbcfe8",
    hoverBorder: "#ec4899",
    priceColor: "#9d174d",
    href: "/products?minPrice=1000&maxPrice=1999&budget=1000-1999",
  },
  {
    id: "2000-plus",
    icon: "👑",
    title: "লাক্সারি ও কম্বো সেট",
    priceRange: "৳২,০০০+",
    tagline: "আমদানি করা এক্সক্লুসিভ স্কিনকেয়ার ও গিফট বক্স",
    badge: "লাক্সারি কালেকশন",
    badgeBg: "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)",
    bgGradient: "linear-gradient(135deg, #faf5ff 0%, #ffffff 100%)",
    borderColor: "#e9d5ff",
    hoverBorder: "#8b5cf6",
    priceColor: "#6d28d9",
    href: "/products?minPrice=2000&budget=2000-plus",
  },
];

export default function ShopByBudget() {
  return (
    <section
      style={{
        maxWidth: "1440px",
        margin: "12px auto 28px",
        padding: "0 16px",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* Section Header */}
      <div style={{ textAlign: "center", marginBottom: "20px" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            background: "linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)",
            color: "#e11d48",
            border: "1px solid #fecdd3",
            padding: "5px 16px",
            borderRadius: "999px",
            fontSize: "12px",
            fontWeight: "800",
            letterSpacing: "0.5px",
            textTransform: "uppercase",
            marginBottom: "10px",
            boxShadow: "0 2px 8px rgba(225, 29, 72, 0.08)",
          }}
        >
          <span>✨</span>
          <span>বাজেট শপিং • Shop by Budget</span>
        </div>

        <h2
          style={{
            fontSize: "clamp(20px, 4vw, 28px)",
            fontWeight: "900",
            color: "#0f172a",
            margin: "0 0 6px",
            letterSpacing: "-0.5px",
          }}
        >
          আপনার পছন্দের বাজেটে সেরা সৌন্দর্য পণ্য
        </h2>
        <p
          style={{
            fontSize: "clamp(12.5px, 2.5vw, 14px)",
            color: "#64748b",
            margin: "0 auto",
            maxWidth: "600px",
          }}
        >
          পকেট ফ্রেন্ডলি ডিল থেকে শুরু করে কোরিয়ান গ্লাস স্কিন ও প্রিমিয়াম কালেকশন — এক ক্লিকে ব্রাউজ করুন
        </p>
      </div>

      {/* Responsive Budget Cards */}
      <div
        className="budget-scroll-container"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "14px",
          width: "100%",
        }}
      >
        <style>{`
          @media (max-width: 640px) {
            .budget-scroll-container {
              grid-template-columns: repeat(2, 1fr) !important;
              gap: 10px !important;
            }
          }
          .budget-card-hover {
            transition: all 0.22s ease-in-out;
          }
          .budget-card-hover:hover {
            transform: translateY(-3px);
            box-shadow: 0 10px 24px rgba(0, 0, 0, 0.08) !important;
          }
          .budget-card-hover:active {
            transform: scale(0.98);
          }
        `}</style>

        {BUDGET_TIERS.map((tier) => (
          <Link
            key={tier.id}
            href={tier.href}
            className="budget-card-hover"
            style={{
              textDecoration: "none",
              background: tier.bgGradient,
              border: `1.5px solid ${tier.borderColor}`,
              borderRadius: "16px",
              padding: "16px 14px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.03)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Top Row: Icon & Tag */}
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "8px",
                }}
              >
                <span
                  style={{
                    fontSize: "24px",
                    lineHeight: 1,
                    filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.1))",
                  }}
                >
                  {tier.icon}
                </span>

                <span
                  style={{
                    background: tier.badgeBg,
                    color: "#ffffff",
                    fontSize: "10px",
                    fontWeight: "800",
                    padding: "2px 8px",
                    borderRadius: "20px",
                    letterSpacing: "0.4px",
                    textTransform: "uppercase",
                  }}
                >
                  {tier.badge}
                </span>
              </div>

              {/* Title & Range */}
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: "700",
                  color: "#64748b",
                  textTransform: "uppercase",
                  letterSpacing: "0.3px",
                  marginBottom: "2px",
                }}
              >
                {tier.title}
              </div>

              <div
                style={{
                  fontSize: "clamp(17px, 2.5vw, 21px)",
                  fontWeight: "900",
                  color: tier.priceColor,
                  letterSpacing: "-0.5px",
                  marginBottom: "6px",
                }}
              >
                {tier.priceRange}
              </div>

              <p
                style={{
                  fontSize: "11.5px",
                  color: "#475569",
                  margin: "0 0 12px",
                  lineHeight: "1.4",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {tier.tagline}
              </p>
            </div>

            {/* Bottom Button Pill */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 12px",
                background: "#ffffff",
                borderRadius: "10px",
                border: `1px solid ${tier.borderColor}`,
                fontSize: "12px",
                fontWeight: "800",
                color: tier.priceColor,
                marginTop: "auto",
              }}
            >
              <span>পণ্য দেখুন</span>
              <span style={{ fontSize: "14px", transform: "translateX(2px)" }}>➔</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
