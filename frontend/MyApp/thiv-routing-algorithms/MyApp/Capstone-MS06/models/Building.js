const mongoose = require("mongoose");

const buildingSchema = new mongoose.Schema({
  building_id: { type: String, required: true, unique: true }, // ENG, LIB, etc.
  name: String,
  address: String,
  floors: [{ type: mongoose.Schema.Types.ObjectId, ref: "Floor" }]
});

module.exports = mongoose.model("Building", buildingSchema);
