export type RoutePoint = { x: number; y: number; nodeId: string };

const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? "http://localhost:5000";

type GraphNode = { id: string; x: number; y: number };
type Edge = { target: string; weight: number };

const NODES: GraphNode[] = [
  { id: "N1", x: 0.82, y: 0.42 },
  { id: "N2", x: 0.82, y: 0.24 },
  { id: "N3", x: 0.55, y: 0.24 },
  { id: "N4", x: 0.42, y: 0.24 },
  { id: "N5", x: 0.42, y: 0.28 },
  { id: "N6", x: 0.5, y: 0.28 },
  { id: "N7", x: 0.5, y: 0.36 },
  { id: "N8", x: 0.42, y: 0.36 },
  { id: "N9", x: 0.55, y: 0.36 },
  { id: "N10", x: 0.55, y: 0.4 },
  { id: "N11", x: 0.58, y: 0.6 },
  { id: "N12", x: 0.8, y: 0.6 },
];

const EDGES: Record<string, Edge[]> = {
  N1: [{ target: "N2", weight: 12 }, { target: "N12", weight: 10 }],
  N2: [{ target: "N1", weight: 12 }, { target: "N3", weight: 110 }],
  N3: [{ target: "N2", weight: 110 }, { target: "N4", weight: 25 }, { target: "N9", weight: 20 }],
  N4: [{ target: "N3", weight: 25 }, { target: "N5", weight: 2 }],
  N5: [{ target: "N4", weight: 2 }, { target: "N6", weight: 10 }, { target: "N8", weight: 5 }],
  N6: [{ target: "N5", weight: 10 }, { target: "N7", weight: 5 }],
  N7: [{ target: "N6", weight: 5 }, { target: "N8", weight: 10 }, { target: "N9", weight: 2 }],
  N8: [{ target: "N5", weight: 5 }, { target: "N7", weight: 10 }],
  N9: [{ target: "N3", weight: 20 }, { target: "N7", weight: 2 }, { target: "N10", weight: 5 }],
  N10: [{ target: "N9", weight: 5 }, { target: "N11", weight: 15 }],
  N11: [{ target: "N10", weight: 15 }, { target: "N12", weight: 100 }],
  N12: [{ target: "N11", weight: 100 }, { target: "N1", weight: 10 }],
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
