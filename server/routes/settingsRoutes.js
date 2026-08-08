const express = require("express");
const router = express.Router();
const SiteSettings = require("../models/SiteSettings");

// GET settings
router.get("/", async (req, res) => {
  try {
    let settings = await SiteSettings.findOne();

    if (!settings) {
      settings = await SiteSettings.create({
        promoSlides: [
          {
            badge: "Limited Offer",
            title: "Special Discount",
            subtitle: "Update this slider anytime from admin panel.",
            buttonText: "Shop Now",
            buttonLink: "/products",
            image: "",
          },
        ],
      });
    }

    if (!settings.promoSlides || settings.promoSlides.length === 0) {
      settings.promoSlides = [
        {
          badge: "Limited Offer",
          title: "Special Discount",
          subtitle: "Update this slider anytime from admin panel.",
          buttonText: "Shop Now",
          buttonLink: "/products",
          image: "",
        },
      ];
      await settings.save();
    }

    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// UPDATE settings
router.put("/", async (req, res) => {
  try {
    let settings = await SiteSettings.findOne();

    if (!settings) {
      settings = await SiteSettings.create({});
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