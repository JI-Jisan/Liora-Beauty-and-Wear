const mongoose = require('mongoose');

const MenuSchema = new mongoose.Schema({
  label:     { type: String, required: true, trim: true },
  href:      { type: String, required: true, trim: true },
  icon:      { type: String, default: '' },
  order:     { type: Number, default: 0 },
  isActive:  { type: Boolean, default: true },
  authOnly:  { type: Boolean, default: false },
  openInNew: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Menu', MenuSchema);
