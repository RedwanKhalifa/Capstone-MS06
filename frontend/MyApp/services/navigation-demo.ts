export type DemoFloorId = "B" | "LG" | "1" | "2" | "3" | "4" | "5";

export type DemoFloor = {
  id: DemoFloorId;
  label: string;
  shortLabel: string;
  levelIndex: number;
};

export type DemoRoom = {
  id: string;
  label: string;
  floorId: DemoFloorId;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  connectTo: string;
  category?: "lecture" | "lab" | "office" | "stairs" | "service";
};

export type DemoNode = {
  id: string;
  floorId: DemoFloorId;
  x: number;
  y: number;
  label: string;
  kind: "room" | "hall" | "stairs";
};

export type DemoRoutePoint = {
  x: number;
  y: number;
  floorId: DemoFloorId;
  nodeId: string;
};

export type DemoRouteSegment = {
  floorId: DemoFloorId;
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
  floorsOnRoute: DemoFloorId[];
};

type Edge = {
  target: string;
  weight: number;
};

const ROOM_COLORS = {
  office: "#a8c5ff",
  lecture: "#f6d26b",
  lab: "#87d3c6",
  service: "#b9b8ff",
};

export const FLOORS: DemoFloor[] = [
  { id: "B", label: "Basement", shortLabel: "B", levelIndex: -1 },
  { id: "LG", label: "Lower Ground", shortLabel: "LG", levelIndex: 0 },
  { id: "1", label: "Floor 1", shortLabel: "1", levelIndex: 1 },
  { id: "2", label: "Floor 2", shortLabel: "2", levelIndex: 2 },
  { id: "3", label: "Floor 3", shortLabel: "3", levelIndex: 3 },
  { id: "4", label: "Floor 4", shortLabel: "4", levelIndex: 4 },
  { id: "5", label: "Floor 5", shortLabel: "5", levelIndex: 5 },
];

export const NAVIGATION_START_ROOM_ID = "ENG103";

function createRoom(
  label: string,
  floorId: DemoFloorId,
  x: number,
  y: number,
  width: number,
  height: number,
  connectTo: string,
  category: DemoRoom["category"] = "office"
): DemoRoom {
  return {
    id: label,
    label,
    floorId,
    x,
    y,
    width,
    height,
    connectTo,
    category,
    color: ROOM_COLORS[category ?? "office"],
  };
}

const floorNorthBand = (
  floorId: DemoFloorId,
  rooms: Array<[string, number, number, string]>
) => rooms.map(([label, x, width, connectTo]) => createRoom(label, floorId, x, 12, width, 9, connectTo, "office"));

const floorSouthBand = (
  floorId: DemoFloorId,
  rooms: Array<[string, number, number, string, DemoRoom["category"]?]>
) => rooms.map(([label, x, width, connectTo, category]) => createRoom(label, floorId, x, 52, width, 15, connectTo, category ?? "lab"));

export const DEMO_ROOMS: DemoRoom[] = [
  createRoom("ENG B1", "B", 16, 48, 16, 16, "B_WEST", "service"),
  createRoom("ENG B2", "B", 38, 48, 18, 16, "B_CENTER", "service"),
  createRoom("ENG B9", "B", 60, 48, 18, 16, "B_CENTER", "lab"),
  createRoom("ENG B10", "B", 18, 28, 18, 12, "B_WEST", "service"),
  createRoom("ENG B17", "B", 80, 44, 14, 20, "B_EAST", "lab"),

  ...floorNorthBand("LG", [
    ["ENG LG 4", 10, 12, "LG_WEST"],
    ["ENG LG 6", 24, 12, "LG_WEST"],
    ["ENG LG 9", 38, 12, "LG_CENTER"],
    ["ENG LG 14", 56, 14, "LG_CENTER"],
    ["ENG LG 18", 74, 14, "LG_EAST"],
  ]),
  ...floorSouthBand("LG", [
    ["ENG LG 24", 12, 18, "LG_WEST", "lecture"],
    ["ENG LG 29", 34, 16, "LG_CENTER", "lecture"],
    ["ENG LG 32", 54, 18, "LG_CENTER", "lecture"],
    ["ENG LG 44", 76, 18, "LG_EAST", "lab"],
    ["ENG LG 53", 56, 34, "LG_EAST", "lab"],
  ]),

  ...floorNorthBand("1", [
    ["ENG116", 8, 10, "1_WEST"],
    ["ENG120", 20, 10, "1_WEST"],
    ["ENG126", 32, 10, "1_CENTER"],
    ["ENG130", 44, 10, "1_CENTER"],
    ["ENG137", 64, 10, "1_EAST"],
    ["ENG140", 76, 10, "1_EAST"],
    ["ENG144", 88, 8, "1_EAST"],
  ]),
  ...floorSouthBand("1", [
    ["ENG101", 12, 16, "1_SOUTHWEST", "lecture"],
    ["ENG103", 32, 16, "1_SOUTHCENTER", "lecture"],
    ["ENG105", 52, 16, "1_SOUTHCENTER", "lecture"],
    ["ENG109", 74, 20, "1_EAST", "lecture"],
    ["ENG112", 78, 30, "1_EAST", "lab"],
    ["ENG182", 60, 10, "1_CENTER", "service"],
  ]),

  ...floorNorthBand("2", [
    ["ENG220", 8, 10, "2_WEST"],
    ["ENG224", 20, 10, "2_WEST"],
    ["ENG229", 32, 10, "2_CENTER"],
    ["ENG235", 44, 10, "2_CENTER"],
    ["ENG243", 64, 10, "2_EAST"],
    ["ENG248", 76, 10, "2_EAST"],
    ["ENG257", 88, 8, "2_EAST"],
  ]),
  ...floorSouthBand("2", [
    ["ENG201", 12, 16, "2_SOUTHWEST", "lab"],
    ["ENG203", 32, 16, "2_SOUTHCENTER", "lab"],
    ["ENG209", 52, 16, "2_SOUTHCENTER", "lab"],
    ["ENG217", 74, 20, "2_EAST", "lab"],
    ["ENG239", 58, 12, "2_CENTER", "service"],
    ["ENG270", 44, 10, "2_CENTER", "office"],
    ["ENG290", 6, 12, "2_WEST", "office"],
  ]),

  ...floorNorthBand("3", [
    ["ENG319", 8, 10, "3_WEST"],
    ["ENG326", 20, 10, "3_WEST"],
    ["ENG330", 32, 10, "3_CENTER"],
    ["ENG339", 44, 10, "3_CENTER"],
    ["ENG343", 64, 10, "3_EAST"],
    ["ENG347", 76, 10, "3_EAST"],
    ["ENG349", 88, 8, "3_EAST"],
  ]),
  ...floorSouthBand("3", [
    ["ENG301", 12, 16, "3_SOUTHWEST", "lab"],
    ["ENG304", 32, 16, "3_SOUTHCENTER", "lab"],
    ["ENG309", 52, 16, "3_SOUTHCENTER", "lab"],
    ["ENG312", 74, 20, "3_EAST", "lab"],
    ["ENG327", 56, 12, "3_CENTER", "lab"],
    ["ENG356", 44, 10, "3_CENTER", "office"],
    ["ENG378", 6, 12, "3_WEST", "office"],
  ]),

  ...floorNorthBand("4", [
    ["ENG420", 8, 10, "4_WEST"],
    ["ENG426", 20, 10, "4_WEST"],
    ["ENG430", 32, 10, "4_CENTER"],
    ["ENG439", 44, 10, "4_CENTER"],
    ["ENG443", 64, 10, "4_EAST"],
    ["ENG447", 76, 10, "4_EAST"],
    ["ENG449", 88, 8, "4_EAST"],
  ]),
  ...floorSouthBand("4", [
    ["ENG401", 12, 16, "4_SOUTHWEST", "lab"],
    ["ENG403", 32, 16, "4_SOUTHCENTER", "lab"],
    ["ENG405", 52, 16, "4_SOUTHCENTER", "lab"],
    ["ENG413", 74, 20, "4_EAST", "lab"],
    ["ENG417", 56, 12, "4_CENTER", "service"],
    ["ENG440", 44, 10, "4_CENTER", "office"],
    ["ENG470", 6, 12, "4_WEST", "office"],
  ]),

  createRoom("ENG501", "5", 18, 46, 18, 18, "5_WEST", "service"),
  createRoom("ENG502", "5", 42, 46, 18, 18, "5_CENTER", "service"),
  createRoom("ENG503", "5", 66, 46, 16, 18, "5_EAST", "service"),
  createRoom("ENG504", "5", 82, 28, 12, 14, "5_EAST", "service"),
];

export const DESTINATION_ROOMS = DEMO_ROOMS.filter((room) => room.id !== NAVIGATION_START_ROOM_ID);

const FLOOR_NODE_TEMPLATE: Record<string, { x: number; y: number; label: string; kind: DemoNode["kind"] }> = {
  WEST: { x: 18, y: 36, label: "West Hall", kind: "hall" },
  CENTER: { x: 50, y: 36, label: "Central Hall", kind: "hall" },
  EAST: { x: 84, y: 36, label: "East Hall", kind: "hall" },
  SOUTHWEST: { x: 22, y: 60, label: "South Wing", kind: "hall" },
  SOUTHCENTER: { x: 50, y: 60, label: "South Spine", kind: "hall" },
  STAIR: { x: 58, y: 36, label: "Main Stairs", kind: "stairs" },
};

const NODES: DemoNode[] = FLOORS.flatMap((floor) =>
  Object.entries(FLOOR_NODE_TEMPLATE).map(([suffix, template]) => ({
    id: `${floor.id}_${suffix}`,
    floorId: floor.id,
    x: template.x,
    y: template.y,
    label: template.label,
    kind: template.kind,
  }))
);

const EDGES: Record<string, Edge[]> = {};

function link(a: string, b: string, weight: number) {
  if (!EDGES[a]) {
    EDGES[a] = [];
  }
  if (!EDGES[b]) {
    EDGES[b] = [];
  }
  EDGES[a].push({ target: b, weight });
  EDGES[b].push({ target: a, weight });
}

FLOORS.forEach((floor) => {
  link(`${floor.id}_WEST`, `${floor.id}_CENTER`, 30);
  link(`${floor.id}_CENTER`, `${floor.id}_EAST`, 34);
  link(`${floor.id}_WEST`, `${floor.id}_SOUTHWEST`, 24);
  link(`${floor.id}_CENTER`, `${floor.id}_SOUTHCENTER`, 24);
  link(`${floor.id}_CENTER`, `${floor.id}_STAIR`, 8);
  link(`${floor.id}_SOUTHWEST`, `${floor.id}_SOUTHCENTER`, 28);
  link(`${floor.id}_SOUTHCENTER`, `${floor.id}_EAST`, 32);
});

for (let index = 0; index < FLOORS.length - 1; index += 1) {
  const current = FLOORS[index];
  const next = FLOORS[index + 1];
  link(`${current.id}_STAIR`, `${next.id}_STAIR`, 20);
}

DEMO_ROOMS.forEach((room) => {
  NODES.push({
    id: room.id,
    floorId: room.floorId,
    x: room.x + room.width / 2,
    y: room.y + room.height / 2,
    label: room.label,
    kind: "room",
  });
  link(room.id, room.connectTo, 10);
});

function getFloor(floorId: DemoFloorId) {
  const floor = FLOORS.find((entry) => entry.id === floorId);
  if (!floor) {
    throw new Error(`Unknown floor: ${floorId}`);
  }
  return floor;
}

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
  const samples = Math.max(6, Math.round(Math.hypot(end.x - start.x, end.y - start.y) / 2));
  const points: DemoRoutePoint[] = [];

  for (let index = 0; index <= samples; index += 1) {
    const progress = index / samples;
    const floorId = progress < 0.5 ? start.floorId : end.floorId;
    points.push({
      x: start.x + (end.x - start.x) * progress,
      y: start.y + (end.y - start.y) * progress,
      floorId,
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
      return [{ x: node.x, y: node.y, floorId: node.floorId, nodeId: node.id }];
    }
    const segmentPoints = interpolateSegment(node, nodePath[index + 1]);
    return index === 0 ? segmentPoints : segmentPoints.slice(1);
  });
}

function buildInstructions(startRoom: DemoRoom, destinationRoom: DemoRoom, floorsOnRoute: DemoFloorId[]) {
  const destinationFloor = getFloor(destinationRoom.floorId);
  const sameFloor = startRoom.floorId === destinationRoom.floorId;

  if (sameFloor) {
    return [
      `Leave ${startRoom.label} and join the main corridor on floor ${startRoom.floorId}.`,
      `Follow the corridor across the building to ${destinationRoom.label}.`,
    ];
  }

  return [
    `Leave ${startRoom.label} and head toward the main stair core on floor ${startRoom.floorId}.`,
    `Travel through the stair core across ${floorsOnRoute.length - 1} floor transitions.`,
    `Exit on ${destinationFloor.label} and continue through the corridor network to ${destinationRoom.label}.`,
  ];
}

function buildSegments(nodePath: DemoNode[]) {
  const segments: DemoRouteSegment[] = [];

  for (let index = 0; index < nodePath.length - 1; index += 1) {
    const current = nodePath[index];
    const next = nodePath[index + 1];
    const previousSegment = segments[segments.length - 1];

    if (current.floorId !== next.floorId) {
      segments.push({
        floorId: current.floorId,
        fromLabel: current.label,
        toLabel: "Main Stairs",
      });
      segments.push({
        floorId: next.floorId,
        fromLabel: "Main Stairs",
        toLabel: next.label,
      });
      continue;
    }

    if (previousSegment && previousSegment.floorId === current.floorId) {
      previousSegment.toLabel = next.label;
    } else {
      segments.push({
        floorId: current.floorId,
        fromLabel: current.label,
        toLabel: next.label,
      });
    }
  }

  return segments;
}

export function getNavigationDemoRoute(destinationRoomId: string): DemoRouteResult {
  const startRoom = getRoom(NAVIGATION_START_ROOM_ID);
  const destinationRoom = getRoom(destinationRoomId);
  const routeData = dijkstra(startRoom.id, destinationRoom.id);
  const nodePath = routeData.nodeIds.map(getNode);
  const floorsOnRoute = [...new Set(nodePath.map((node) => node.floorId))] as DemoFloorId[];

  return {
    startRoom,
    destinationRoom,
    nodePath,
    animatedPoints: createAnimatedPoints(nodePath),
    segments: buildSegments(nodePath),
    instructions: buildInstructions(startRoom, destinationRoom, floorsOnRoute),
    distance: routeData.distance,
    floorsOnRoute,
  };
}
