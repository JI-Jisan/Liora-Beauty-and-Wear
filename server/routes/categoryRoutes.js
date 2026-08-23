const express = require("express");
const router = express.Router();
const Category = require("../models/Category");
const adminAuth = require("../middleware/adminAuth");
const Product = require("../models/Product");

// GET all categories
router.get("/", async (req, res) => {
  try {
    const cats = await Category.find({}).sort({ level: 1, order: 1, name: 1 }).lean();
    res.json(cats);
  } catch (e) {
    res.status(500).json({ message: "লোড করা যায়নি" });
  }
});

// ADD new category (Protected)
router.post("/", adminAuth, async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    if (!name) return res.status(400).json({ message: "নাম দিন" });

    let parent = null, ancestors = [], level = 0;
    if (req.body.parent) {
      const p = await Category.findById(req.body.parent).lean();
      if (!p) return res.status(404).json({ message: "Parent পাওয়া যায়নি" });
      if ((p.level ?? 0) + 1 >= 4)
        return res.status(400).json({ message: "সর্বোচ্চ ৪ ধাপ" });
      parent = p._id;
      ancestors = [...(p.ancestors || []), p._id];
      level = (p.level ?? 0) + 1;
    }

    const dup = await Category.findOne({ name, parent });
    if (dup) return res.status(409).json({ message: "এই নামে একটি আছে" });

    const cat = await Category.create({ name, parent, ancestors, level, type: level === 0 ? (req.body.type || "main") : "main" });
    res.status(201).json(cat);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// UPDATE category (Protected)
router.put("/:id", adminAuth, async (req, res) => {
  try {
    const { name, type, parentCategory } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ message: "Category name is required" });
    }

    const validParent = parentCategory && parentCategory.match(/^[0-9a-fA-F]{24}$/) ? parentCategory : null;

    const updated = await Category.findByIdAndUpdate(
      req.params.id,
      { name: name.trim(), type: type || "main", parentCategory: validParent },
      { new: true }
    ).populate("parentCategory");

    if (!updated) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// CLEAR ALL categories (Protected)
router.delete("/clear-all", adminAuth, async (req, res) => {
  try {
    await Category.deleteMany({});
    res.json({ message: "All categories deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE category (Protected)
router.delete("/:id", adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const kids = await Category.find({ ancestors: id }).select("_id").lean();
    const ids = [id, ...kids.map(k => String(k._id))];
    const used = await Product.countDocuments({ category: { $in: ids } });
    if (used > 0) return res.status(409).json({ message: `${used} টি প্রোডাক্ট আছে, আগে সরান` });
    await Category.deleteMany({ _id: { $in: ids } });
    res.json({ deleted: ids.length });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;