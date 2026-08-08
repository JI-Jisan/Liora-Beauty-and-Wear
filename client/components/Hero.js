"use client";

export default function Hero({
  heroTitle = "Big Deals, Trendy Products, Easy Order",
  heroText = "Shop perfumes, ghori, fan light, beauty items and more without any login.",
}) {
  const scrollToSection = (id) => {
    const section = document.getElementById(id);
    if (section) {
      section.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="jt-hero">
      <div className="jt-hero-content">
        <div className="jt-hero-badge">Bangladesh Trusted Online Shop</div>

        <h2>{heroTitle}</h2>
        <p>{heroText}</p>

        <div className="jt-hero-buttons">
          <button onClick={() => scrollToSection("shop-products")}>
            Shop Now
          </button>

          <button
            className="secondary-btn"
            onClick={() => scrollToSection("view-offers")}
          >
            View Offers
          </button>
        </div>
      </div>
    </section>
  );
}