const mongoose = require("mongoose");
const seedAdmin = require("../utils/seedAdmin");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    await seedAdmin();
  } catch (error) {
    console.error("MongoDB Atlas connection failed:", error.message);
    try {
      console.log("Attempting local MongoDB connection...");
      const conn = await mongoose.connect("mongodb://127.0.0.1:27017/jisantrends");
      console.log(`Local MongoDB Connected: ${conn.connection.host}`);
      await seedAdmin();
    } catch (localErr) {
      console.error("Local MongoDB connection also failed:", localErr.message);
      console.error("Server will continue running. Please whitelist your IP on MongoDB Atlas or run local MongoDB service.");
    }
  }
};

module.exports = connectDB;