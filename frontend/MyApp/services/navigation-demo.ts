export type DemoFloor = 1 | 2;

export type DemoRoom = {
  id: string;
  label: string;
  floor: DemoFloor;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  kind?: "room" | "stairs";
};

export type DemoNode = {
  id: string;
  floor: DemoFloor;
  x: number;
  y: number;
  label?: string;
  kind: "room" | "hall" | "stairs";
};

export type DemoRoutePoint = {
  x: number;
  y: number;
  floor: DemoFloor;
  nodeId: string;
};

export type DemoRouteSegment = {
  floor: DemoFloor;
  fromLabel: string;
  toLabel: string;
};

export type DemoRouteResult = {
  startRoom: DemoRoom;
  destinationRoom: DemoRoom;
  nodePath: DemoNode[];
  animatedPoints: DemoRoutePoint[];
  segments: DemoRouteSegment[];
  instructions: string[];
  distance: number;
};

type Edge = {
  target: string;
  weight: number;
};

export const NAVIGATION_START_ROOM_ID = "ENG103";

export const DEMO_ROOMS: DemoRoom[] = [
  { id: "ENG101", label: "ENG101", floor: 1, x: 8, y: 16, width: 18, height: 14, color: "#7c92ff" },
  { id: "ENG102", label: "ENG102", floor: 1, x: 30, y: 16, width: 18, height: 14, color: "#6ea8ff" },
  { id: "ENG103", label: "ENG103", floor: 1, x: 8, y: 58, width: 24, height: 16, color: "#f4d35e" },
  { id: "ENG104", label: "ENG104", floor: 1, x: 36, y: 58, width: 18, height: 16, color: "#98c1d9" },
  { id: "STAIRS-1", label: "STAIRS", floor: 1, x: 70, y: 34, width: 16, height: 28, color: "#f28482", kind: "stairs" },
  { id: "ENG201", label: "ENG201", floor: 2, x: 42, y: 12, width: 22, height: 16, color: "#f4d35e" },
  { id: "ENG202", label: "ENG202", floor: 2, x: 14, y: 12, width: 22, height: 16, color: "#84dcc6" },
  { id: "ENG203", label: "ENG203", floor: 2, x: 14, y: 58, width: 22, height: 16, color: "#a29bfe" },
  { id: "ENG204", label: "ENG204", floor: 2, x: 42, y: 58, width: 22, height: 16, color: "#8ecae6" },
  { id: "STAIRS-2", label: "STAIRS", floor: 2, x: 70, y: 34, width: 16, height: 28, color: "#f28482", kind: "stairs" },
];

export const DESTINATION_ROOMS = DEMO_ROOMS.filter(
  (room) => room.id !== NAVIGATION_START_ROOM_ID && room.kind !== "stairs"
);

const NODES: DemoNode[] = [
  { id: "ENG103", floor: 1, x: 24, y: 66, label: "ENG103", kind: "room" },
  { id: "F1_HALL_WEST", floor: 1, x: 42, y: 66, label: "Hallway", kind: "hall" },
  { id: "F1_HALL_CENTER", floor: 1, x: 58, y: 50, label: "Hallway", kind: "hall" },
  { id: "STAIRS_1", floor: 1, x: 78, y: 50, label: "Stairs", kind: "stairs" },
  { id: "STAIRS_2", floor: 2, x: 78, y: 50, label: "Stairs", kind: "stairs" },
  { id: "F2_HALL_CENTER", floor: 2, x: 58, y: 36, label: "Upper Hallway", kind: "hall" },
  { id: "ENG201", floor: 2, x: 53, y: 28, label: "ENG201", kind: "room" },
  { id: "ENG202", floor: 2, x: 25, y: 28, label: "ENG202", kind: "room" },
  { id: "F2_HALL_WEST", floor: 2, x: 32, y: 50, label: "Upper Hallway", kind: "hall" },
  { id: "ENG203", floor: 2, x: 25, y: 58, label: "ENG203", kind: "room" },
  { id: "ENG204", floor: 2, x: 53, y: 58, label: "ENG204", kind: "room" },
];

const EDGES: Record<string, Edge[]> = {
  ENG103: [{ target: "F1_HALL_WEST", weight: 18 }],
  F1_HALL_WEST: [
    { target: "ENG103", weight: 18 },
    { target: "F1_HALL_CENTER", weight: 22 },
  ],
  F1_HALL_CENTER: [
    { target: "F1_HALL_WEST", weight: 22 },
    { target: "STAIRS_1", weight: 20 },
  ],
  STAIRS_1: [{ target: "F1_HALL_CENTER", weight: 20 }, { target: "STAIRS_2", weight: 26 }],
  STAIRS_2: [{ target: "STAIRS_1", weight: 26 }, { target: "F2_HALL_CENTER", weight: 18 }],
  F2_HALL_CENTER: [
    { target: "STAIRS_2", weight: 18 },
    { target: "ENG201", weight: 10 },
    { target: "ENG202", weight: 34 },
    { target: "F2_HALL_WEST", weight: 30 },
  ],
  ENG201: [{ target: "F2_HALL_CENTER", weight: 10 }],
  ENG202: [{ target: "F2_HALL_CENTER", weight: 34 }],
  F2_HALL_WEST: [
    { target: "F2_HALL_CENTER", weight: 30 },
    { target: "ENG203", weight: 12 },
    { target: "ENG204", weight: 22 },
  ],
  ENG203: [{ target: "F2_HALL_WEST", weight: 12 }],
  ENG204: [{ target: "F2_HALL_WEST", weight: 22 }],
};

const ROOM_TO_NODE: Record<string, string> = {
  ENG103: "ENG103",
  ENG201: "ENG201",
  ENG202: "ENG202",
  ENG203: "ENG203",
  ENG204: "ENG204",
};

function getNode(nodeId: string) {
  const node = NODES.find((entry) => entry.id === nodeId);
  if (!node) {
    throw new Error(`Unknown node: ${nodeId}`);
  }
  return node;
}

function getRoom(roomId: string) {
  const room = DEMO_ROOMS.find((entry) => entry.id === roomId);
  if (!room) {
    throw new Error(`Unknown room: ${roomId}`);
  }
  return room;
}

function dijkstra(startId: string, endId: string) {
  const distances: Record<string, number> = {};
  const previous: Record<string, string | null> = {};
  const unvisited = new Set(NODES.map((node) => node.id));

  NODES.forEach((node) => {
    distances[node.id] = Number.POSITIVE_INFINITY;
    previous[node.id] = null;
  });

  distances[startId] = 0;

  while (unvisited.size > 0) {
    const currentId = [...unvisited].reduce((best, candidate) =>
      distances[candidate] < distances[best] ? candidate : best
    );

    if (distances[currentId] === Number.POSITIVE_INFINITY) {
      break;
    }

    unvisited.delete(currentId);

    if (currentId === endId) {
      break;
    }

    (EDGES[currentId] ?? []).forEach((edge) => {
      const nextDistance = distances[currentId] + edge.weight;
      if (nextDistance < distances[edge.target]) {
        distances[edge.target] = nextDistance;
        previous[edge.target] = currentId;
      }
    });
  }

  const path: string[] = [];
  let cursor: string | null = endId;

  while (cursor) {
    path.unshift(cursor);
    cursor = previous[cursor];
  }

  return {
    nodeIds: path,
    distance: distances[endId],
  };
}

function interpolateSegment(start: DemoNode, end: DemoNode) {
  const samples = Math.max(8, Math.round(Math.hypot(end.x - start.x, end.y - start.y) / 2));
  const points: DemoRoutePoint[] = [];

  for (let index = 0; index <= samples; index += 1) {
    const progress = index / samples;
    points.push({
      x: start.x + (end.x - start.x) * progress,
      y: start.y + (end.y - start.y) * progress,
      floor: progress < 0.5 ? start.floor : end.floor,
      nodeId: progress < 1 ? start.id : end.id,
    });
  }

  return points;
}

function createAnimatedPoints(nodePath: DemoNode[]) {
  if (nodePath.length === 0) {
    return [];
  }

  return nodePath.flatMap((node, index) => {
    if (index === nodePath.length - 1) {
      return [{ x: node.x, y: node.y, floor: node.floor, nodeId: node.id }];
    }

    const segmentPoints = interpolateSegment(node, nodePath[index + 1]);
    return index === 0 ? segmentPoints : segmentPoints.slice(1);
  });
}

function buildInstructions(startRoom: DemoRoom, destinationRoom: DemoRoom) {
  return [
    `Leave ${startRoom.label} and join the first-floor hallway.`,
    "Continue straight to the stairs and go up to level 2.",
    `Exit the stairs and follow the second-floor hallway to ${destinationRoom.label}.`,
  ];
}

function buildSegments(nodePath: DemoNode[]) {
  const segments: DemoRouteSegment[] = [];

  for (let index = 0; index < nodePath.length - 1; index += 1) {
    const current = nodePath[index];
    const next = nodePath[index + 1];

    if (current.floor !== next.floor) {
      segments.push({
        floor: current.floor,
        fromLabel: current.label ?? current.id,
        toLabel: "Stairs",
      });
      segments.push({
        floor: next.floor,
        fromLabel: "Stairs",
        toLabel: next.label ?? next.id,
      });
      continue;
    }

    const previousSegment = segments[segments.length - 1];
    if (previousSegment && previousSegment.floor === current.floor) {
      previousSegment.toLabel = next.label ?? next.id;
    } else {
      segments.push({
        floor: current.floor,
        fromLabel: current.label ?? current.id,
        toLabel: next.label ?? next.id,
      });
    }
  }

  return segments;
}

export function getNavigationDemoRoute(destinationRoomId: string): DemoRouteResult {
  const startRoom = getRoom(NAVIGATION_START_ROOM_ID);
  const destinationRoom = getRoom(destinationRoomId);
  const startNodeId = ROOM_TO_NODE[startRoom.id];
  const endNodeId = ROOM_TO_NODE[destinationRoom.id];
  const result = dijkstra(startNodeId, endNodeId);
  const nodePath = result.nodeIds.map(getNode);

  return {
    startRoom,
    destinationRoom,
    nodePath,
    animatedPoints: createAnimatedPoints(nodePath),
    segments: buildSegments(nodePath),
    instructions: buildInstructions(startRoom, destinationRoom),
    distance: result.distance,
  };
}
