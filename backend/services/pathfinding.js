const buildGraph = (connections, { accessibleOnly = false } = {}) => {
  const graph = new Map();

  const addEdge = (from, to, weight, connection) => {
    if (!graph.has(from)) {
      graph.set(from, []);
    }
    graph.get(from).push({ node: to, weight, meta: connection });
  };

  connections.forEach((connection) => {
    const isAccessible =
      connection.accessible !== false && connection.type !== 'stair';

    if (accessibleOnly && !isAccessible) {
      return;
    }

    const weight = Number(connection.distance) || 1;
    const fromId = connection.from._id.toString();
    const toId = connection.to._id.toString();

    addEdge(fromId, toId, weight, connection);
    addEdge(toId, fromId, weight, connection);
  });

  return graph;
};

const dijkstra = (graph, startId, endId) => {
  const distances = new Map();
  const previous = new Map();
  const visited = new Set();

  graph.forEach((_, nodeId) => {
    distances.set(nodeId, Number.POSITIVE_INFINITY);
  });

  distances.set(startId, 0);

  while (visited.size < graph.size) {
    let currentNode = null;
    let smallestDistance = Number.POSITIVE_INFINITY;

    for (const [nodeId, distance] of distances.entries()) {
      if (!visited.has(nodeId) && distance < smallestDistance) {
        smallestDistance = distance;
        currentNode = nodeId;
      }
    }

    if (currentNode === null) {
      break;
    }

    if (currentNode === endId) {
      break;
    }

    visited.add(currentNode);

    const neighbours = graph.get(currentNode) || [];
    neighbours.forEach(({ node: neighbourId, weight }) => {
      if (visited.has(neighbourId)) {
        return;
      }

      const altDistance = distances.get(currentNode) + weight;
      if (altDistance < distances.get(neighbourId)) {
        distances.set(neighbourId, altDistance);
        previous.set(neighbourId, currentNode);
      }
    });
  }

  const path = [];
  let current = endId;

  if (!previous.has(current) && current !== startId) {
    return { path: [], totalDistance: Number.POSITIVE_INFINITY };
  }

  while (current) {
    path.unshift(current);
    if (current === startId) {
      break;
    }
    current = previous.get(current);
  }

  const totalDistance = distances.get(endId);
  return { path, totalDistance };
};

module.exports = {
  buildGraph,
  dijkstra,
};
