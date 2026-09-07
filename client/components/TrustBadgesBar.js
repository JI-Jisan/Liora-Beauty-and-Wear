"use client";

export default function TrustBadgesBar() {
  const badges = [
    {
      icon: "🛡️",
      title: "100% Authentic",
      subtitle: "Guaranteed Original",
      bg: "#ecfdf5",
      border: "#a7f3d0",
      color: "#065f46",
    },
    {
      icon: "🚚",
      title: "Cash On Delivery",
      subtitle: "Nationwide Shipping",
      bg: "#eff6ff",
      border: "#bfdbfe",
      color: "#1e40af",
    },
    {
      icon: "⚡",
      title: "Fast Express Delivery",
      subtitle: "24-48 Hours in Dhaka",
      bg: "#fffbeb",
      border: "#fde68a",
      color: "#92400e",
    },
    {
      icon: "🔄",
      title: "7 Days Easy Return",
      subtitle: "Hassle-Free Policy",
      bg: "#fff1f2",
      border: "#fecdd3",
      color: "#9f1239",
    },
  ];

  return (
    <section className="jt-trust-badges-new">
      <div className="jt-trust-badges-new-inner">
        {badges.map((badge, idx) => (
          <div
            key={idx}
            className="jt-trust-new-item"
            style={{
              borderColor: badge.border,
            }}
          >
            <div
              className="jt-trust-new-icon-wrap"
              style={{
                background: badge.bg,
                borderColor: badge.border,
              }}
            >
              <span className="jt-trust-new-icon">{badge.icon}</span>
            </div>
            <div className="jt-trust-new-text">
              <strong style={{ color: badge.color }}>{badge.title}</strong>
              <span>{badge.subtitle}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
