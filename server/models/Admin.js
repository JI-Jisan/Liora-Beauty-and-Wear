const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      default: "Admin",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Admin", adminSchema);