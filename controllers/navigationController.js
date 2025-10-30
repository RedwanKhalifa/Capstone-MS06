const Room = require('../models/Room');
const Connection = require('../models/Connection');

// POST /api/navigation
exports.navigate = async (req, res) => {
  const { from, to, accessible } = req.body;

  try {
    // Example placeholder: Dijkstra algorithm call here
    const path = [`${from}`, 'HALL1F', 'ELEV1', 'HALL2F', `${to}`];
    const totalDistance = 60;
    return res.json({ path, totalDistance, accessible });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/navigation/nearby?room=ENG101&type=restroom
exports.findNearby = async (req, res) => {
  const { room, type } = req.query;
  try {
    const nearby = await Room.findOne({ type });
    res.json({ nearest: nearby });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
