import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line, Path, Polygon, Polyline, Rect, Text as SvgText } from "react-native-svg";

import { IconSymbol } from "../../components/ui/icon-symbol";
import {
  DESTINATION_ROOMS,
  DEMO_ROOMS,
  NAVIGATION_START_ROOM_ID,
  type DemoFloor,
  type DemoRoom,
  getNavigationDemoRoute,
} from "../../services/navigation-demo";

const FRAME_INTERVAL_MS = 120;
const FLOOR_HEIGHT = 22;
const ROOM_HEIGHT = 10;
const ISO_X = 1.55;
const ISO_Y = 0.9;
const BASE_X = 176;
const BASE_Y = 186;

type IsoPoint = {
  x: number;
  y: number;
};

function shadeHex(hex: string, amount: number) {
  const normalized = hex.replace("#", "");
  const raw = normalized.length === 3
    ? normalized
        .split("")
        .map((char) => `${char}${char}`)
        .join("")
    : normalized;

  const value = Number.parseInt(raw, 16);
  const clamp = (channel: number) => Math.max(0, Math.min(255, channel + amount));
  const red = clamp((value >> 16) & 0xff);
  const green = clamp((value >> 8) & 0xff);
  const blue = clamp(value & 0xff);

  return `#${[red, green, blue].map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

function projectPoint(x: number, y: number, z: number): IsoPoint {
  return {
    x: BASE_X + (x - y) * ISO_X,
    y: BASE_Y + (x + y) * ISO_Y - z,
  };
}

function polygonString(points: IsoPoint[]) {
  return points.map((point) => `${point.x},${point.y}`).join(" ");
}

function levelZ(floor: DemoFloor) {
  return floor === 1 ? FLOOR_HEIGHT : FLOOR_HEIGHT * 2;
}

function extrudeBox(
  x: number,
  y: number,
  width: number,
  depth: number,
  bottomZ: number,
  height: number
) {
  const frontLeftBottom = projectPoint(x, y + depth, bottomZ);
  const frontRightBottom = projectPoint(x + width, y + depth, bottomZ);
  const backRightBottom = projectPoint(x + width, y, bottomZ);
  const backLeftBottom = projectPoint(x, y, bottomZ);

  const frontLeftTop = projectPoint(x, y + depth, bottomZ + height);
  const frontRightTop = projectPoint(x + width, y + depth, bottomZ + height);
  const backRightTop = projectPoint(x + width, y, bottomZ + height);
  const backLeftTop = projectPoint(x, y, bottomZ + height);

  return {
    top: [frontLeftTop, frontRightTop, backRightTop, backLeftTop],
    left: [frontLeftBottom, frontLeftTop, backLeftTop, backLeftBottom],
    right: [frontRightBottom, frontRightTop, backRightTop, backRightBottom],
    front: [frontLeftBottom, frontRightBottom, frontRightTop, frontLeftTop],
  };
}

function drawTree(x: number, y: number, key: string) {
  const trunkTop = projectPoint(x, y, 3);
  const canopy = projectPoint(x, y, 9);

  return (
    <React.Fragment key={key}>
      <Line x1={trunkTop.x} y1={trunkTop.y} x2={trunkTop.x} y2={trunkTop.y + 8} stroke="#8b6a4f" strokeWidth={2.2} />
      <Circle cx={canopy.x} cy={canopy.y} r={5.3} fill="#96c67d" />
      <Circle cx={canopy.x - 4} cy={canopy.y + 2} r={3.2} fill="#82b56b" />
      <Circle cx={canopy.x + 4} cy={canopy.y + 1} r={3.4} fill="#a5d28d" />
    </React.Fragment>
  );
}

function renderRoomBlock(room: DemoRoom, isDestination: boolean, isStart: boolean) {
  const bottomZ = levelZ(room.floor);
  const block = extrudeBox(room.x, room.y, room.width, room.height, bottomZ, ROOM_HEIGHT);
  const roofColor = isDestination ? "#ffd166" : isStart ? "#b8f2e6" : shadeHex(room.color, 20);
  const leftColor = shadeHex(room.color, -14);
  const rightColor = shadeHex(room.color, -34);
  const textPoint = projectPoint(room.x + room.width / 2, room.y + room.height / 2, bottomZ + ROOM_HEIGHT + 2);

  return (
    <React.Fragment key={room.id}>
      <Polygon points={polygonString(block.left)} fill={leftColor} />
      <Polygon points={polygonString(block.right)} fill={rightColor} />
      <Polygon points={polygonString(block.top)} fill={roofColor} stroke="#31406d" strokeWidth={1.2} />
      {room.kind === "stairs" && (
        <>
          <Line x1={textPoint.x - 8} y1={textPoint.y + 2} x2={textPoint.x + 8} y2={textPoint.y - 2} stroke="#31406d" strokeWidth={1.5} />
          <Line x1={textPoint.x - 6} y1={textPoint.y + 5} x2={textPoint.x + 10} y2={textPoint.y + 1} stroke="#31406d" strokeWidth={1.5} />
          <Line x1={textPoint.x - 4} y1={textPoint.y + 8} x2={textPoint.x + 12} y2={textPoint.y + 4} stroke="#31406d" strokeWidth={1.5} />
        </>
      )}
      <SvgText x={textPoint.x} y={textPoint.y} fontSize={10} fontWeight="700" fill="#10204b" textAnchor="middle">
        {room.label}
      </SvgText>
    </React.Fragment>
  );
}

function renderFloorPlate(floor: DemoFloor) {
  const z = levelZ(floor) - 2;
  const plate = extrudeBox(2, 6, 92, 72, z, 3);
  const topColor = floor === 1 ? "#edf1ff" : "#f7f9ff";
  const leftColor = floor === 1 ? "#d2daf8" : "#d9e0fb";
  const rightColor = floor === 1 ? "#bcc8ed" : "#c9d3f6";

  return (
    <React.Fragment key={`plate-${floor}`}>
      <Polygon points={polygonString(plate.left)} fill={leftColor} />
      <Polygon points={polygonString(plate.right)} fill={rightColor} />
      <Polygon points={polygonString(plate.top)} fill={topColor} stroke="#c2ccef" strokeWidth={1.1} />
    </React.Fragment>
  );
}

function routePolylinePath(points: { x: number; y: number; floor: DemoFloor }[]) {
  return points
    .map((point) => {
      const projected = projectPoint(point.x, point.y, levelZ(point.floor) + ROOM_HEIGHT + 2.5);
      return `${projected.x},${projected.y}`;
    })
    .join(" ");
}

function activeMarker(point?: { x: number; y: number; floor: DemoFloor }) {
  if (!point) {
    return null;
  }

  const base = projectPoint(point.x, point.y, levelZ(point.floor) + ROOM_HEIGHT + 4);
  return (
    <>
      <Circle cx={base.x} cy={base.y} r={7.5} fill="rgba(37,99,235,0.18)" />
      <Circle cx={base.x} cy={base.y} r={4.8} fill="#ef4444" stroke="#ffffff" strokeWidth={2.2} />
    </>
  );
}

function campusRoadPath(startX: number, startY: number, endX: number, endY: number, width: number) {
  const s1 = projectPoint(startX, startY, 0);
  const s2 = projectPoint(startX + width, startY, 0);
  const e1 = projectPoint(endX, endY, 0);
  const e2 = projectPoint(endX + width, endY, 0);
  return polygonString([s1, s2, e2, e1]);
}

function IsometricBuildingScene({
  destinationId,
  currentPoint,
  routePoints,
}: {
  destinationId: string;
  currentPoint?: { x: number; y: number; floor: DemoFloor };
  routePoints: { x: number; y: number; floor: DemoFloor }[];
}) {
  const destinationRoom = DEMO_ROOMS.find((room) => room.id === destinationId);

  return (
    <View style={styles.sceneCard}>
      <Svg viewBox="0 0 360 300" style={styles.sceneSvg}>
        <Rect x={0} y={0} width={360} height={300} fill="#f7f8fb" />
        <Polygon points={campusRoadPath(-18, 36, 120, 36, 14)} fill="#cfd6df" />
        <Polygon points={campusRoadPath(12, -8, 12, 126, 14)} fill="#cfd6df" />
        <Polygon points={campusRoadPath(56, -14, 56, 128, 12)} fill="#d8dde6" />

        <Path d="M 30 196 L 88 226" stroke="#ffffff" strokeWidth={2.2} strokeDasharray="6 6" />
        <Path d="M 72 132 L 130 162" stroke="#ffffff" strokeWidth={2.2} strokeDasharray="6 6" />
        <Path d="M 204 64 L 262 94" stroke="#ffffff" strokeWidth={2.2} strokeDasharray="6 6" />

        {[
          drawTree(14, 12, "t-1"),
          drawTree(24, 18, "t-2"),
          drawTree(86, 18, "t-3"),
          drawTree(100, 28, "t-4"),
          drawTree(14, 88, "t-5"),
          drawTree(28, 92, "t-6"),
          drawTree(110, 82, "t-7"),
          drawTree(118, 94, "t-8"),
        ]}

        <Polygon
          points={polygonString([
            projectPoint(0, 0, 0),
            projectPoint(104, 0, 0),
            projectPoint(104, 86, 0),
            projectPoint(0, 86, 0),
          ])}
          fill="#d9efc2"
        />

        {renderFloorPlate(1)}
        {renderFloorPlate(2)}

        <Polygon
          points={polygonString(extrudeBox(72, 34, 12, 24, levelZ(1), FLOOR_HEIGHT + 12).right)}
          fill="#c76d6d"
        />
        <Polygon
          points={polygonString(extrudeBox(72, 34, 12, 24, levelZ(1), FLOOR_HEIGHT + 12).left)}
          fill="#d98989"
        />
        <Polygon
          points={polygonString(extrudeBox(72, 34, 12, 24, levelZ(1), FLOOR_HEIGHT + 12).top)}
          fill="#f2a6a6"
          stroke="#7c3f3f"
          strokeWidth={1.2}
        />

        {DEMO_ROOMS
          .slice()
          .sort((a, b) => a.floor - b.floor || a.y - b.y || a.x - b.x)
          .map((room) =>
            renderRoomBlock(
              room,
              room.id === destinationId,
              room.id === NAVIGATION_START_ROOM_ID
            )
          )}

        {routePoints.length > 1 && (
          <Polyline
            points={routePolylinePath(routePoints)}
            fill="none"
            stroke="#2563eb"
            strokeWidth={4.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {routePoints[0] && (() => {
          const start = projectPoint(routePoints[0].x, routePoints[0].y, levelZ(routePoints[0].floor) + ROOM_HEIGHT + 2.5);
          return <Circle cx={start.x} cy={start.y} r={4.8} fill="#10b981" stroke="#ffffff" strokeWidth={1.5} />;
        })()}

        {routePoints[routePoints.length - 1] && (() => {
          const end = routePoints[routePoints.length - 1];
          const projected = projectPoint(end.x, end.y, levelZ(end.floor) + ROOM_HEIGHT + 2.5);
          return <Circle cx={projected.x} cy={projected.y} r={5.2} fill="#f59e0b" stroke="#ffffff" strokeWidth={1.7} />;
        })()}

        {activeMarker(currentPoint)}

        <SvgText x={42} y={34} fontSize={13} fontWeight="700" fill="#50617b">
          ENG Building Demo
        </SvgText>
        <SvgText x={42} y={50} fontSize={11} fill="#6b7b93">
          Isometric multi-floor navigation preview
        </SvgText>
        {destinationRoom && (
          <SvgText x={250} y={34} fontSize={12} fontWeight="700" fill="#2036a4" textAnchor="middle">
            Destination: {destinationRoom.label}
          </SvgText>
        )}
      </Svg>
    </View>
  );
}

export default function NavigationScreen() {
  const [destinationId, setDestinationId] = useState("ENG201");
  const [frameIndex, setFrameIndex] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  const route = useMemo(() => getNavigationDemoRoute(destinationId), [destinationId]);
  const currentPoint = route.animatedPoints[Math.min(frameIndex, route.animatedPoints.length - 1)];
  const currentFloor = currentPoint?.floor ?? 1;
  const hasArrived = frameIndex >= route.animatedPoints.length - 1;
  const startRoom = DEMO_ROOMS.find((room) => room.id === NAVIGATION_START_ROOM_ID) ?? route.startRoom;
  const destinationRoom = DEMO_ROOMS.find((room) => room.id === destinationId) ?? route.destinationRoom;

  useEffect(() => {
    setFrameIndex(0);
    setIsRunning(false);
  }, [destinationId]);

  useEffect(() => {
    if (!isRunning || route.animatedPoints.length < 2) {
      return;
    }

    const timer = setInterval(() => {
      setFrameIndex((current) => {
        if (current >= route.animatedPoints.length - 1) {
          setIsRunning(false);
          return current;
        }

        return current + 1;
      });
    }, FRAME_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [isRunning, route.animatedPoints.length]);

  const progress = route.animatedPoints.length > 1 ? frameIndex / (route.animatedPoints.length - 1) : 0;
  const estimatedMinutes = Math.max(1, Math.round(route.distance / 42));
  const routePoints = route.animatedPoints.map((point) => ({
    x: point.x,
    y: point.y,
    floor: point.floor,
  }));

  const floorChips = useMemo(
    () =>
      [1, 2].map((floor) => ({
        floor: floor as DemoFloor,
        active: currentFloor === floor,
        label: floor === 1 ? "Start level" : "Arrival level",
      })),
    [currentFloor]
  );

  const startSimulation = () => {
    if (hasArrived) {
      setFrameIndex(0);
    }

    setIsRunning(true);
  };

  const pauseSimulation = () => setIsRunning(false);

  const resetSimulation = () => {
    setIsRunning(false);
    setFrameIndex(0);
  };

  const statusLabel = hasArrived
    ? `Arrived at ${destinationRoom.label}`
    : isRunning
      ? currentFloor === 1
        ? "Moving toward stairs on floor 1"
        : `Finishing route on floor ${currentFloor}`
      : "Ready to simulate";

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Navigation</Text>
          <Text style={styles.headerSubtitle}>Interactive indoor demo with 3D-style building view</Text>
        </View>
        <View style={styles.profileCircle}>
          <IconSymbol name="location.fill" color="#0b0b0b" size={28} />
        </View>
      </View>

      <View style={styles.heroCard}>
        <View style={styles.heroTopRow}>
          <View>
            <Text style={styles.heroEyebrow}>Default route demo</Text>
            <Text style={styles.heroTitle}>
              {startRoom.label} to {destinationRoom.label}
            </Text>
          </View>
          <View style={styles.heroCompass}>
            <IconSymbol name="arrow.up" color="#ffffff" size={16} />
            <Text style={styles.heroCompassText}>N</Text>
          </View>
        </View>

        <Text style={styles.heroText}>
          The student starts in ENG103, walks to the stair core on level 1, then continues to the selected room on level 2.
        </Text>

        <View style={styles.heroMetaRow}>
          <View style={styles.heroPill}>
            <Text style={styles.heroPillLabel}>Route engine</Text>
            <Text style={styles.heroPillValue}>Dijkstra</Text>
          </View>
          <View style={styles.heroPill}>
            <Text style={styles.heroPillLabel}>Current floor</Text>
            <Text style={styles.heroPillValue}>{currentFloor}</Text>
          </View>
          <View style={styles.heroPill}>
            <Text style={styles.heroPillLabel}>ETA</Text>
            <Text style={styles.heroPillValue}>{estimatedMinutes} min</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Choose destination room</Text>
        <View style={styles.selectorGrid}>
          {DESTINATION_ROOMS.map((room) => {
            const selected = room.id === destinationId;

            return (
              <Pressable
                key={room.id}
                style={[styles.selectorButton, selected && styles.selectorButtonSelected]}
                onPress={() => setDestinationId(room.id)}
              >
                <Text style={[styles.selectorButtonText, selected && styles.selectorButtonTextSelected]}>
                  {room.label}
                </Text>
                <Text style={[styles.selectorFloorText, selected && styles.selectorButtonTextSelected]}>
                  Floor {room.floor}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.controlsCard}>
          <View style={styles.controlsHeader}>
            <View>
              <Text style={styles.sectionTitle}>Run simulation</Text>
              <Text style={styles.statusText}>{statusLabel}</Text>
            </View>
            <View style={styles.buttonRow}>
              <Pressable style={styles.primaryButton} onPress={startSimulation}>
                <Text style={styles.primaryButtonText}>{hasArrived ? "Replay" : "Start"}</Text>
              </Pressable>
              <Pressable style={styles.secondaryButton} onPress={pauseSimulation}>
                <Text style={styles.secondaryButtonText}>Pause</Text>
              </Pressable>
              <Pressable style={styles.secondaryButton} onPress={resetSimulation}>
                <Text style={styles.secondaryButtonText}>Reset</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.progressShell}>
            <View style={[styles.progressFill, { width: `${Math.max(progress * 100, 4)}%` }]} />
          </View>

          <View style={styles.floorChipRow}>
            {floorChips.map((chip) => (
              <View key={chip.floor} style={[styles.floorChip, chip.active && styles.floorChipActive]}>
                <Text style={[styles.floorChipTitle, chip.active && styles.floorChipTitleActive]}>Floor {chip.floor}</Text>
                <Text style={[styles.floorChipLabel, chip.active && styles.floorChipTitleActive]}>{chip.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>3D navigation scene</Text>
        <IsometricBuildingScene destinationId={destinationId} currentPoint={currentPoint} routePoints={routePoints} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Route breakdown</Text>
        <View style={styles.stepsCard}>
          {route.segments.map((segment, index) => (
            <View key={`${segment.floor}-${index}`} style={styles.stepRow}>
              <View style={styles.stepIndex}>
                <Text style={styles.stepIndexText}>{index + 1}</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Floor {segment.floor}</Text>
                <Text style={styles.stepBody}>
                  {segment.fromLabel} to {segment.toLabel}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Student instructions</Text>
        <View style={styles.instructionsCard}>
          {route.instructions.map((instruction) => (
            <Text key={instruction} style={styles.instructionText}>
              {instruction}
            </Text>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f7f0d7",
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 100,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#0b0b0b",
  },
  headerSubtitle: {
    marginTop: 4,
    color: "#43506c",
    fontSize: 14,
    maxWidth: 250,
  },
  profileCircle: {
    backgroundColor: "#f3d400",
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  heroCard: {
    marginTop: 24,
    backgroundColor: "#2c3ea3",
    borderRadius: 24,
    padding: 20,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  heroEyebrow: {
    color: "#f7f0d7",
    textTransform: "uppercase",
    letterSpacing: 1.1,
    fontSize: 12,
    fontWeight: "700",
  },
  heroTitle: {
    marginTop: 8,
    fontSize: 28,
    fontWeight: "800",
    color: "#ffffff",
  },
  heroCompass: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.26)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  heroCompassText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 11,
    marginTop: 1,
  },
  heroText: {
    marginTop: 12,
    color: "#e6e9ff",
    lineHeight: 21,
  },
  heroMetaRow: {
    marginTop: 18,
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },
  heroPill: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 14,
    minWidth: 96,
  },
  heroPillLabel: {
    color: "#c7d2fe",
    fontSize: 12,
    fontWeight: "600",
  },
  heroPillValue: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    marginTop: 3,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1f2d86",
    marginBottom: 12,
  },
  selectorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  selectorButton: {
    width: "47%",
    backgroundColor: "#ffffff",
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#d8deef",
  },
  selectorButtonSelected: {
    backgroundColor: "#ecf0ff",
    borderColor: "#2c3ea3",
  },
  selectorButtonText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#10204b",
  },
  selectorButtonTextSelected: {
    color: "#2036a4",
  },
  selectorFloorText: {
    marginTop: 4,
    color: "#51607e",
    fontSize: 13,
  },
  controlsCard: {
    backgroundColor: "#ffffff",
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: "#dde3f4",
  },
  controlsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  statusText: {
    color: "#4b5563",
    marginTop: 2,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  primaryButton: {
    backgroundColor: "#2c3ea3",
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "800",
  },
  secondaryButton: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#d8deef",
  },
  secondaryButtonText: {
    color: "#10204b",
    fontWeight: "800",
  },
  progressShell: {
    marginTop: 16,
    height: 12,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "#d9deef",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#2c3ea3",
  },
  floorChipRow: {
    marginTop: 14,
    flexDirection: "row",
    gap: 10,
  },
  floorChip: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: "#f8f9ff",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#dde3f4",
  },
  floorChipActive: {
    backgroundColor: "#2c3ea3",
    borderColor: "#2c3ea3",
  },
  floorChipTitle: {
    color: "#10204b",
    fontWeight: "800",
    fontSize: 14,
  },
  floorChipLabel: {
    color: "#61708d",
    fontSize: 12,
    marginTop: 2,
  },
  floorChipTitleActive: {
    color: "#ffffff",
  },
  sceneCard: {
    backgroundColor: "#ffffff",
    borderRadius: 28,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#dde3f4",
    shadowColor: "#1f2d86",
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  sceneSvg: {
    width: "100%",
    height: 360,
  },
  stepsCard: {
    backgroundColor: "#ffffff",
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    borderColor: "#dde3f4",
    gap: 12,
  },
  stepRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  stepIndex: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#2c3ea3",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  stepIndexText: {
    color: "#fff",
    fontWeight: "800",
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    color: "#1f2d86",
    fontWeight: "800",
    marginBottom: 2,
  },
  stepBody: {
    color: "#334155",
    lineHeight: 20,
  },
  instructionsCard: {
    backgroundColor: "#fffdf7",
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: "#eadfb8",
    gap: 10,
  },
  instructionText: {
    color: "#4c5567",
    lineHeight: 21,
  },
});
