const Connection = require('../models/Connection');

exports.getConnections = async (req, res) => {
  try {
    const connections = await Connection.find();
    res.json(connections);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
