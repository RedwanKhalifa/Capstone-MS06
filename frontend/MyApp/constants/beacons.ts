// constants/beacons.ts

// Beacon identifiers (friendly names)
export type BeaconId = "A1" | "A2" | "A3";

export type BeaconMeta = {
  /** friendly room name shown to the user */
  room: string;
  /** normalized 0-1 coordinates used by the map */
  pos: { x: number; y: number };
  /**
   * BLE calibration used to convert RSSI → distance for trilateration.
   * Adjusted to pull the user closer to the left/right beacons in the UI.
   */
  rssiAt1m: number;
  pathLoss: number;
};

/**
 * Normalized coordinates (0–1) for each beacon.
 * These match your UI layout proportions.
 */
export const BEACON_META: Record<BeaconId, BeaconMeta> = {
  A1: {
    room: "ENG101",
    pos: { x: 0.17, y: 0.76 }, // left beacon nudged closer for on-map proximity
    rssiAt1m: -59,
    pathLoss: 1.9,
  },
  A2: {
    room: "ENG102",
    pos: { x: 0.45, y: 0.78 }, // center beacon stays as reference
    rssiAt1m: -62,
    pathLoss: 2.1,
  },
  A3: {
    room: "ENG103",
    pos: { x: 0.70, y: 0.40 }, // right beacon slightly stronger for closeness
    rssiAt1m: -59,
    pathLoss: 1.9,
  },
};

/**
 * Real MAC addresses → Beacon IDs
 * These MUST match exactly what the scanner prints.
 */
export const BEACON_MAC_TO_ID: Record<string, BeaconId> = {
  "20:6E:F1:6D:F7:96": "A1",
  "20:6E:F1:6C:C5:9A": "A2",
  "20:6E:F1:6B:9C:7A": "A3",
};
