const mongoose = require('mongoose');

const beaconSchema = new mongoose.Schema(
  {
    deviceId: { type: String, required: true, unique: true },
    alias: { type: String },
    floor: { type: mongoose.Schema.Types.ObjectId, ref: 'Floor' },
    building: { type: mongoose.Schema.Types.ObjectId, ref: 'Building' },
    lastSeen: { type: Date },
    status: {
      type: String,
      enum: ['online', 'offline', 'maintenance'],
      default: 'offline',
    },
    telemetry: {
      rssi: Number,
      battery: Number,
      temperature: Number,
    },
    coordinates: {
      x: Number,
      y: Number,
      floorIndex: Number,
    },
    metadata: {
      firmware: String,
      notes: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Beacon', beaconSchema);
