const mongoose = require('mongoose');

const BrandSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true },
  slug:     { type: String, required: true, unique: true, lowercase: true, index: true },
  logo:     { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  order:    { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Brand', BrandSchema);
