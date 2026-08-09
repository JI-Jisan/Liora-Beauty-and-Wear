const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
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
    const { customerName, phone, address, items, subtotal, total, deliveryCharge } = req.body;

    if (!customerName || !phone || !address) {
      return res.status(400).json({ message: "Customer name, phone and address are required" });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Cart cannot be empty" });
    }

    // Generate collision-free order number (e.g. LIORA-8492105)
    const timestampSuffix = Date.now().toString().slice(-4);
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const orderNumber = `LIORA-${timestampSuffix}${randomSuffix}`;

    const order = new Order({
      customerName: String(customerName).trim(),
      phone: String(phone).trim(),
      address: String(address).trim(),
      note: req.body.note ? String(req.body.note).trim() : "",
      items,
      deliveryCharge: Number(deliveryCharge) || 0,
      subtotal: Number(subtotal) || 0,
      total: Number(total) || 0,
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