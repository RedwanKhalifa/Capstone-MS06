const connectDB = require("./config/db");
const Room = require("./models/Room");
const rooms = require("./rooms.json");

async function seedDatabase() {
  try {
    await connectDB();

    await Room.deleteMany({});
    console.log("Cleared existing rooms");

    await Room.insertMany(rooms);
    console.log("Rooms inserted successfully!");

    process.exit();
  } catch (err) {
    console.error("Error seeding database:", err);
    process.exit(1);
  }
}

seedDatabase();
