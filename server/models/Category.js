const mongoose = require("mongoose");

const CategorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  parent: { type: mongoose.Schema.Types.ObjectId, ref: "Category", default: null },
  ancestors: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category" }],
  level: { type: Number, default: 0 },
  type: { type: String, enum: ["main", "more"], default: "main" },
  order: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

CategorySchema.index({ parent: 1, name: 1 }, { unique: true });
CategorySchema.index({ ancestors: 1 });

module.exports = mongoose.model("Category", CategorySchema);