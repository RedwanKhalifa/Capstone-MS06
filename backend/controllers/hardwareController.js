const Beacon = require('../models/Beacon');

exports.ingestTelemetry = async (req, res) => {
  const {
    deviceId,
    rssi,
    battery,
    temperature,
    floor,
    building,
    coordinates,
    alias,
  } = req.body;

  if (!deviceId) {
    return res.status(400).json({ message: 'deviceId is required' });
  }

  try {
    const now = new Date();
    const beacon = await Beacon.findOneAndUpdate(
      { deviceId },
      {
        deviceId,
        alias,
        floor,
        building,
        lastSeen: now,
        status: 'online',
        telemetry: { rssi, battery, temperature },
        coordinates,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({ message: 'Telemetry ingested', beacon });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.listBeacons = async (_req, res) => {
  try {
    const now = Date.now();
    const beacons = await Beacon.find().populate('floor building');
    const transformed = beacons.map((beacon) => {
      const offlineThreshold = 5 * 60 * 1000;
      const isOffline =
        !beacon.lastSeen || now - beacon.lastSeen.getTime() > offlineThreshold;
      return {
        ...beacon.toObject(),
        status: isOffline ? 'offline' : 'online',
      };
    });
    res.json(transformed);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getBeacon = async (req, res) => {
  try {
    const beacon = await Beacon.findOne({ deviceId: req.params.id }).populate(
      'floor building'
    );
    if (!beacon) {
      return res.status(404).json({ message: 'Beacon not found' });
    }
    res.json(beacon);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getLivePositions = async (req, res) => {
  const offlineThreshold = Number(req.query.offlineMs || 120000);

  try {
    const beacons = await Beacon.find().populate('floor building');
    const now = Date.now();
    const live = beacons
      .filter((beacon) =>
        beacon.lastSeen ? now - beacon.lastSeen.getTime() <= offlineThreshold : false
      )
      .map((beacon) => ({
        deviceId: beacon.deviceId,
        alias: beacon.alias,
        coordinates: beacon.coordinates,
        telemetry: beacon.telemetry,
        floor: beacon.floor,
        building: beacon.building,
        lastSeen: beacon.lastSeen,
      }));
    res.json({ live, offlineThreshold });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
