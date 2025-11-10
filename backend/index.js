const connectDB = require("./config/db");
const Room = require("./models/Room");

async function main() {
  await connectDB();

  // Test query
  const rooms = await Room.find();
  console.log("📋 Current rooms:", rooms);

  process.exit(); // close app after query
}

main();