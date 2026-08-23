import mongoose from "mongoose";

// ---------- Category ----------
const CategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    type: { type: String, enum: ["main", "more"], default: "main" },
    parentCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Category =
  mongoose.models.Category || mongoose.model("Category", CategorySchema);

// ---------- Product ----------
const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", default: null },
    purchasePrice: { type: Number, required: true, default: 0, min: 0 },
    originalPrice: { type: Number, required: true, min: 0 },
    offerPrice: { type: Number, required: true, min: 0 },
    stockQuantity: { type: Number, required: true, default: 0, min: 0 },
    discountBadge: { type: String, default: "" },
    stockStatus: {
      type: String,
      enum: ["In Stock", "Limited Stock", "Out of Stock"],
      default: "In Stock",
    },
    image: { type: String, default: "" },                 // মূল ছবি
    images: {                                             // অতিরিক্ত ৩টা
      type: [String],
      default: [],
      validate: [(v) => v.length <= 3, "সর্বোচ্চ ৩টি অতিরিক্ত ছবি দেওয়া যাবে"],
    },
    description: { type: String, default: "" },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0, min: 0 },
    isFeatured: { type: Boolean, default: false },
    isTrending: { type: Boolean, default: false },
    isNewArrival: { type: Boolean, default: false },
    isSlider: { type: Boolean, default: false },
  },
  { timestamps: true }
);

ProductSchema.index({ category: 1 });
ProductSchema.index({ isSlider: 1 });
ProductSchema.index({ isFeatured: 1, isTrending: 1, isNewArrival: 1 });
ProductSchema.index({ createdAt: -1 });

export const Product =
  mongoose.models.Product || mongoose.model("Product", ProductSchema);

// ---------- Admin ----------
const AdminSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, required: true },
    name: { type: String, default: "Admin" },
  },
  { timestamps: true }
);

export const Admin =
  mongoose.models.Admin || mongoose.model("Admin", AdminSchema);

// ---------- Order ----------
const OrderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    productName: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },          // বিক্রয়মূল্য snapshot
    purchasePrice: { type: Number, default: 0, min: 0 },      // ক্রয়মূল্য snapshot
    originalPrice: { type: Number, default: 0, min: 0 },
    categoryName: { type: String, default: "" },
    image: { type: String, default: "" },
  },
  { _id: false }
);

const OrderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, unique: true, sparse: true, trim: true },
    customerName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    note: { type: String, default: "" },
    items: { type: [OrderItemSchema], required: true },
    deliveryZone: { type: String, enum: ["inside", "outside"], default: "inside" },
    deliveryCharge: { type: Number, default: 0, min: 0 },
    subtotal: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["Pending", "Confirmed", "Shipped", "Delivered", "Cancelled"],
      default: "Pending",
    },
    stockRestored: { type: Boolean, default: false },  // Cancelled এ স্টক ফেরতের জন্য
    isDeleted: { type: Boolean, default: false },      // soft delete
  },
  { timestamps: true }
);

OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ status: 1 });
OrderSchema.index({ phone: 1 });

export const Order =
  mongoose.models.Order || mongoose.model("Order", OrderSchema);

// ---------- SiteSettings ----------
const SiteSettingsSchema = new mongoose.Schema(
  {
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
        productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", default: null },
        price: Number,
        originalPrice: Number,
      },
    ],
    flashTitle: String,
    flashSubtitle: String,
    flashButtonText: String,
    flashButtonLink: String,
    flashDurationHours: Number,
    // ডেলিভারি সংক্রান্ত একমাত্র সত্য উৎস
    deliveryInside: { type: Number, default: 65 },
    deliveryOutside: { type: Number, default: 110 },
    freeDeliveryThreshold: { type: Number, default: 0 }, // 0 = ফ্রি ডেলিভারি বন্ধ
  },
  { timestamps: true }
);

export const SiteSettings =
  mongoose.models.SiteSettings || mongoose.model("SiteSettings", SiteSettingsSchema);
