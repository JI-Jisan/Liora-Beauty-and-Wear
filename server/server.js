const adminRoutes = require("./routes/adminRoutes");
const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const connectDB = require("./config/db");
const categoryRoutes = require("./routes/categoryRoutes");
const productRoutes = require("./routes/productRoutes");
const orderRoutes = require("./routes/orderRoutes");
const settingsRoutes = require("./routes/settingsRoutes");

const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const app = express();

connectDB();

app.use(helmet());

app.use(cors({
  origin: process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',') : "http://localhost:3000",
  credentials: true
}));

app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  message: { message: "Too many login attempts, please try again after 15 minutes." }
});

const orderTrackLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: "Too many tracking requests, please try again later." }
});

app.use("/api/admin/login", authLimiter);
app.use("/api/orders/track", orderTrackLimiter);
app.use("/api/", apiLimiter);

app.get("/", (req, res) => {
  res.send("Jisan Trends API is running...");
});

app.use("/api/categories", categoryRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/admin", adminRoutes);

const PORT = process.env.PORT || 5001;

if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;