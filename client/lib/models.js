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
  name:               { type: String, required: true, trim: true },
  slug:               { type: String, required: true, unique: true, lowercase: true, index: true },
  logo:               { type: String, default: '' },
  wholesaleMarginPct: { type: Number, default: 7 }, // e.g. 5 for 5%, 20 for 20%
  minWholesaleQty:    { type: Number, default: 3 },
  isActive:           { type: Boolean, default: true },
  order:              { type: Number, default: 0 }
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
    wholesalePrice: { type: Number, default: 0, min: 0 },
    wholesaleMinQty: { type: Number, default: 3, min: 1 },
    resellerPrice: { type: Number, default: 0, min: 0 },
    stockQuantity: { type: Number, required: true, default: 0, min: 0 },
    inStock: { type: Boolean, default: true, index: true },
    discountBadge: { type: String, default: "" },
    campusDiscountPct: { type: Number, default: 0, min: 0, max: 15 },
    stockStatus: {
      type: String,
      enum: ["In Stock", "Limited Stock", "Out of Stock"],
      default: "In Stock",
    },
    image: { type: String, default: "" },                 // মূল ছবি
    images: {                                             // অতিরিক্ত ৩টা
      type: [String],
      default: [],
      validate: {
        validator: function (v) {
          return !v || v.length <= 3;
        },
        message: "সর্বোচ্চ ৩টি অতিরিক্ত ছবি দেওয়া যাবে",
      },
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

ProductSchema.index({ inStock: -1, isFeatured: -1, createdAt: -1 });
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

ProductSchema.pre("save", function () {
  this.stockStatus = deriveStockStatus(this.stockQuantity);
  this.inStock = this.stockQuantity > 0 && this.stockStatus !== "Out of Stock";
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

// ---------- Purchase Batch (প্রতিবার মাল কেনার রেকর্ড) ----------
const PurchaseBatchSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    productName: { type: String, required: true }, // snapshot
    qty: { type: Number, required: true, min: 1 },
    remaining: { type: Number, required: true, min: 0, index: true },
    unitCost: { type: Number, required: true, min: 0 },
    purchaseDate: { type: Date, default: Date.now, index: true },
    ownerName: { type: String, required: true, default: "Owner" },   // টাকা কে দিয়েছে
    locationName: { type: String, required: true, default: "Owner" }, // মাল কার কাছে আছে
    supplier: { type: String, default: "" },
    note: { type: String, default: "" },
  },
  { timestamps: true }
);

PurchaseBatchSchema.index({ product: 1, purchaseDate: 1 });

// ---------- Expense (boosting, courier return, packaging ইত্যাদি) ----------
const ExpenseSchema = new mongoose.Schema(
  {
    date: { type: Date, default: Date.now, index: true },
    category: {
      type: String,
      required: true,
      enum: [
        "Facebook Boosting",
        "Courier Return",
        "Courier Charge",
        "Packaging",
        "Transport",
        "Salary",
        "Mobile/Internet",
        "Other",
      ],
    },
    amount: { type: Number, required: true, min: 0 },
    paidBy: { type: String, required: true, default: "Owner" },
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", default: null },
    note: { type: String, default: "" },
  },
  { timestamps: true }
);

// ---------- Partner Ledger ----------
const PartnerLedgerSchema = new mongoose.Schema(
  {
    partnerName: { type: String, required: true, index: true },
    date: { type: Date, default: Date.now, index: true },
    type: { type: String, required: true, enum: ["cost_payable", "profit_share", "payment", "adjustment"] },
    amount: { type: Number, required: true }, // payable = ধনাত্মক, payment = ঋণাত্মক
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", default: null },
    note: { type: String, default: "" },
  },
  { timestamps: true }
);

export const PurchaseBatch =
  mongoose.models.PurchaseBatch || mongoose.model("PurchaseBatch", PurchaseBatchSchema);
export const Expense =
  mongoose.models.Expense || mongoose.model("Expense", ExpenseSchema);
export const PartnerLedger =
  mongoose.models.PartnerLedger || mongoose.model("PartnerLedger", PartnerLedgerSchema);

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
    costAtSale: { type: Number, default: 0 },                 // প্রতি পিস কেনা দাম, বিক্রির মুহূর্তে
    allocations: [
      {
        batch: { type: mongoose.Schema.Types.ObjectId, ref: "PurchaseBatch" },
        qty: Number,
        unitCost: Number,
        ownerName: String,
      },
    ],
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
    customerEmail: { type: String, default: "", lowercase: true, trim: true, index: true },
    phone: { type: String, required: true, trim: true },
    district: { type: String, default: "Dhaka", trim: true },
    thana: { type: String, default: "", trim: true },
    address: { type: String, required: true, trim: true },
    note: { type: String, default: "" },
    items: { type: [OrderItemSchema], required: true },
    deliveryZone: {
      type: String,
      default: "inside_dhaka",
    },
    deliveryType: { type: String, default: "standard" }, // "standard" or "urgent"
    deliveryCharge: { type: Number, default: 0, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    couponCode: { type: String, default: "" },
    commission: { type: Number, default: 0, min: 0 },
    commissionNote: { type: String, default: "" },
    subtotal: { type: Number, required: true, min: 0 },
    totalCost: { type: Number, default: 0 },                  // সব item এর কেনা দাম
    total: { type: Number, required: true, min: 0 },
    shippedBy: { type: String, default: "" },                 // কে পাঠাচ্ছে
    stockDeducted: { type: Boolean, default: false },         // double deduction ঠেকাতে
    status: {
      type: String,
      enum: ["Pending", "Confirmed", "Shipped", "Delivered", "Cancelled"],
      default: "Pending",
    },
    isFlagged: { type: Boolean, default: false },
    flagReason: { type: String, default: "" },
    pendingOrdersCount: { type: Number, default: 0 },
    stockRestored: { type: Boolean, default: false },  // Cancelled এ স্টক ফেরতের জন্য
    isDeleted: { type: Boolean, default: false },      // soft delete
    orderType: {
      type: String,
      enum: ["retail", "wholesale", "reseller"],
      default: "retail",
      index: true,
    },
    resellerDetails: {
      resellerUid: { type: String, default: "" },
      resellerEmail: { type: String, default: "", lowercase: true, trim: true },
      resellerName: { type: String, default: "" },
      storeName: { type: String, default: "" },
      storePhone: { type: String, default: "" },
      customerCodAmount: { type: Number, default: 0 },
      baseCost: { type: Number, default: 0 },
      deliveryFee: { type: Number, default: 0 },
      resellerProfit: { type: Number, default: 0 },
      settledToWallet: { type: Boolean, default: false },
    },
    wholesaleDetails: {
      businessName: { type: String, default: "" },
      tradeLicense: { type: String, default: "" },
      totalItemsQty: { type: Number, default: 0 },
      wholesaleSavings: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ status: 1 });
OrderSchema.index({ phone: 1 });
OrderSchema.index({ isFlagged: 1 });

export const Order =
  mongoose.models.Order || mongoose.model("Order", OrderSchema);

// ---------- Customer / User ----------
const CustomerSchema = new mongoose.Schema(
  {
    firebaseUid: {
      type: String,
      required: false,
      sparse: true,
      index: {
        unique: true,
        sparse: true,
        partialFilterExpression: { firebaseUid: { $type: "string" } },
      },
    },
    email: { type: String, lowercase: true, trim: true, index: true },
    name: { type: String, default: "" },
    phone: { type: String, default: "", index: true },
    address: { type: String, default: "" },
    role: {
      type: String,
      enum: ["user", "customer", "admin", "wholesale", "reseller", "team_leader"],
      default: "user",
      index: true,
    },
    appliedRole: { type: String, default: "" },
    appliedAt: { type: Date, default: null },
    fbPageLink: { type: String, default: "" },
    tradeLicense: { type: String, default: "" },
    teamLeader: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", default: null, index: true },
    teamLeaderEmail: { type: String, default: "", lowercase: true, trim: true },
    teamLeaderName: { type: String, default: "" },
    isWeeklyStar: { type: Boolean, default: false, index: true },
    weeklyStarMarkedAt: { type: Date, default: null },
    businessName: { type: String, default: "" },
    resellerStoreName: { type: String, default: "" },
    resellerStorePhone: { type: String, default: "" },
    status: {
      type: String,
      enum: ["active", "pending", "suspended"],
      default: "active",
      index: true,
    },
    walletBalance: { type: Number, default: 0 },
    wholesaleDiscountPct: { type: Number, default: 0 },
    minWholesaleOrderAmount: { type: Number, default: 5000 },
    note: { type: String, default: "" },
  },
  { timestamps: true }
);

export const Customer =
  mongoose.models.Customer || mongoose.model("Customer", CustomerSchema);

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

    // Facebook Auto-Pilot Settings
    fbPageId: { type: String, default: "61593176967507" },
    fbPageAccessToken: { type: String, default: "" },
    fbAppId: { type: String, default: "974777838976699" },
    fbAppSecret: { type: String, default: "832fb1c79860a989e060efb7be11a45b" },
  },
  { timestamps: true }
);

export const SiteSettings =
  mongoose.models.SiteSettings || mongoose.model("SiteSettings", SiteSettingsSchema);

// ---------- WholesaleQuotation (পাইকারি কোটেশন ও ইনভয়েস) ----------
const WholesaleQuotationItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: false },
    name: { type: String, required: true },
    brandName: { type: String, default: "" },
    categoryName: { type: String, default: "" },
    image: { type: String, default: "" },
    originalPrice: { type: Number, default: 0 },
    purchasePrice: { type: Number, default: 0 },
    wholesalePrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, default: 1, min: 1 },
    lineTotal: { type: Number, required: true, default: 0 },
    discountPct: { type: Number, default: 0 },
  },
  { _id: false }
);

const WholesaleQuotationSchema = new mongoose.Schema(
  {
    quoteNumber: { type: String, required: true, unique: true, index: true, trim: true },
    clientInfo: {
      clientName: { type: String, required: true, trim: true },
      clientPhone: { type: String, default: "", trim: true },
      clientAddress: { type: String, default: "", trim: true },
      note: { type: String, default: "" },
    },
    items: [WholesaleQuotationItemSchema],
    profitPercent: { type: Number, default: 5 },
    brandProfitOverrides: { type: mongoose.Schema.Types.Mixed, default: {} },
    totalItems: { type: Number, default: 0 },
    totalQty: { type: Number, default: 0 },
    totalMarketSum: { type: Number, default: 0 },
    totalWholesaleSum: { type: Number, default: 0 },
    totalSavings: { type: Number, default: 0 },
    estimatedCost: { type: Number, default: 0 },
    estimatedProfit: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["Draft", "Sent", "Confirmed", "Converted"],
      default: "Draft",
      index: true,
    },
    convertedOrderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", default: null },
    convertedOrderNumber: { type: String, default: "" },
  },
  { timestamps: true }
);

WholesaleQuotationSchema.index({ createdAt: -1 });

export const WholesaleQuotation =
  mongoose.models.WholesaleQuotation ||
  mongoose.model("WholesaleQuotation", WholesaleQuotationSchema);

// ---------- ResellerLedger (রিসেলার ওয়ালেট ও কমিশন লেজার) ----------
const ResellerLedgerSchema = new mongoose.Schema(
  {
    resellerUid: { type: String, required: false, index: true },
    resellerEmail: { type: String, required: true, lowercase: true, trim: true, index: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", default: null },
    orderNumber: { type: String, default: "" },
    type: {
      type: String,
      enum: [
        "profit_credit",
        "delivery_fee_charge",
        "return_deduction",
        "payout_withdrawal",
        "manual_adjustment",
      ],
      required: true,
    },
    amount: { type: Number, required: true },
    balanceAfter: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["pending", "completed", "cancelled"],
      default: "completed",
    },
    payoutMethod: { type: String, default: "" },
    payoutAccount: { type: String, default: "" },
    note: { type: String, default: "" },
  },
  { timestamps: true }
);

ResellerLedgerSchema.index({ createdAt: -1 });

export const ResellerLedger =
  mongoose.models.ResellerLedger || mongoose.model("ResellerLedger", ResellerLedgerSchema);

