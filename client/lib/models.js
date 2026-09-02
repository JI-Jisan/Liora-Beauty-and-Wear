import mongoose from "mongoose";

// ---------- Category ----------
const CategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    parent: { type: mongoose.Schema.Types.ObjectId, ref: "Category", default: null },
    ancestors: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category" }],
    level: { type: Number, default: 0 },
    type: { type: String, enum: ["main", "more"], default: "main" },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

CategorySchema.index({ parent: 1, name: 1 }, { unique: true });
CategorySchema.index({ ancestors: 1 });

export const Category =
  mongoose.models.Category || mongoose.model("Category", CategorySchema);

// ---------- Menu ----------
const MenuSchema = new mongoose.Schema({
  label:     { type: String, required: true, trim: true },
  href:      { type: String, required: true, trim: true },
  icon:      { type: String, default: '' },
  order:     { type: Number, default: 0 },
  isActive:  { type: Boolean, default: true },
  authOnly:  { type: Boolean, default: false },
  openInNew: { type: Boolean, default: false }
}, { timestamps: true });

export const Menu = mongoose.models.Menu || mongoose.model('Menu', MenuSchema);

// ---------- Brand ----------
const BrandSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true },
  slug:     { type: String, required: true, unique: true, lowercase: true, index: true },
  logo:     { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  order:    { type: Number, default: 0 }
}, { timestamps: true });

export const Brand = mongoose.models.Brand || mongoose.model('Brand', BrandSchema);

// ---------- Product ----------
const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", default: null },
    brand: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', default: null, index: true },
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

export function deriveStockStatus(qty) {
  const n = Number(qty) || 0;
  if (n <= 0) return "Out of Stock";
  if (n <= 5) return "Limited Stock";
  return "In Stock";
}

ProductSchema.pre("save", function (next) {
  this.stockStatus = deriveStockStatus(this.stockQuantity);
  next();
});

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

// ---------- Counter ----------
const CounterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 500000 }
});

export const Counter = mongoose.models.Counter || mongoose.model("Counter", CounterSchema);

export async function nextOrderIdentity() {
  let serial = 500000;
  try {
    const c = await Counter.findByIdAndUpdate(
      "order",
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    serial = c?.seq || 500000;
  } catch (e) {
    console.error("Counter error:", e?.message);
    serial = Date.now();
  }

  for (let i = 0; i < 6; i++) {
    const n = 10000000 + Math.floor(Math.random() * 90000000);
    const candidate = `LIORA-${n}`;
    if (!(await Order.exists({ orderNumber: candidate }))) {
      return { orderNumber: candidate, serial };
    }
  }
  return { orderNumber: `LIORA-${Date.now()}`, serial };
}

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
    orderNumber: { type: String, unique: true, index: true, sparse: true, trim: true },
    serial: { type: Number, index: true },
    accessToken: { type: String, index: true },
    firebaseUid: { type: String, default: null, index: true },
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
