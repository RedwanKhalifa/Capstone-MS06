import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Button,
  Dimensions,
  Easing,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import ImageZoom from "react-native-image-pan-zoom";
import Svg, { Circle, G, Polyline, Text as SvgText } from "react-native-svg";

/* =======================
   TYPES
======================= */
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

const FLOOR_TRANSITIONS: Edge[] = [
  { target: "N1", weight: 8 },
];

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/* =======================
   DIJKSTRA (SAFE)
======================= */
function dijkstra(
  nodes: GraphNode[],
  edges: Record<string, Edge[]>,
  startId: string,
  endId: string,
): string[] {
  const distances: Record<string, number> = {};
  const prev: Record<string, string | null> = {};
  const unvisited = new Set(nodes.map((n) => n.id));

  nodes.forEach((n) => {
    distances[n.id] = Infinity;
    prev[n.id] = null;
  });

  distances[startId] = 0;

  while (unvisited.size > 0) {
    let current = Array.from(unvisited).reduce((a, b) =>
      distances[a] < distances[b] ? a : b,
    );

    if (distances[current] === Infinity) break;
    unvisited.delete(current);

    if (current === endId) break;

    (edges[current] || []).forEach(({ target, weight }) => {
      const alt = distances[current] + weight;
      if (alt < distances[target]) {
        distances[target] = alt;
        prev[target] = current;
      }
    });
  }

  const path: string[] = [];
  let u: string | null = endId;

  while (u) {
    path.unshift(u);
    u = prev[u];
  }

  if (path[0] !== startId) {
    return [];
  }

  return path;
}

/* =======================
   COMPONENT
======================= */
export default function CampusMap() {
  const [accessibilityMode, setAccessibilityMode] = useState(false);
  const [floorPaths, setFloorPaths] = useState<
    Record<number, { x: number; y: number }[]>
  >({});
  const [isLoading, setIsLoading] = useState(false);
  const [currentFloor, setCurrentFloor] = useState(1);
  const [isSimulating, setIsSimulating] = useState(false);

  const imageZoomRef = useRef<any>(null);
  // Per-floor animated location values to avoid cross-floor artifacts
  const locationAnims = useRef<Record<number, Animated.ValueXY>>({});
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Which floor the current simulation belongs to (so we only render the
  // animated dot on the active floor) and a ref to the running animation
  // so it can be stopped when changing floors.
  const [simulatedFloor, setSimulatedFloor] = useState<number | null>(null);
  const animationRef = useRef<any>(null);

  const imageWidth = 800;
  const imageHeight = 600;

  const scaleToFit = Math.min(
    screenWidth / imageWidth,
    screenHeight / imageHeight,
  );

  /* =======================
     MARKERS
  ======================= */
  // Temporarily remove markers for floors 1 and 2 to avoid clutter.
  // Previous coordinates kept for reference.
  // const floor1Markers = [
  //   { x: 200, y: 420 },
  //   { x: 125, y: 390 },
  // ];
  const floor1Markers: { x: number; y: number }[] = [];

  // const floor2Markers = [
  //   { x: 105, y: 350 },
  //   { x: 370, y: 425 },
  // ];
  const floor2Markers: { x: number; y: number }[] = [];

  const floor4Markers = [
    { x: 150, y: 300 },
    { x: 400, y: 320 },
  ];

  /* =======================
     GRAPH DATA (FLOOR 4)
  ======================= */
  const allNodes: GraphNode[] = [
    // --- Third floor nodes ---
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

  const edges: Record<string, Edge[]> = {
    // --- Third floor edges ---
    "3N1": [
      { target: "3N2", weight: 50},
      { target: "3N5", weight: 20 },
    ],
    "3N2": [
      { target: "3N1", weight: 50 },
      { target: "3N3", weight: 27 },
    ],
    "3N3": [
      { target: "3N2", weight: 27 },
      { target: "3N4", weight: 5 },
      { target: "3N7", weight: 3 },
    ],
    "3N4": [
      { target: "3N3", weight: 5 },
      { target: "3N7", weight: 2 },
      ...FLOOR_TRANSITIONS,
    ],
    "3N5": [
      { target: "3N6", weight: 30 },
      { target: "3N1", weight: 20 },
    ],
    "3N6": [
      { target: "3N5", weight: 30 },
      { target: "3N8", weight: 50 },
    ],
    "3N7": [
      { target: "3N4", weight: 2 },
      { target: "3N8", weight: 20 },
      { target: "3N3", weight: 3 },
    ],
    "3N8": [
      { target: "3N7", weight: 20 },
      { target: "3N6", weight: 50 },
    ],
    N1: [
      { target: "N2", weight: 12 },
      { target: "N12", weight: 10 },
      { target: "3N4", weight: 8 },
    ],
    N2: [
      { target: "N1", weight: 12 },
      { target: "N3", weight: 110 },
    ],
    N3: [
      { target: "N2", weight: 110 },
      { target: "N4", weight: 25 },
      { target: "N9", weight: 20 },
    ],
    N4: [
      { target: "N3", weight: 25 },
      { target: "N5", weight: 2 },
    ],
    N5: [
      { target: "N4", weight: 2 },
      { target: "N6", weight: 10 },
      { target: "N8", weight: 5 },
    ],
    N6: [
      { target: "N5", weight: 10 },
      { target: "N7", weight: 5 },
    ],
    N7: [
      { target: "N6", weight: 5 },
      { target: "N8", weight: 10 },
      { target: "N9", weight: 2 },
    ],
    N8: [
      { target: "N5", weight: 5 },
      { target: "N7", weight: 10 },
    ],
    N9: [
      { target: "N3", weight: 20 },
      { target: "N7", weight: 2 },
      { target: "N10", weight: 5 },
    ],
    N10: [
      { target: "N9", weight: 5 },
      { target: "N11", weight: 15 },
    ],
    N11: [
      { target: "N10", weight: 15 },
      { target: "N12", weight: 100 },
    ],
    N12: [
      { target: "N11", weight: 100 },
      { target: "N1", weight: 10 },
    ],
  };

  const nodesOnCurrentFloor = allNodes.filter((n) => n.floor === currentFloor);

  const edgesOnCurrentFloor: Record<string, Edge[]> = {};
  nodesOnCurrentFloor.forEach((n) => {
    edgesOnCurrentFloor[n.id] = (edges[n.id] || []).filter((e) =>
      nodesOnCurrentFloor.some((x) => x.id === e.target),
    );
  });

  const stopSimulation = (clearPaths = false) => {
    if (animationRef.current) {
      try {
        animationRef.current.stop();
      } catch (e) {
        // ignore
      }
      animationRef.current = null;
    }

    setIsSimulating(false);
    setSimulatedFloor(null);

    if (clearPaths) {
      setFloorPaths({});
    }
  };

  /* =======================
     ANIMATION
  ======================= */
  const animateFloorSegment = (
    points: { x: number; y: number }[],
    floor: number,
    onComplete?: () => void,
  ) => {
    // Ensure an Animated.ValueXY exists for this floor
    let anim = locationAnims.current[floor];
    if (!anim) {
      anim = new Animated.ValueXY({ x: points[0].x, y: points[0].y });
      locationAnims.current[floor] = anim;
    } else {
      anim.setValue(points[0]);
    }

    setIsSimulating(true);
    setSimulatedFloor(floor);

    if (points.length < 2) {
      animationRef.current = null;
      onComplete?.();
      return;
    }

    const anims = points.slice(1).map((p) =>
      Animated.timing(anim as any, {
        toValue: p,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: false,
      }),
    );

    animationRef.current = Animated.sequence(anims);
    animationRef.current.start(() => {
      animationRef.current = null;
      onComplete?.();
    });
  };

  const traverseMultiFloorPath = (
    segments: { floor: number; points: { x: number; y: number }[] }[],
  ) => {
    if (segments.length === 0) return;

    stopSimulation();

    const runSegment = (index: number) => {
      const segment = segments[index];
      if (!segment) {
        setIsSimulating(false);
        setSimulatedFloor(null);
        return;
      }

      setCurrentFloor(segment.floor);
      animateFloorSegment(segment.points, segment.floor, () => {
        const nextSegment = segments[index + 1];
        if (!nextSegment) {
          setIsSimulating(false);
          setSimulatedFloor(null);
          return;
        }

        setCurrentFloor(nextSegment.floor);
        setTimeout(() => runSegment(index + 1), 350);
      });
    };

    runSegment(0);
  };

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.5,
          duration: 800,
          useNativeDriver: false,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: false,
        }),
      ]),
    ).start();
  }, []);

  // Stop any running simulation when the user switches to a different floor
  // to avoid artifacts from a previous-floor animation being shown.
  useEffect(() => {
    if (animationRef.current && simulatedFloor !== null && simulatedFloor !== currentFloor) {
      stopSimulation();
      // Clear the animated value for the previously-simulated floor
      const prevAnim = locationAnims.current[simulatedFloor];
      if (prevAnim && typeof prevAnim.setValue === "function") {
        try {
          prevAnim.setValue({ x: 0, y: 0 });
        } catch (e) {
          // ignore
        }
      }
    }
  }, [currentFloor, simulatedFloor]);

  const [selectedStartId, setSelectedStartId] = useState<string | null>("N1");
  const [selectedEndId, setSelectedEndId] = useState<string | null>("N11");

  /* =======================
     RUN DIJKSTRA
  ======================= */
  const runDijkstra = (startId?: string, endId?: string) => {
    const start = startId ?? selectedStartId;
    const end = endId ?? selectedEndId;

    if (!start || !end) {
      Alert.alert("Select start and end nodes");
      return;
    }

    const startNode = allNodes.find((n) => n.id === start);
    const endNode = allNodes.find((n) => n.id === end);

    if (!startNode || !endNode) {
      Alert.alert("Invalid node IDs");
      return;
    }

    const ids = dijkstra(allNodes, edges, start, end);

    console.log("Dijkstra path IDs:", ids);

    if (ids.length < 2) {
      stopSimulation(true);
      Alert.alert("No route found.");
      return;
    }

    const pathNodes = ids
      .map((id) => allNodes.find((n) => n.id === id))
      .filter((n): n is GraphNode => n !== undefined);

    if (pathNodes.length < 2) return;

    const nextFloorPaths = pathNodes.reduce<Record<number, { x: number; y: number }[]>>(
      (acc, node) => {
        if (!acc[node.floor]) {
          acc[node.floor] = [];
        }
        acc[node.floor].push({ x: node.x, y: node.y });
        return acc;
      },
      {},
    );

    const segments = pathNodes.reduce<
      { floor: number; points: { x: number; y: number }[] }[]
    >((acc, node) => {
      const point = { x: node.x, y: node.y };
      const lastSegment = acc[acc.length - 1];

      if (!lastSegment || lastSegment.floor !== node.floor) {
        acc.push({ floor: node.floor, points: [point] });
      } else {
        lastSegment.points.push(point);
      }

      return acc;
    }, []);

    setFloorPaths(nextFloorPaths);
    setCurrentFloor(startNode.floor);
    traverseMultiFloorPath(segments);

    if (startNode.floor !== endNode.floor) {
      Alert.alert(
        "Floor transition",
        `Route includes a floor change from ${startNode.floor} to ${endNode.floor} using 3N4 -> N1.`,
      );
    }
  };

  // Only show markers for floor 4; disable markers for floors 1 and 2.
  const markers = currentFloor === 4 ? floor4Markers : [];
  // Toggle to hide all markers regardless of floor (useful while debugging).
  const showMarkers = false;

  const currentPathPoints = floorPaths[currentFloor] || [];
  const selectorNodes = allNodes;

  /* =======================
     RENDER
  ======================= */
  return (
    <View style={{ flex: 1 }}>
      <View style={styles.selectorContainer}>
        <View style={styles.selectorColumn}>
          <Text style={styles.selectorLabel}>Start</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {selectorNodes.map((n) => (
              <TouchableOpacity
                key={n.id}
                onPress={() => {
                  stopSimulation(true);
                  setSelectedStartId(n.id);
                }}
                style={[
                  styles.nodeButton,
                  selectedStartId === n.id && styles.nodeButtonSelected,
                ]}
              >
                <Text
                  style={
                    selectedStartId === n.id
                      ? styles.nodeButtonTextSelected
                      : styles.nodeButtonText
                  }
                >
                  {n.id}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.selectorColumn}>
          <Text style={styles.selectorLabel}>End</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {selectorNodes.map((n) => (
              <TouchableOpacity
                key={n.id}
                onPress={() => {
                  stopSimulation(true);
                  setSelectedEndId(n.id);
                }}
                style={[
                  styles.nodeButton,
                  selectedEndId === n.id && styles.nodeButtonSelected,
                ]}
              >
                <Text
                  style={
                    selectedEndId === n.id
                      ? styles.nodeButtonTextSelected
                      : styles.nodeButtonText
                  }
                >
                  {n.id}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.findButton}>
          <Button title="Find Route" onPress={() => runDijkstra()} />
        </View>
      </View>

      <View style={styles.floorButtons}>
        <Button title="1st Floor" onPress={() => {
          stopSimulation(true);
          setCurrentFloor(1);
        }} />
        <Button title="2nd Floor" onPress={() => {
          stopSimulation(true);
          setCurrentFloor(2);
        }} />
        <Button title="3rd Floor" onPress={() => {
          stopSimulation(true);
          setCurrentFloor(3);
        }} />
        <Button title="4th Floor" onPress={() => {
          stopSimulation(true);
          setCurrentFloor(4);
        }} />
      </View>

      <ImageZoom
        ref={imageZoomRef}
        cropWidth={screenWidth}
        cropHeight={screenHeight}
        imageWidth={imageWidth}
        imageHeight={imageHeight}
        minScale={scaleToFit}
        maxScale={3}
      >
        <View>
          <Image
            source={
              currentFloor === 1
                ? require("../../assets/images/CampusMapEng1stFloor.png")
                : currentFloor === 2
                  ? require("../../assets/images/CampusMapEng2ndFloor.png")
                  : currentFloor === 3
                    ? require("../../assets/images/CampusMapEng3rdFloor.png")
                    : require("../../assets/images/CampusMapEng4thFloor.png")
            }
            style={{ width: imageWidth, height: imageHeight }}
          />

          <Svg
            width={imageWidth}
            height={imageHeight}
            style={{ position: "absolute" }}
          >
            {/* Path */}
            {currentPathPoints.length > 1 && (
              <Polyline
                points={currentPathPoints.map((p) => `${p.x},${p.y}`).join(" ")}
                fill="none"
                stroke="red"
                strokeWidth={4}
              />
            )}

            {/* Nodes */}
            {nodesOnCurrentFloor.map((n) => (
              <G key={n.id}>
                <Circle
                  cx={n.x}
                  cy={n.y}
                  r={5}
                  fill={
                    n.id === selectedStartId
                      ? "blue"
                      : n.id === selectedEndId
                        ? "red"
                        : "purple"
                  }
                />

                <SvgText
                  x={n.x + 12}
                  y={n.y - 8}
                  fontSize={12}
                  fill={
                    n.id === selectedStartId
                      ? "blue"
                      : n.id === selectedEndId
                        ? "red"
                        : "green"
                  }
                  fontWeight={
                    n.id === selectedStartId || n.id === selectedEndId
                      ? "700"
                      : "400"
                  }
                >
                  {n.id}
                </SvgText>
              </G>
            ))}

            {/* Markers (hidden while debugging) */}
            {showMarkers && markers.map((m, i) => (
              <Circle key={i} cx={m.x} cy={m.y} r={10} fill="blue" />
            ))}

            {/* Animated dot (render only when simulation belongs to active floor) */}
            {isSimulating && simulatedFloor === currentFloor && (() => {
              const active = locationAnims.current[currentFloor];
              if (!active) return null;
              return (
                <AnimatedCircle
                  cx={active.x}
                  cy={active.y}
                  r={12}
                  fill="dodgerblue"
                />
              );
            })()}

            {Object.entries(edgesOnCurrentFloor).map(([fromId, edgeList]) =>
              edgeList.map((e, i) => {
                const from = nodesOnCurrentFloor.find((n) => n.id === fromId);
                const to = nodesOnCurrentFloor.find((n) => n.id === e.target);
                if (!from || !to) return null;

                return (
                  <Polyline
                    key={`${fromId}-${i}`}
                    points={`${from.x},${from.y} ${to.x},${to.y}`}
                    stroke="green"
                    strokeWidth={2}
                    strokeDasharray="4,4"
                  />
                );
              }),
            )}
          </Svg>

        </View>
      </ImageZoom>
    </View>
  );
}

/* =======================
   STYLES
======================= */
const styles = StyleSheet.create({
  floorButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 40,
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
  findButton: {
    justifyContent: "center",
    marginLeft: 8,
  },
});
