import { usePositioning } from "@/context/positioning";
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

type GraphNode = {
  id: string;
  x: number;
  y: number;
  floor: number;
};

type Edge = {
  target: string;
  weight: number;
};

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

const ROOM_TO_NODE: Record<string, string> = {
  ENG103: "N12",
  LIB072: "N2",
  ENG: "N3",
};

const FLOOR_4_IMAGE = require("../../assets/images/eng4_north.png");

const ALL_NODES: GraphNode[] = [
  { id: "3N1", x: 455, y: 180, floor: 3 },
  { id: "3N2", x: 730, y: 180, floor: 3 },
  { id: "3N3", x: 730, y: 275, floor: 3 },
  { id: "3N4", x: 710, y: 300, floor: 3 },
  { id: "3N5", x: 450, y: 270, floor: 3 },
  { id: "3N6", x: 455, y: 410, floor: 3 },
  { id: "3N7", x: 730, y: 300, floor: 3 },
  { id: "3N8", x: 730, y: 410, floor: 3 },
  { id: "N1", x: 700, y: 295, floor: 4 },
  { id: "N2", x: 700, y: 195, floor: 4 },
  { id: "N3", x: 460, y: 195, floor: 4 },
  { id: "N4", x: 350, y: 195, floor: 4 },
  { id: "N5", x: 350, y: 215, floor: 4 },
  { id: "N6", x: 425, y: 215, floor: 4 },
  { id: "N7", x: 425, y: 260, floor: 4 },
  { id: "N8", x: 350, y: 260, floor: 4 },
  { id: "N9", x: 455, y: 260, floor: 4 },
  { id: "N10", x: 455, y: 280, floor: 4 },
  { id: "N11", x: 480, y: 385, floor: 4 },
  { id: "N12", x: 695, y: 385, floor: 4 },
];

const EDGES: Record<string, Edge[]> = {
  "3N1": [{ target: "3N2", weight: 50 }, { target: "3N5", weight: 20 }],
  "3N2": [{ target: "3N1", weight: 50 }, { target: "3N3", weight: 27 }],
  "3N3": [{ target: "3N2", weight: 27 }, { target: "3N4", weight: 5 }, { target: "3N7", weight: 3 }],
  "3N4": [{ target: "3N3", weight: 5 }, { target: "3N7", weight: 2 }],
  "3N5": [{ target: "3N6", weight: 30 }, { target: "3N1", weight: 20 }],
  "3N6": [{ target: "3N5", weight: 30 }, { target: "3N8", weight: 50 }],
  "3N7": [{ target: "3N4", weight: 2 }, { target: "3N8", weight: 20 }, { target: "3N3", weight: 3 }],
  "3N8": [{ target: "3N7", weight: 20 }, { target: "3N6", weight: 50 }],
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

  const [floorPaths, setFloorPaths] = useState<Record<number, { x: number; y: number }[]>>({});
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulatedFloor, setSimulatedFloor] = useState<number | null>(null);
  const [selectedStartId, setSelectedStartId] = useState<string | null>(null);
  const [selectedEndId, setSelectedEndId] = useState<string | null>("N11");

  const imageZoomRef = useRef<any>(null);
  const locationAnims = useRef<Record<number, Animated.ValueXY>>({});
  const liveAnim = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const animationRef = useRef<any>(null);
  const [livePointNorm, setLivePointNorm] = useState({ x: 0.5, y: 0.5 });
  const cropWidth = screenWidth - 40;
  const cropHeight = 420;
  // Cover-based min scale prevents immediate snap-back when panning.
  const minScale = Math.max(cropWidth / imageWidth, cropHeight / imageHeight);

  const toRenderedPoint = (point: { x: number; y: number }) => ({
    x: point.x * scaleX,
    y: point.y * scaleY,
  });

  const nodesOnCurrentFloor = useMemo(
    () => ALL_NODES.filter((node) => node.floor === NAV_FLOOR),
    []
  );

  const edgesOnCurrentFloor = useMemo(() => {
    const next: Record<string, Edge[]> = {};
    nodesOnCurrentFloor.forEach((node) => {
      next[node.id] = (EDGES[node.id] || []).filter((edge) =>
        nodesOnCurrentFloor.some((candidate) => candidate.id === edge.target)
      );
    });
    return next;
  }, [nodesOnCurrentFloor]);

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

    const endNode = ALL_NODES.find((node) => node.id === mappedEnd);
    if (!endNode || endNode.floor !== NAV_FLOOR) return;

    setSelectedEndId(mappedEnd);
  }, [destination]);

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
    if (!selectedEndId) return;

    const endNode = ALL_NODES.find((node) => node.id === selectedEndId);
    if (!endNode) return;

    const floorNodes = ALL_NODES.filter((node) => node.floor === endNode.floor);
    const floorEdges: Record<string, Edge[]> = {};

    floorNodes.forEach((node) => {
      floorEdges[node.id] = (EDGES[node.id] || []).filter((edge) =>
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
  }, [livePointNorm.x, livePointNorm.y, onRouteComputed, selectedEndId, selectedStartId]);

  const runDijkstra = (endId?: string) => {
    const end = endId ?? selectedEndId;

    if (!end) {
      Alert.alert("Select an end node");
      return;
    }

    const endNode = ALL_NODES.find((node) => node.id === end);
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

  const currentPathPoints = floorPaths[NAV_FLOOR] || [];
  const renderedPathPoints = currentPathPoints.map(toRenderedPoint);

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
                onPress={() => setSelectedEndId(node.id)}
                style={[
                  styles.nodeButton,
                  selectedEndId === node.id && styles.nodeButtonSelected,
                ]}>
                <Text
                  style={
                    selectedEndId === node.id
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

      <ImageZoom
        ref={imageZoomRef}
        cropWidth={cropWidth}
        cropHeight={cropHeight}
        imageWidth={imageWidth}
        imageHeight={imageHeight}
        minScale={minScale}
        maxScale={3}
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

            {nodesOnCurrentFloor.map((node) => (
              <G key={node.id}>
                <Circle
                  cx={node.x * scaleX}
                  cy={node.y * scaleY}
                  r={5}
                  fill={
                    node.id === selectedStartId
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
                  fill={
                    node.id === selectedStartId
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
            ))}

            {isSimulating && simulatedFloor === NAV_FLOOR && (() => {
              const active = locationAnims.current[NAV_FLOOR];
              if (!active) return null;
              return <AnimatedCircle cx={active.x} cy={active.y} r={12} fill="dodgerblue" />;
            })()}

            {NAV_FLOOR === 4 ? (
              <AnimatedCircle cx={liveAnim.x} cy={liveAnim.y} r={11} fill="#2563eb" stroke="#ffffff" strokeWidth={3} />
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
                    stroke="green"
                    strokeWidth={2}
                    strokeDasharray="4,4"
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
