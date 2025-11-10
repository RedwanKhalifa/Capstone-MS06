const Room = require('../models/Room');

exports.listRooms = async (req, res) => {
  const { type, floor, search } = req.query;

  const filters = {};
  if (type) {
    filters.type = type;
  }
  if (floor) {
    filters.floor = floor;
  }
  if (search) {
    filters.$or = [
      { room_id: new RegExp(search, 'i') },
      { name: new RegExp(search, 'i') },
    ];
  }

  try {
    const rooms = await Room.find(filters).populate('floor');
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getRoom = async (req, res) => {
  const { id } = req.params;
  try {
    const room = await Room.findById(id).populate('floor');
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }
    res.json(room);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getRoomByCode = async (req, res) => {
  const { code } = req.params;
  try {
    const room = await Room.findOne({ room_id: code }).populate('floor');
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }
    res.json(room);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
