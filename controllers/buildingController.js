const Building = require('../models/Building');
const Floor = require('../models/Floor');

exports.getBuildings = async (req, res) => {
  const buildings = await Building.find();
  res.json(buildings);
};

exports.getFloors = async (req, res) => {
  const floors = await Floor.find({ building_id: req.params.id });
  res.json(floors);
};

exports.getFloor = async (req, res) => {
  const floor = await Floor.findById(req.params.id);
  res.json(floor);
};
