const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const upload = require("../middleware/upload");
const adminAuth = require("../middleware/adminAuth");

const DEMO_PRODUCTS = [
  {
    _id: "demo-1",
    name: "Royal Oud Perfume 100ml",
    description: "Premium long-lasting royal oud fragrance perfume for men and women. Made with authentic oriental woody notes.",
    image: "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=600&auto=format&fit=crop&q=80",
    originalPrice: 2500,
    offerPrice: 1850,
    discountBadge: "26% OFF",
    stockStatus: "In Stock",
    category: { _id: "cat-1", name: "Perfume" },
    isFeatured: true,
    isTrending: true,
    isNewArrival: true
  },
  {
    _id: "demo-2",
    name: "Luxury Gold Chronograph Watch",
    description: "Premium stainless steel quartz chronograph watch with water resistance and luxury design.",
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80",
    originalPrice: 3200,
    offerPrice: 2400,
    discountBadge: "25% OFF",
    stockStatus: "In Stock",
    category: { _id: "cat-2", name: "Watches" },
    isFeatured: true,
    isTrending: true
  },
  {
    _id: "demo-3",
    name: "Smart RGB LED Fan Light 30W",
    description: "Multi-color remote control LED ceiling fan light with low power consumption and super silent operation.",
    image: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600&auto=format&fit=crop&q=80",
    originalPrice: 1800,
    offerPrice: 1350,
    discountBadge: "25% OFF",
    stockStatus: "In Stock",
    category: { _id: "cat-3", name: "Fan Light" },
    isFeatured: true,
    isNewArrival: true
  },
  {
    _id: "demo-4",
    name: "Vitamin C Brightening Serum 30ml",
    description: "Natural organic vitamin C serum for glowing, smooth skin and reducing dark spots.",
    image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&auto=format&fit=crop&q=80",
    originalPrice: 1200,
    offerPrice: 850,
    discountBadge: "29% OFF",
    stockStatus: "In Stock",
    category: { _id: "cat-4", name: "Beauty Items" },
    isTrending: true,
    isNewArrival: true
  },
  {
    _id: "demo-5",
    name: "French Vanilla Long-Lasting Body Mist",
    description: "Refreshing vanilla scent body mist for daily freshness and long lasting aroma.",
    image: "https://images.unsplash.com/photo-1541643600914-78b084683601?w=600&auto=format&fit=crop&q=80",
    originalPrice: 1500,
    offerPrice: 990,
    discountBadge: "34% OFF",
    stockStatus: "In Stock",
    category: { _id: "cat-1", name: "Perfume" },
    isFeatured: true
  }
];

const SiteSettings = require("../models/SiteSettings");

// GET all products
router.get("/", async (req, res) => {
  try {
    let products = await Product.find().populate("category");

    // Check if database has been seeded before
    let settings = await SiteSettings.findOne();
    if (!settings) {
      settings = new SiteSettings();
    }

    // Seed initial demo products ONCE into DB if brand new database
    if (!settings.isDemoSeeded && (!products || products.length === 0)) {
      try {
        const Category = require("../models/Category");
        let perfCat = await Category.findOne({ name: "Perfume" });
        if (!perfCat) perfCat = await Category.create({ name: "Perfume", type: "main" });

        let watchCat = await Category.findOne({ name: "Watches" });
        if (!watchCat) watchCat = await Category.create({ name: "Watches", type: "main" });

        let fanCat = await Category.findOne({ name: "Fan Light" });
        if (!fanCat) fanCat = await Category.create({ name: "Fan Light", type: "main" });

        let beautyCat = await Category.findOne({ name: "Beauty Items" });
        if (!beautyCat) beautyCat = await Category.create({ name: "Beauty Items", type: "main" });

        const seedItems = [
          {
            name: "Royal Oud Perfume 100ml",
            description: "Premium long-lasting royal oud fragrance perfume for men and women.",
            image: "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=600&auto=format&fit=crop&q=80",
            originalPrice: 2500, offerPrice: 1850, discountBadge: "26% OFF", stockStatus: "In Stock",
            category: perfCat._id, isFeatured: true, isTrending: true, isNewArrival: true
          },
          {
            name: "Luxury Gold Chronograph Watch",
            description: "Premium stainless steel quartz chronograph watch.",
            image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80",
            originalPrice: 3200, offerPrice: 2400, discountBadge: "25% OFF", stockStatus: "In Stock",
            category: watchCat._id, isFeatured: true, isTrending: true
          },
          {
            name: "Smart RGB LED Fan Light 30W",
            description: "Multi-color remote control LED ceiling fan light.",
            image: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600&auto=format&fit=crop&q=80",
            originalPrice: 1800, offerPrice: 1350, discountBadge: "25% OFF", stockStatus: "In Stock",
            category: fanCat._id, isFeatured: true, isNewArrival: true
          },
          {
            name: "Vitamin C Brightening Serum 30ml",
            description: "Natural organic vitamin C serum for glowing skin.",
            image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&auto=format&fit=crop&q=80",
            originalPrice: 1200, offerPrice: 850, discountBadge: "29% OFF", stockStatus: "In Stock",
            category: beautyCat._id, isTrending: true, isNewArrival: true
          },
          {
            name: "French Vanilla Long-Lasting Body Mist",
            description: "Refreshing vanilla scent body mist for daily freshness.",
            image: "https://images.unsplash.com/photo-1541643600914-78b084683601?w=600&auto=format&fit=crop&q=80",
            originalPrice: 1500, offerPrice: 990, discountBadge: "34% OFF", stockStatus: "In Stock",
            category: perfCat._id, isFeatured: true
          }
        ];

        await Product.insertMany(seedItems);
        settings.isDemoSeeded = true;
        await settings.save();

        products = await Product.find().populate("category");
      } catch (seedErr) {
        console.error("Seed error:", seedErr);
      }
    }

    res.json(products || []);
  } catch (error) {
    res.json([]);
  }
});

// GET single product by ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (id.startsWith("demo-")) {
      const demoItem = DEMO_PRODUCTS.find((p) => p._id === id);
      if (demoItem) return res.json(demoItem);
    }

    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      const product = await Product.findById(id).populate("category");
      if (product) {
        return res.json(product);
      }
    }

    const demoFallback = DEMO_PRODUCTS.find((p) => p._id === id);
    if (demoFallback) {
      return res.json(demoFallback);
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

    const updated = await Product.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate("category");

    if (!updated) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(updated);
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

    if (id.startsWith("demo-")) {
      return res.json({ message: "Demo product deleted successfully" });
    }

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