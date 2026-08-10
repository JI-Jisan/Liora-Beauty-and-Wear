const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const Product = require("../models/Product");
const adminAuth = require("../middleware/adminAuth");
const {
  sendOrderPlacedNotification,
  sendStatusUpdateNotification,
} = require("../utils/notification");

// GET all orders (Protected - Admin only)
router.get("/", adminAuth, async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders || []);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// TRACK orders (Public - Search by Phone or Order Number)
router.get("/track", async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || !query.trim()) {
      return res.status(400).json({ message: "Search keyword is required" });
    }

    const safeQuery = query.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const orders = await Order.find({
      $or: [
        { phone: { $regex: safeQuery, $options: "i" } },
        { orderNumber: { $regex: safeQuery, $options: "i" } },
      ],
    }).sort({ createdAt: -1 });

    res.json(orders || []);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET single order by ID or Order Number (Public for Success page)
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    let order = null;

    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      order = await Order.findById(id);
    }

    if (!order) {
      order = await Order.findOne({ orderNumber: id });
    }

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// CREATE order (Public - Guest Checkout)
router.post("/", async (req, res) => {
  try {
    const { customerName, phone, address, items, deliveryCharge } = req.body;

    if (!customerName || !phone || !address) {
      return res.status(400).json({ message: "Customer name, phone and address are required" });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Cart cannot be empty" });
    }

    const safeDeliveryCharge = Number(deliveryCharge) === 110 ? 110 : 65;

    // Recalculate prices on backend to prevent client-side price tampering
    let calculatedSubtotal = 0;
    const sanitizedItems = [];

    for (const item of items) {
      const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
      let price = Number(item.price) || 0;

      // Verify product price from DB if item._id is a valid ObjectId
      if (item._id && String(item._id).match(/^[0-9a-fA-F]{24}$/)) {
        const dbProduct = await Product.findById(item._id);
        if (dbProduct && dbProduct.offerPrice > 0) {
          price = dbProduct.offerPrice;
        }
      }

      const itemTotal = price * qty;
      calculatedSubtotal += itemTotal;

      sanitizedItems.push({
        productName: String(item.productName || item.name || "Product").trim(),
        quantity: qty,
        price: price,
      });
    }

    const calculatedTotal = calculatedSubtotal + safeDeliveryCharge;

    // Collision-resistant unique order number generation with retry safety
    let orderNumber = "";
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 5) {
      attempts++;
      const timeStamp = Date.now().toString().slice(-6);
      const randomBits = Math.floor(1000 + Math.random() * 9000);
      const candidateNumber = `LIORA-${timeStamp}${randomBits}`;

      const existing = await Order.findOne({ orderNumber: candidateNumber });
      if (!existing) {
        orderNumber = candidateNumber;
        isUnique = true;
      }
    }

    if (!orderNumber) {
      orderNumber = `LIORA-${Date.now()}`;
    }

    const order = new Order({
      customerName: String(customerName).trim(),
      phone: String(phone).trim(),
      address: String(address).trim(),
      note: req.body.note ? String(req.body.note).trim() : "",
      items: sanitizedItems,
      deliveryCharge: safeDeliveryCharge,
      subtotal: calculatedSubtotal,
      total: calculatedTotal,
      orderNumber,
    });

    const savedOrder = await order.save();

    // Trigger SMS/Email notification async
    sendOrderPlacedNotification(savedOrder).catch((err) =>
      console.error(err)
    );

    res.status(201).json(savedOrder);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// UPDATE order status (Protected - Admin only)
router.put("/:id/status", adminAuth, async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Trigger status update SMS notification async
    sendStatusUpdateNotification(order).catch((err) => console.error(err));

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;