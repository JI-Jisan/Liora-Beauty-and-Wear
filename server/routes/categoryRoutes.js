const express = require("express");
const router = express.Router();
const Category = require("../models/Category");
const adminAuth = require("../middleware/adminAuth");

const DEMO_CATEGORIES = [
  { _id: "cat-1", name: "Perfume" },
  { _id: "cat-2", name: "Watches" },
  { _id: "cat-3", name: "Fan Light" },
  { _id: "cat-4", name: "Beauty Items" },
];

// GET all categories
router.get("/", async (req, res) => {
  try {
    const categories = await Category.find().sort({ createdAt: -1 });
    if (categories && categories.length > 0) {
      return res.json(categories);
    }
    res.json(DEMO_CATEGORIES);
  } catch (error) {
    res.json(DEMO_CATEGORIES);
  }
});

// ADD new category (Protected)
router.post("/", adminAuth, async (req, res) => {
  try {
    const { name, type } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ message: "Category name is required" });
    }

    const category = new Category({
      name: name.trim(),
      type: type || "main",
    });

    const savedCategory = await category.save();
    res.status(201).json(savedCategory);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// UPDATE category (Protected)
router.put("/:id", adminAuth, async (req, res) => {
  try {
    const { name, type } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ message: "Category name is required" });
    }

    const updated = await Category.findByIdAndUpdate(
      req.params.id,
      { name: name.trim(), type: type || "main" },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE category (Protected)
router.delete("/:id", adminAuth, async (req, res) => {
  try {
    const deleted = await Category.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.json({ message: "Category deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;