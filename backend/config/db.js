require("dotenv").config();
const mongoose = require("mongoose");

async function connectDB() {
  try {
    console.log("Connecting to:", process.env.MONGO_URI);
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB Atlas");
  } catch (err) {
    console.error("Database connection error:", err);
    process.exit(1); // stop app if DB fails
  }
}

module.exports = connectDB;
