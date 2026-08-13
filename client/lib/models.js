import mongoose from "mongoose";

// Category Schema
const CategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    type: { type: String, enum: ["main", "more"], default: "main" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Category =
  mongoose.models.Category || mongoose.model("Category", CategorySchema);

// Product Schema
const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", default: null },
    originalPrice: { type: Number, required: true },
    offerPrice: { type: Number, required: true },
    discountBadge: { type: String, default: "" },
    stockStatus: {
      type: String,
      enum: ["In Stock", "Limited Stock", "Out of Stock"],
      default: "In Stock",
    },
    image: { type: String, default: "" },
    description: { type: String, default: "" },
    isFeatured: { type: Boolean, default: false },
    isTrending: { type: Boolean, default: false },
    isNewArrival: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Product =
  mongoose.models.Product || mongoose.model("Product", ProductSchema);

// Admin Schema
const AdminSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true },
    name: { type: String, default: "Admin" },
  },
  { timestamps: true }
);

export const Admin =
  mongoose.models.Admin || mongoose.model("Admin", AdminSchema);

// Order Schema
const OrderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, unique: true, sparse: true, trim: true },
    customerName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    note: { type: String, default: "" },
    items: [
      {
        productName: String,
        quantity: Number,
        price: Number,
      },
    ],
    deliveryCharge: { type: Number, default: 0 },
    subtotal: { type: Number, required: true },
    total: { type: Number, required: true },
    status: {
      type: String,
      enum: ["Pending", "Confirmed", "Shipped", "Delivered", "Cancelled"],
      default: "Pending",
    },
  },
  { timestamps: true }
);

export const Order =
  mongoose.models.Order || mongoose.model("Order", OrderSchema);

// SiteSettings Schema
const SiteSettingsSchema = new mongoose.Schema({
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
});

export const SiteSettings =
  mongoose.models.SiteSettings || mongoose.model("SiteSettings", SiteSettingsSchema);
