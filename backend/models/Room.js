const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema({
  room_id: { type: String, required: true, unique: true }, // ENG101
  name: String,
  floor: { type: mongoose.Schema.Types.ObjectId, ref: "Floor" },
  type: {
    type: String,
    enum: [
      "classroom",
      "lab",
      "office",
      "hallway",
      "stairwell",
      "elevator",
      "meeting",
      "storage",
      "restroom"
    ]
  },
  accessible: Boolean,
  accessibility: {
    wheelchair: Boolean,
    elevator_access: Boolean,
    notes: String
  },
  coordinates: {
    x: Number,
    y: Number
  }
});

module.exports = mongoose.model("Room", roomSchema);
