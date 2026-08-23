const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const upload = require("../middleware/upload");
const adminAuth = require("../middleware/adminAuth");
const Category = require("../models/Category");
const SiteSettings = require("../models/SiteSettings");

// GET all products
router.get("/", async (req, res) => {
  try {
    const query = {};
    if (req.query.category) {
      const kids = await Category.find({ ancestors: req.query.category }).select("_id").lean();
      query.category = { $in: [req.query.category, ...kids.map(k => k._id)] };
    }
    const products = await Product.find(query).populate("category", "name").lean();
    res.json(products);
  } catch (error) {
    res.json([]);
  }
});

// GET single product by ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      const product = await Product.findById(id).populate({
      path: "category",
      populate: {
        path: "parentCategory",
        populate: { path: "parentCategory" }
      }
    });
      if (product) {
        return res.json(product);
      }
    }

    res.status(404).json({ message: "Product not found" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ADD new product
router.post("/", adminAuth, async (req, res) => {
  try {
    const { name, originalPrice, offerPrice, category } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ message: "Product name is required" });
    }

    if (isNaN(originalPrice) || isNaN(offerPrice) || Number(offerPrice) < 0 || Number(originalPrice) < 0) {
      return res.status(400).json({ message: "Prices must be non-negative numbers" });
    }

    if (Number(offerPrice) > Number(originalPrice)) {
      return res.status(400).json({ message: "Offer price cannot exceed original price" });
    }

    const validCategory =
      category && typeof category === "string" && category.match(/^[0-9a-fA-F]{24}$/)
        ? category
        : null;

    const product = new Product({
      ...req.body,
      name: name.trim(),
      originalPrice: Number(originalPrice),
      offerPrice: Number(offerPrice),
      category: validCategory,
    });

    await product.save();

    // Mark demo as seeded so deleted demos don't reappear
    await SiteSettings.findOneAndUpdate({}, { isDemoSeeded: true }, { upsert: true });

    const savedProduct = await Product.findById(product._id).populate("category");
    res.status(201).json(savedProduct);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// UPDATE product
router.put("/:id", adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, originalPrice, offerPrice, category } = req.body;

    if (name !== undefined && (!name || typeof name !== "string" || !name.trim())) {
      return res.status(400).json({ message: "Product name cannot be empty" });
    }

    if (originalPrice !== undefined && (isNaN(originalPrice) || Number(originalPrice) < 0)) {
      return res.status(400).json({ message: "Original price must be non-negative" });
    }

    if (offerPrice !== undefined && (isNaN(offerPrice) || Number(offerPrice) < 0)) {
      return res.status(400).json({ message: "Offer price must be non-negative" });
    }

    const updateData = { ...req.body };
    if (category !== undefined) {
      updateData.category =
        category && typeof category === "string" && category.match(/^[0-9a-fA-F]{24}$/)
          ? category
          : null;
    }

    // Mark demo as seeded
    await SiteSettings.findOneAndUpdate({}, { isDemoSeeded: true }, { upsert: true });

    let updated = null;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      updated = await Product.findByIdAndUpdate(id, updateData, { new: true }).populate("category");
    }

    if (!updated) {
      delete updateData._id;
      const newProduct = new Product(updateData);
      await newProduct.save();
      const saved = await Product.findById(newProduct._id).populate("category");
      return res.json(saved);
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// CLEAR all products at once
router.delete("/clear-all", adminAuth, async (req, res) => {
  try {
    await Product.deleteMany({});
    await SiteSettings.findOneAndUpdate({}, { isDemoSeeded: true }, { upsert: true });
    res.json({ message: "All products deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE product
router.delete("/:id", adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Mark demo seeded so empty list stays empty
    await SiteSettings.findOneAndUpdate({}, { isDemoSeeded: true }, { upsert: true });

    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      await Product.findByIdAndDelete(id);
      return res.json({ message: "Product deleted successfully" });
    }

    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// UPLOAD product image
router.post("/upload", adminAuth, upload.single("image"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No image uploaded" });
    }

    res.json({
      message: "Image uploaded successfully",
      imageUrl: `/uploads/${req.file.filename}`,
      filename: req.file.filename,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;