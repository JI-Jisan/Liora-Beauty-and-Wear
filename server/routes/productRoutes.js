const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const upload = require("../middleware/upload");
const adminAuth = require("../middleware/adminAuth");
const Category = require("../models/Category");
const Brand = require("../models/Brand");
const SiteSettings = require("../models/SiteSettings");

// GET all products
router.get("/", async (req, res) => {
  try {
    const conditions = [];

    // Filter by Category (includes descendants)
    if (req.query.category && req.query.category !== "all") {
      const kids = await Category.find({ ancestors: req.query.category }).select("_id").lean();
      conditions.push({ category: { $in: [req.query.category, ...kids.map((k) => k._id)] } });
    }

    // Filter by Brand (accepts ObjectId or slug/name)
    if (req.query.brand && req.query.brand !== "all") {
      if (req.query.brand.match(/^[0-9a-fA-F]{24}$/)) {
        conditions.push({ brand: req.query.brand });
      } else {
        const matchedBrand = await Brand.findOne({
          $or: [{ slug: req.query.brand }, { name: new RegExp(`^${req.query.brand}$`, "i") }],
        }).select("_id").lean();
        if (matchedBrand) {
          conditions.push({ brand: matchedBrand._id });
        }
      }
    }

    // Filter by Type
    if (req.query.type && req.query.type !== "all") {
      if (req.query.type === "featured") conditions.push({ isFeatured: true });
      else if (req.query.type === "trending") conditions.push({ isTrending: true });
      else if (req.query.type === "new-arrivals" || req.query.type === "new") conditions.push({ isNewArrival: true });
      else if (req.query.type === "flash-sale" || req.query.type === "sale") conditions.push({ offerPrice: { $gt: 0 } });
    }

    // Search by name, description, category name, or brand name
    if (req.query.search && req.query.search.trim()) {
      const cleanSearch = req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const searchRegex = new RegExp(cleanSearch, "i");

      const matchingCategories = await Category.find({ name: searchRegex }).select("_id").lean();
      const catIds = matchingCategories.map((c) => c._id);

      const matchingBrands = await Brand.find({ name: searchRegex }).select("_id").lean();
      const brandIds = matchingBrands.map((b) => b._id);

      const searchOr = [
        { name: searchRegex },
        { description: searchRegex },
      ];
      if (catIds.length > 0) {
        searchOr.push({ category: { $in: catIds } });
      }
      if (brandIds.length > 0) {
        searchOr.push({ brand: { $in: brandIds } });
      }

      conditions.push({ $or: searchOr });
    }

    const finalQuery = conditions.length > 0 ? { $and: conditions } : {};

    const isPaginated = req.query.paginate === "1" || req.query.paginate === "true";
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = parseInt(req.query.limit) || (isPaginated ? 24 : 0);

    let productQuery = Product.find(finalQuery)
      .populate("category", "name ancestors")
      .populate("brand", "name slug")
      .sort({ createdAt: -1 });

    if (isPaginated) {
      const total = await Product.countDocuments(finalQuery);
      const pageSize = limit > 0 ? limit : 24;
      const totalPages = Math.ceil(total / pageSize) || 1;
      const products = await productQuery
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean();

      return res.json({
        products,
        total,
        totalPages,
        currentPage: page,
      });
    }

    if (limit > 0) {
      productQuery = productQuery.limit(limit);
    }

    const products = await productQuery.lean();
    res.json(products);
  } catch (error) {
    console.error("Product fetch error:", error);
    if (req.query.paginate === "1" || req.query.paginate === "true") {
      res.json({ products: [], total: 0, totalPages: 1, currentPage: 1 });
    } else {
      res.json([]);
    }
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