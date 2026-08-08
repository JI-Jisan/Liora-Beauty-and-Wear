"use client";

export default function CategoryBar({
  categories = [],
  selectedCategory,
  onSelectCategory,
}) {
  const mainCategories = categories.filter((cat) => cat.type === "main");
  const moreCategories = categories.filter((cat) => cat.type === "more");

  return (
    <section className="jt-category-section">
      <div className="jt-category-scroll">
        <button
          type="button"
          className={`jt-cat-btn ${selectedCategory === "all" ? "active" : ""}`}
          onClick={() => onSelectCategory("all")}
        >
          All Products
        </button>

        {mainCategories.map((cat) => (
          <button
            key={cat._id}
            type="button"
            className={`jt-cat-btn ${selectedCategory === cat.name ? "active" : ""}`}
            onClick={() => onSelectCategory(cat.name)}
          >
            {cat.name}
          </button>
        ))}

        {moreCategories.map((cat) => (
          <button
            key={cat._id}
            type="button"
            className={`jt-cat-btn ${selectedCategory === cat.name ? "active" : ""}`}
            onClick={() => onSelectCategory(cat.name)}
          >
            {cat.name}
          </button>
        ))}
      </div>
    </section>
  );
}