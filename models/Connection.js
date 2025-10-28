const mongoose = require("mongoose");

const connectionSchema = new mongoose.Schema({
  from: { type: mongoose.Schema.Types.ObjectId, ref: "Room", required: true },
  to: { type: mongoose.Schema.Types.ObjectId, ref: "Room", required: true },
  type: {
    type: String,
    enum: ["door", "hallway", "stair", "elevator"]
  },
  distance: Number,
  accessible: Boolean
});

module.exports = mongoose.model("Connection", connectionSchema);
