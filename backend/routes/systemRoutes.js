const express = require('express');
const router = express.Router();
const Room = require('../models/Room');
const Connection = require('../models/Connection');
const Beacon = require('../models/Beacon');
const { createPresignedUrl } = require('../services/aws');

router.get('/stats', async (_req, res) => {
  try {
    const [roomCount, connectionCount, beaconCount] = await Promise.all([
      Room.countDocuments(),
      Connection.countDocuments(),
      Beacon.countDocuments(),
    ]);

    res.json({
      status: 'OK',
      totals: {
        rooms: roomCount,
        connections: connectionCount,
        beacons: beaconCount,
      },
      message: 'Backend services are reachable.',
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/assets/map', (req, res) => {
  const { key, bucket = process.env.AWS_MAP_BUCKET } = req.query;

  if (!key) {
    return res.status(400).json({ message: 'Map asset key is required' });
  }

  try {
    const url = createPresignedUrl({ bucket, key });
    res.json({ url, expiresIn: 900 });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
