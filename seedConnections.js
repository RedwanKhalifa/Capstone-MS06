const connectDB = require("./config/db");
const Connection = require("./models/Connection");
const Room = require("./models/Room");
const connections = require("./connections.json");

async function seedConnections() {
  await connectDB();
  await Connection.deleteMany({});

  // Replace room_id with ObjectId references
  const rooms = await Room.find();
  const roomMap = {};
  rooms.forEach(r => roomMap[r.room_id] = r._id);

  const connectionDocs = connections.map(c => ({
    from: roomMap[c.from],
    to: roomMap[c.to],
    type: c.type,
    distance: c.distance,
    accessible: c.accessible
  }));

  await Connection.insertMany(connectionDocs);
  console.log("Connections inserted successfully!");
  process.exit();
}

seedConnections();
