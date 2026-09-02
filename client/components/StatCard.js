const TONES = {
  green: "background: #f0fdf4; border: 1px solid #86efac; color: #166534;",
  red: "background: #fef2f2; border: 1px solid #fca5a5; color: #991b1b;",
  blue: "background: #eff6ff; border: 1px solid #93c5fd; color: #1e40af;",
  amber: "background: #fffbeb; border: 1px solid #fde68a; color: #92400e;",
  pink: "background: #fdf4ff; border: 1px solid #f9a8d4; color: #86198f;",
};

const VALUE_COLORS = {
  green: "#15803d",
  red: "#b91c1c",
  blue: "#2563eb",
  amber: "#d97706",
  pink: "#a21caf",
};

export default function StatCard({ label, value, tone = "blue", icon }) {
  const toneStyle = TONES[tone] || TONES.blue;
  const valColor = VALUE_COLORS[tone] || "#0f172a";

  return (
    <div
      style={{
        borderRadius: "12px",
        padding: "10px 12px",
        boxSizing: "border-box",
        minWidth: 0,
        ...Object.fromEntries(
          toneStyle
            .split(";")
            .filter(Boolean)
            .map((s) => {
              const [k, v] = s.split(":");
              return [k.trim().replace(/-([a-z])/g, (g) => g[1].toUpperCase()), v.trim()];
            })
        ),
      }}
    >
      <p style={{ margin: 0, fontSize: "11px", fontWeight: "700", opacity: 0.85, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {icon} {label}
      </p>
      <p style={{ margin: "4px 0 0", fontSize: "18px", fontWeight: "800", color: valColor, wordBreak: "break-word" }}>
        {value}
      </p>
    </div>
  );
}
