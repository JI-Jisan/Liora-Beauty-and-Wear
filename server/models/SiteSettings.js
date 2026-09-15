const mongoose = require("mongoose");

const siteSettingsSchema = new mongoose.Schema({
  brandName: String,
  brandSubtitle: String,
  heroTitle: String,
  heroText: String,
  heroImage: String,
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

  // Facebook Auto-Pilot Settings
  fbPageId: { type: String, default: "61593176967507" },
  fbPageAccessToken: { type: String, default: "" },
  fbAppId: { type: String, default: "974777838976699" },
  fbAppSecret: { type: String, default: "832fb1c79860a989e060efb7be11a45b" },
});



module.exports = mongoose.model("SiteSettings", siteSettingsSchema);