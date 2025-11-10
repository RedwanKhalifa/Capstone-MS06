const Connection = require('../models/Connection');

exports.getConnections = async (req, res) => {
  const { accessible } = req.query;
  const filters = {};
  if (accessible === 'true') {
    filters.accessible = true;
  }
  try {
    const connections = await Connection.find(filters)
      .populate('from')
      .populate('to');
    res.json(connections);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
