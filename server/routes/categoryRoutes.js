const express = require("express");
const router = express.Router();
const Category = require("../models/Category");

const DEMO_CATEGORIES = [
  { _id: "cat-1", name: "Perfume" },
  { _id: "cat-2", name: "Watches" },
  { _id: "cat-3", name: "Fan Light" },
  { _id: "cat-4", name: "Beauty Items" }
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

// ADD new category
router.post("/", async (req, res) => {
  try {
    const { name, type } = req.body;

    const category = new Category({
      name,
      type,
    });

    const savedCategory = await category.save();
    res.json(savedCategory);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;