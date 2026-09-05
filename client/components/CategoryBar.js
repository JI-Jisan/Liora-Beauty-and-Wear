"use client";

export default function CategoryBar({
  categories = [],
  selectedCategory,
  onSelectCategory,
}) {
  const displayCategories = categories;

  return (
    <section className="jt-category-section" style={{ background: "transparent", padding: "10px 0 16px", width: "100%", maxWidth: "100%", boxSizing: "border-box", overflow: "hidden" }}>
      <div className="jt-category-scroll" style={{ display: "flex", flexWrap: "nowrap", gap: "8px", overflowX: "auto", paddingBottom: "6px", width: "100%", maxWidth: "100%", boxSizing: "border-box", WebkitOverflowScrolling: "touch" }}>
        <button
          type="button"
          onClick={() => onSelectCategory("all")}
          style={{
            border: selectedCategory === "all" ? "none" : "1px solid #E2E8F0",
            background: selectedCategory === "all" ? "#FF4D6D" : "#FFFFFF",
            color: selectedCategory === "all" ? "#FFFFFF" : "#334155",
            padding: "10px 22px",
            borderRadius: "999px",
            fontWeight: selectedCategory === "all" ? "800" : "600",
            fontSize: "14px",
            cursor: "pointer",
            whiteSpace: "nowrap",
            flexShrink: 0,
            boxShadow: selectedCategory === "all" ? "0 4px 14px rgba(255, 77, 109, 0.25)" : "0 2px 6px rgba(0, 0, 0, 0.03)",
            transition: "all 0.2s ease",
          }}
        >
          All Products
        </button>

        {displayCategories.map((cat) => {
          const isActive = selectedCategory === cat._id || selectedCategory === cat.name;
          const label = typeof cat.parentCategory === "object" && cat.parentCategory?.name ? `${cat.parentCategory.name} ➔ ${cat.name}` : cat.name;

          return (
            <button
              key={cat._id}
              type="button"
              onClick={() => onSelectCategory(cat._id || cat.name)}
              style={{
                border: isActive ? "none" : "1px solid #E2E8F0",
                background: isActive ? "#FF4D6D" : "#FFFFFF",
                color: isActive ? "#FFFFFF" : "#334155",
                padding: "10px 22px",
                borderRadius: "999px",
                fontWeight: isActive ? "800" : "600",
                fontSize: "14px",
                cursor: "pointer",
                whiteSpace: "nowrap",
                flexShrink: 0,
                boxShadow: isActive ? "0 4px 14px rgba(255, 77, 109, 0.25)" : "0 2px 6px rgba(0, 0, 0, 0.03)",
                transition: "all 0.2s ease",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
    </section>
  );
}