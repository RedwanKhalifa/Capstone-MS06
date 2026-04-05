import { useAppState } from "@/context/app-state";
import { usePositioning } from "@/context/positioning";
import { DEFAULT_ROUTING_GRAPH, MINIMUM_ROUTING_GRAPH_VERSION } from "@/lib/default-routing-graph";
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
    Share,
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
const PLAN_FLOORS: Record<"ENG4_NORTH" | "ENG4_SOUTH" | "ENG3_NORTH" | "ENG3_SOUTH" | "HOME_MAIN", number> = {
  ENG4_NORTH: 4,
  ENG4_SOUTH: 5,
  ENG3_NORTH: 3,
  ENG3_SOUTH: 2,
  HOME_MAIN: 40,
};
const FLOOR_TO_PLAN: Record<number, keyof typeof PLAN_FLOORS> = {
  4: "ENG4_NORTH",
  5: "ENG4_SOUTH",
  3: "ENG3_NORTH",
  2: "ENG3_SOUTH",
  40: "HOME_MAIN",
};
const FLOOR_LABELS: Record<number, string> = {
  4: "4N",
  5: "4S",
  3: "3N",
  2: "3S",
  40: "H",
};
const VERTICAL_CONNECTOR_LABELS: Record<string, string> = {
  [edgeKey("N32", "3N4")]: "Stairs",
  [edgeKey("N65", "3N56")]: "Elevator",
};
const CANONICAL_IMAGE_WIDTH = 800;
const CANONICAL_IMAGE_HEIGHT = 600;
const MIN_RENDER_WIDTH = 1200;
const MAX_RENDER_WIDTH = 1800;
const MAX_DRAW_PIXELS = 40_000_000;
const EDIT_STEPS = [2, 4, 8] as const;
const EDGE_TAP_THRESHOLD_PX = 18;
const LIVE_DOT_BASE_RADIUS = 11;
const LIVE_DOT_BASE_STROKE = 3;
const SIM_DOT_BASE_RADIUS = 12;
const TEMP_START_NODE_ID = "__TEMP_START__";
const SIM_LOOP_PAUSE_MS = 500;
const DESTINATION_REACHED_THRESHOLD_PX = 9;
const PLAN_ROOM_TO_NODE: Record<"ENG4_NORTH" | "ENG4_SOUTH" | "ENG3_NORTH" | "ENG3_SOUTH" | "HOME_MAIN", Record<string, string>> = {
  ENG4_NORTH: {
    ENG103: "N12",
    ENG448: "N14",
    "ENG 448": "N14",
    ENG460: "N7",
    "ENG 460": "N7",
    LIB072: "N2",
    ENG: "N3",
  },
  ENG4_SOUTH: {},
  ENG3_NORTH: {},
  ENG3_SOUTH: {},
  HOME_MAIN: {},
};

const GLOBAL_ROOM_TO_NODE: Record<string, string> = Object.values(PLAN_ROOM_TO_NODE).reduce(
  (acc, planMap) => ({ ...acc, ...planMap }),
  {} as Record<string, string>
);

const PLAN_IMAGES: Record<"ENG4_NORTH" | "ENG4_SOUTH" | "ENG3_NORTH" | "ENG3_SOUTH" | "HOME_MAIN", any> = {
  ENG4_NORTH: require("../../assets/images/eng4_north.png"),
  ENG4_SOUTH: require("../../assets/images/eng4_south.png"),
  ENG3_NORTH: require("../../assets/images/eng3_north.png"),
  ENG3_SOUTH: require("../../assets/images/eng3_south.png"),
  HOME_MAIN: require("../../assets/images/HomeFloorPlan-1.png"),
};

const DEFAULT_GRAPH: RoutingGraph = DEFAULT_ROUTING_GRAPH;

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
  const { devModeEnabled } = useAppState();
  const positioning = usePositioning();
  const activePlanId = (positioning as any).activePlanId as "ENG4_NORTH" | "ENG4_SOUTH" | "ENG3_NORTH" | "ENG3_SOUTH" | "HOME_MAIN" ?? "ENG4_NORTH";
  const isRoutingPlan = true;
  const activeFloor = PLAN_FLOORS[activePlanId];
  const activeImage = PLAN_IMAGES[activePlanId];
  const resolvedImage = RNImage.resolveAssetSource(activeImage);
  const sourceWidth = resolvedImage.width || CANONICAL_IMAGE_WIDTH;
  const sourceHeight = resolvedImage.height || CANONICAL_IMAGE_HEIGHT;
  const pixelRatio = PixelRatio.get();
  const sourceAspect = sourceHeight / sourceWidth;
  // Keep enough raster detail for sharpness on high-density screens without using full source size.
  const qualityTargetWidth = Math.ceil((screenWidth - 40) * PixelRatio.get() * 2.2);
  // react-native-svg can rasterize transformed content to very large bitmaps on Android.
  // Cap base width so max zoom does not exceed a safe total pixel area.
  const zoomForBudget = 3;
  const safeWidthFromBudget = Math.floor(
    Math.sqrt(MAX_DRAW_PIXELS / Math.max(0.01, sourceAspect * (zoomForBudget * pixelRatio) ** 2))
  );
  const maxSafeRenderWidth = Math.max(900, safeWidthFromBudget);
  const renderTargetWidth = Math.min(
    sourceWidth,
    Math.min(MAX_RENDER_WIDTH, maxSafeRenderWidth, Math.max(qualityTargetWidth, MIN_RENDER_WIDTH))
  );
  const renderScale = Math.min(1, renderTargetWidth / sourceWidth);
  const imageWidth = Math.round(sourceWidth * renderScale);
  const imageHeight = Math.round(sourceHeight * renderScale);
  const scaleX = imageWidth / CANONICAL_IMAGE_WIDTH;
  const scaleY = imageHeight / CANONICAL_IMAGE_HEIGHT;

  const [graph, setGraph] = useState<RoutingGraph>(DEFAULT_GRAPH);
  const [graphLoaded, setGraphLoaded] = useState(false);
  const [floorPaths, setFloorPaths] = useState<Record<number, { x: number; y: number }[]>>({});
  const [routeNodeIds, setRouteNodeIds] = useState<string[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulatedFloor, setSimulatedFloor] = useState<number | null>(null);
  const [selectedStartId, setSelectedStartId] = useState<string | null>(null);
  const [selectedEndId, setSelectedEndId] = useState<string | null>(null);
  const [routeStartOverrideId, setRouteStartOverrideId] = useState<string | null>(null);
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
  const mapOpacity = useRef(new Animated.Value(1)).current;
  const animationRef = useRef<any>(null);
  const simLoopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingTransitionRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentFloorTransitionRef = useRef<{
    fromId: string;
    toId: string;
    fromFloor: number;
    toFloor: number;
    connector: string;
  } | null>(null);
  const simIsRunningRef = useRef(false);
  const simPendingRef = useRef<{ points: { x: number; y: number }[]; floor: number } | null>(null);
  const simLastCompletedRef = useRef<{ points: { x: number; y: number }[]; floor: number } | null>(null);
  const zoomScaleRef = useRef(1);
  const [livePointNorm, setLivePointNorm] = useState({ x: 0.5, y: 0.5 });
  const [zoomScale, setZoomScale] = useState(1);
  const cropWidth = screenWidth - 40;
  const cropHeight = 420;
  // Cover-based min scale prevents immediate snap-back when panning.
  const minScale = Math.max(cropWidth / imageWidth, cropHeight / imageHeight);
  const safeMaxScale = Math.max(
    minScale,
    Math.min(3, Math.sqrt(MAX_DRAW_PIXELS / Math.max(1, imageWidth * imageHeight * pixelRatio * pixelRatio)))
  );
  const markerScale = Math.max(0.4, zoomScale);
  const liveDotRadius = Math.max(4, Math.min(24, LIVE_DOT_BASE_RADIUS / markerScale));
  const liveDotStrokeWidth = Math.max(1, Math.min(8, LIVE_DOT_BASE_STROKE / markerScale));
  const simDotRadius = Math.max(5, Math.min(24, SIM_DOT_BASE_RADIUS / markerScale));
  const destinationMarkerOuterRadius = Math.max(5, Math.min(22, 10 / markerScale));
  const destinationMarkerInnerRadius = Math.max(3, Math.min(14, 5 / markerScale));
  const destinationMarkerStrokeWidth = Math.max(1, Math.min(6, 2 / markerScale));

  const allNodesSorted = useMemo(
    () => [...graph.nodes].sort((a, b) => a.floor - b.floor || a.id.localeCompare(b.id)),
    [graph.nodes]
  );

  const upcomingFloorTransition = useMemo(() => {
    if (routeNodeIds.length < 2) return null;

    const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
    for (let i = 0; i < routeNodeIds.length - 1; i += 1) {
      const fromId = routeNodeIds[i];
      const toId = routeNodeIds[i + 1];
      const fromNode = nodeById.get(fromId);
      const toNode = nodeById.get(toId);
      if (!fromNode || !toNode) continue;
      if (fromNode.floor !== activeFloor) continue;
      if (fromNode.floor === toNode.floor) continue;
      return {
        fromId,
        toId,
        fromFloor: fromNode.floor,
        toFloor: toNode.floor,
        connector: VERTICAL_CONNECTOR_LABELS[edgeKey(fromId, toId)] ?? "Transition",
      };
    }

    return null;
  }, [activeFloor, graph.nodes, routeNodeIds]);

  function transitionToRouteFloor(transition: { toFloor: number; toId: string }) {
    const nextPlan = FLOOR_TO_PLAN[transition.toFloor];
    if (!nextPlan) return;
    setRouteStartOverrideId(transition.toId);
    transitionToPlan(nextPlan);
  }

  useEffect(() => {
    currentFloorTransitionRef.current = upcomingFloorTransition;
  }, [upcomingFloorTransition]);

  // In navigate mode there is no floor-segment simulation, so keep a short timer-based
  // handoff. In normal mode, the handoff is triggered when the blue-dot simulation
  // reaches the connector.
  useEffect(() => {
    if (pendingTransitionRef.current) {
      clearTimeout(pendingTransitionRef.current);
      pendingTransitionRef.current = null;
    }
    if (!upcomingFloorTransition || !isNavigateMode) return;

    pendingTransitionRef.current = setTimeout(() => {
      pendingTransitionRef.current = null;
      transitionToRouteFloor(upcomingFloorTransition);
    }, 2000);

    return () => {
      if (pendingTransitionRef.current) {
        clearTimeout(pendingTransitionRef.current);
        pendingTransitionRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNavigateMode, upcomingFloorTransition]);

  const toRenderedPoint = (point: { x: number; y: number }) => ({
    x: point.x * scaleX,
    y: point.y * scaleY,
  });

  useEffect(() => {
    if (devModeEnabled) return;
    setShowNodes(false);
    setIsEditMode(false);
    setIsAddNodeMode(false);
  }, [devModeEnabled]);

  useEffect(() => {
    if (isRoutingPlan) return;
    stopPathSimulation();
    setSelectedEndId(null);
    setSelectedStartId(null);
    setRouteStartOverrideId(null);
    setRouteNodeIds([]);
    setFloorPaths({});
    if (onRouteComputed) onRouteComputed([]);
  }, [isRoutingPlan, onRouteComputed]);

  useEffect(() => {
    let active = true;
    void (async () => {
      const loaded = await loadRoutingGraph(DEFAULT_GRAPH, MINIMUM_ROUTING_GRAPH_VERSION);
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
    void saveRoutingGraph({ ...graph, edges: weightedEdges }, MINIMUM_ROUTING_GRAPH_VERSION);
  }, [graph, weightedEdges, graphLoaded]);

  const shareCurrentFloorGraph = async () => {
    const floorNodeIds = new Set(
      graph.nodes.filter((node) => node.floor === activeFloor).map((node) => node.id)
    );
    const floorGraph = {
      version: MINIMUM_ROUTING_GRAPH_VERSION,
      floor: activeFloor,
      nodes: graph.nodes.filter((node) => node.floor === activeFloor),
      edges: Object.fromEntries(
        Object.entries(weightedEdges)
          .filter(([fromId]) => floorNodeIds.has(fromId))
          .map(([fromId, list]) => [
            fromId,
            list.filter((edge) => floorNodeIds.has(edge.target)),
          ])
      ),
    };

    await Share.share({
      message: JSON.stringify(floorGraph, null, 2),
      title: `Routing Graph Floor ${activeFloor}`,
    });
  };

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

  const generateNextNodeId = (nodes: GraphNode[], prefix: "N" | "H" | "3N" = "N") => {
    const maxN = nodes.reduce((max, n) => {
      const match = n.id.match(new RegExp(`^${prefix}(\\d+)$`));
      if (!match) return max;
      return Math.max(max, Number(match[1]));
    }, 0);
    return `${prefix}${maxN + 1}`;
  };

  const addSeedNodeAtLivePosition = () => {
    const prefix = activePlanId === "HOME_MAIN" ? "H" : activePlanId.includes("ENG3") ? "3N" : "N";
    const x = Math.round(Math.max(0, Math.min(CANONICAL_IMAGE_WIDTH, livePointNorm.x * CANONICAL_IMAGE_WIDTH)));
    const y = Math.round(Math.max(0, Math.min(CANONICAL_IMAGE_HEIGHT, livePointNorm.y * CANONICAL_IMAGE_HEIGHT)));

    let createdNodeId: string | null = null;
    setGraph((prev) => {
      const newId = generateNextNodeId(prev.nodes, prefix);
      const newNode: GraphNode = { id: newId, x, y, floor: activeFloor };
      createdNodeId = newId;
      return {
        ...prev,
        nodes: [...prev.nodes, newNode],
        edges: {
          ...prev.edges,
          [newId]: prev.edges[newId] || [],
        },
      };
    });

    if (createdNodeId) {
      setEditingNodeId(createdNodeId);
      setEdgeNodeA(createdNodeId);
      setEdgeNodeB(null);
    }
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

      const newId = generateNextNodeId(prev.nodes, activePlanId === "HOME_MAIN" ? "H" : activePlanId.includes("ENG3") ? "3N" : "N");
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
    if (!isRoutingPlan || !isEditMode) return;
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

        const newId = generateNextNodeId(prev.nodes, activePlanId === "HOME_MAIN" ? "H" : activePlanId.includes("ENG3") ? "3N" : "N");
        const newNode: GraphNode = {
          id: newId,
          x: Math.round(best.x),
          y: Math.round(best.y),
          floor: activeFloor,
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

      const newNodeId = generateNextNodeId(graph.nodes, activePlanId === "HOME_MAIN" ? "H" : activePlanId.includes("ENG3") ? "3N" : "N");
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
    () => (isRoutingPlan ? graph.nodes.filter((node) => node.floor === activeFloor) : []),
    [activeFloor, graph.nodes, isRoutingPlan]
  );

  const selectedEndNodeOnCurrentFloor = useMemo(
    () => nodesOnCurrentFloor.find((node) => node.id === selectedEndId) ?? null,
    [nodesOnCurrentFloor, selectedEndId]
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

  const stopPathSimulation = () => {
    if (animationRef.current) {
      try {
        animationRef.current.stop();
      } catch {}
      animationRef.current = null;
    }
    if (simLoopTimerRef.current) {
      clearTimeout(simLoopTimerRef.current);
      simLoopTimerRef.current = null;
    }
    if (pendingTransitionRef.current) {
      clearTimeout(pendingTransitionRef.current);
      pendingTransitionRef.current = null;
    }
    simIsRunningRef.current = false;
    simPendingRef.current = null;
    simLastCompletedRef.current = null;
    setIsSimulating(false);
    setSimulatedFloor(null);
  };

  const traversePath = (points: { x: number; y: number }[], floor: number) => {
    if (points.length < 2) return;
    const renderedPoints = points.map(toRenderedPoint);

    if (simLoopTimerRef.current) {
      clearTimeout(simLoopTimerRef.current);
      simLoopTimerRef.current = null;
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
    simIsRunningRef.current = true;

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
      animationRef.current = null;
      simIsRunningRef.current = false;
      simLastCompletedRef.current = { points, floor };

      const floorTransition = currentFloorTransitionRef.current;
      if (!isNavigateMode && floorTransition && floorTransition.fromFloor === floor) {
        transitionToRouteFloor(floorTransition);
        return;
      }

      if (isNavigateMode) {
        setIsSimulating(false);
        setSimulatedFloor(null);
        return;
      }

      const nextRun = simPendingRef.current ?? simLastCompletedRef.current;
      simPendingRef.current = null;
      if (!nextRun || nextRun.points.length < 2) {
        setIsSimulating(false);
        setSimulatedFloor(null);
        return;
      }

      simLoopTimerRef.current = setTimeout(() => {
        simLoopTimerRef.current = null;
        if (isNavigateMode) {
          setIsSimulating(false);
          setSimulatedFloor(null);
          return;
        }
        traversePath(nextRun.points, nextRun.floor);
      }, SIM_LOOP_PAUSE_MS);
    });
  };

  const queuePathSimulation = (points: { x: number; y: number }[], floor: number) => {
    if (isNavigateMode || points.length < 2) return;
    if (simIsRunningRef.current) {
      simPendingRef.current = { points, floor };
      return;
    }
    traversePath(points, floor);
  };

  useEffect(() => {
    if (isNavigateMode) {
      stopPathSimulation();
    }
  }, [isNavigateMode]);

  useEffect(() => {
    if (animationRef.current && simulatedFloor !== null && simulatedFloor !== activeFloor) {
      try {
        animationRef.current.stop();
      } catch {}
      animationRef.current = null;
      if (simLoopTimerRef.current) {
        clearTimeout(simLoopTimerRef.current);
        simLoopTimerRef.current = null;
      }
      simIsRunningRef.current = false;
      simPendingRef.current = null;
      setIsSimulating(false);
      setSimulatedFloor(null);
      const prevAnim = locationAnims.current[simulatedFloor];
      if (prevAnim && typeof prevAnim.setValue === "function") {
        try {
          prevAnim.setValue({ x: 0, y: 0 });
        } catch {}
      }
    }
  }, [activeFloor, simulatedFloor]);

  useEffect(() => {
    return () => {
      stopPathSimulation();
    };
  }, []);

  useEffect(() => {
    if (!destination) return;

    const normalized = destination.trim().toUpperCase();
    const normalizedNoSpace = normalized.replace(/\s+/g, "");
    const mappedByRoom = GLOBAL_ROOM_TO_NODE[normalized] ?? GLOBAL_ROOM_TO_NODE[normalizedNoSpace];
    const mappedByNodeId = graph.nodes.find((node) => node.id.toUpperCase() === normalized)?.id;
    const mappedEnd = mappedByRoom ?? mappedByNodeId;
    if (!mappedEnd) return;

    const endNode = graph.nodes.find((node) => node.id === mappedEnd);
    if (!endNode) return;

    setRouteStartOverrideId(null);
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
    const targetScale = Math.min(safeMaxScale, Math.max(minScale, 2.1));
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
  }, [cropHeight, cropWidth, imageHeight, imageWidth, isNavigateMode, livePointNorm.x, livePointNorm.y, minScale, safeMaxScale]);

  useEffect(() => {
    if (!isRoutingPlan) return;
    if (!selectedEndId) return;
    const endNode = graph.nodes.find((node) => node.id === selectedEndId);
    if (!endNode || endNode.floor !== activeFloor) return;

    const liveCanonical = {
      x: livePointNorm.x * CANONICAL_IMAGE_WIDTH,
      y: livePointNorm.y * CANONICAL_IMAGE_HEIGHT,
    };
    const distToEnd = distance(liveCanonical, endNode);
    if (distToEnd > DESTINATION_REACHED_THRESHOLD_PX) return;

    stopPathSimulation();
    setSelectedEndId(null);
    setSelectedStartId(null);
    setRouteStartOverrideId(null);
    setRouteNodeIds([]);
    setFloorPaths({});
    if (onRouteComputed) onRouteComputed([]);
    Alert.alert("Destination Reached");
  }, [graph.nodes, isRoutingPlan, livePointNorm.x, livePointNorm.y, onRouteComputed, selectedEndId]);

  useEffect(() => {
    if (!isRoutingPlan) return;
    if (!selectedEndId) return;

    const endNode = graph.nodes.find((node) => node.id === selectedEndId);
    if (!endNode) return;

    const allNodes = graph.nodes;
    const allEdges = weightedEdges;

    // Prefer the live context prediction (always current) over the animation-synced state.
    const liveCanonical = {
      x: livePointNorm.x * CANONICAL_IMAGE_WIDTH,
      y: livePointNorm.y * CANONICAL_IMAGE_HEIGHT,
    };

    const overrideStartNode = routeStartOverrideId
      ? graph.nodes.find((node) => node.id === routeStartOverrideId && node.floor === activeFloor) ?? null
      : null;

    const startFloorNodes = graph.nodes.filter((node) => node.floor === activeFloor);

    let routeNodes = allNodes;
    let routeEdges = allEdges;
    let autoStartId: string | null = null;

    if (overrideStartNode) {
      autoStartId = overrideStartNode.id;
    }

    if (!autoStartId && startFloorNodes.length >= 2) {
      const nodeById = new Map(startFloorNodes.map((node) => [node.id, node]));
      const seen = new Set<string>();
      let best:
        | {
            fromId: string;
            toId: string;
            x: number;
            y: number;
            dist: number;
          }
        | null = null;

      startFloorNodes.forEach((node) => {
        const fromId = node.id;
        const list = (allEdges[fromId] || []).filter((edge) => {
          const target = graph.nodes.find((candidate) => candidate.id === edge.target);
          return target?.floor === activeFloor;
        });
        const from = nodeById.get(fromId);
        if (!from) return;
        list.forEach((edge) => {
          const to = nodeById.get(edge.target);
          if (!to) return;
          const key = edgeKey(fromId, edge.target);
          if (seen.has(key)) return;
          seen.add(key);
          const proj = projectToSegment(liveCanonical, from, to);
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

      if (best) {
        const tempStart: GraphNode = {
          id: TEMP_START_NODE_ID,
          x: Math.round(best.x),
          y: Math.round(best.y),
          floor: activeFloor,
        };

        const from = nodeById.get(best.fromId);
        const to = nodeById.get(best.toId);
        if (from && to) {
          routeNodes = [...allNodes, tempStart];
          routeEdges = {};
          allNodes.forEach((node) => {
            routeEdges[node.id] = [...(allEdges[node.id] || [])];
          });
          routeEdges[TEMP_START_NODE_ID] = [];

          const toFromWeight = Math.max(1, Math.round(distance(tempStart, from)));
          const toToWeight = Math.max(1, Math.round(distance(tempStart, to)));

          routeEdges[TEMP_START_NODE_ID].push({ target: from.id, weight: toFromWeight });
          routeEdges[TEMP_START_NODE_ID].push({ target: to.id, weight: toToWeight });
          routeEdges[from.id] = [...(routeEdges[from.id] || []), { target: TEMP_START_NODE_ID, weight: toFromWeight }];
          routeEdges[to.id] = [...(routeEdges[to.id] || []), { target: TEMP_START_NODE_ID, weight: toToWeight }];

          autoStartId = TEMP_START_NODE_ID;
        }
      }
    }

    if (!autoStartId) {
      autoStartId = nearestNodeId(startFloorNodes, liveCanonical.x, liveCanonical.y);
      if (!autoStartId) autoStartId = startFloorNodes[0]?.id ?? null;
    }
    if (!autoStartId) return;

    const ids = dijkstra(routeNodes, routeEdges, autoStartId, selectedEndId);
    const nodeByRouteId = new Map(routeNodes.map((node) => [node.id, node]));
    const coords = ids
      .map((id) => nodeByRouteId.get(id))
      .filter((node): node is GraphNode => Boolean(node));
    const reportIds = ids.filter((id) => id !== TEMP_START_NODE_ID);

    if (selectedStartId !== autoStartId) setSelectedStartId(autoStartId);
    if (coords.length < 2) {
      if (!isNavigateMode) {
        stopPathSimulation();
      }
      const singleFloorPaths: Record<number, { x: number; y: number }[]> = {};
      if (coords.length) {
        const onlyFloor = coords[0].floor;
        singleFloorPaths[onlyFloor] = coords;
      }
      setFloorPaths(singleFloorPaths);
      setRouteNodeIds(reportIds);
      if (onRouteComputed) onRouteComputed(reportIds);
      return;
    }

    // Group each route node into its own floor's path bucket.
    // Each floor segment therefore ends exactly at the connector node (staircase/elevator)
    // so the polyline on the source floor leads right up to it.
    const nextFloorPaths: Record<number, { x: number; y: number }[]> = {};
    coords.forEach((node) => {
      if (!nextFloorPaths[node.floor]) nextFloorPaths[node.floor] = [];
      nextFloorPaths[node.floor].push({ x: node.x, y: node.y });
    });
    setFloorPaths(nextFloorPaths);
    setRouteNodeIds(reportIds);
    if (!isNavigateMode) {
      const activeFloorCoords = nextFloorPaths[activeFloor] || [];
      if (activeFloorCoords.length >= 2) {
        queuePathSimulation(activeFloorCoords, activeFloor);
      } else {
        stopPathSimulation();
      }
    }
    if (onRouteComputed) onRouteComputed(reportIds);
  }, [
    livePointNorm.x,
    livePointNorm.y,
    isRoutingPlan,
    onRouteComputed,
    selectedEndId,
    selectedStartId,
    routeStartOverrideId,
    graph.nodes,
    weightedEdges,
    activeFloor,
    isNavigateMode,
  ]);

  const transitionToPlan = (planId: keyof typeof PLAN_FLOORS, onSwitched?: () => void) => {
    if (planId === activePlanId) {
      onSwitched?.();
      return;
    }

    Animated.timing(mapOpacity, {
      toValue: 0.2,
      duration: 170,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(() => {
      positioning.setActivePlan(planId);
      onSwitched?.();
      Animated.timing(mapOpacity, {
        toValue: 1,
        duration: 230,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
    });
  };

  const handleNodeSelection = (node: GraphNode) => {
    if (isEditMode) {
      // In edit mode: switch to the node's floor and select it for editing
      const targetPlan = FLOOR_TO_PLAN[node.floor];
      if (targetPlan) {
        transitionToPlan(targetPlan, () => setEditingNodeId(node.id));
      } else {
        setEditingNodeId(node.id);
      }
      return;
    }

    // In routing mode: set the destination and stay on the current floor.
    // If the destination is on another floor, the route will lead to the
    // staircase/elevator first. The transition banner will appear and let
    // the user switch floors when ready.
    setRouteStartOverrideId(null);
    setSelectedEndId(node.id);
  };

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

  const currentPathPoints = floorPaths[activeFloor] || [];
  const renderedPathPoints = currentPathPoints.map(toRenderedPoint);
  const shouldShowNodes = isEditMode || showNodes;

  return (
    <View style={styles.wrapper}>
      <View style={styles.selectorContainer}>
        {devModeEnabled ? (
          <View style={styles.selectorColumn}>
            <Text style={styles.selectorLabel}>Start</Text>
            <Text style={styles.autoStartText}>Auto nearest node: {selectedStartId ?? "N/A"}</Text>
          </View>
        ) : null}

        <View style={styles.selectorColumn}>
          <Text style={styles.selectorLabel}>End (All Floors)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              key="clear-end"
              onPress={() => {
                setSelectedEndId(null);
                setSelectedStartId(null);
                setRouteStartOverrideId(null);
                setRouteNodeIds([]);
                stopPathSimulation();
                setFloorPaths({});
                if (onRouteComputed) onRouteComputed([]);
              }}
              style={[styles.nodeButton, selectedEndId === null && styles.nodeButtonSelected]}>
              <Text style={selectedEndId === null ? styles.nodeButtonTextSelected : styles.nodeButtonText}>Clear</Text>
            </TouchableOpacity>
            {allNodesSorted.map((node) => (
              <TouchableOpacity
                key={`picker-${node.id}`}
                onPress={() => handleNodeSelection(node)}
                style={[
                  styles.nodeButton,
                  node.floor !== activeFloor && styles.nodeButtonMuted,
                  (isEditMode ? editingNodeId === node.id : selectedEndId === node.id) && styles.nodeButtonSelected,
                ]}>
                <Text
                  style={
                    (isEditMode ? editingNodeId === node.id : selectedEndId === node.id)
                      ? styles.nodeButtonTextSelected
                      : styles.nodeButtonText
                  }>
                  {`${FLOOR_LABELS[node.floor] ?? node.floor} ${node.id}`}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>

      <View style={styles.editContainer}>
        {upcomingFloorTransition ? (
          <View style={styles.transitionCard}>
            <Text style={styles.transitionTitle}>Next Floor Transition</Text>
            <Text style={styles.transitionText}>
              {`${upcomingFloorTransition.connector}: ${upcomingFloorTransition.fromId} (${FLOOR_LABELS[upcomingFloorTransition.fromFloor] ?? upcomingFloorTransition.fromFloor}) -> ${upcomingFloorTransition.toId} (${FLOOR_LABELS[upcomingFloorTransition.toFloor] ?? upcomingFloorTransition.toFloor})`}
            </Text>
            <TouchableOpacity
              style={styles.transitionBtn}
              onPress={() => {
                transitionToRouteFloor(upcomingFloorTransition);
              }}>
              <Text style={styles.transitionBtnText}>
                {`Show ${FLOOR_LABELS[upcomingFloorTransition.toFloor] ?? upcomingFloorTransition.toFloor} Floor Segment`}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {devModeEnabled ? (
          <TouchableOpacity
            style={[styles.editToggleButton, shouldShowNodes && styles.editToggleButtonActive]}
            onPress={() => setShowNodes((prev) => !prev)}>
            <Text style={shouldShowNodes ? styles.editToggleTextActive : styles.editToggleText}>
              {shouldShowNodes ? "Nodes: ON" : "Nodes: OFF"}
            </Text>
          </TouchableOpacity>
        ) : null}

        {devModeEnabled ? (
          <TouchableOpacity
            style={[styles.editToggleButton, isEditMode && styles.editToggleButtonActive]}
            onPress={toggleEditMode}>
            <Text style={isEditMode ? styles.editToggleTextActive : styles.editToggleText}>
              {isEditMode ? "Node Edit: ON" : "Node Edit: OFF"}
            </Text>
          </TouchableOpacity>
        ) : null}

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
              {nodesOnCurrentFloor.length === 0 ? (
                <TouchableOpacity style={styles.editActionBtn} onPress={addSeedNodeAtLivePosition}>
                  <Text style={styles.editActionText}>Add First Node</Text>
                </TouchableOpacity>
              ) : null}
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
              <TouchableOpacity style={styles.editActionBtn} onPress={() => void shareCurrentFloorGraph()}>
                <Text style={styles.editActionText}>Share Graph</Text>
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

      <Animated.View style={{ opacity: mapOpacity }}>
        <ImageZoom
          ref={imageZoomRef}
          cropWidth={cropWidth}
          cropHeight={cropHeight}
          imageWidth={imageWidth}
          imageHeight={imageHeight}
          minScale={minScale}
          maxScale={safeMaxScale}
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
              source={activeImage}
              style={{ width: imageWidth, height: imageHeight }}
              contentFit="contain"
              contentPosition="center"
              allowDownscaling={false}
              transition={0}
            />

          <Svg width={imageWidth} height={imageHeight} style={StyleSheet.absoluteFillObject}>
            {isRoutingPlan && renderedPathPoints.length > 1 && (
              <Polyline
                points={renderedPathPoints.map((point) => `${point.x},${point.y}`).join(" ")}
                fill="none"
                stroke="red"
                strokeWidth={4}
              />
            )}

            {isRoutingPlan && shouldShowNodes
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

            {isRoutingPlan && isSimulating && simulatedFloor === activeFloor && (() => {
              const active = locationAnims.current[activeFloor];
              if (!active) return null;
              return <AnimatedCircle cx={active.x} cy={active.y} r={simDotRadius} fill="dodgerblue" />;
            })()}

            <AnimatedCircle
              cx={liveAnim.x}
              cy={liveAnim.y}
              r={liveDotRadius}
              fill="#2563eb"
              stroke="#ffffff"
              strokeWidth={liveDotStrokeWidth}
            />

            {isRoutingPlan && Object.entries(edgesOnCurrentFloor).map(([fromId, edgeList]) =>
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

            {isRoutingPlan && selectedEndNodeOnCurrentFloor ? (
              <G>
                <Circle
                  cx={selectedEndNodeOnCurrentFloor.x * scaleX}
                  cy={selectedEndNodeOnCurrentFloor.y * scaleY}
                  r={destinationMarkerOuterRadius}
                  fill="none"
                  stroke="#dc2626"
                  strokeWidth={destinationMarkerStrokeWidth}
                />
                <Circle
                  cx={selectedEndNodeOnCurrentFloor.x * scaleX}
                  cy={selectedEndNodeOnCurrentFloor.y * scaleY}
                  r={destinationMarkerInnerRadius}
                  fill="rgba(220, 38, 38, 0.35)"
                  stroke="#ffffff"
                  strokeWidth={Math.max(1, destinationMarkerStrokeWidth * 0.8)}
                />
              </G>
            ) : null}
            </Svg>
          </View>
        </ImageZoom>
      </Animated.View>
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
  transitionCard: {
    borderWidth: 1,
    borderColor: "#bfdbfe",
    backgroundColor: "#eff6ff",
    borderRadius: 10,
    padding: 10,
    gap: 6,
  },
  transitionTitle: {
    color: "#1e3a8a",
    fontWeight: "800",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  transitionText: {
    color: "#1f2937",
    fontWeight: "600",
  },
  transitionBtn: {
    alignSelf: "flex-start",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1d4ed8",
    backgroundColor: "#dbeafe",
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  transitionBtnText: {
    color: "#1e3a8a",
    fontWeight: "700",
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
  nodeButtonMuted: {
    opacity: 0.75,
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
