const Room = require('../models/Room');
const Connection = require('../models/Connection');
const { buildGraph, dijkstra } = require('../services/pathfinding');

const formatRoomForResponse = (room) => {
  if (!room) {
    return null;
  }

  return {
    id: room._id,
    roomId: room.room_id,
    name: room.name || room.room_id,
    type: room.type,
    floor: room.floor,
    coordinates: room.coordinates || null,
    accessible: room.accessible,
  };
};

const buildStepInstructions = (roomsInPath) =>
  roomsInPath.map((room, index) => {
    if (index === roomsInPath.length - 1) {
      return `Arrive at ${room.name}`;
    }
    const nextRoom = roomsInPath[index + 1];
    return `Proceed from ${room.name} to ${nextRoom.name}`;
  });

// POST /api/navigation
exports.navigate = async (req, res) => {
  const { from, to, accessible = false } = req.body;

  if (!from || !to) {
    return res.status(400).json({
      message: 'Both "from" and "to" room identifiers are required.',
    });
  }

  try {
    const [startRoom, endRoom] = await Promise.all([
      Room.findOne({ room_id: from }).populate('floor'),
      Room.findOne({ room_id: to }).populate('floor'),
    ]);

    if (!startRoom || !endRoom) {
      return res.status(404).json({
        message: 'Unable to resolve both start and destination rooms.',
      });
    }

    const connections = await Connection.find()
      .populate({ path: 'from', populate: { path: 'floor' } })
      .populate({ path: 'to', populate: { path: 'floor' } });

    if (!connections.length) {
      return res.status(503).json({
        message: 'Navigation graph is empty. Seed connections first.',
      });
    }

    const startId = startRoom._id.toString();
    const endId = endRoom._id.toString();
    const graph = buildGraph(connections, { accessibleOnly: accessible });
    if (!graph.has(startId)) {
      graph.set(startId, []);
    }
    if (!graph.has(endId)) {
      graph.set(endId, []);
    }
    const { path: nodePath, totalDistance } = dijkstra(graph, startId, endId);

    if (!nodePath.length || !isFinite(totalDistance)) {
      return res.status(404).json({
        message: 'No route found between the selected rooms.',
      });
    }

    const roomsById = new Map();
    connections.forEach((connection) => {
      roomsById.set(connection.from._id.toString(), connection.from);
      roomsById.set(connection.to._id.toString(), connection.to);
    });
    roomsById.set(startId, startRoom);
    roomsById.set(endId, endRoom);

    const roomsInPath = nodePath
      .map((roomId) => formatRoomForResponse(roomsById.get(roomId)))
      .filter(Boolean);

    const steps = buildStepInstructions(roomsInPath);

    res.json({
      from: formatRoomForResponse(startRoom),
      to: formatRoomForResponse(endRoom),
      path: roomsInPath,
      steps,
      totalDistance,
      accessible,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/navigation/nearby?room=ENG101&type=restroom&accessible=true
exports.findNearby = async (req, res) => {
  const { room: roomId, type, accessible } = req.query;
  if (!roomId || !type) {
    return res.status(400).json({
      message: 'Query parameters "room" and "type" are required.',
    });
  }

  const accessibleOnly = accessible === 'true';

  try {
    const [originRoom, candidateRooms, connections] = await Promise.all([
      Room.findOne({ room_id: roomId }).populate('floor'),
      Room.find({ type }).populate('floor'),
      Connection.find()
        .populate({ path: 'from', populate: { path: 'floor' } })
        .populate({ path: 'to', populate: { path: 'floor' } }),
    ]);

    if (!originRoom) {
      return res.status(404).json({ message: 'Origin room not found.' });
    }

    if (!candidateRooms.length) {
      return res.status(404).json({
        message: `No destinations of type ${type} found.`,
      });
    }

    const graph = buildGraph(connections, { accessibleOnly });
    const originId = originRoom._id.toString();
    if (!graph.has(originId)) {
      graph.set(originId, []);
    }

    const scoredDestinations = candidateRooms
      .map((destination) => {
        const destId = destination._id.toString();
        if (!graph.has(destId)) {
          graph.set(destId, []);
        }
        const { path: nodePath, totalDistance } = dijkstra(
          graph,
          originId,
          destId
        );
        return {
          destination,
          nodePath,
          totalDistance,
        };
      })
      .filter((result) => result.nodePath.length && isFinite(result.totalDistance))
      .sort((a, b) => a.totalDistance - b.totalDistance);

    if (!scoredDestinations.length) {
      return res.status(404).json({
        message: 'No reachable destinations found for the requested type.',
      });
    }

    const best = scoredDestinations[0];
    const roomsById = new Map();
    connections.forEach((connection) => {
      roomsById.set(connection.from._id.toString(), connection.from);
      roomsById.set(connection.to._id.toString(), connection.to);
    });
    roomsById.set(originId, originRoom);
    roomsById.set(best.destination._id.toString(), best.destination);

    const roomsInPath = best.nodePath
      .map((id) => formatRoomForResponse(roomsById.get(id)))
      .filter(Boolean);

    res.json({
      origin: formatRoomForResponse(originRoom),
      nearest: formatRoomForResponse(best.destination),
      path: roomsInPath,
      totalDistance: best.totalDistance,
      accessible: accessibleOnly,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
