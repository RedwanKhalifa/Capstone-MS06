// app/(tabs)/navigation.tsx

import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ScrollView,
} from "react-native";
import Svg, { Line } from "react-native-svg";

import { useBleScanner } from "../../hooks/useBleScanner";
import { useLivePosition } from "../../hooks/useLivePosition";
import {
  BEACON_META,
  BEACON_MAC_TO_ID,
  BeaconId,
} from "../../constants/beacons";
import { useHeading } from "../../hooks/useHeading";

const MAP_WIDTH = 350;
const MAP_HEIGHT = 300;

export default function NavigationScreen() {
  // BLE scanner data
  const { beaconData, bleReady, error } = useBleScanner();
  const heading = useHeading();
  const [selectedBeacon, setSelectedBeacon] = useState<BeaconId | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  console.log("SCANNER DATA:", beaconData);

  /**
   * Convert raw BLE scan results:
   *   { mac: "...", rssi: -70 }
   * → { id: "A1", rssi: -70 }
   */
  const normalizedBeacons = useMemo(() => {
    return beaconData
      .map((b) => {
        const mac = b.mac.toUpperCase();
        const id = BEACON_MAC_TO_ID[mac]; // convert MAC → A1/A2/A3

        if (!id) return null; // ignore unknown MACs
        return { id, rssi: b.rssi };
      })
      .filter(Boolean) as { id: BeaconId; rssi: number }[];
  }, [beaconData]);

  console.log("NORMALIZED:", normalizedBeacons);

  // Compute indoor position based on RSSI
  const position = useLivePosition(normalizedBeacons);

  console.log("USER POSITION:", position);

  const destinations = useMemo(
    () =>
      Object.entries(BEACON_META).map(([id, meta]) => ({
        id: id as BeaconId,
        label: `${meta.room} (${id})`,
        pos: meta.pos,
      })),
    []
  );

  const selectedMeta = selectedBeacon ? BEACON_META[selectedBeacon] : null;
  const distanceToTarget = useMemo(() => {
    if (!position || !selectedMeta) return null;
    const dx = position.x - selectedMeta.pos.x;
    const dy = position.y - selectedMeta.pos.y;
    return Math.sqrt(dx * dx + dy * dy);
  }, [position, selectedMeta]);

  const arrived = distanceToTarget !== null && distanceToTarget < 0.045;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Smart Campus Navigation App</Text>

      {/* MAP BOX */}
      <View style={styles.mapBox}>
        {/* Guidance line */}
        {position && selectedMeta && (
          <Svg pointerEvents="none" style={StyleSheet.absoluteFill}>
            <Line
              x1={position.x * MAP_WIDTH}
              y1={position.y * MAP_HEIGHT}
              x2={selectedMeta.pos.x * MAP_WIDTH}
              y2={selectedMeta.pos.y * MAP_HEIGHT}
              stroke="#1E90FF"
              strokeWidth={3}
              strokeDasharray="8 6"
            />
          </Svg>
        )}

        {/* Render Red Beacon Dots */}
        {Object.entries(BEACON_META).map(([id, meta]) => (
          <View
            key={id}
            style={[
              styles.beaconDot,
              {
                left: meta.pos.x * MAP_WIDTH - 10, // convert 0–1 → pixels
                top: meta.pos.y * MAP_HEIGHT - 10,
              },
            ]}
          />
        ))}

        {/* Render Blue User Dot */}
        {position && (
          <View
            style={[
              styles.userDot,
              {
                left: position.x * MAP_WIDTH - 10,
                top: position.y * MAP_HEIGHT - 10,
              },
            ]}
          />
        )}

        {/* Heading triangle */}
        {position && (
          <View
            style={[
              styles.headingPointer,
              {
                left: position.x * MAP_WIDTH - 8,
                top: position.y * MAP_HEIGHT - 24,
                transform: [{ rotate: `${heading}deg` }],
              },
            ]}
          />
        )}
      </View>

      {/* Destination dropdown */}
      <View style={styles.dropdownCard}>
        <TouchableOpacity
          style={styles.dropdownToggle}
          onPress={() => setDropdownOpen((open) => !open)}
          activeOpacity={0.8}
        >
          <Text style={styles.dropdownLabel}>
            {selectedMeta ? selectedMeta.room : "Destination"}
          </Text>
        </TouchableOpacity>

        {dropdownOpen && (
          <ScrollView style={styles.dropdownList}>
            {destinations.map((dest) => (
              <TouchableOpacity
                key={dest.id}
                style={styles.dropdownItem}
                onPress={() => {
                  setSelectedBeacon(dest.id);
                  setDropdownOpen(false);
                }}
              >
                <Text style={styles.dropdownItemText}>{dest.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Arrival status */}
      {selectedMeta && (
        <Text style={arrived ? styles.arrived : styles.status}>
          {arrived
            ? `${selectedMeta.room} reached`
            : distanceToTarget
              ? `Heading to ${selectedMeta.room} (≈ ${(distanceToTarget * 100).toFixed(0)}% of map width away)`
              : `Heading to ${selectedMeta.room}`}
        </Text>
      )}

      {/* Status messages */}
      {!bleReady && <Text style={styles.status}>Initializing Bluetooth…</Text>}
      {error && <Text style={styles.error}>{error}</Text>}
      {!error && Platform.OS === "android" && (
        <Text style={styles.subtle}>
          Use the dev client build (expo run:android) and scan the QR with your
          phone — Expo Go cannot scan BLE beacons.
        </Text>
      )}
    </View>
  );
}

/* ================================
            STYLES
================================ */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 30,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
  },
  mapBox: {
    width: MAP_WIDTH,
    height: MAP_HEIGHT,
    borderColor: "black",
    borderWidth: 3,
    borderRadius: 10,
    position: "relative",
    backgroundColor: "#fff",
  },
  beaconDot: {
    width: 20,
    height: 20,
    backgroundColor: "red",
    borderRadius: 10,
    position: "absolute",
  },
  userDot: {
    width: 20,
    height: 20,
    backgroundColor: "blue",
    borderRadius: 10,
    position: "absolute",
  },
  headingPointer: {
    position: "absolute",
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 16,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "#66b3ff",
  },
  status: {
    marginTop: 20,
    color: "gray",
  },
  arrived: {
    marginTop: 20,
    color: "#007b55",
    fontWeight: "700",
  },
  error: {
    marginTop: 20,
    color: "red",
  },
  subtle: {
    marginTop: 10,
    color: "#666",
    textAlign: "center",
    paddingHorizontal: 20,
  },
  dropdownCard: {
    marginTop: 24,
    width: MAP_WIDTH,
    borderWidth: 3,
    borderColor: "#1E90FF",
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#f6fbff",
  },
  dropdownToggle: {
    paddingVertical: 14,
    alignItems: "center",
  },
  dropdownLabel: {
    fontSize: 18,
    fontWeight: "700",
  },
  dropdownList: {
    maxHeight: 160,
    borderTopWidth: 1,
    borderTopColor: "#b6d7ff",
  },
  dropdownItem: {
    paddingVertical: 12,
    alignItems: "center",
  },
  dropdownItemText: {
    fontSize: 16,
    color: "#1c4f82",
  },
});
