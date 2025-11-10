const express = require('express');
const router = express.Router();

// GET /api/system/stats
router.get('/stats', (req, res) => {
  res.json({
    status: 'OK',
    totalRooms: 32,
    totalConnections: 64,
    message: 'System routes placeholder working'
  });
});

module.exports = router;
