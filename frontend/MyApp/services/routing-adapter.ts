export type RoutePoint = { x: number; y: number; nodeId: string };

const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? "http://localhost:5000";

type GraphNode = { id: string; x: number; y: number };
type Edge = { target: string; weight: number };

const NODES: GraphNode[] = [
  { id: "N1", x: 0.83, y: 0.491667 },
  { id: "N2", x: 0.83, y: 0.325 },
  { id: "N3", x: 0.555, y: 0.311667 },
  { id: "N4", x: 0.44, y: 0.325 },
  { id: "N5", x: 0.44, y: 0.361667 },
  { id: "N6", x: 0.53125, y: 0.361667 },
  { id: "N7", x: 0.53125, y: 0.433333 },
  { id: "N8", x: 0.44, y: 0.433333 },
  { id: "N9", x: 0.55375, y: 0.433333 },
  { id: "N11", x: 0.555, y: 0.641667 },
  { id: "N12", x: 0.82875, y: 0.641667 },
  { id: "N13", x: 0.6025, y: 0.325 },
  { id: "N14", x: 0.69375, y: 0.325 },
  { id: "N15", x: 0.785, y: 0.325 },
  { id: "N16", x: 0.55375, y: 0.498333 },
  { id: "N17", x: 0.55375, y: 0.573333 },
  { id: "N18", x: 0.59125, y: 0.641667 },
  { id: "N19", x: 0.6625, y: 0.641667 },
  { id: "N20", x: 0.72375, y: 0.641667 },
  { id: "N21", x: 0.7825, y: 0.641667 },
  { id: "N22", x: 0.82875, y: 0.568333 },
  { id: "N23", x: 0.4875, y: 0.433333 },
  { id: "N24", x: 0.48625, y: 0.361667 },
  { id: "N25", x: 0.53125, y: 0.396667 },
  { id: "N26", x: 0.44, y: 0.395 },
  { id: "N27", x: 0.50125, y: 0.325 },
  { id: "N28", x: 0.65375, y: 0.325 },
  { id: "N29", x: 0.735, y: 0.325 },
  { id: "N30", x: 0.58125, y: 0.641667 },
  { id: "N31", x: 0.57875, y: 0.495 },
  { id: "N32", x: 0.8075, y: 0.491667 },
  { id: "N33", x: 0.555, y: 0.615 },
  { id: "N34", x: 0.4275, y: 0.325 },
  { id: "N35", x: 0.4, y: 0.325 },
  { id: "N36", x: 0.3825, y: 0.325 },
  { id: "N37", x: 0.365, y: 0.325 },
  { id: "N38", x: 0.3375, y: 0.325 },
  { id: "N39", x: 0.32, y: 0.325 },
  { id: "N40", x: 0.2775, y: 0.325 },
  { id: "N41", x: 0.245, y: 0.325 },
  { id: "N42", x: 0.2475, y: 0.358333 },
  { id: "N43", x: 0.245, y: 0.405 },
  { id: "N44", x: 0.2675, y: 0.405 },
  { id: "N45", x: 0.285, y: 0.405 },
  { id: "N46", x: 0.2825, y: 0.438333 },
  { id: "N47", x: 0.2275, y: 0.405 },
  { id: "N48", x: 0.24, y: 0.431667 },
  { id: "N49", x: 0.22, y: 0.438333 },
  { id: "N50", x: 0.2225, y: 0.531667 },
  { id: "N51", x: 0.2225, y: 0.565 },
  { id: "N52", x: 0.2225, y: 0.658333 },
  { id: "N53", x: 0.235, y: 0.705 },
  { id: "N54", x: 0.3125, y: 0.705 },
  { id: "N55", x: 0.405, y: 0.705 },
  { id: "N56", x: 0.4975, y: 0.705 },
  { id: "N57", x: 0.555, y: 0.671667 },
];

const EDGES: Record<string, Edge[]> = {
  N1: [{ target: "N2", weight: 100 }, { target: "N22", weight: 46 }, { target: "N32", weight: 18 }],
  N2: [{ target: "N1", weight: 100 }, { target: "N15", weight: 36 }],
  N3: [{ target: "N9", weight: 73 }, { target: "N13", weight: 39 }, { target: "N27", weight: 44 }],
  N4: [{ target: "N5", weight: 22 }, { target: "N27", weight: 49 }],
  N5: [{ target: "N4", weight: 22 }, { target: "N24", weight: 37 }, { target: "N26", weight: 20 }],
  N6: [{ target: "N24", weight: 36 }, { target: "N25", weight: 21 }],
  N7: [{ target: "N9", weight: 18 }, { target: "N23", weight: 35 }, { target: "N25", weight: 22 }],
  N8: [{ target: "N23", weight: 38 }, { target: "N26", weight: 23 }],
  N9: [{ target: "N3", weight: 73 }, { target: "N7", weight: 18 }, { target: "N16", weight: 39 }],
  N11: [{ target: "N33", weight: 16 }, { target: "N30", weight: 21 }],
  N12: [{ target: "N21", weight: 37 }, { target: "N22", weight: 44 }],
  N13: [{ target: "N3", weight: 39 }, { target: "N28", weight: 41 }],
  N14: [{ target: "N28", weight: 32 }, { target: "N29", weight: 33 }],
  N15: [{ target: "N2", weight: 36 }, { target: "N29", weight: 40 }],
  N16: [{ target: "N17", weight: 45 }, { target: "N31", weight: 20 }, { target: "N9", weight: 39 }],
  N17: [{ target: "N16", weight: 45 }, { target: "N33", weight: 25 }],
  N18: [{ target: "N19", weight: 57 }, { target: "N30", weight: 8 }],
  N19: [{ target: "N18", weight: 57 }, { target: "N20", weight: 49 }],
  N20: [{ target: "N19", weight: 49 }, { target: "N21", weight: 47 }],
  N21: [{ target: "N12", weight: 37 }, { target: "N20", weight: 47 }],
  N22: [{ target: "N1", weight: 46 }, { target: "N12", weight: 44 }],
  N23: [{ target: "N7", weight: 35 }, { target: "N8", weight: 38 }],
  N24: [{ target: "N5", weight: 37 }, { target: "N6", weight: 36 }],
  N25: [{ target: "N6", weight: 21 }, { target: "N7", weight: 22 }],
  N26: [{ target: "N5", weight: 20 }, { target: "N8", weight: 23 }],
  N27: [{ target: "N3", weight: 44 }, { target: "N4", weight: 49 }],
  N28: [{ target: "N13", weight: 41 }, { target: "N14", weight: 32 }],
  N29: [{ target: "N14", weight: 33 }, { target: "N15", weight: 40 }],
  N30: [{ target: "N18", weight: 8 }, { target: "N31", weight: 88 }, { target: "N11", weight: 21 }],
  N31: [{ target: "N30", weight: 88 }, { target: "N16", weight: 20 }],
  N32: [{ target: "N1", weight: 18 }],
  N33: [{ target: "N11", weight: 16 }, { target: "N17", weight: 25 }],
  N34: [{ target: "N4", weight: 10 }, { target: "N35", weight: 22 }],
  N35: [{ target: "N34", weight: 22 }, { target: "N36", weight: 14 }],
  N36: [{ target: "N35", weight: 14 }, { target: "N37", weight: 14 }],
  N37: [{ target: "N36", weight: 14 }, { target: "N38", weight: 22 }],
  N38: [{ target: "N37", weight: 22 }, { target: "N39", weight: 14 }],
  N39: [{ target: "N38", weight: 14 }, { target: "N40", weight: 34 }],
  N40: [{ target: "N39", weight: 34 }, { target: "N41", weight: 26 }],
  N41: [{ target: "N40", weight: 26 }, { target: "N42", weight: 20 }],
  N42: [{ target: "N41", weight: 20 }, { target: "N43", weight: 28 }],
  N43: [{ target: "N42", weight: 28 }, { target: "N44", weight: 18 }, { target: "N47", weight: 14 }, { target: "N48", weight: 16 }],
  N44: [{ target: "N43", weight: 18 }, { target: "N45", weight: 14 }],
  N45: [{ target: "N44", weight: 14 }, { target: "N46", weight: 20 }],
  N46: [{ target: "N45", weight: 20 }],
  N47: [{ target: "N43", weight: 14 }, { target: "N48", weight: 19 }, { target: "N49", weight: 21 }],
  N48: [{ target: "N47", weight: 19 }, { target: "N43", weight: 16 }],
  N49: [{ target: "N47", weight: 21 }, { target: "N50", weight: 56 }],
  N50: [{ target: "N49", weight: 56 }, { target: "N51", weight: 20 }],
  N51: [{ target: "N50", weight: 20 }, { target: "N52", weight: 56 }],
  N52: [{ target: "N51", weight: 56 }, { target: "N53", weight: 30 }],
  N53: [{ target: "N52", weight: 30 }, { target: "N54", weight: 62 }],
  N54: [{ target: "N53", weight: 62 }, { target: "N55", weight: 74 }],
  N55: [{ target: "N54", weight: 74 }, { target: "N56", weight: 74 }],
  N56: [{ target: "N55", weight: 74 }, { target: "N57", weight: 50 }],
  N57: [{ target: "N56", weight: 50 }, { target: "N11", weight: 18 }],
};

const ROOM_TO_NODE: Record<string, string> = {
  ENG103: "N12",
  LIB072: "N2",
  ENG: "N3",
};

export function getNearestGraphNodeId(position: { x: number; y: number }) {
  return NODES.reduce((best, node) => {
    const bestDistance = Math.hypot(best.x - position.x, best.y - position.y);
    const nodeDistance = Math.hypot(node.x - position.x, node.y - position.y);
    return nodeDistance < bestDistance ? node : best;
  }).id;
}

function dijkstra(startId: string, endId: string): string[] {
  const distances: Record<string, number> = {};
  const previous: Record<string, string | null> = {};
  const unvisited = new Set(NODES.map((node) => node.id));

  for (const node of NODES) {
    distances[node.id] = Infinity;
    previous[node.id] = null;
  }

  distances[startId] = 0;

  while (unvisited.size > 0) {
    const current = [...unvisited].reduce((a, b) => (distances[a] < distances[b] ? a : b));

    if (distances[current] === Infinity) break;

    unvisited.delete(current);
    if (current === endId) break;

    for (const edge of EDGES[current] ?? []) {
      const alt = distances[current] + edge.weight;
      if (alt < distances[edge.target]) {
        distances[edge.target] = alt;
        previous[edge.target] = current;
      }
    }
  }

  const path: string[] = [];
  let cursor: string | null = endId;

  while (cursor) {
    path.unshift(cursor);
    cursor = previous[cursor];
  }

  return path;
}

export async function getRouteForDestination(
  destination: string,
  startPosition?: { x: number; y: number }
): Promise<RoutePoint[]> {
  const endNode = ROOM_TO_NODE[destination] ?? "N2";
  const startNode = startPosition ? getNearestGraphNodeId(startPosition) : "N1";

  try {
    const res = await fetch(`${BASE_URL}/navigate?start=${startNode}&end=${endNode}`);
    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json.path)) {
        return json.path.map((point: { x: number; y: number }, index: number) => ({
          x: point.x,
          y: point.y,
          nodeId: `api-${index}`,
        }));
      }
    }
  } catch {}

  const nodePath = dijkstra(startNode, endNode);
  return nodePath
    .map((id) => NODES.find((node) => node.id === id))
    .filter((node): node is GraphNode => Boolean(node))
    .map((node) => ({ x: node.x, y: node.y, nodeId: node.id }));
}
