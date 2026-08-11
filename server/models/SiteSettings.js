const mongoose = require("mongoose");

const siteSettingsSchema = new mongoose.Schema({
  brandName: String,
  brandSubtitle: String,
  heroTitle: String,
  heroText: String,
  offerText: String,

  promoSlides: [
    {
      badge: String,
      title: String,
      subtitle: String,
      buttonText: String,
      buttonLink: String,
      image: String,
    },
  ],

  flashTitle: String,
  flashSubtitle: String,
  flashButtonText: String,
  flashButtonLink: String,
  flashDurationHours: Number,
  isDemoSeeded: { type: Boolean, default: false },
});



module.exports = mongoose.model("SiteSettings", siteSettingsSchema);