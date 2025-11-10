const Building = require('../models/Building');
const Floor = require('../models/Floor');

exports.getBuildings = async (req, res) => {
  try {
    const buildings = await Building.find();
    res.json(buildings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getFloors = async (req, res) => {
  try {
    const floors = await Floor.find({ building_id: req.params.id });
    res.json(floors);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getFloor = async (req, res) => {
  try {
    const floor = await Floor.findById(req.params.id);
    if (!floor) {
      return res.status(404).json({ message: 'Floor not found' });
    }
    res.json(floor);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
