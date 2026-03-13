import { DXF_FLOOR_FEATURES } from "./generated-eng-dxf";

export type DemoFloorId = "B" | "LG" | "1" | "2" | "3" | "4" | "5";

export type DemoFloor = {
  id: DemoFloorId;
  label: string;
  shortLabel: string;
  levelIndex: number;
};

export type DemoRoomCategory = "lecture" | "lab" | "office" | "stairs" | "service";

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
  category?: DemoRoomCategory;
};

export type DemoNode = {
  id: string;
  floorId: DemoFloorId;
  x: number;
  y: number;
  label: string;
  kind: "room" | "hall" | "stairs";
};

export type DemoPlanPoint = {
  x: number;
  y: number;
};

export type DemoFloorFeature = {
  fill: string;
  stroke?: string;
  points: DemoPlanPoint[];
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

const ROOM_COLORS: Record<DemoRoomCategory, string> = {
  office: "#a8c5ff",
  lecture: "#f6d26b",
  lab: "#87d3c6",
  service: "#b9b8ff",
  stairs: "#d7b47b",
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

const BASE_FLOOR_FEATURES: Record<DemoFloorId, DemoFloorFeature[]> = {
  B: [
    { fill: "#e7edf6", points: [{ x: 14, y: 10 }, { x: 94, y: 10 }, { x: 94, y: 78 }, { x: 14, y: 78 }] },
    { fill: "#d8e1ee", points: [{ x: 46, y: 28 }, { x: 90, y: 28 }, { x: 90, y: 76 }, { x: 46, y: 76 }] },
    { fill: "#d7dfec", points: [{ x: 54, y: 48 }, { x: 90, y: 48 }, { x: 90, y: 54 }, { x: 54, y: 54 }] },
  ],
  LG: [
    { fill: "#e7edf6", points: [{ x: 8, y: 8 }, { x: 98, y: 8 }, { x: 98, y: 76 }, { x: 8, y: 76 }] },
    { fill: "#d7dfec", points: [{ x: 8, y: 34 }, { x: 98, y: 34 }, { x: 98, y: 42 }, { x: 8, y: 42 }] },
    { fill: "#dde5f1", points: [{ x: 60, y: 34 }, { x: 90, y: 34 }, { x: 90, y: 66 }, { x: 60, y: 66 }] },
    { fill: "#dce4f1", points: [{ x: 18, y: 18 }, { x: 58, y: 18 }, { x: 58, y: 28 }, { x: 18, y: 28 }] },
  ],
  "1": [
    { fill: "#e7edf6", points: [{ x: 6, y: 8 }, { x: 98, y: 8 }, { x: 98, y: 76 }, { x: 6, y: 76 }] },
    { fill: "#d7dfec", points: [{ x: 6, y: 20 }, { x: 98, y: 20 }, { x: 98, y: 28 }, { x: 6, y: 28 }] },
    { fill: "#dce5f2", points: [{ x: 52, y: 9 }, { x: 60, y: 9 }, { x: 60, y: 44 }, { x: 52, y: 44 }] },
    { fill: "#dbe4f0", points: [{ x: 24, y: 36 }, { x: 68, y: 36 }, { x: 68, y: 42 }, { x: 24, y: 42 }] },
    { fill: "#dce4f1", points: [{ x: 68, y: 20 }, { x: 98, y: 20 }, { x: 98, y: 74 }, { x: 68, y: 74 }] },
  ],
  "2": [
    { fill: "#e7edf6", points: [{ x: 4, y: 8 }, { x: 98, y: 8 }, { x: 98, y: 76 }, { x: 4, y: 76 }] },
    { fill: "#d7dfec", points: [{ x: 4, y: 20 }, { x: 98, y: 20 }, { x: 98, y: 28 }, { x: 4, y: 28 }] },
    { fill: "#dce4f1", points: [{ x: 52, y: 9 }, { x: 60, y: 9 }, { x: 60, y: 40 }, { x: 52, y: 40 }] },
    { fill: "#d9e2ef", points: [{ x: 16, y: 36 }, { x: 80, y: 36 }, { x: 80, y: 42 }, { x: 16, y: 42 }] },
    { fill: "#dbe4f1", points: [{ x: 76, y: 18 }, { x: 98, y: 18 }, { x: 98, y: 70 }, { x: 76, y: 70 }] },
  ],
  "3": [
    { fill: "#e7edf6", points: [{ x: 4, y: 8 }, { x: 98, y: 8 }, { x: 98, y: 76 }, { x: 4, y: 76 }] },
    { fill: "#d8e0ed", points: [{ x: 4, y: 24 }, { x: 98, y: 24 }, { x: 98, y: 32 }, { x: 4, y: 32 }] },
    { fill: "#dbe4f1", points: [{ x: 66, y: 10 }, { x: 98, y: 10 }, { x: 98, y: 40 }, { x: 66, y: 40 }] },
    { fill: "#dbe4f0", points: [{ x: 10, y: 38 }, { x: 92, y: 38 }, { x: 92, y: 44 }, { x: 10, y: 44 }] },
  ],
  "4": [
    { fill: "#e7edf6", points: [{ x: 4, y: 10 }, { x: 98, y: 10 }, { x: 98, y: 76 }, { x: 4, y: 76 }] },
    { fill: "#d8e0ed", points: [{ x: 4, y: 24 }, { x: 98, y: 24 }, { x: 98, y: 32 }, { x: 4, y: 32 }] },
    { fill: "#dbe3f0", points: [{ x: 68, y: 12 }, { x: 98, y: 12 }, { x: 98, y: 40 }, { x: 68, y: 40 }] },
    { fill: "#dbe4f0", points: [{ x: 10, y: 38 }, { x: 96, y: 38 }, { x: 96, y: 44 }, { x: 10, y: 44 }] },
  ],
  "5": [
    { fill: "#e7edf6", points: [{ x: 10, y: 14 }, { x: 98, y: 14 }, { x: 98, y: 72 }, { x: 10, y: 72 }] },
    { fill: "#d8e0ed", points: [{ x: 10, y: 34 }, { x: 98, y: 34 }, { x: 98, y: 42 }, { x: 10, y: 42 }] },
    { fill: "#dce4f1", points: [{ x: 54, y: 14 }, { x: 98, y: 14 }, { x: 98, y: 66 }, { x: 54, y: 66 }] },
  ],
};

export const FLOOR_FEATURES: Record<DemoFloorId, DemoFloorFeature[]> = {
  B: BASE_FLOOR_FEATURES.B,
  LG: BASE_FLOOR_FEATURES.LG,
  "1": [...BASE_FLOOR_FEATURES["1"], ...((DXF_FLOOR_FEATURES["1"] as unknown as DemoFloorFeature[] | undefined) ?? [])],
  "2": [...BASE_FLOOR_FEATURES["2"], ...((DXF_FLOOR_FEATURES["2"] as unknown as DemoFloorFeature[] | undefined) ?? [])],
  "3": [...BASE_FLOOR_FEATURES["3"], ...((DXF_FLOOR_FEATURES["3"] as unknown as DemoFloorFeature[] | undefined) ?? [])],
  "4": [...BASE_FLOOR_FEATURES["4"], ...((DXF_FLOOR_FEATURES["4"] as unknown as DemoFloorFeature[] | undefined) ?? [])],
  "5": [...BASE_FLOOR_FEATURES["5"], ...((DXF_FLOOR_FEATURES["5"] as unknown as DemoFloorFeature[] | undefined) ?? [])],
};

export const NAVIGATION_START_ROOM_ID = "ENG103";

function createRoom(
  label: string,
  floorId: DemoFloorId,
  x: number,
  y: number,
  width: number,
  height: number,
  connectTo: string,
  category: DemoRoomCategory = "office"
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
    color: ROOM_COLORS[category],
  };
}

export const DEMO_ROOMS: DemoRoom[] = [
  createRoom("ENG B1", "B", 18, 16, 10, 12, "B_WEST", "service"),
  createRoom("ENG B2", "B", 56, 16, 14, 10, "B_CENTER", "service"),
  createRoom("ENG B9", "B", 72, 16, 18, 10, "B_EAST", "lab"),
  createRoom("ENG B10", "B", 48, 34, 24, 16, "B_CENTER", "service"),
  createRoom("STAIRS B", "B", 72, 36, 8, 10, "B_STAIR", "stairs"),
  createRoom("ENG B17", "B", 50, 54, 32, 18, "B_SOUTHCENTER", "lab"),

  createRoom("ENG LG 4", "LG", 10, 12, 18, 20, "LG_WEST", "lecture"),
  createRoom("ENG LG 6", "LG", 30, 12, 18, 20, "LG_CENTER", "lecture"),
  createRoom("ENG LG 9", "LG", 54, 10, 22, 22, "LG_CENTER", "service"),
  createRoom("ENG LG 14", "LG", 78, 10, 16, 22, "LG_EAST", "lecture"),
  createRoom("STAIRS LG", "LG", 50, 20, 8, 12, "LG_STAIR", "stairs"),
  createRoom("ENG LG 24", "LG", 26, 44, 18, 18, "LG_SOUTHWEST", "lecture"),
  createRoom("ENG LG 29", "LG", 46, 44, 18, 18, "LG_SOUTHCENTER", "lecture"),
  createRoom("ENG LG 32", "LG", 66, 48, 28, 16, "LG_EAST", "lecture"),
  createRoom("ENG LG 44", "LG", 6, 48, 16, 18, "LG_WEST", "lab"),
  createRoom("ENG LG 53", "LG", 56, 64, 38, 10, "LG_EAST", "lab"),

  createRoom("ENG116", "1", 8, 10, 8, 8, "1_WEST", "office"),
  createRoom("ENG120", "1", 18, 10, 8, 8, "1_WEST", "office"),
  createRoom("ENG126", "1", 30, 10, 8, 8, "1_CENTER", "office"),
  createRoom("ENG130", "1", 40, 10, 8, 8, "1_CENTER", "office"),
  createRoom("STAIRS 1", "1", 52, 11, 8, 10, "1_STAIR", "stairs"),
  createRoom("ENG137", "1", 66, 10, 8, 8, "1_EAST", "office"),
  createRoom("ENG140", "1", 76, 10, 8, 8, "1_EAST", "office"),
  createRoom("ENG144", "1", 86, 10, 8, 8, "1_EAST", "office"),
  createRoom("ENG109", "1", 10, 24, 15, 16, "1_WEST", "lecture"),
  createRoom("ENG101", "1", 28, 41, 18, 16, "1_SOUTHWEST", "lecture"),
  createRoom("ENG105", "1", 48, 41, 18, 16, "1_SOUTHCENTER", "lecture"),
  createRoom("ENG182", "1", 56, 28, 7, 12, "1_STAIR", "service"),
  createRoom("ENG103", "1", 71, 23, 25, 24, "1_EAST", "lecture"),
  createRoom("ENG112", "1", 71, 50, 25, 22, "1_EAST", "lab"),

  createRoom("ENG290", "2", 4, 22, 10, 14, "2_WEST", "office"),
  createRoom("STAIRS 2", "2", 52, 13, 8, 10, "2_STAIR", "stairs"),
  createRoom("ENG270", "2", 44, 18, 12, 8, "2_CENTER", "office"),
  createRoom("ENG243", "2", 18, 10, 8, 8, "2_WEST", "office"),
  createRoom("ENG248", "2", 28, 10, 8, 8, "2_WEST", "office"),
  createRoom("ENG229", "2", 48, 10, 8, 8, "2_CENTER", "office"),
  createRoom("ENG235", "2", 58, 10, 8, 8, "2_CENTER", "office"),
  createRoom("ENG220", "2", 76, 10, 8, 8, "2_EAST", "office"),
  createRoom("ENG224", "2", 86, 10, 8, 8, "2_EAST", "office"),
  createRoom("ENG239", "2", 40, 30, 12, 10, "2_CENTER", "service"),
  createRoom("ENG201", "2", 20, 40, 18, 18, "2_SOUTHWEST", "lab"),
  createRoom("ENG203", "2", 40, 40, 18, 18, "2_SOUTHCENTER", "lab"),
  createRoom("ENG209", "2", 62, 42, 16, 18, "2_SOUTHCENTER", "lab"),
  createRoom("ENG217", "2", 82, 22, 14, 24, "2_EAST", "lab"),

  createRoom("ENG372", "3", 4, 12, 8, 10, "3_WEST", "office"),
  createRoom("ENG370", "3", 14, 24, 10, 12, "3_WEST", "office"),
  createRoom("ENG360", "3", 30, 12, 22, 12, "3_CENTER", "office"),
  createRoom("ENG356", "3", 46, 26, 16, 12, "3_CENTER", "office"),
  createRoom("STAIRS 3", "3", 8, 44, 8, 10, "3_STAIR", "stairs"),
  createRoom("ENG304", "3", 24, 42, 18, 22, "3_SOUTHWEST", "lab"),
  createRoom("ENG302", "3", 44, 42, 18, 22, "3_SOUTHCENTER", "lab"),
  createRoom("ENG320", "3", 64, 42, 18, 22, "3_SOUTHCENTER", "lab"),
  createRoom("ENG319", "3", 84, 10, 12, 10, "3_EAST", "office"),
  createRoom("ENG312", "3", 84, 42, 16, 24, "3_EAST", "lab"),
  createRoom("ENG349", "3", 78, 24, 18, 12, "3_EAST", "office"),

  createRoom("ENG470", "4", 4, 18, 10, 12, "4_WEST", "office"),
  createRoom("STAIRS 4", "4", 8, 44, 8, 10, "4_STAIR", "stairs"),
  createRoom("ENG420", "4", 28, 12, 12, 10, "4_CENTER", "office"),
  createRoom("ENG440", "4", 40, 24, 16, 14, "4_CENTER", "office"),
  createRoom("ENG443", "4", 70, 12, 10, 10, "4_EAST", "office"),
  createRoom("ENG449", "4", 82, 12, 10, 10, "4_EAST", "office"),
  createRoom("ENG401", "4", 22, 42, 18, 22, "4_SOUTHWEST", "lab"),
  createRoom("ENG402", "4", 42, 42, 18, 22, "4_SOUTHCENTER", "lab"),
  createRoom("ENG403", "4", 62, 42, 18, 22, "4_SOUTHCENTER", "lab"),
  createRoom("ENG413", "4", 84, 42, 16, 24, "4_EAST", "lab"),
  createRoom("ENG404", "4", 68, 18, 28, 18, "4_EAST", "service"),

  createRoom("STAIRS 5", "5", 12, 48, 8, 12, "5_STAIR", "stairs"),
  createRoom("ENG501", "5", 34, 28, 24, 20, "5_CENTER", "service"),
  createRoom("ENG502", "5", 70, 18, 16, 14, "5_EAST", "service"),
  createRoom("ENG503", "5", 82, 42, 14, 16, "5_EAST", "service"),
  createRoom("ENG504", "5", 58, 50, 18, 14, "5_CENTER", "service"),
];

export const DESTINATION_ROOMS = DEMO_ROOMS.filter(
  (room) => room.id !== NAVIGATION_START_ROOM_ID && room.category !== "stairs"
);

const FLOOR_NODE_TEMPLATE: Record<string, { x: number; y: number; label: string; kind: DemoNode["kind"] }> = {
  WEST: { x: 18, y: 36, label: "West Hall", kind: "hall" },
  CENTER: { x: 50, y: 36, label: "Central Hall", kind: "hall" },
  EAST: { x: 84, y: 36, label: "East Hall", kind: "hall" },
  SOUTHWEST: { x: 22, y: 60, label: "South Wing", kind: "hall" },
  SOUTHCENTER: { x: 50, y: 60, label: "South Spine", kind: "hall" },
  STAIR: { x: 58, y: 36, label: "Main Stairs", kind: "stairs" },
};

const FLOOR_NODE_OVERRIDES: Partial<Record<DemoFloorId, Record<string, { x: number; y: number }>>> = {
  B: {
    WEST: { x: 24, y: 28 },
    CENTER: { x: 56, y: 28 },
    EAST: { x: 84, y: 26 },
    SOUTHWEST: { x: 24, y: 62 },
    SOUTHCENTER: { x: 66, y: 62 },
    STAIR: { x: 76, y: 42 },
  },
  LG: {
    WEST: { x: 18, y: 38 },
    CENTER: { x: 50, y: 34 },
    EAST: { x: 84, y: 36 },
    SOUTHWEST: { x: 32, y: 54 },
    SOUTHCENTER: { x: 58, y: 56 },
    STAIR: { x: 54, y: 24 },
  },
  "1": {
    WEST: { x: 16, y: 24 },
    CENTER: { x: 48, y: 24 },
    EAST: { x: 82, y: 24 },
    SOUTHWEST: { x: 34, y: 58 },
    SOUTHCENTER: { x: 58, y: 58 },
    STAIR: { x: 56, y: 24 },
  },
  "2": {
    WEST: { x: 14, y: 25 },
    CENTER: { x: 48, y: 24 },
    EAST: { x: 82, y: 24 },
    SOUTHWEST: { x: 30, y: 58 },
    SOUTHCENTER: { x: 60, y: 58 },
    STAIR: { x: 56, y: 24 },
  },
  "3": {
    WEST: { x: 14, y: 30 },
    CENTER: { x: 50, y: 30 },
    EAST: { x: 88, y: 30 },
    SOUTHWEST: { x: 32, y: 62 },
    SOUTHCENTER: { x: 60, y: 62 },
    STAIR: { x: 12, y: 48 },
  },
  "4": {
    WEST: { x: 14, y: 28 },
    CENTER: { x: 48, y: 28 },
    EAST: { x: 86, y: 30 },
    SOUTHWEST: { x: 30, y: 62 },
    SOUTHCENTER: { x: 62, y: 62 },
    STAIR: { x: 12, y: 48 },
  },
  "5": {
    WEST: { x: 16, y: 44 },
    CENTER: { x: 52, y: 42 },
    EAST: { x: 84, y: 38 },
    SOUTHWEST: { x: 20, y: 62 },
    SOUTHCENTER: { x: 60, y: 60 },
    STAIR: { x: 16, y: 54 },
  },
};

const NODES: DemoNode[] = FLOORS.flatMap((floor) =>
  Object.entries(FLOOR_NODE_TEMPLATE).map(([suffix, template]) => {
    const override = FLOOR_NODE_OVERRIDES[floor.id]?.[suffix];

    return {
      id: `${floor.id}_${suffix}`,
      floorId: floor.id,
      x: override?.x ?? template.x,
      y: override?.y ?? template.y,
      label: template.label,
      kind: template.kind,
    };
  })
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
