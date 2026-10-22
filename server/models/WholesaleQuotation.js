const mongoose = require("mongoose");

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

module.exports =
  mongoose.models.WholesaleQuotation ||
  mongoose.model("WholesaleQuotation", WholesaleQuotationSchema);
