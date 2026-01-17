import { useEffect, useState } from "react";
import { Magnetometer } from "expo-sensors";

/**
 * Returns a smoothed compass heading in degrees (0-360).
 */
export function useHeading() {
  const [heading, setHeading] = useState(0);

  useEffect(() => {
    let mounted = true;

    const setup = async () => {
      const available = await Magnetometer.isAvailableAsync();
      if (!available) return;

      Magnetometer.setUpdateInterval(200);

      const subscription = Magnetometer.addListener(({ x, y }) => {
        // Calculate heading in degrees (convert from radians)
        const angle = Math.atan2(y, x) * (180 / Math.PI);
        const normalized = (angle + 450) % 360; // rotate to 0° = north

        if (!mounted) return;
        setHeading((prev) => prev * 0.8 + normalized * 0.2);
      });

      return () => subscription.remove();
    };

    const cleanupPromise = setup();

    return () => {
      mounted = false;
      cleanupPromise.then((cleanup) => cleanup?.());
    };
  }, []);

  return heading;
}
