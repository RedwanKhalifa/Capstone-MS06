import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  TextInput,
  View,
  Switch,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import ImageZoom from "react-native-image-pan-zoom";
import Svg, { Circle, Polyline } from "react-native-svg";
import { endpoints } from "../../constants/api";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

type RoomMarker = {
  x: number;
  y: number;
  label: string;
  type?: string;
};

type PathPoint = {
  x: number;
  y: number;
};

type BeaconPosition = {
  deviceId: string;
  coordinates?: { x: number; y: number } | null;
};

const imageWidth = 800;
const imageHeight = 600;

const scaleToFit = Math.min(screenWidth / imageWidth, screenHeight / imageHeight);

export default function CampusMap() {
  const imageZoomRef = useRef<any>(null);
  const [accessibilityMode, setAccessibilityMode] = useState(false);
  const [fromRoom, setFromRoom] = useState("ENG101");
  const [toRoom, setToRoom] = useState("ENG203");
  const [markers, setMarkers] = useState<RoomMarker[]>([]);
  const [pathPoints, setPathPoints] = useState<PathPoint[]>([]);
  const [beacons, setBeacons] = useState<BeaconPosition[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [loadingPath, setLoadingPath] = useState(false);
  const [systemStats, setSystemStats] = useState<{ rooms: number; connections: number; beacons: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const centerOnUser = (location: PathPoint | null) => {
    if (imageZoomRef.current && location) {
      const offsetX = location.x - screenWidth / 2;
      const offsetY = location.y - screenHeight / 2;

      imageZoomRef.current.centerOn({
        x: -offsetX,
        y: -offsetY,
        scale: 1,
        duration: 300,
      });
    }
  };

  useEffect(() => {
    const loadRooms = async () => {
      try {
        const res = await fetch(endpoints.rooms);
        if (!res.ok) {
          throw new Error(`Unable to load rooms (${res.status})`);
        }
        const data = await res.json();
        const mappedMarkers: RoomMarker[] = data
          .filter((room: any) => room.coordinates?.x != null && room.coordinates?.y != null)
          .map((room: any) => ({
            x: room.coordinates.x,
            y: room.coordinates.y,
            label: room.room_id,
            type: room.type,
          }));
        setMarkers(mappedMarkers);
      } catch (err: any) {
        setError(err.message);
      }
    };

    const loadStats = async () => {
      try {
        const res = await fetch(endpoints.systemStats);
        if (!res.ok) {
          throw new Error("Unable to fetch system status");
        }
        const payload = await res.json();
        setSystemStats(payload.totals);
      } catch (err: any) {
        setStatusMessage(err.message);
      }
    };

    loadRooms();
    loadStats();
  }, []);

  useEffect(() => {
    const loadBeacons = async () => {
      try {
        const res = await fetch(endpoints.beacons);
        if (!res.ok) return;
        const payload = await res.json();
        setBeacons(payload.live || []);
        const firstWithCoordinates = payload.live?.find(
          (entry: any) => entry.coordinates?.x != null && entry.coordinates?.y != null
        );
        if (firstWithCoordinates) {
          const location = {
            x: firstWithCoordinates.coordinates.x,
            y: firstWithCoordinates.coordinates.y,
          };
          centerOnUser(location);
        }
      } catch (err) {
        // non-fatal telemetry errors are ignored
      }
    };

    loadBeacons();
    const interval = setInterval(loadBeacons, 15000);
    return () => clearInterval(interval);
  }, []);

  const requestPath = async (overrideDest?: string) => {
    const destination = overrideDest || toRoom;
    setLoadingPath(true);
    setError(null);
    setStatusMessage(null);
    try {
      const res = await fetch(endpoints.navigation, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: fromRoom, to: destination, accessible: accessibilityMode }),
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.message || "Failed to compute path");
      }
      const mappedPath = (payload.path || [])
        .filter((step: any) => step.coordinates?.x != null && step.coordinates?.y != null)
        .map((step: any) => ({ x: step.coordinates.x, y: step.coordinates.y }));
      setPathPoints(mappedPath);
      setStatusMessage(`Route distance: ${Math.round(payload.totalDistance)} meters`);
    } catch (err: any) {
      setPathPoints([]);
      setError(err.message);
    } finally {
      setLoadingPath(false);
    }
  };

  const findNearestAmenity = async (type: string) => {
    setLoadingPath(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        room: fromRoom,
        type,
        accessible: accessibilityMode ? "true" : "false",
      });
      const res = await fetch(`${endpoints.nearby}?${params.toString()}`);
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.message || "No nearby amenities found");
      }
      const mappedPath = (payload.path || [])
        .filter((step: any) => step.coordinates?.x != null && step.coordinates?.y != null)
        .map((step: any) => ({ x: step.coordinates.x, y: step.coordinates.y }));
      setPathPoints(mappedPath);
      setStatusMessage(`Nearest ${type} is ${Math.round(payload.totalDistance)} meters away`);
      setToRoom(payload.nearest?.roomId || type);
    } catch (err: any) {
      setPathPoints([]);
      setError(err.message);
    } finally {
      setLoadingPath(false);
    }
  };

  const filteredMarkers = useMemo(() => {
    if (!accessibilityMode) return markers;
    return markers.filter((marker) => marker.type !== "stairwell");
  }, [markers, accessibilityMode]);

  return (
    <View style={{ flex: 1, backgroundColor: accessibilityMode ? "#000" : "#fff" }}>
      <ScrollView contentContainerStyle={styles.panel}>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, accessibilityMode && styles.highContrastText]}>From</Text>
            <TextInput
              value={fromRoom}
              onChangeText={setFromRoom}
              placeholder="Room code (e.g. ENG101)"
              style={[styles.input, accessibilityMode && styles.highContrastInput]}
              autoCapitalize="characters"
            />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.label, accessibilityMode && styles.highContrastText]}>To</Text>
            <TextInput
              value={toRoom}
              onChangeText={setToRoom}
              placeholder="Destination room"
              style={[styles.input, accessibilityMode && styles.highContrastInput]}
              autoCapitalize="characters"
            />
          </View>
        </View>

        <View style={[styles.row, styles.alignCenter]}>
          <Text style={[styles.label, accessibilityMode && styles.highContrastText]}>Accessibility Mode</Text>
          <Switch
            value={accessibilityMode}
            onValueChange={(value) => {
              setAccessibilityMode(value);
              requestPath();
            }}
            thumbColor={accessibilityMode ? "#FFD700" : "#f4f3f4"}
            trackColor={{ false: "#767577", true: "#81b0ff" }}
          />
        </View>

        <View style={styles.row}>
          <TouchableOpacity style={styles.primaryButton} onPress={() => requestPath()} disabled={loadingPath}>
            {loadingPath ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Get Directions</Text>}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.secondaryButton, { marginLeft: 12 }]}
            onPress={() => findNearestAmenity("restroom")}
            disabled={loadingPath}
          >
            <Text style={styles.secondaryButtonText}>Nearest Restroom</Text>
          </TouchableOpacity>
        </View>

        {systemStats && (
          <Text style={[styles.status, accessibilityMode && styles.highContrastText]}>
            {`Rooms: ${systemStats.rooms} · Connections: ${systemStats.connections} · Beacons: ${systemStats.beacons}`}
          </Text>
        )}

        {statusMessage && (
          <Text style={[styles.status, accessibilityMode && styles.highContrastText]}>{statusMessage}</Text>
        )}
        {error && <Text style={[styles.error, accessibilityMode && styles.highContrastText]}>{error}</Text>}
      </ScrollView>

      <ImageZoom
        ref={imageZoomRef}
        cropWidth={screenWidth}
        cropHeight={screenHeight - 220}
        imageWidth={imageWidth}
        imageHeight={imageHeight}
        minScale={scaleToFit}
        maxScale={3}
      >
        <View>
          <Image
            source={require("../../assets/images/CampusMapEng1stFloor.png")}
            style={{ width: imageWidth, height: imageHeight }}
          />

          <Svg width={imageWidth} height={imageHeight} style={{ position: "absolute", top: 0, left: 0 }}>
            {pathPoints.length > 0 && (
              <Polyline
                points={pathPoints.map((p) => `${p.x},${p.y}`).join(" ")}
                fill="none"
                stroke={accessibilityMode ? "yellow" : "red"}
                strokeWidth={accessibilityMode ? 8 : 4}
              />
            )}

            {filteredMarkers.map((m, index) => (
              <Circle
                key={`${m.label}-${index}`}
                cx={m.x}
                cy={m.y}
                r={accessibilityMode ? 15 : 10}
                fill={accessibilityMode ? "lime" : "blue"}
                stroke="white"
                strokeWidth={2}
              />
            ))}

            {beacons.map((beacon, index) =>
              beacon.coordinates?.x != null && beacon.coordinates?.y != null ? (
                <Circle
                  key={`${beacon.deviceId}-${index}`}
                  cx={beacon.coordinates.x}
                  cy={beacon.coordinates.y}
                  r={accessibilityMode ? 18 : 12}
                  fill={accessibilityMode ? "orange" : "dodgerblue"}
                  stroke="white"
                  strokeWidth={3}
                />
              ) : null
            )}
          </Svg>
        </View>
      </ImageZoom>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 12,
    backgroundColor: "transparent",
  },
  row: {
    flexDirection: "row",
    alignItems: "stretch",
    marginBottom: 12,
  },
  alignCenter: {
    alignItems: "center",
    justifyContent: "space-between",
  },
  label: {
    fontWeight: "600",
    marginBottom: 6,
    color: "#1f2933",
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
    color: "#111827",
  },
  primaryButton: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: "#0f62fe",
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#0f62fe",
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  secondaryButtonText: {
    color: "#0f62fe",
    fontWeight: "600",
  },
  status: {
    marginTop: 4,
    color: "#1f2933",
  },
  error: {
    color: "#dc2626",
    fontWeight: "500",
  },
  highContrastText: {
    color: "#facc15",
  },
  highContrastInput: {
    backgroundColor: "#1f2933",
    color: "#facc15",
    borderColor: "#facc15",
  },
});
