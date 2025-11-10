const express = require('express');
const router = express.Router();
const {
  ingestTelemetry,
  listBeacons,
  getBeacon,
  getLivePositions,
} = require('../controllers/hardwareController');

router.post('/beacons/telemetry', ingestTelemetry);
router.get('/beacons', listBeacons);
router.get('/beacons/live', getLivePositions);
router.get('/beacons/:id', getBeacon);

module.exports = router;
