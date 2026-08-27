const mongoose = require("mongoose");

const ORDER_STATUSES = [
  "Pending", "Confirmed", "Shipped", "Delivered", "Cancelled",
];

const orderItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    productName: { type: String, required: true, trim: true },
    image: { type: String, default: "" },
    categoryName: { type: String, default: "" },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },        // বিক্রয়মূল্য (DB থেকে)
    originalPrice: { type: Number, default: 0 },
    purchasePrice: { type: Number, default: 0 },            // ক্রয়মূল্য — কখনো পাবলিক API-তে পাঠাবেন না
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, unique: true, sparse: true, trim: true, index: true },
    customerName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true, index: true },
    address: { type: String, required: true, trim: true },
    note: { type: String, default: "" },

    items: { type: [orderItemSchema], required: true },

    deliveryZone: { type: String, enum: ["inside", "outside"], default: "inside" },
    deliveryCharge: { type: Number, default: 0, min: 0 },
    subtotal: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },

    status: { type: String, enum: ORDER_STATUSES, default: "Pending", index: true },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

orderSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Order", orderSchema);
module.exports.ORDER_STATUSES = ORDER_STATUSES;