import { usePositioning } from "@/context/positioning";
import {
    loadRoutingGraph,
    saveRoutingGraph,
    type RoutingEdge as Edge,
    type RoutingNode as GraphNode,
    type RoutingGraph,
} from "@/lib/storage";
import { Image as ExpoImage } from "expo-image";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    Alert,
    Animated,
    Dimensions,
    Easing,
    PixelRatio,
    Image as RNImage,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import ImageZoom from "react-native-image-pan-zoom";
import Svg, { Circle, G, Polyline, Text as SvgText } from "react-native-svg";

type Props = {
  destination?: string;
  onRouteComputed?: (nodeIds: string[]) => void;
};

const { width: screenWidth } = Dimensions.get("window");
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const NAV_FLOOR = 4;
const CANONICAL_IMAGE_WIDTH = 800;
const CANONICAL_IMAGE_HEIGHT = 600;
const MIN_RENDER_WIDTH = 1200;
const MAX_RENDER_WIDTH = 1800;
const EDIT_STEPS = [2, 4, 8] as const;
const EDGE_TAP_THRESHOLD_PX = 18;
const LIVE_DOT_BASE_RADIUS = 11;
const LIVE_DOT_BASE_STROKE = 3;
const SIM_DOT_BASE_RADIUS = 12;

const ROOM_TO_NODE: Record<string, string> = {
  ENG103: "N12",
  LIB072: "N2",
  ENG: "N3",
};

const FLOOR_4_IMAGE = require("../../assets/images/eng4_north.png");

const DEFAULT_NODES: GraphNode[] = [
  { id: "3N1", x: 455, y: 180, floor: 3 },
  { id: "3N2", x: 730, y: 180, floor: 3 },
  { id: "3N3", x: 730, y: 275, floor: 3 },
  { id: "3N4", x: 710, y: 300, floor: 3 },
  { id: "3N5", x: 450, y: 270, floor: 3 },
  { id: "3N6", x: 455, y: 410, floor: 3 },
  { id: "3N7", x: 730, y: 300, floor: 3 },
  { id: "3N8", x: 730, y: 410, floor: 3 },
  { id: "N1", x: 664, y: 295, floor: 4 },
  { id: "N2", x: 664, y: 195, floor: 4 },
  { id: "N3", x: 444, y: 195, floor: 4 },
  { id: "N4", x: 350, y: 195, floor: 4 },
  { id: "N5", x: 350, y: 215, floor: 4 },
  { id: "N6", x: 425, y: 215, floor: 4 },
  { id: "N7", x: 425, y: 260, floor: 4 },
  { id: "N8", x: 350, y: 260, floor: 4 },
  { id: "N9", x: 443, y: 260, floor: 4 },
  { id: "N11", x: 444, y: 385, floor: 4 },
  { id: "N12", x: 663, y: 385, floor: 4 },
  { id: "N13", x: 482, y: 195, floor: 4 },
  { id: "N14", x: 555, y: 195, floor: 4 },
  { id: "N15", x: 628, y: 195, floor: 4 },
  { id: "N16", x: 443, y: 299, floor: 4 },
  { id: "N17", x: 443, y: 342, floor: 4 },
  { id: "N18", x: 473, y: 385, floor: 4 },
  { id: "N19", x: 530, y: 385, floor: 4 },
  { id: "N20", x: 579, y: 385, floor: 4 },
  { id: "N21", x: 626, y: 385, floor: 4 },
  { id: "N22", x: 663, y: 341, floor: 4 },
  { id: "N23", x: 390, y: 260, floor: 4 },
  { id: "N24", x: 389, y: 215, floor: 4 },
  { id: "N25", x: 425, y: 238, floor: 4 },
  { id: "N26", x: 350, y: 237, floor: 4 },
  { id: "N27", x: 401, y: 195, floor: 4 },
  { id: "N28", x: 523, y: 195, floor: 4 },
  { id: "N29", x: 588, y: 195, floor: 4 },
  { id: "N30", x: 465, y: 385, floor: 4 },
  { id: "N31", x: 463, y: 297, floor: 4 },
  { id: "N32", x: 646, y: 295, floor: 4 },
];

const DEFAULT_EDGES: Record<string, Edge[]> = {
  "3N1": [{ target: "3N2", weight: 275 }, { target: "3N5", weight: 90 }],
  "3N2": [{ target: "3N1", weight: 275 }, { target: "3N3", weight: 95 }],
  "3N3": [{ target: "3N2", weight: 95 }, { target: "3N4", weight: 32 }, { target: "3N7", weight: 25 }],
  "3N4": [{ target: "3N3", weight: 32 }, { target: "3N7", weight: 20 }],
  "3N5": [{ target: "3N6", weight: 140 }, { target: "3N1", weight: 90 }],
  "3N6": [{ target: "3N5", weight: 140 }, { target: "3N8", weight: 275 }],
  "3N7": [{ target: "3N4", weight: 20 }, { target: "3N8", weight: 110 }, { target: "3N3", weight: 25 }],
  "3N8": [{ target: "3N7", weight: 110 }, { target: "3N6", weight: 275 }],
  N1: [{ target: "N2", weight: 100 }, { target: "N22", weight: 46 }, { target: "N32", weight: 18 }],
  N2: [{ target: "N1", weight: 100 }, { target: "N15", weight: 36 }],
  N3: [{ target: "N9", weight: 65 }, { target: "N13", weight: 38 }, { target: "N27", weight: 43 }],
  N4: [{ target: "N5", weight: 20 }, { target: "N27", weight: 51 }],
  N5: [{ target: "N4", weight: 20 }, { target: "N24", weight: 39 }, { target: "N26", weight: 22 }],
  N6: [{ target: "N24", weight: 36 }, { target: "N25", weight: 23 }],
  N7: [{ target: "N9", weight: 18 }, { target: "N23", weight: 35 }, { target: "N25", weight: 22 }],
  N8: [{ target: "N23", weight: 40 }, { target: "N26", weight: 23 }],
  N9: [{ target: "N3", weight: 65 }, { target: "N7", weight: 18 }, { target: "N16", weight: 39 }],
  N11: [{ target: "N17", weight: 43 }, { target: "N30", weight: 21 }],
  N12: [{ target: "N21", weight: 37 }, { target: "N22", weight: 44 }],
  N13: [{ target: "N3", weight: 38 }, { target: "N28", weight: 41 }],
  N14: [{ target: "N28", weight: 32 }, { target: "N29", weight: 33 }],
  N15: [{ target: "N2", weight: 36 }, { target: "N29", weight: 40 }],
  N16: [{ target: "N17", weight: 43 }, { target: "N31", weight: 20 }, { target: "N9", weight: 39 }],
  N17: [{ target: "N11", weight: 43 }, { target: "N16", weight: 43 }],
  N18: [{ target: "N19", weight: 57 }, { target: "N30", weight: 8 }],
  N19: [{ target: "N18", weight: 57 }, { target: "N20", weight: 49 }],
  N20: [{ target: "N19", weight: 49 }, { target: "N21", weight: 47 }],
  N21: [{ target: "N12", weight: 37 }, { target: "N20", weight: 47 }],
  N22: [{ target: "N1", weight: 46 }, { target: "N12", weight: 44 }],
  N23: [{ target: "N7", weight: 35 }, { target: "N8", weight: 40 }],
  N24: [{ target: "N5", weight: 39 }, { target: "N6", weight: 36 }],
  N25: [{ target: "N6", weight: 23 }, { target: "N7", weight: 22 }],
  N26: [{ target: "N5", weight: 22 }, { target: "N8", weight: 23 }],
  N27: [{ target: "N3", weight: 43 }, { target: "N4", weight: 51 }],
  N28: [{ target: "N13", weight: 41 }, { target: "N14", weight: 32 }],
  N29: [{ target: "N14", weight: 33 }, { target: "N15", weight: 40 }],
  N30: [{ target: "N11", weight: 21 }, { target: "N18", weight: 8 }, { target: "N31", weight: 88 }],
  N31: [{ target: "N30", weight: 88 }, { target: "N16", weight: 20 }],
  N32: [{ target: "N1", weight: 18 }],
};

const DEFAULT_GRAPH: RoutingGraph = {
  nodes: DEFAULT_NODES,
  edges: DEFAULT_EDGES,
};

function dijkstra(
  nodes: GraphNode[],
  edges: Record<string, Edge[]>,
  startId: string,
  endId: string
): string[] {
  const distances: Record<string, number> = {};
  const prev: Record<string, string | null> = {};
  const unvisited = new Set(nodes.map((node) => node.id));

  for (const node of nodes) {
    distances[node.id] = Infinity;
    prev[node.id] = null;
  }

  distances[startId] = 0;

  while (unvisited.size > 0) {
    const current = [...unvisited].reduce((a, b) => (distances[a] < distances[b] ? a : b));

    if (distances[current] === Infinity) break;
    unvisited.delete(current);
    if (current === endId) break;

    for (const edge of edges[current] || []) {
      const alt = distances[current] + edge.weight;
      if (alt < distances[edge.target]) {
        distances[edge.target] = alt;
        prev[edge.target] = current;
      }
    }
  }

  const path: string[] = [];
  let cursor: string | null = endId;
  while (cursor) {
    path.unshift(cursor);
    cursor = prev[cursor];
  }

  return path;
}

function nearestNodeId(nodes: GraphNode[], x: number, y: number): string | null {
  if (!nodes.length) return null;
  let best = nodes[0];
  let bestD2 = (best.x - x) ** 2 + (best.y - y) ** 2;
  for (let i = 1; i < nodes.length; i += 1) {
    const n = nodes[i];
    const d2 = (n.x - x) ** 2 + (n.y - y) ** 2;
    if (d2 < bestD2) {
      best = n;
      bestD2 = d2;
    }
  }
  return best.id;
}

function edgeKey(a: string, b: string) {
  return a < b ? `${a}__${b}` : `${b}__${a}`;
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function projectToSegment(
  p: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number }
) {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const ab2 = abx * abx + aby * aby;
  if (ab2 <= 1e-6) {
    return { x: a.x, y: a.y, t: 0, dist: distance(p, a) };
  }
  const apx = p.x - a.x;
  const apy = p.y - a.y;
  const t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / ab2));
  const proj = { x: a.x + t * abx, y: a.y + t * aby };
  return { ...proj, t, dist: distance(p, proj) };
}

function withEuclideanEdgeWeights(
  nodes: GraphNode[],
  edges: Record<string, Edge[]>
): Record<string, Edge[]> {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const next: Record<string, Edge[]> = {};

  nodes.forEach((node) => {
    const outgoing = edges[node.id] || [];
    next[node.id] = outgoing
      .filter((edge) => nodeById.has(edge.target))
      .map((edge) => {
        const from = node;
        const to = nodeById.get(edge.target)!;
        return {
          target: edge.target,
          weight: Math.max(1, Math.round(distance(from, to))),
        };
      });
  });

  return next;
}

export function IndoorRoutingMap({ destination, onRouteComputed }: Props) {
  const positioning = usePositioning();
  const resolvedImage = RNImage.resolveAssetSource(FLOOR_4_IMAGE);
  const sourceWidth = resolvedImage.width || CANONICAL_IMAGE_WIDTH;
  const sourceHeight = resolvedImage.height || CANONICAL_IMAGE_HEIGHT;
  // Keep enough raster detail for sharpness on high-density screens without using full source size.
  const qualityTargetWidth = Math.ceil((screenWidth - 40) * PixelRatio.get() * 2.2);
  const renderTargetWidth = Math.min(
    sourceWidth,
    Math.min(MAX_RENDER_WIDTH, Math.max(qualityTargetWidth, MIN_RENDER_WIDTH))
  );
  const renderScale = Math.min(1, renderTargetWidth / sourceWidth);
  const imageWidth = Math.round(sourceWidth * renderScale);
  const imageHeight = Math.round(sourceHeight * renderScale);
  const scaleX = imageWidth / CANONICAL_IMAGE_WIDTH;
  const scaleY = imageHeight / CANONICAL_IMAGE_HEIGHT;

  const [graph, setGraph] = useState<RoutingGraph>(DEFAULT_GRAPH);
  const [graphLoaded, setGraphLoaded] = useState(false);
  const [floorPaths, setFloorPaths] = useState<Record<number, { x: number; y: number }[]>>({});
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulatedFloor, setSimulatedFloor] = useState<number | null>(null);
  const [selectedStartId, setSelectedStartId] = useState<string | null>(null);
  const [selectedEndId, setSelectedEndId] = useState<string | null>("N11");
  const [isEditMode, setIsEditMode] = useState(false);
  const [showNodes, setShowNodes] = useState(false);
  const [isNavigateMode, setIsNavigateMode] = useState(false);
  const [isAddNodeMode, setIsAddNodeMode] = useState(false);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [edgeNodeA, setEdgeNodeA] = useState<string | null>(null);
  const [edgeNodeB, setEdgeNodeB] = useState<string | null>(null);
  const [editStep, setEditStep] = useState<number>(4);

  const imageZoomRef = useRef<any>(null);
  const locationAnims = useRef<Record<number, Animated.ValueXY>>({});
  const liveAnim = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const animationRef = useRef<any>(null);
  const zoomScaleRef = useRef(1);
  const [livePointNorm, setLivePointNorm] = useState({ x: 0.5, y: 0.5 });
  const [zoomScale, setZoomScale] = useState(1);
  const cropWidth = screenWidth - 40;
  const cropHeight = 420;
  // Cover-based min scale prevents immediate snap-back when panning.
  const minScale = Math.max(cropWidth / imageWidth, cropHeight / imageHeight);
  const markerScale = Math.max(0.4, zoomScale);
  const liveDotRadius = Math.max(4, Math.min(24, LIVE_DOT_BASE_RADIUS / markerScale));
  const liveDotStrokeWidth = Math.max(1, Math.min(8, LIVE_DOT_BASE_STROKE / markerScale));
  const simDotRadius = Math.max(5, Math.min(24, SIM_DOT_BASE_RADIUS / markerScale));

  const toRenderedPoint = (point: { x: number; y: number }) => ({
    x: point.x * scaleX,
    y: point.y * scaleY,
  });

  useEffect(() => {
    let active = true;
    void (async () => {
      const loaded = await loadRoutingGraph(DEFAULT_GRAPH);
      if (!active) return;
      setGraph({
        nodes: loaded.nodes,
        edges: withEuclideanEdgeWeights(loaded.nodes, loaded.edges),
      });
      setGraphLoaded(true);
    })();
    return () => {
      active = false;
    };
  }, []);

  const weightedEdges = useMemo(
    () => withEuclideanEdgeWeights(graph.nodes, graph.edges),
    [graph.nodes, graph.edges]
  );

  useEffect(() => {
    if (!graphLoaded) return;
    void saveRoutingGraph({ ...graph, edges: weightedEdges });
  }, [graph, weightedEdges, graphLoaded]);

  const moveEditingNode = (dx: number, dy: number) => {
    if (!editingNodeId) return;
    setGraph((prev) => ({
      ...prev,
      nodes: prev.nodes.map((node) => {
        if (node.id !== editingNodeId) return node;
        return {
          ...node,
          x: Math.max(0, Math.min(CANONICAL_IMAGE_WIDTH, node.x + dx)),
          y: Math.max(0, Math.min(CANONICAL_IMAGE_HEIGHT, node.y + dy)),
        };
      }),
    }));
  };

  const selectedEditNode = useMemo(
    () => graph.nodes.find((n) => n.id === editingNodeId) ?? null,
    [graph.nodes, editingNodeId]
  );

  const upsertEdge = (edges: Record<string, Edge[]>, from: string, to: string, weight: number) => {
    const list = edges[from] || [];
    const existing = list.find((e) => e.target === to);
    if (existing) {
      existing.weight = weight;
      return;
    }
    list.push({ target: to, weight });
    edges[from] = list;
  };

  const removeDirectedEdge = (edges: Record<string, Edge[]>, from: string, to: string) => {
    edges[from] = (edges[from] || []).filter((e) => e.target !== to);
  };

  const generateNextNodeId = (nodes: GraphNode[]) => {
    const maxN = nodes.reduce((max, n) => {
      const match = n.id.match(/^N(\d+)$/);
      if (!match) return max;
      return Math.max(max, Number(match[1]));
    }, 0);
    return `N${maxN + 1}`;
  };

  const addEdgeFromSelectedNode = () => {
    if (!editingNodeId) {
      Alert.alert("Select a node", "Pick a node first, then tap Add Edge.");
      return;
    }

    let createdNodeId: string | null = null;
    let sourceNodeId: string | null = null;

    setGraph((prev) => {
      const source = prev.nodes.find((n) => n.id === editingNodeId);
      if (!source) return prev;

      const SHORT_EDGE_LENGTH = 26;
      const candidates = [
        { x: source.x + SHORT_EDGE_LENGTH, y: source.y },
        { x: source.x - SHORT_EDGE_LENGTH, y: source.y },
        { x: source.x, y: source.y + SHORT_EDGE_LENGTH },
        { x: source.x, y: source.y - SHORT_EDGE_LENGTH },
      ];

      const nextPos =
        candidates.find(
          (p) => p.x >= 0 && p.x <= CANONICAL_IMAGE_WIDTH && p.y >= 0 && p.y <= CANONICAL_IMAGE_HEIGHT
        ) ?? {
          x: Math.max(0, Math.min(CANONICAL_IMAGE_WIDTH, source.x + SHORT_EDGE_LENGTH)),
          y: source.y,
        };

      const newId = generateNextNodeId(prev.nodes);
      const newNode: GraphNode = {
        id: newId,
        x: Math.round(nextPos.x),
        y: Math.round(nextPos.y),
        floor: source.floor,
      };

      const nextEdges: Record<string, Edge[]> = { ...prev.edges };
      const edgeWeight = Math.max(1, Math.round(distance(source, newNode)));
      upsertEdge(nextEdges, source.id, newId, edgeWeight);
      upsertEdge(nextEdges, newId, source.id, edgeWeight);

      createdNodeId = newId;
      sourceNodeId = source.id;

      return {
        nodes: [...prev.nodes, newNode],
        edges: nextEdges,
      };
    });

    if (createdNodeId && sourceNodeId) {
      setEditingNodeId(createdNodeId);
      setEdgeNodeA(sourceNodeId);
      setEdgeNodeB(createdNodeId);
      setIsAddNodeMode(false);
    }
  };

  const linkSelectedEdge = () => {
    if (!edgeNodeA || !edgeNodeB || edgeNodeA === edgeNodeB) return;
    setGraph((prev) => {
      const a = prev.nodes.find((n) => n.id === edgeNodeA);
      const b = prev.nodes.find((n) => n.id === edgeNodeB);
      if (!a || !b) return prev;
      const weight = Math.max(1, Math.round(distance(a, b)));
      const nextEdges: Record<string, Edge[]> = { ...prev.edges };
      upsertEdge(nextEdges, edgeNodeA, edgeNodeB, weight);
      upsertEdge(nextEdges, edgeNodeB, edgeNodeA, weight);
      return { ...prev, edges: nextEdges };
    });
  };

  const unlinkSelectedEdge = () => {
    if (!edgeNodeA || !edgeNodeB || edgeNodeA === edgeNodeB) return;
    setGraph((prev) => {
      const nextEdges: Record<string, Edge[]> = { ...prev.edges };
      removeDirectedEdge(nextEdges, edgeNodeA, edgeNodeB);
      removeDirectedEdge(nextEdges, edgeNodeB, edgeNodeA);
      return { ...prev, edges: nextEdges };
    });
  };

  const removeSelectedNode = () => {
    if (!editingNodeId) return;
    const doomed = editingNodeId;
    setGraph((prev) => {
      const nextNodes = prev.nodes.filter((n) => n.id !== doomed);
      const nextEdges: Record<string, Edge[]> = { ...prev.edges };
      delete nextEdges[doomed];
      Object.keys(nextEdges).forEach((from) => {
        nextEdges[from] = nextEdges[from].filter((edge) => edge.target !== doomed);
      });
      return { nodes: nextNodes, edges: nextEdges };
    });
    if (selectedEndId === doomed) setSelectedEndId(null);
    if (selectedStartId === doomed) setSelectedStartId(null);
    if (edgeNodeA === doomed) setEdgeNodeA(null);
    if (edgeNodeB === doomed) setEdgeNodeB(null);
    setEditingNodeId(null);
  };

  const handleMapTap = (event: any) => {
    if (!isEditMode) return;
    const tapX = typeof event?.locationX === "number" ? event.locationX : event?.x;
    const tapY = typeof event?.locationY === "number" ? event.locationY : event?.y;
    if (typeof tapX !== "number" || typeof tapY !== "number") return;

    const canonicalX = tapX / scaleX;
    const canonicalY = tapY / scaleY;

    if (isAddNodeMode) {
      let best:
        | {
            fromId: string;
            toId: string;
            x: number;
            y: number;
            dist: number;
          }
        | null = null;
      const seen = new Set<string>();

      Object.entries(edgesOnCurrentFloor).forEach(([fromId, list]) => {
        list.forEach((edge) => {
          const key = edgeKey(fromId, edge.target);
          if (seen.has(key)) return;
          seen.add(key);
          const from = nodesOnCurrentFloor.find((n) => n.id === fromId);
          const to = nodesOnCurrentFloor.find((n) => n.id === edge.target);
          if (!from || !to) return;
          const proj = projectToSegment(
            { x: canonicalX, y: canonicalY },
            { x: from.x, y: from.y },
            { x: to.x, y: to.y }
          );
          if (!best || proj.dist < best.dist) {
            best = {
              fromId,
              toId: edge.target,
              x: proj.x,
              y: proj.y,
              dist: proj.dist,
            };
          }
        });
      });

      if (!best || best.dist > EDGE_TAP_THRESHOLD_PX) {
        Alert.alert("Tap closer to an edge", "Add Node mode inserts along the nearest edge.");
        return;
      }

      setGraph((prev) => {
        const from = prev.nodes.find((n) => n.id === best.fromId);
        const to = prev.nodes.find((n) => n.id === best.toId);
        if (!from || !to) return prev;

        const newId = generateNextNodeId(prev.nodes);
        const newNode: GraphNode = {
          id: newId,
          x: Math.round(best.x),
          y: Math.round(best.y),
          floor: NAV_FLOOR,
        };

        const nextEdges: Record<string, Edge[]> = { ...prev.edges };
        removeDirectedEdge(nextEdges, best.fromId, best.toId);
        removeDirectedEdge(nextEdges, best.toId, best.fromId);

        const w1 = Math.max(1, Math.round(distance(from, newNode)));
        const w2 = Math.max(1, Math.round(distance(newNode, to)));

        upsertEdge(nextEdges, best.fromId, newId, w1);
        upsertEdge(nextEdges, newId, best.fromId, w1);
        upsertEdge(nextEdges, newId, best.toId, w2);
        upsertEdge(nextEdges, best.toId, newId, w2);

        return {
          nodes: [...prev.nodes, newNode],
          edges: nextEdges,
        };
      });

      const newNodeId = generateNextNodeId(graph.nodes);
      setEditingNodeId(newNodeId);
      setEdgeNodeA(best.fromId);
      setEdgeNodeB(newNodeId);
      return;
    }

    const nearestId = nearestNodeId(nodesOnCurrentFloor, canonicalX, canonicalY);
    if (nearestId) {
      setEditingNodeId(nearestId);
      if (!edgeNodeA || (edgeNodeA && edgeNodeB)) {
        setEdgeNodeA(nearestId);
        setEdgeNodeB(null);
      } else if (edgeNodeA !== nearestId) {
        setEdgeNodeB(nearestId);
      }
    }
  };

  const nodesOnCurrentFloor = useMemo(
    () => graph.nodes.filter((node) => node.floor === NAV_FLOOR),
    [graph.nodes]
  );

  const edgesOnCurrentFloor = useMemo(() => {
    const next: Record<string, Edge[]> = {};
    nodesOnCurrentFloor.forEach((node) => {
      next[node.id] = (weightedEdges[node.id] || []).filter((edge) =>
        nodesOnCurrentFloor.some((candidate) => candidate.id === edge.target)
      );
    });
    return next;
  }, [nodesOnCurrentFloor, weightedEdges]);

  const traversePath = (points: { x: number; y: number }[], floor: number) => {
    if (points.length < 2) return;
    const renderedPoints = points.map(toRenderedPoint);

    if (animationRef.current) {
      try {
        animationRef.current.stop();
      } catch {}
      animationRef.current = null;
    }

    let anim = locationAnims.current[floor];
    if (!anim) {
      anim = new Animated.ValueXY({ x: renderedPoints[0].x, y: renderedPoints[0].y });
      locationAnims.current[floor] = anim;
    } else {
      anim.setValue(renderedPoints[0]);
    }

    setIsSimulating(true);
    setSimulatedFloor(floor);

    const anims = renderedPoints.slice(1).map((point) =>
      Animated.timing(anim as any, {
        toValue: point,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: false,
      })
    );

    animationRef.current = Animated.sequence(anims);
    animationRef.current.start(() => {
      setIsSimulating(false);
      setSimulatedFloor(null);
      animationRef.current = null;
    });
  };

  useEffect(() => {
    if (animationRef.current && simulatedFloor !== null && simulatedFloor !== NAV_FLOOR) {
      try {
        animationRef.current.stop();
      } catch {}
      animationRef.current = null;
      setIsSimulating(false);
      setSimulatedFloor(null);
      const prevAnim = locationAnims.current[simulatedFloor];
      if (prevAnim && typeof prevAnim.setValue === "function") {
        try {
          prevAnim.setValue({ x: 0, y: 0 });
        } catch {}
      }
    }
  }, [simulatedFloor]);

  useEffect(() => {
    if (!destination) return;

    const mappedEnd = ROOM_TO_NODE[destination];
    if (!mappedEnd) return;

    const endNode = graph.nodes.find((node) => node.id === mappedEnd);
    if (!endNode || endNode.floor !== NAV_FLOOR) return;

    setSelectedEndId(mappedEnd);
  }, [destination, graph.nodes]);

  useEffect(() => {
    if (!positioning.prediction) return;

    const nextNorm = {
      x: Math.max(0, Math.min(1, positioning.prediction.x)),
      y: Math.max(0, Math.min(1, positioning.prediction.y)),
    };
    setLivePointNorm(nextNorm);
  }, [positioning.prediction]);

  useEffect(() => {
    const x = Math.max(0, Math.min(imageWidth, livePointNorm.x * imageWidth));
    const y = Math.max(0, Math.min(imageHeight, livePointNorm.y * imageHeight));
    liveAnim.setValue({ x, y });
  }, [imageHeight, imageWidth, liveAnim, livePointNorm.x, livePointNorm.y]);

  useEffect(() => {
    if (!isNavigateMode || !imageZoomRef.current) return;
    const renderedX = Math.max(0, Math.min(imageWidth, livePointNorm.x * imageWidth));
    const renderedY = Math.max(0, Math.min(imageHeight, livePointNorm.y * imageHeight));
    const targetScale = Math.max(minScale, 2.1);
    const targetX = imageWidth / 2 - renderedX;
    const targetY = imageHeight / 2 - renderedY;

    imageZoomRef.current.centerOn({
      x: targetX,
      y: targetY,
      scale: targetScale,
      duration: 300,
    });
    zoomScaleRef.current = targetScale;
    setZoomScale(targetScale);
  }, [cropHeight, cropWidth, imageHeight, imageWidth, isNavigateMode, livePointNorm.x, livePointNorm.y, minScale]);

  useEffect(() => {
    if (!selectedEndId) return;

    const endNode = graph.nodes.find((node) => node.id === selectedEndId);
    if (!endNode) return;

    const floorNodes = graph.nodes.filter((node) => node.floor === endNode.floor);
    const floorEdges: Record<string, Edge[]> = {};

    floorNodes.forEach((node) => {
      floorEdges[node.id] = (weightedEdges[node.id] || []).filter((edge) =>
        floorNodes.some((candidate) => candidate.id === edge.target)
      );
    });

    // Prefer the live context prediction (always current) over the animation-synced state.
    const liveCanonical = {
      x: livePointNorm.x * CANONICAL_IMAGE_WIDTH,
      y: livePointNorm.y * CANONICAL_IMAGE_HEIGHT,
    };

    let autoStartId: string | null = null;
    if (endNode.floor === 4) {
      autoStartId = nearestNodeId(floorNodes, liveCanonical.x, liveCanonical.y);
    }
    if (!autoStartId) autoStartId = floorNodes[0]?.id ?? null;
    if (!autoStartId) return;

    const ids = dijkstra(floorNodes, floorEdges, autoStartId, selectedEndId);
    const coords = ids
      .map((id) => floorNodes.find((node) => node.id === id))
      .filter((node): node is GraphNode => Boolean(node));

    if (selectedStartId !== autoStartId) setSelectedStartId(autoStartId);
    if (coords.length < 2) {
      setFloorPaths((prev) => ({ ...prev, [endNode.floor]: coords }));
      if (onRouteComputed) onRouteComputed(ids);
      return;
    }

    setFloorPaths((prev) => ({ ...prev, [endNode.floor]: coords }));
    traversePath(coords, endNode.floor);
    if (onRouteComputed) onRouteComputed(ids);
  }, [livePointNorm.x, livePointNorm.y, onRouteComputed, selectedEndId, selectedStartId, graph.nodes, weightedEdges]);

  const runDijkstra = (endId?: string) => {
    const end = endId ?? selectedEndId;

    if (!end) {
      Alert.alert("Select an end node");
      return;
    }

    const endNode = graph.nodes.find((node) => node.id === end);
    if (!endNode) {
      Alert.alert("Invalid node ID");
      return;
    }

    if (endNode.floor !== NAV_FLOOR) {
      Alert.alert("Only 4th floor is enabled right now.");
      return;
    }

    setSelectedEndId(end);
  };

  const toggleEditMode = () => {
    setIsEditMode((prev) => {
      const next = !prev;
      if (next && !editingNodeId) {
        setEditingNodeId(selectedEndId ?? nodesOnCurrentFloor[0]?.id ?? null);
        setEdgeNodeA(selectedEndId ?? nodesOnCurrentFloor[0]?.id ?? null);
        setEdgeNodeB(null);
      }
      if (!next) {
        setIsAddNodeMode(false);
      }
      return next;
    });
  };

  const currentPathPoints = floorPaths[NAV_FLOOR] || [];
  const renderedPathPoints = currentPathPoints.map(toRenderedPoint);
  const shouldShowNodes = isEditMode || showNodes;

  return (
    <View style={styles.wrapper}>
      <View style={styles.selectorContainer}>
        <View style={styles.selectorColumn}>
          <Text style={styles.selectorLabel}>Start</Text>
          <Text style={styles.autoStartText}>Auto nearest node: {selectedStartId ?? "N/A"}</Text>
        </View>

        <View style={styles.selectorColumn}>
          <Text style={styles.selectorLabel}>End</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {nodesOnCurrentFloor.map((node) => (
              <TouchableOpacity
                key={node.id}
                onPress={() => {
                  if (isEditMode) {
                    setEditingNodeId(node.id);
                    return;
                  }
                  setSelectedEndId(node.id);
                }}
                style={[
                  styles.nodeButton,
                  (isEditMode ? editingNodeId === node.id : selectedEndId === node.id) && styles.nodeButtonSelected,
                ]}>
                <Text
                  style={
                    (isEditMode ? editingNodeId === node.id : selectedEndId === node.id)
                      ? styles.nodeButtonTextSelected
                      : styles.nodeButtonText
                  }>
                  {node.id}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>

      <View style={styles.editContainer}>
        <TouchableOpacity
          style={[styles.editToggleButton, shouldShowNodes && styles.editToggleButtonActive]}
          onPress={() => setShowNodes((prev) => !prev)}>
          <Text style={shouldShowNodes ? styles.editToggleTextActive : styles.editToggleText}>
            {shouldShowNodes ? "Nodes: ON" : "Nodes: OFF"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.editToggleButton, isEditMode && styles.editToggleButtonActive]}
          onPress={toggleEditMode}>
          <Text style={isEditMode ? styles.editToggleTextActive : styles.editToggleText}>
            {isEditMode ? "Node Edit: ON" : "Node Edit: OFF"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.editToggleButton, isNavigateMode && styles.editToggleButtonActive]}
          onPress={() => {
            setIsNavigateMode((prev) => !prev);
            if (isEditMode) {
              setIsEditMode(false);
              setIsAddNodeMode(false);
            }
          }}>
          <Text style={isNavigateMode ? styles.editToggleTextActive : styles.editToggleText}>
            {isNavigateMode ? "Navigate Mode: ON" : "Navigate Mode: OFF"}
          </Text>
        </TouchableOpacity>

        {isEditMode ? (
          <View style={styles.editPanel}>
            <Text style={styles.editHint}>Tap map node or node chip to select it, then nudge it.</Text>
            <Text style={styles.editHint}>Toggle Add Node mode, then tap near an edge to insert a node.</Text>
            <Text style={styles.editHint}>Selected: {selectedEditNode?.id ?? "none"}</Text>
            {selectedEditNode ? (
              <Text style={styles.editHint}>
                x={selectedEditNode.x.toFixed(1)} y={selectedEditNode.y.toFixed(1)}
              </Text>
            ) : null}

            <View style={styles.editActionsRow}>
              <TouchableOpacity
                style={[styles.editActionBtn, isAddNodeMode && styles.editActionBtnActive]}
                onPress={() => setIsAddNodeMode((prev) => !prev)}>
                <Text style={isAddNodeMode ? styles.editActionTextActive : styles.editActionText}>
                  {isAddNodeMode ? "Add Node: ON" : "Add Node: OFF"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.editActionBtn} onPress={addEdgeFromSelectedNode} disabled={!selectedEditNode}>
                <Text style={styles.editActionText}>Add Edge</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.editActionDangerBtn}
                onPress={removeSelectedNode}
                disabled={!selectedEditNode}>
                <Text style={styles.editActionDangerText}>Delete Node</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.editHint}>Edge A: {edgeNodeA ?? "none"}  Edge B: {edgeNodeB ?? "none"}</Text>
            <View style={styles.editActionsRow}>
              <TouchableOpacity style={styles.editActionBtn} onPress={linkSelectedEdge}>
                <Text style={styles.editActionText}>Link Edge</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.editActionBtn} onPress={unlinkSelectedEdge}>
                <Text style={styles.editActionText}>Unlink Edge</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.editActionBtn}
                onPress={() => {
                  setEdgeNodeA(null);
                  setEdgeNodeB(null);
                }}>
                <Text style={styles.editActionText}>Clear Edge Pick</Text>
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.editNodePickerRow}>
              {nodesOnCurrentFloor.map((node) => (
                <TouchableOpacity
                  key={`edit-${node.id}`}
                  style={[styles.editNodeChip, editingNodeId === node.id && styles.editNodeChipActive]}
                  onPress={() => {
                    setEditingNodeId(node.id);
                    if (!edgeNodeA || (edgeNodeA && edgeNodeB)) {
                      setEdgeNodeA(node.id);
                      setEdgeNodeB(null);
                    } else if (edgeNodeA !== node.id) {
                      setEdgeNodeB(node.id);
                    }
                  }}>
                  <Text style={editingNodeId === node.id ? styles.editNodeChipTextActive : styles.editNodeChipText}>
                    {node.id}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.editStepRow}>
              {EDIT_STEPS.map((step) => (
                <TouchableOpacity
                  key={step}
                  style={[styles.editStepChip, editStep === step && styles.editStepChipActive]}
                  onPress={() => setEditStep(step)}>
                  <Text style={editStep === step ? styles.editStepTextActive : styles.editStepText}>
                    {step}px
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.nudgeGrid}>
              <TouchableOpacity
                style={styles.nudgeBtn}
                disabled={!selectedEditNode}
                onPress={() => moveEditingNode(0, -editStep)}>
                <Text style={styles.nudgeText}>Up</Text>
              </TouchableOpacity>

              <View style={styles.nudgeRow}>
                <TouchableOpacity
                  style={styles.nudgeBtn}
                  disabled={!selectedEditNode}
                  onPress={() => moveEditingNode(-editStep, 0)}>
                  <Text style={styles.nudgeText}>Left</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.nudgeBtn}
                  disabled={!selectedEditNode}
                  onPress={() => moveEditingNode(editStep, 0)}>
                  <Text style={styles.nudgeText}>Right</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.nudgeBtn}
                disabled={!selectedEditNode}
                onPress={() => moveEditingNode(0, editStep)}>
                <Text style={styles.nudgeText}>Down</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
      </View>

      <ImageZoom
        ref={imageZoomRef}
        cropWidth={cropWidth}
        cropHeight={cropHeight}
        imageWidth={imageWidth}
        imageHeight={imageHeight}
        minScale={minScale}
        maxScale={3}
        onMove={(event: any) => {
          const nextScale = typeof event?.scale === "number" && Number.isFinite(event.scale) ? event.scale : 1;
          if (Math.abs(nextScale - zoomScaleRef.current) < 0.02) return;
          zoomScaleRef.current = nextScale;
          setZoomScale(nextScale);
        }}
        onClick={handleMapTap}
        enableCenterFocus={false}>
        <View>
          <ExpoImage
            source={FLOOR_4_IMAGE}
            style={{ width: imageWidth, height: imageHeight }}
            contentFit="contain"
            contentPosition="center"
            allowDownscaling={false}
            transition={0}
          />

          <Svg width={imageWidth} height={imageHeight} style={StyleSheet.absoluteFillObject}>
            {renderedPathPoints.length > 1 && (
              <Polyline
                points={renderedPathPoints.map((point) => `${point.x},${point.y}`).join(" ")}
                fill="none"
                stroke="red"
                strokeWidth={4}
              />
            )}

            {shouldShowNodes
              ? nodesOnCurrentFloor.map((node) => (
                  <G key={node.id}>
                    <Circle
                      cx={node.x * scaleX}
                      cy={node.y * scaleY}
                      r={5}
                      onPress={() => {
                        if (!isEditMode) return;
                        setEditingNodeId(node.id);
                        if (!edgeNodeA || (edgeNodeA && edgeNodeB)) {
                          setEdgeNodeA(node.id);
                          setEdgeNodeB(null);
                        } else if (edgeNodeA !== node.id) {
                          setEdgeNodeB(node.id);
                        }
                      }}
                      fill={
                        node.id === editingNodeId
                          ? "#f59e0b"
                          : node.id === selectedStartId
                          ? "blue"
                          : node.id === selectedEndId
                            ? "red"
                            : "purple"
                      }
                    />
                    <SvgText
                      x={node.x * scaleX + 12}
                      y={node.y * scaleY - 8}
                      fontSize={12}
                      onPress={() => {
                        if (!isEditMode) return;
                        setEditingNodeId(node.id);
                        if (!edgeNodeA || (edgeNodeA && edgeNodeB)) {
                          setEdgeNodeA(node.id);
                          setEdgeNodeB(null);
                        } else if (edgeNodeA !== node.id) {
                          setEdgeNodeB(node.id);
                        }
                      }}
                      fill={
                        node.id === editingNodeId
                          ? "#b45309"
                          : node.id === selectedStartId
                          ? "blue"
                          : node.id === selectedEndId
                            ? "red"
                            : "green"
                      }
                      fontWeight={
                        node.id === selectedStartId || node.id === selectedEndId ? "700" : "400"
                      }>
                      {node.id}
                    </SvgText>
                  </G>
                ))
              : null}

            {isSimulating && simulatedFloor === NAV_FLOOR && (() => {
              const active = locationAnims.current[NAV_FLOOR];
              if (!active) return null;
              return <AnimatedCircle cx={active.x} cy={active.y} r={simDotRadius} fill="dodgerblue" />;
            })()}

            {NAV_FLOOR === 4 ? (
              <AnimatedCircle
                cx={liveAnim.x}
                cy={liveAnim.y}
                r={liveDotRadius}
                fill="#2563eb"
                stroke="#ffffff"
                strokeWidth={liveDotStrokeWidth}
              />
            ) : null}

            {Object.entries(edgesOnCurrentFloor).map(([fromId, edgeList]) =>
              edgeList.map((edge, index) => {
                const from = nodesOnCurrentFloor.find((node) => node.id === fromId);
                const to = nodesOnCurrentFloor.find((node) => node.id === edge.target);
                if (!from || !to) return null;

                return (
                  <Polyline
                    key={`${fromId}-${index}`}
                    points={`${from.x * scaleX},${from.y * scaleY} ${to.x * scaleX},${to.y * scaleY}`}
                    stroke="rgba(34, 197, 94, 0.18)"
                    strokeWidth={2}
                  />
                );
              })
            )}
          </Svg>
        </View>
      </ImageZoom>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    paddingBottom: 12,
  },
  selectorContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    marginTop: 12,
  },
  selectorColumn: {
    flex: 1,
    paddingHorizontal: 6,
  },
  selectorLabel: {
    fontWeight: "700",
    marginBottom: 6,
  },
  autoStartText: {
    color: "#334155",
    fontWeight: "600",
  },
  editContainer: {
    paddingHorizontal: 12,
    paddingTop: 8,
    gap: 8,
  },
  editToggleButton: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#64748b",
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  editToggleButtonActive: {
    borderColor: "#1d4ed8",
    backgroundColor: "#dbeafe",
  },
  editToggleText: {
    color: "#334155",
    fontWeight: "700",
  },
  editToggleTextActive: {
    color: "#1e3a8a",
    fontWeight: "700",
  },
  editPanel: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    padding: 10,
    gap: 8,
    backgroundColor: "#f8fafc",
  },
  editHint: {
    color: "#475569",
    fontSize: 12,
    fontWeight: "600",
  },
  editActionsRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  editActionBtn: {
    borderWidth: 1,
    borderColor: "#94a3b8",
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "#fff",
  },
  editActionBtnActive: {
    borderColor: "#1d4ed8",
    backgroundColor: "#dbeafe",
  },
  editActionText: {
    color: "#334155",
    fontWeight: "700",
  },
  editActionTextActive: {
    color: "#1e3a8a",
    fontWeight: "700",
  },
  editActionDangerBtn: {
    borderWidth: 1,
    borderColor: "#991b1b",
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "#fee2e2",
  },
  editActionDangerText: {
    color: "#7f1d1d",
    fontWeight: "700",
  },
  editStepRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  editNodePickerRow: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 2,
  },
  editNodeChip: {
    borderWidth: 1,
    borderColor: "#94a3b8",
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: "#fff",
  },
  editNodeChipActive: {
    borderColor: "#d97706",
    backgroundColor: "#fef3c7",
  },
  editNodeChipText: {
    color: "#334155",
    fontWeight: "600",
  },
  editNodeChipTextActive: {
    color: "#92400e",
    fontWeight: "700",
  },
  editStepChip: {
    borderWidth: 1,
    borderColor: "#94a3b8",
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: "#fff",
  },
  editStepChipActive: {
    borderColor: "#1d4ed8",
    backgroundColor: "#dbeafe",
  },
  editStepText: {
    color: "#334155",
    fontWeight: "600",
  },
  editStepTextActive: {
    color: "#1e3a8a",
    fontWeight: "700",
  },
  nudgeGrid: {
    alignItems: "center",
    gap: 6,
  },
  nudgeRow: {
    flexDirection: "row",
    gap: 6,
  },
  nudgeBtn: {
    minWidth: 70,
    borderWidth: 1,
    borderColor: "#64748b",
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  nudgeText: {
    color: "#0f172a",
    fontWeight: "700",
  },
  nodeButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "#eee",
    marginRight: 8,
  },
  nodeButtonSelected: {
    backgroundColor: "#4CAF50",
  },
  nodeButtonText: {
    color: "#222",
    fontWeight: "600",
  },
  nodeButtonTextSelected: {
    color: "#fff",
    fontWeight: "700",
  },
  // Removed findButton style as it is no longer needed
});
