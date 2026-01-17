// hooks/useLivePosition.ts

import { useEffect, useRef, useState } from "react";
import { BEACON_META, BeaconId } from "../constants/beacons";
import { useMotionIntensity } from "./useMotionIntensity";

export type NormalizedBeacon = {
  id: BeaconId; // A1, A2, A3
  rssi: number; // RSSI value
};

/**
 * Compute a rough weighted indoor position based on RSSI and smooth
 * the output using both a RSSI low-pass filter and a motion-aware
 * easing factor from the device accelerometer.
 */
export function useLivePosition(readings: NormalizedBeacon[]) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const rssiAveragesRef = useRef<Record<BeaconId, number>>({});
  const motion = useMotionIntensity();

  useEffect(() => {
    if (!readings || readings.length === 0) return;

    // Keep only known beacon IDs
    const known = readings.filter((b) => BEACON_META[b.id]);
    if (known.length === 0) return;

    // Smooth RSSI to avoid jumpy distance estimates
    known.forEach((reading) => {
      const prev = rssiAveragesRef.current[reading.id];
      const blend = 0.35; // higher = more responsive
      rssiAveragesRef.current[reading.id] =
        prev === undefined ? reading.rssi : prev * (1 - blend) + reading.rssi * blend;
    });

    // Convert RSSI → distance using a calibrated log-distance path loss model
    const weights = known.map((b) => {
      const meta = BEACON_META[b.id];
      const smoothedRssi = rssiAveragesRef.current[b.id] ?? b.rssi;

      // d = 10 ^ ((txPower - rssi) / (10 * n))
      const distance = Math.max(
        0.35,
        Math.pow(10, (meta.rssiAt1m - smoothedRssi) / (10 * meta.pathLoss))
      );

      // Use inverse-square distance weighting so close beacons dominate
      const weight = 1 / Math.pow(distance, 2);

      return {
        id: b.id,
        weight,
      };
    });

    let totalW = 0;
    let sumX = 0;
    let sumY = 0;

    weights.forEach((w) => {
      const p = BEACON_META[w.id].pos;
      sumX += p.x * w.weight;
      sumY += p.y * w.weight;
      totalW += w.weight;
    });

    if (totalW === 0) return;

    // Final weighted position
    const target = {
      x: sumX / totalW,
      y: sumY / totalW,
    };

    // Motion-aware smoothing: move faster when device is in motion
    const baseSmooth = 0.14;
    const motionBoost = Math.min(0.3, motion * 0.22);
    const alpha = Math.min(0.72, baseSmooth + motionBoost);

    setPos((prev) => {
      if (!prev) return target;
      return {
        x: prev.x + (target.x - prev.x) * alpha,
        y: prev.y + (target.y - prev.y) * alpha,
      };
    });
  }, [readings, motion]);

  return pos;
}
