import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line, Path, Polygon, Polyline, Rect, Text as SvgText } from "react-native-svg";

import { IconSymbol } from "../../components/ui/icon-symbol";
import {
  DEMO_ROOMS,
  DESTINATION_ROOMS,
  FLOOR_FEATURES,
  FLOORS,
  NAVIGATION_START_ROOM_ID,
  type DemoFloor,
  type DemoFloorFeature,
  type DemoFloorId,
  type DemoRoom,
  getNavigationDemoRoute,
} from "../../services/navigation-demo";

const FRAME_INTERVAL_MS = 110;
const FLOOR_STEP = 15;
const ROOM_HEIGHT = 7;
const ISO_X = 1.48;
const ISO_Y = 0.84;
const BASE_X = 178;
const BASE_Y = 232;
const MIN_LEVEL_INDEX = Math.min(...FLOORS.map((floor) => floor.levelIndex));

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

function getFloorMeta(floorId: DemoFloorId) {
  const floor = FLOORS.find((entry) => entry.id === floorId);
  if (!floor) {
    throw new Error(`Unknown floor: ${floorId}`);
  }
  return floor;
}

function levelZ(floorId: DemoFloorId) {
  const floor = getFloorMeta(floorId);
  return 18 + (floor.levelIndex - MIN_LEVEL_INDEX) * FLOOR_STEP;
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

function projectPlanPolygon(
  points: DemoFloorFeature["points"],
  z: number,
  projector: (x: number, y: number, z: number) => IsoPoint = projectPoint
) {
  return points.map((point) => projector(point.x, point.y, z));
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
  };
}

function drawTree(x: number, y: number, key: string) {
  const trunkTop = projectPoint(x, y, 5);
  const canopy = projectPoint(x, y, 13);

  return (
    <React.Fragment key={key}>
      <Line x1={trunkTop.x} y1={trunkTop.y} x2={trunkTop.x} y2={trunkTop.y + 7} stroke="#907258" strokeWidth={2} />
      <Circle cx={canopy.x} cy={canopy.y} r={4.8} fill="#9cc980" />
      <Circle cx={canopy.x - 4} cy={canopy.y + 2} r={2.8} fill="#8bbb72" />
      <Circle cx={canopy.x + 4} cy={canopy.y + 1} r={3} fill="#a8d78f" />
    </React.Fragment>
  );
}

function roomOpacity(room: DemoRoom, activeFloorId: DemoFloorId, floorsOnRoute: DemoFloorId[]) {
  if (room.floorId === activeFloorId) {
    return 1;
  }
  if (floorsOnRoute.includes(room.floorId)) {
    return 0.78;
  }
  return 0.28;
}

function renderRoomBlock(
  room: DemoRoom,
  activeFloorId: DemoFloorId,
  floorsOnRoute: DemoFloorId[],
  destinationId: string
) {
  const opacity = roomOpacity(room, activeFloorId, floorsOnRoute);
  const bottomZ = levelZ(room.floorId);
  const block = extrudeBox(room.x, room.y, room.width, room.height, bottomZ, ROOM_HEIGHT);
  const isStart = room.id === NAVIGATION_START_ROOM_ID;
  const isDestination = room.id === destinationId;
  const roofColor = isDestination ? "#ffd166" : isStart ? "#c4f1df" : shadeHex(room.color, 18);
  const leftColor = shadeHex(room.color, -14);
  const rightColor = shadeHex(room.color, -32);
  const labelPoint = projectPoint(room.x + room.width / 2, room.y + room.height / 2, bottomZ + ROOM_HEIGHT + 2);

  return (
    <React.Fragment key={room.id}>
      <Polygon points={polygonString(block.left)} fill={leftColor} opacity={opacity} />
      <Polygon points={polygonString(block.right)} fill={rightColor} opacity={opacity} />
      <Polygon points={polygonString(block.top)} fill={roofColor} stroke="#2f3f70" strokeWidth={1} opacity={opacity} />
      {(room.floorId === activeFloorId || isStart || isDestination) && (
        <SvgText x={labelPoint.x} y={labelPoint.y} fontSize={8.8} fontWeight="700" fill="#13244d" textAnchor="middle">
          {room.label}
        </SvgText>
      )}
    </React.Fragment>
  );
}

function renderFloorPlate(floorId: DemoFloorId, activeFloorId: DemoFloorId, floorsOnRoute: DemoFloorId[]) {
  const z = levelZ(floorId) - 2;
  const floorRooms = DEMO_ROOMS.filter((room) => room.floorId === floorId);
  const bounds = floorRooms.reduce(
    (acc, room) => ({
      minX: Math.min(acc.minX, room.x),
      minY: Math.min(acc.minY, room.y),
      maxX: Math.max(acc.maxX, room.x + room.width),
      maxY: Math.max(acc.maxY, room.y + room.height),
    }),
    { minX: 10, minY: 10, maxX: 96, maxY: 76 }
  );
  const margin = floorId === "5" ? 4 : 6;
  const plate = extrudeBox(
    bounds.minX - margin,
    bounds.minY - margin,
    bounds.maxX - bounds.minX + margin * 2,
    bounds.maxY - bounds.minY + margin * 2,
    z,
    3
  );
  const isActive = floorId === activeFloorId;
  const inRoute = floorsOnRoute.includes(floorId);
  const opacity = isActive ? 1 : inRoute ? 0.72 : 0.26;
  const topColor = isActive ? "#eef3ff" : "#f7f9ff";

  return (
    <React.Fragment key={`plate-${floorId}`}>
      <Polygon points={polygonString(plate.left)} fill="#d0d8f4" opacity={opacity} />
      <Polygon points={polygonString(plate.right)} fill="#bec8eb" opacity={opacity} />
      <Polygon points={polygonString(plate.top)} fill={topColor} stroke="#bcc7eb" strokeWidth={1} opacity={opacity} />
    </React.Fragment>
  );
}

function renderFloorFeatures(
  floorId: DemoFloorId,
  activeFloorId: DemoFloorId,
  floorsOnRoute: DemoFloorId[],
  projector: (x: number, y: number, z: number) => IsoPoint = projectPoint
) {
  const features = FLOOR_FEATURES[floorId] ?? [];
  const isActive = floorId === activeFloorId;
  const inRoute = floorsOnRoute.includes(floorId);
  const opacity = isActive ? 0.94 : inRoute ? 0.68 : 0.24;
  const z = levelZ(floorId) + 0.3;

  return features.map((feature, index) => (
    <Polygon
      key={`feature-${floorId}-${index}`}
      points={polygonString(projectPlanPolygon(feature.points, z, projector))}
      fill={feature.fill}
      stroke={feature.stroke ?? "#c2cedf"}
      strokeWidth={0.9}
      opacity={opacity}
    />
  ));
}

function routePointsForFloor(
  routePoints: { x: number; y: number; floorId: DemoFloorId }[],
  floorId: DemoFloorId
) {
  return routePoints
    .filter((point) => point.floorId === floorId)
    .map((point) => {
      const projected = projectPoint(point.x, point.y, levelZ(point.floorId) + ROOM_HEIGHT + 2.5);
      return `${projected.x},${projected.y}`;
    })
    .join(" ");
}

function activeMarker(point?: { x: number; y: number; floorId: DemoFloorId }) {
  if (!point) {
    return null;
  }

  const projected = projectPoint(point.x, point.y, levelZ(point.floorId) + ROOM_HEIGHT + 3.6);
  return (
    <>
      <Circle cx={projected.x} cy={projected.y} r={8} fill="rgba(37,99,235,0.18)" />
      <Circle cx={projected.x} cy={projected.y} r={4.8} fill="#ef4444" stroke="#ffffff" strokeWidth={2} />
    </>
  );
}

function campusRoad(startX: number, startY: number, endX: number, endY: number, width: number) {
  return polygonString([
    projectPoint(startX, startY, 0),
    projectPoint(startX + width, startY, 0),
    projectPoint(endX + width, endY, 0),
    projectPoint(endX, endY, 0),
  ]);
}

function destinationGroups() {
  return FLOORS.map((floor) => ({
    floor,
    rooms: DESTINATION_ROOMS.filter((room) => room.floorId === floor.id),
  })).filter((group) => group.rooms.length > 0);
}

function BuildingScene({
  destinationId,
  routePoints,
  currentPoint,
  activeFloorId,
  floorsOnRoute,
  isolatedFloorId,
}: {
  destinationId: string;
  routePoints: { x: number; y: number; floorId: DemoFloorId }[];
  currentPoint?: { x: number; y: number; floorId: DemoFloorId };
  activeFloorId: DemoFloorId;
  floorsOnRoute: DemoFloorId[];
  isolatedFloorId?: DemoFloorId;
}) {
  const visibleFloors = isolatedFloorId
    ? FLOORS.filter((floor) => floor.id === isolatedFloorId)
    : FLOORS;
  const visibleRooms = isolatedFloorId
    ? DEMO_ROOMS.filter((room) => room.floorId === isolatedFloorId)
    : DEMO_ROOMS;
  const visibleRouteFloors = isolatedFloorId
    ? floorsOnRoute.filter((floorId) => floorId === isolatedFloorId)
    : floorsOnRoute;

  return (
    <View style={styles.sceneCard}>
      <Svg viewBox="0 0 360 370" style={styles.sceneSvg}>
        <Rect x={0} y={0} width={360} height={370} fill="#f7f8fb" />
        <Polygon points={campusRoad(-18, 34, 118, 34, 12)} fill="#d5dbe3" />
        <Polygon points={campusRoad(14, -8, 14, 122, 12)} fill="#d0d7e1" />
        <Polygon points={campusRoad(60, -10, 60, 124, 10)} fill="#dde3ea" />

        <Path d="M 26 245 L 82 276" stroke="#ffffff" strokeWidth={2} strokeDasharray="6 6" />
        <Path d="M 70 174 L 126 205" stroke="#ffffff" strokeWidth={2} strokeDasharray="6 6" />
        <Path d="M 213 100 L 269 131" stroke="#ffffff" strokeWidth={2} strokeDasharray="6 6" />

        {[drawTree(10, 10, "t1"), drawTree(18, 16, "t2"), drawTree(24, 90, "t3"), drawTree(86, 10, "t4"), drawTree(98, 18, "t5"), drawTree(112, 86, "t6")]}

        <Polygon
          points={polygonString([
            projectPoint(0, 0, 0),
            projectPoint(104, 0, 0),
            projectPoint(104, 86, 0),
            projectPoint(0, 86, 0),
          ])}
          fill="#dff0cb"
        />

        {visibleFloors.map((floor) => renderFloorPlate(floor.id, activeFloorId, visibleRouteFloors))}
        {visibleFloors.flatMap((floor) => renderFloorFeatures(floor.id, activeFloorId, visibleRouteFloors))}

        {visibleRooms
          .slice()
          .sort((a, b) => getFloorMeta(a.floorId).levelIndex - getFloorMeta(b.floorId).levelIndex || a.y - b.y || a.x - b.x)
          .map((room) => renderRoomBlock(room, activeFloorId, visibleRouteFloors, destinationId))}

        {visibleRouteFloors.map((floorId) => {
          const points = routePointsForFloor(routePoints, floorId);
          if (!points) {
            return null;
          }

          return (
            <Polyline
              key={`route-${floorId}`}
              points={points}
              fill="none"
              stroke="#2563eb"
              strokeWidth={4.2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        })}

        {routePoints[0] && (() => {
          const start = routePoints[0];
          const projected = projectPoint(start.x, start.y, levelZ(start.floorId) + ROOM_HEIGHT + 2.5);
          return <Circle cx={projected.x} cy={projected.y} r={4.8} fill="#10b981" stroke="#ffffff" strokeWidth={1.7} />;
        })()}

        {routePoints[routePoints.length - 1] && (() => {
          const end = routePoints[routePoints.length - 1];
          const projected = projectPoint(end.x, end.y, levelZ(end.floorId) + ROOM_HEIGHT + 2.5);
          return <Circle cx={projected.x} cy={projected.y} r={5.1} fill="#f59e0b" stroke="#ffffff" strokeWidth={1.8} />;
        })()}

        {activeMarker(currentPoint)}

        <SvgText x={36} y={42} fontSize={13} fontWeight="700" fill="#52627a">
          {isolatedFloorId ? `${getFloorMeta(isolatedFloorId).label} Focus View` : "ENG Building Stack"}
        </SvgText>
        <SvgText x={36} y={58} fontSize={11} fill="#6e7d94">
          {isolatedFloorId
            ? "Single-level inspection with route overlay for that floor"
            : "Basement to 5th floor simplified from the supplied plans"}
        </SvgText>
      </Svg>
    </View>
  );
}

function NavigatorScene({
  routePoints,
  currentPoint,
  activeFloorId,
  destinationRoom,
  startRoom,
  hasArrived,
  estimatedMinutes,
}: {
  routePoints: { x: number; y: number; floorId: DemoFloorId }[];
  currentPoint?: { x: number; y: number; floorId: DemoFloorId };
  activeFloorId: DemoFloorId;
  destinationRoom: DemoRoom;
  startRoom: DemoRoom;
  hasArrived: boolean;
  estimatedMinutes: number;
}) {
  const routeOnFloor = routePoints.filter((point) => point.floorId === activeFloorId);
  const currentInstruction = hasArrived
    ? `Arrive at ${destinationRoom.label}`
    : activeFloorId === destinationRoom.floorId
      ? `Continue to ${destinationRoom.label}`
      : `Head to main stairs from ${startRoom.label}`;
  const guideRooms = DEMO_ROOMS
    .filter((room) => room.floorId === activeFloorId)
    .sort((a, b) => a.y - b.y || a.x - b.x);
  const sceneAnchor = routeOnFloor.length > 0
    ? {
        x: routeOnFloor.reduce((sum, point) => sum + point.x, 0) / routeOnFloor.length,
        y: routeOnFloor.reduce((sum, point) => sum + point.y, 0) / routeOnFloor.length,
      }
    : { x: 50, y: 44 };
  const routeDirection = routeOnFloor.length > 1
    ? {
        x: routeOnFloor[routeOnFloor.length - 1].x - routeOnFloor[0].x,
        y: routeOnFloor[routeOnFloor.length - 1].y - routeOnFloor[0].y,
      }
    : { x: 0, y: -1 };
  const directionLength = Math.max(0.001, Math.hypot(routeDirection.x, routeDirection.y));
  const forward = {
    x: routeDirection.x / directionLength,
    y: routeDirection.y / directionLength,
  };
  const right = {
    x: forward.y,
    y: -forward.x,
  };
  const cameraScale = 5.5;
  const floorBaseZ = levelZ(activeFloorId);
  const projectGuide = (x: number, y: number, z: number) => {
    const dx = x - sceneAnchor.x;
    const dy = y - sceneAnchor.y;
    const localX = dx * right.x + dy * right.y;
    const localY = dx * forward.x + dy * forward.y;

    return {
      x: cameraCenterX + localX * 8.8,
      y: cameraCenterY - localY * cameraScale - z * 1.58,
    };
  };
  const extrudeGuideBox = (
    x: number,
    y: number,
    width: number,
    depth: number,
    bottomZ: number,
    height: number
  ) => {
    const frontLeftBottom = projectGuide(x, y + depth, bottomZ);
    const frontRightBottom = projectGuide(x + width, y + depth, bottomZ);
    const backRightBottom = projectGuide(x + width, y, bottomZ);
    const backLeftBottom = projectGuide(x, y, bottomZ);

    const frontLeftTop = projectGuide(x, y + depth, bottomZ + height);
    const frontRightTop = projectGuide(x + width, y + depth, bottomZ + height);
    const backRightTop = projectGuide(x + width, y, bottomZ + height);
    const backLeftTop = projectGuide(x, y, bottomZ + height);

    return {
      top: [frontLeftTop, frontRightTop, backRightTop, backLeftTop],
      left: [frontLeftBottom, frontLeftTop, backLeftTop, backLeftBottom],
      right: [frontRightBottom, frontRightTop, backRightTop, backRightBottom],
    };
  };
  const guideRoutePath = routeOnFloor
    .map((point) => {
      const projected = projectGuide(point.x, point.y, floorBaseZ + ROOM_HEIGHT + 2.8);
      return `${projected.x},${projected.y}`;
    })
    .join(" ");
  const visibleGuideRooms = guideRooms.map((room) => {
    const centerX = room.x + room.width / 2;
    const centerY = room.y + room.height / 2;
    const dx = centerX - sceneAnchor.x;
    const dy = centerY - sceneAnchor.y;
    const localX = dx * right.x + dy * right.y;
    const localY = dx * forward.x + dy * forward.y;

    return {
      ...room,
      localX,
      localY,
    };
  }).filter((room) => Math.abs(room.localX) < 56 && room.localY > -28 && room.localY < 62)
    .sort((a, b) => a.localY - b.localY || a.localX - b.localX);
  const routeBounds = routeOnFloor.reduce(
    (acc, point) => ({
      minX: Math.min(acc.minX, point.x),
      minY: Math.min(acc.minY, point.y),
      maxX: Math.max(acc.maxX, point.x),
      maxY: Math.max(acc.maxY, point.y),
    }),
    { minX: 30, minY: 10, maxX: 70, maxY: 78 }
  );
  const corridorMargin = 7;
  const guideFloorSlab = extrudeGuideBox(2, 4, 100, 84, floorBaseZ - 4, 3.2);
  const guideCorridor = extrudeGuideBox(
    routeBounds.minX - corridorMargin,
    routeBounds.minY - corridorMargin,
    routeBounds.maxX - routeBounds.minX + corridorMargin * 2,
    routeBounds.maxY - routeBounds.minY + corridorMargin * 2,
    floorBaseZ - 1.1,
    1.6
  );
  return (
    <View style={styles.navigatorShell}>
      <View style={styles.navigatorHeader}>
        <View style={styles.navigatorHeaderTop}>
          <View>
            <Text style={styles.navigatorEyebrow}>Indoor Navigation</Text>
            <Text style={styles.navigatorDistance}>{estimatedMinutes} min</Text>
          </View>
          <View style={styles.navigatorExitPill}>
            <Text style={styles.navigatorExitText}>{getFloorMeta(activeFloorId).label}</Text>
          </View>
        </View>
        <Text style={styles.navigatorInstruction}>{currentInstruction}</Text>
        <Text style={styles.navigatorSubtext}>{arrivalBadgeText}</Text>
      </View>

      <View style={styles.navigatorMapCard}>
        <Svg viewBox="0 0 360 420" style={styles.navigatorOverlay}>
          <Rect x={0} y={0} width={360} height={420} fill="#edf2fa" />
          <Rect x={0} y={0} width={360} height={110} fill="#f8fbff" />

          <Polygon points={polygonString(guideFloorSlab.left)} fill="#d0d8e8" />
          <Polygon points={polygonString(guideFloorSlab.right)} fill="#c6cfdf" />
          <Polygon points={polygonString(guideFloorSlab.top)} fill="#e7edf6" />
          {renderFloorFeatures(activeFloorId, activeFloorId, [activeFloorId], projectGuide)}
          <Polygon points={polygonString(guideCorridor.left)} fill="#c8d1df" opacity={0.9} />
          <Polygon points={polygonString(guideCorridor.right)} fill="#bcc7d8" opacity={0.9} />
          <Polygon points={polygonString(guideCorridor.top)} fill="#dce4ee" opacity={0.92} />

          {visibleGuideRooms.map((room) => {
            const bottomZ = floorBaseZ;
            const block = extrudeGuideBox(
              room.x,
              room.y,
              room.width,
              room.height,
              bottomZ,
              ROOM_HEIGHT + 2
            );
            const isStart = room.id === NAVIGATION_START_ROOM_ID;
            const isDestination = room.id === destinationRoom.id;
            const roofColor = isDestination ? "#ffd166" : isStart ? "#c4f1df" : shadeHex(room.color, 18);
            const leftColor = shadeHex(room.color, -14);
            const rightColor = shadeHex(room.color, -32);
            const labelPoint = projectGuide(
              room.x + room.width / 2,
              room.y + room.height / 2,
              bottomZ + ROOM_HEIGHT + 5
            );
            return (
              <React.Fragment key={`guide-${room.id}`}>
                <Polygon points={polygonString(block.left)} fill={leftColor} opacity={0.96} />
                <Polygon points={polygonString(block.right)} fill={rightColor} opacity={0.96} />
                <Polygon points={polygonString(block.top)} fill={roofColor} stroke="#2f3f70" strokeWidth={1} opacity={0.98} />
                {(isStart || isDestination || (Math.abs(room.localX) < 28 && room.localY > -6 && room.localY < 50)) && (
                  <SvgText
                    x={labelPoint.x}
                    y={labelPoint.y}
                    fontSize={8.2}
                    fontWeight="700"
                    fill="#13244d"
                    textAnchor="middle"
                  >
                    {room.label}
                  </SvgText>
                )}
              </React.Fragment>
            );
          })}

          {routeOnFloor.length > 1 && (
            <>
              <Polyline
                points={guideRoutePath}
                fill="none"
                stroke="rgba(37,99,235,0.2)"
                strokeWidth={14}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <Polyline
                points={guideRoutePath}
                fill="none"
                stroke="#2563eb"
                strokeWidth={6}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </>
          )}

          {routeOnFloor[0] && (() => {
            const start = routeOnFloor[0];
            const projected = projectGuide(start.x, start.y, floorBaseZ + ROOM_HEIGHT + 2.8);
            return <Circle cx={projected.x} cy={projected.y} r={5.2} fill="#10b981" stroke="#ffffff" strokeWidth={1.8} />;
          })()}

          {routeOnFloor[routeOnFloor.length - 1] && (() => {
            const end = routeOnFloor[routeOnFloor.length - 1];
            const projected = projectGuide(end.x, end.y, floorBaseZ + ROOM_HEIGHT + 2.8);
            return <Circle cx={projected.x} cy={projected.y} r={5.6} fill="#f59e0b" stroke="#ffffff" strokeWidth={2} />;
          })()}

          {currentPoint?.floorId === activeFloorId && (() => {
            const projected = projectGuide(
              currentPoint.x,
              currentPoint.y,
              floorBaseZ + ROOM_HEIGHT + 4.4
            );
            return (
              <>
                <Circle cx={projected.x} cy={projected.y} r={12} fill="rgba(37,99,235,0.16)" />
                <Circle cx={projected.x} cy={projected.y} r={6.6} fill="#2563eb" stroke="#ffffff" strokeWidth={2.4} />
                <Circle cx={projected.x} cy={projected.y} r={2.3} fill="#ffffff" />
              </>
            );
          })()}

          <SvgText x={24} y={88} fontSize={12} fontWeight="700" fill="#66758e">
            Tilted Overview
          </SvgText>
          <SvgText x={24} y={104} fontSize={11} fill="#7b889e">
            {getFloorMeta(activeFloorId).label} live guidance
          </SvgText>
        </Svg>
      </View>

      <View style={styles.navigatorFooter}>
        <View style={styles.navigatorMetric}>
          <Text style={styles.navigatorMetricValue}>{destinationRoom.label}</Text>
          <Text style={styles.navigatorMetricLabel}>destination</Text>
        </View>
        <View style={styles.navigatorMetric}>
          <Text style={styles.navigatorMetricValue}>{estimatedMinutes}</Text>
          <Text style={styles.navigatorMetricLabel}>min</Text>
        </View>
        <View style={styles.navigatorMetric}>
          <Text style={styles.navigatorMetricValue}>{getFloorMeta(activeFloorId).shortLabel}</Text>
          <Text style={styles.navigatorMetricLabel}>floor</Text>
        </View>
      </View>
    </View>
  );
}

export default function NavigationScreen() {
  const [destinationId, setDestinationId] = useState("ENG201");
  const [frameIndex, setFrameIndex] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [viewMode, setViewMode] = useState<"stack" | "single" | "guide">("stack");
  const [selectedFloorId, setSelectedFloorId] = useState<DemoFloorId>("1");

  const route = useMemo(() => getNavigationDemoRoute(destinationId), [destinationId]);
  const currentPoint = route.animatedPoints[Math.min(frameIndex, route.animatedPoints.length - 1)];
  const activeFloorId = currentPoint?.floorId ?? route.startRoom.floorId;
  const hasArrived = frameIndex >= route.animatedPoints.length - 1;
  const startRoom = DEMO_ROOMS.find((room) => room.id === NAVIGATION_START_ROOM_ID) ?? route.startRoom;
  const destinationRoom = DEMO_ROOMS.find((room) => room.id === destinationId) ?? route.destinationRoom;
  const groupedDestinations = useMemo(destinationGroups, []);
  const visibleFloorId = viewMode === "single" ? selectedFloorId : undefined;

  useEffect(() => {
    setFrameIndex(0);
    setIsRunning(false);
  }, [destinationId]);

  useEffect(() => {
    if (viewMode === "single") {
      setSelectedFloorId(activeFloorId);
    }
  }, [activeFloorId, viewMode]);

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
  const estimatedMinutes = Math.max(1, Math.round(route.distance / 48));
  const routePoints = route.animatedPoints.map((point) => ({
    x: point.x,
    y: point.y,
    floorId: point.floorId,
  }));

  const statusLabel = hasArrived
    ? `Arrived at ${destinationRoom.label}`
    : isRunning
      ? `Navigating through ${getFloorMeta(activeFloorId).label}`
      : "Ready to simulate";

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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Navigation</Text>
          <Text style={styles.headerSubtitle}>Full ENG stack with basement, lower ground, and floors 1 through 5</Text>
        </View>
        <View style={styles.profileCircle}>
          <IconSymbol name="location.fill" color="#0b0b0b" size={28} />
        </View>
      </View>

      <View style={styles.heroCard}>
        <View style={styles.heroTopRow}>
          <View style={styles.heroTextWrap}>
            <Text style={styles.heroEyebrow}>Expanded building model</Text>
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
          This version uses the supplied ENG floor plans to simulate routing across the whole building, including the basement, lower ground, and upper floors.
        </Text>

        <View style={styles.heroMetaRow}>
          <View style={styles.heroPill}>
            <Text style={styles.heroPillLabel}>Levels</Text>
            <Text style={styles.heroPillValue}>B to 5</Text>
          </View>
          <View style={styles.heroPill}>
            <Text style={styles.heroPillLabel}>Active floor</Text>
            <Text style={styles.heroPillValue}>{getFloorMeta(activeFloorId).shortLabel}</Text>
          </View>
          <View style={styles.heroPill}>
            <Text style={styles.heroPillLabel}>ETA</Text>
            <Text style={styles.heroPillValue}>{estimatedMinutes} min</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Choose destination room</Text>
        {groupedDestinations.map((group) => (
          <View key={group.floor.id} style={styles.floorGroup}>
            <Text style={styles.floorGroupTitle}>{group.floor.label}</Text>
            <View style={styles.selectorGrid}>
              {group.rooms.map((room) => {
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
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <View style={styles.controlsCard}>
          <View style={styles.controlsHeader}>
            <View style={styles.controlsTextWrap}>
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
            {FLOORS.map((floor) => {
              const active = floor.id === activeFloorId;
              const inRoute = route.floorsOnRoute.includes(floor.id);

              return (
                <View
                  key={floor.id}
                  style={[
                    styles.floorChip,
                    active && styles.floorChipActive,
                    inRoute && !active && styles.floorChipInRoute,
                  ]}
                >
                  <Text style={[styles.floorChipTitle, active && styles.floorChipTitleActive]}>
                    {floor.shortLabel}
                  </Text>
                  <Text style={[styles.floorChipLabel, active && styles.floorChipTitleActive]}>
                    {inRoute ? "On route" : "Idle"}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>View mode</Text>
        <View style={styles.modeRow}>
          <Pressable
            style={[styles.modeButton, viewMode === "stack" && styles.modeButtonActive]}
            onPress={() => setViewMode("stack")}
          >
            <Text style={[styles.modeButtonText, viewMode === "stack" && styles.modeButtonTextActive]}>
              Building stack
            </Text>
          </Pressable>
          <Pressable
            style={[styles.modeButton, viewMode === "single" && styles.modeButtonActive]}
            onPress={() => setViewMode("single")}
          >
            <Text style={[styles.modeButtonText, viewMode === "single" && styles.modeButtonTextActive]}>
              Single floor
            </Text>
          </Pressable>
          <Pressable
            style={[styles.modeButton, viewMode === "guide" && styles.modeButtonActive]}
            onPress={() => setViewMode("guide")}
          >
            <Text style={[styles.modeButtonText, viewMode === "guide" && styles.modeButtonTextActive]}>
              Navigate
            </Text>
          </Pressable>
        </View>

        {viewMode === "single" && (
          <View style={styles.singleFloorPanel}>
            <Text style={styles.singleFloorTitle}>Choose level</Text>
            <View style={styles.singleFloorRow}>
              {FLOORS.map((floor: DemoFloor) => {
                const selected = floor.id === selectedFloorId;
                const onRoute = route.floorsOnRoute.includes(floor.id);

                return (
                  <Pressable
                    key={floor.id}
                    style={[
                      styles.singleFloorChip,
                      selected && styles.singleFloorChipActive,
                      onRoute && !selected && styles.singleFloorChipRoute,
                    ]}
                    onPress={() => setSelectedFloorId(floor.id)}
                  >
                    <Text style={[styles.singleFloorChipText, selected && styles.singleFloorChipTextActive]}>
                      {floor.shortLabel}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.singleFloorHint}>
              {route.floorsOnRoute.includes(selectedFloorId)
                ? `${getFloorMeta(selectedFloorId).label} is part of the current route.`
                : `${getFloorMeta(selectedFloorId).label} is not used by the current route, but you can still inspect it.`}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {viewMode === "guide" ? "Guidance view" : "3D navigation scene"}
        </Text>
        {viewMode === "guide" ? (
          <NavigatorScene
            routePoints={routePoints}
            currentPoint={currentPoint}
            activeFloorId={activeFloorId}
            destinationRoom={destinationRoom}
            startRoom={startRoom}
            hasArrived={hasArrived}
            estimatedMinutes={estimatedMinutes}
          />
        ) : (
          <BuildingScene
            destinationId={destinationId}
            routePoints={routePoints}
            currentPoint={currentPoint}
            activeFloorId={activeFloorId}
            floorsOnRoute={route.floorsOnRoute}
            isolatedFloorId={visibleFloorId}
          />
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Route breakdown</Text>
        <View style={styles.stepsCard}>
          {route.segments.map((segment, index) => (
            <View key={`${segment.floorId}-${index}`} style={styles.stepRow}>
              <View style={styles.stepIndex}>
                <Text style={styles.stepIndexText}>{index + 1}</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>{getFloorMeta(segment.floorId).label}</Text>
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
    gap: 12,
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
    maxWidth: 270,
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
  heroTextWrap: {
    flex: 1,
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
  floorGroup: {
    marginBottom: 16,
  },
  floorGroupTitle: {
    color: "#32468e",
    fontWeight: "800",
    marginBottom: 10,
    fontSize: 15,
  },
  selectorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  selectorButton: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#d8deef",
  },
  selectorButtonSelected: {
    backgroundColor: "#ecf0ff",
    borderColor: "#2c3ea3",
  },
  selectorButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#10204b",
  },
  selectorButtonTextSelected: {
    color: "#2036a4",
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
  controlsTextWrap: {
    flex: 1,
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
    maxWidth: 190,
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
    flexWrap: "wrap",
    gap: 8,
  },
  floorChip: {
    minWidth: 66,
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
  floorChipInRoute: {
    backgroundColor: "#edf3ff",
    borderColor: "#8fb0ff",
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
  modeRow: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },
  modeButton: {
    minWidth: 96,
    borderRadius: 16,
    backgroundColor: "#ffffff",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#d8deef",
    alignItems: "center",
  },
  modeButtonActive: {
    backgroundColor: "#2c3ea3",
    borderColor: "#2c3ea3",
  },
  modeButtonText: {
    color: "#10204b",
    fontWeight: "800",
  },
  modeButtonTextActive: {
    color: "#ffffff",
  },
  singleFloorPanel: {
    marginTop: 12,
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: "#dde3f4",
  },
  singleFloorTitle: {
    color: "#1f2d86",
    fontWeight: "800",
    marginBottom: 10,
  },
  singleFloorRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  singleFloorChip: {
    minWidth: 48,
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: "#f8f9ff",
    borderWidth: 1,
    borderColor: "#dde3f4",
  },
  singleFloorChipActive: {
    backgroundColor: "#2c3ea3",
    borderColor: "#2c3ea3",
  },
  singleFloorChipRoute: {
    backgroundColor: "#edf3ff",
    borderColor: "#8fb0ff",
  },
  singleFloorChipText: {
    color: "#10204b",
    fontWeight: "800",
  },
  singleFloorChipTextActive: {
    color: "#ffffff",
  },
  singleFloorHint: {
    marginTop: 10,
    color: "#5f6d86",
    lineHeight: 20,
  },
  navigatorShell: {
    backgroundColor: "#091224",
    borderRadius: 28,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#16233c",
    shadowColor: "#0f172a",
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  navigatorHeader: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 16,
    backgroundColor: "#0b162c",
  },
  navigatorHeaderTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  navigatorEyebrow: {
    color: "#6fb7ff",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  navigatorDistance: {
    color: "#ffffff",
    fontSize: 30,
    fontWeight: "800",
    marginTop: 4,
  },
  navigatorInstruction: {
    color: "#eff4ff",
    marginTop: 6,
    fontSize: 16,
    fontWeight: "700",
  },
  navigatorSubtext: {
    color: "#75b7ff",
    marginTop: 6,
    fontSize: 13,
    fontWeight: "700",
  },
  navigatorExitPill: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  navigatorExitText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 12,
  },
  navigatorMapCard: {
    backgroundColor: "#edf2fa",
    height: 420,
  },
  navigatorOverlay: {
    width: "100%",
    height: "100%",
  },
  navigatorFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 16,
    backgroundColor: "#ffffff",
  },
  navigatorMetric: {
    alignItems: "center",
    flex: 1,
  },
  navigatorMetricValue: {
    color: "#111827",
    fontSize: 20,
    fontWeight: "800",
  },
  navigatorMetricLabel: {
    color: "#6b7280",
    marginTop: 2,
    fontSize: 12,
    textTransform: "uppercase",
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
    height: 420,
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
