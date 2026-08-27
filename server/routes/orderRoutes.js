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
    const raw = String(req.query.query || "").trim();
    const isOrderNo = /^LIORA-\d{6,}$/i.test(raw);
    const isPhone = /^01\d{9}$/.test(raw);
    if (!isOrderNo && !isPhone) return res.status(400).json({ message: "Invalid format" });

    const PUBLIC_ORDER_FIELDS =
      "orderNumber status subtotal deliveryCharge total createdAt customerName " +
      "items.productName items.quantity items.price items.image";

    const filter = isOrderNo ? { orderNumber: raw.toUpperCase() } : { phone: raw };
    const orders = await Order.find(filter)
      .select(PUBLIC_ORDER_FIELDS)
      .sort({ createdAt: -1 }).limit(10);
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

const PUBLIC_ORDER_FIELDS =
  "orderNumber status subtotal deliveryCharge total createdAt customerName " +
  "items.productName items.quantity items.price items.image";

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    let order = null;

    if (/^[0-9a-fA-F]{24}$/.test(id)) {
      order = await Order.findById(id).select(PUBLIC_ORDER_FIELDS).lean();
    }
    if (!order) {
      order = await Order.findOne({ orderNumber: id.toUpperCase() })
        .select(PUBLIC_ORDER_FIELDS)
        .lean();
    }
    if (!order) return res.status(404).json({ message: "Order not found" });

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// CREATE order (Public - Guest Checkout)
/* router.post("/", async (req, res) => {
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
      
      const productId = item.productId || item._id;
      if (!productId || !String(productId).match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({ message: "Invalid product ID in cart" });
      }

      const dbProduct = await Product.findById(productId);
      if (!dbProduct) {
        return res.status(404).json({ message: "Product not found" });
      }

      const price = Number(dbProduct.offerPrice ?? dbProduct.originalPrice ?? 0);

      const itemTotal = price * qty;
      calculatedSubtotal += itemTotal;

      sanitizedItems.push({
        productId: dbProduct._id,
        productName: dbProduct.name,
        quantity: qty,
        price: price,
        purchasePrice: Number(dbProduct.purchasePrice ?? 0),
        originalPrice: Number(dbProduct.originalPrice ?? 0),
        image: dbProduct.image || "",
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
}); */

const { ORDER_STATUSES } = require("../models/Order");

// UPDATE order status (Protected - Admin only)
router.put("/:id/status", adminAuth, async (req, res) => {
  try {
    const status = String(req.body.status || "");
    if (!ORDER_STATUSES.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
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