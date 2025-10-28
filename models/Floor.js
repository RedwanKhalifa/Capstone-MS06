const mongoose = require("mongoose");

const floorSchema = new mongoose.Schema({
  floor_number: { type: Number, required: true },
  building: { type: mongoose.Schema.Types.ObjectId, ref: "Building" },
  rooms: [{ type: mongoose.Schema.Types.ObjectId, ref: "Room" }]
});

module.exports = mongoose.model("Floor", floorSchema);
