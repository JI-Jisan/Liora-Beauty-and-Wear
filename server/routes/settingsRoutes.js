const express = require("express");
const router = express.Router();
const SiteSettings = require("../models/SiteSettings");
const adminAuth = require("../middleware/adminAuth");

const DEFAULT_SETTINGS = {
  brandName: "LIORA Beauty & Wear",
  brandSubtitle: "Beauty. Style. You.",
  heroTitle: "Beauty That Inspires Confidence & Style That Speaks Elegance",
  heroText: "Shop 100% authentic cosmetics, luxury perfumes, skincare, and fashion wear in one place.",
  offerText: "💖 Welcome to LIORA Beauty & Wear   🚚 Cash on Delivery Available   🎁 Free delivery on orders above 1500 Tk   ✨ 100% Authentic Products",
  promoSlides: [
    {
      badge: "BEAUTY & WEAR",
      title: "LIORA Beauty & Wear",
      subtitle: "Cosmetics & Fashion All in One Place. Style that speaks elegance.",
      buttonText: "Shop Collection",
      buttonLink: "/products",
      image: "",
    },
  ],
  flashTitle: "Limited Time Special Offer",
  flashSubtitle: "Grab selected trending beauty & wear items before the timer runs out.",
  flashButtonText: "Shop Flash Sale",
  flashButtonLink: "/products",
  flashDurationHours: 6,
};

// GET settings
router.get("/", async (req, res) => {
  try {
    let settings = await SiteSettings.findOne();

    if (!settings) {
      settings = await SiteSettings.create(DEFAULT_SETTINGS);
    }

    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// UPDATE settings
router.put("/", adminAuth, async (req, res) => {
  try {
    let settings = await SiteSettings.findOne();

    if (!settings) {
      settings = await SiteSettings.create(DEFAULT_SETTINGS);
    }

    const updated = await SiteSettings.findByIdAndUpdate(
      settings._id,
      req.body,
      { new: true }
    );

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;