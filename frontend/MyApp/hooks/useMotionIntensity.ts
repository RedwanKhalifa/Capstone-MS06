// hooks/useMotionIntensity.ts

import { useEffect, useState } from "react";
import { Accelerometer } from "expo-sensors";

/**
 * Lightweight hook that exposes how much the device is moving
 * using accelerometer readings. The returned value is a smoothed
 * magnitude (0 = idle, 1+ = strong movement).
 */
export function useMotionIntensity() {
  const [motion, setMotion] = useState(0);

  useEffect(() => {
    Accelerometer.setUpdateInterval(200);

    const subscription = Accelerometer.addListener(({ x, y, z }) => {
      // Gravity keeps the baseline close to 1 g; use delta from that baseline
      const magnitude = Math.sqrt(x * x + y * y + z * z);
      const deltaFromGravity = Math.max(0, Math.abs(magnitude - 1));

      // Smooth out noisy spikes with exponential moving average
      setMotion((prev) => prev * 0.85 + deltaFromGravity * 0.15);
    });

    return () => {
      subscription?.remove();
    };
  }, []);

  return motion;
}
