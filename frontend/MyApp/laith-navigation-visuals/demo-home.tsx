import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { IconSymbol } from "../../components/ui/icon-symbol";

type Pt = { x: number; y: number };
type Step = { atT: number; icon: string; title: string; sub: string };

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
function lerpPt(p0: Pt, p1: Pt, t: number): Pt {
  return { x: lerp(p0.x, p1.x, t), y: lerp(p0.y, p1.y, t) };
}

export default function SimulateScreen() {
  const router = useRouter();

  // Route points (0..1 normalized)
  const route: Pt[] = useMemo(
    () => [
      { x: 0.14, y: 0.86 }, // start
      { x: 0.14, y: 0.64 },
      { x: 0.30, y: 0.64 },
      { x: 0.30, y: 0.42 },
      { x: 0.58, y: 0.42 },
      { x: 0.78, y: 0.28 }, // end
    ],
    []
  );

  const steps: Step[] = useMemo(
    () => [
      { atT: 0.00, icon: "arrow.up", title: "Go straight", sub: "Walk along the main hallway" },
      { atT: 0.22, icon: "arrow.turn.up.right", title: "Turn right", sub: "At the intersection" },
      { atT: 0.52, icon: "arrow.turn.up.left", title: "Turn left", sub: "Follow corridor to rooms" },
      { atT: 0.80, icon: "arrow.up", title: "Continue straight", sub: "Approach destination" },
      { atT: 0.96, icon: "flag.fill", title: "Arrive", sub: "You’ve reached your destination" },
    ],
    []
  );

  const [running, setRunning] = useState(false);
  const [t, setT] = useState(0);
  const [speed, setSpeed] = useState(0.12);

  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  const activeStep = useMemo(() => {
    let current = steps[0];
    for (const s of steps) if (t >= s.atT) current = s;
    return current;
  }, [t, steps]);

  const pos = useMemo(() => {
    const n = route.length;
    if (n < 2) return route[0] ?? { x: 0.1, y: 0.1 };

    const segCount = n - 1;
    const segT = t * segCount;
    const segIdx = Math.min(segCount - 1, Math.max(0, Math.floor(segT)));
    const localT = segT - segIdx;

    return lerpPt(route[segIdx], route[segIdx + 1], localT);
  }, [t, route]);

  useEffect(() => {
    if (!running) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastTimeRef.current = null;
      return;
    }

    const tick = (time: number) => {
      if (lastTimeRef.current == null) lastTimeRef.current = time;
      const dt = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      setT((prev) => {
        const next = prev + speed * dt;
        if (next >= 1) {
          setRunning(false);
          return 1;
        }
        return next;
      });

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastTimeRef.current = null;
    };
  }, [running, speed]);

  const onReset = () => {
    setRunning(false);
    setT(0);
  };

  const onToggleSpeed = () => {
    setSpeed((s) => (s < 0.14 ? 0.22 : s < 0.24 ? 0.34 : 0.12));
  };

  return (
    <View style={styles.screen}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Pressable style={styles.circleBtn} onPress={() => router.back()}>
          <IconSymbol name="chevron.left" color="#0b0b0b" size={18} />
        </Pressable>

        <View style={styles.titlePill}>
          <Text style={styles.title}>Indoor Navigation Demo</Text>
          <Text style={styles.subTitle}>Pseudo-3D + moving route simulation</Text>
        </View>

        <Pressable style={styles.circleBtn} onPress={onToggleSpeed}>
          <IconSymbol name="speedometer" color="#0b0b0b" size={18} />
        </Pressable>
      </View>

      {/* Turn-by-turn banner */}
      <View style={styles.banner}>
        <View style={styles.bannerIcon}>
          <IconSymbol name={activeStep.icon as any} color="#fff" size={16} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.bannerTitle} numberOfLines={1}>
            {activeStep.title}
          </Text>
          <Text style={styles.bannerSub} numberOfLines={1}>
            {activeStep.sub}
          </Text>
        </View>
        <View style={styles.progressPill}>
          <Text style={styles.progressText}>{Math.round(t * 100)}%</Text>
        </View>
      </View>

      {/* Map area */}
      <View style={styles.mapArea}>
        {/* The whole “world” is tilted to feel like Google Maps perspective */}
        <View style={styles.world3D} pointerEvents="none">
          {/* Base floor */}
          <View style={styles.floor} />

          {/* Corridors */}
          <View style={[styles.corridor, { left: "10%", top: "18%", width: "18%", height: "72%" }]} />
          <View style={[styles.corridor, { left: "10%", top: "54%", width: "48%", height: "18%" }]} />
          <View style={[styles.corridor, { left: "26%", top: "32%", width: "18%", height: "40%" }]} />
          <View style={[styles.corridor, { left: "26%", top: "32%", width: "52%", height: "18%" }]} />

          {/* Rooms (blocks) */}
          <Room x={0.36} y={0.80} w={0.18} h={0.12} label="Room 401" />
          <Room x={0.60} y={0.80} w={0.20} h={0.12} label="Lab A" />
          <Room x={0.36} y={0.18} w={0.20} h={0.12} label="Office" />
          <Room x={0.62} y={0.18} w={0.24} h={0.12} label="Elevators" />

          {/* Doors (little rectangles) */}
          <Door x={0.30} y={0.78} />
          <Door x={0.30} y={0.70} />
          <Door x={0.30} y={0.62} />
          <Door x={0.58} y={0.54} />
          <Door x={0.58} y={0.46} />
          <Door x={0.58} y={0.38} />
          <Door x={0.78} y={0.32} />

          {/* Route segments */}
          {route.map((a, i) => {
            if (i === route.length - 1) return null;
            const b = route[i + 1];

            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            const ang = (Math.atan2(dy, dx) * 180) / Math.PI;

            return (
              <View
                key={`seg-${i}`}
                style={[
                  styles.routeSeg,
                  {
                    left: `${a.x * 100}%`,
                    top: `${a.y * 100}%`,
                    width: `${len * 100}%`,
                    transform: [{ rotate: `${ang}deg` }],
                  },
                ]}
              />
            );
          })}

          {/* Start/End pins */}
          <View style={[styles.pinStart, { left: `${route[0].x * 100}%`, top: `${route[0].y * 100}%` }]}>
            <Text style={styles.pinText}>S</Text>
          </View>

          <View
            style={[
              styles.pinEnd,
              {
                left: `${route[route.length - 1].x * 100}%`,
                top: `${route[route.length - 1].y * 100}%`,
              },
            ]}
          >
            <Text style={styles.pinText}>E</Text>
          </View>

          {/* Moving dot */}
          <View style={[styles.dotGlow, { left: `${pos.x * 100}%`, top: `${pos.y * 100}%` }]} />
          <View style={[styles.dot, { left: `${pos.x * 100}%`, top: `${pos.y * 100}%` }]} />
        </View>

        {/* Overlay fade (like distance haze) */}
        <View style={styles.haze} pointerEvents="none" />
      </View>

      {/* Bottom controls */}
      <View style={styles.sheet}>
        {!running ? (
          <Pressable
            style={styles.primaryBtn}
            onPress={() => {
              if (t >= 1) Alert.alert("Arrived", "Reset to run again.");
              else setRunning(true);
            }}
          >
            <IconSymbol name="paperplane.fill" color="#0b0b0b" size={18} />
            <Text style={styles.primaryText}>{t >= 1 ? "Arrived" : "Start Simulation"}</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.primaryBtn} onPress={() => setRunning(false)}>
            <IconSymbol name="pause.fill" color="#0b0b0b" size={18} />
            <Text style={styles.primaryText}>Pause</Text>
          </Pressable>
        )}

        <View style={styles.row}>
          <Pressable style={styles.secondaryBtn} onPress={onReset}>
            <Text style={styles.secondaryText}>Reset</Text>
          </Pressable>

          <Pressable
            style={styles.secondaryBtn}
            onPress={() => Alert.alert("Demo mode", "This is a UI simulation. Later connect to real BLE + routing.")}
          >
            <Text style={styles.secondaryText}>Info</Text>
          </Pressable>
        </View>

        <Text style={styles.hint}>Tip: Tap the speed icon to change simulation speed.</Text>
      </View>
    </View>
  );
}

/** Simple room box with label */
function Room({ x, y, w, h, label }: { x: number; y: number; w: number; h: number; label: string }) {
  return (
    <View
      style={[
        styles.room,
        {
          left: `${x * 100}%`,
          top: `${y * 100}%`,
          width: `${w * 100}%`,
          height: `${h * 100}%`,
        },
      ]}
    >
      <Text style={styles.roomLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/** Small door marker */
function Door({ x, y }: { x: number; y: number }) {
  return <View style={[styles.door, { left: `${x * 100}%`, top: `${y * 100}%` }]} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f7f0d7" },

  topBar: {
    paddingTop: Platform.OS === "ios" ? 54 : 18,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  circleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.10)",
  },
  titlePill: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.10)",
  },
  title: { fontWeight: "900", color: "#0b0b0b" },
  subTitle: { marginTop: 2, color: "#666", fontWeight: "700", fontSize: 12 },

  banner: {
    marginTop: 12,
    marginHorizontal: 16,
    backgroundColor: "#2c3ea3",
    borderRadius: 16,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  bannerIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.20)",
    alignItems: "center",
    justifyContent: "center",
  },
  bannerTitle: { color: "#fff", fontWeight: "900" },
  bannerSub: { marginTop: 2, color: "rgba(255,255,255,0.9)", fontWeight: "700", fontSize: 12 },
  progressPill: {
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  progressText: { color: "#fff", fontWeight: "900" },

  mapArea: {
    flex: 1,
    marginTop: 12,
    marginHorizontal: 16,
    backgroundColor: "#ffffff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.10)",
    overflow: "hidden",
    position: "relative",
  },

  // This is the “perspective” effect
  world3D: {
    flex: 1,
    transform: [{ perspective: 900 }, { rotateX: "55deg" }, { scale: 1.2 }],
  },

  floor: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#f5f7fb",
  },

  corridor: {
    position: "absolute",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.10)",
    // subtle “depth”
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
  },

  room: {
    position: "absolute",
    backgroundColor: "rgba(0,0,0,0.06)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    padding: 6,
  },
  roomLabel: { fontSize: 10, fontWeight: "900", color: "rgba(0,0,0,0.55)" },

  door: {
    position: "absolute",
    width: 12,
    height: 6,
    borderRadius: 3,
    marginLeft: -6,
    marginTop: -3,
    backgroundColor: "#0b0b0b",
    opacity: 0.35,
  },

  routeSeg: {
    position: "absolute",
    height: 10,
    borderRadius: 5,
    backgroundColor: "#2c3ea3",
    opacity: 0.95,
  },

  pinStart: {
    position: "absolute",
    width: 28,
    height: 28,
    borderRadius: 14,
    marginLeft: -14,
    marginTop: -14,
    backgroundColor: "#2c3ea3",
    borderWidth: 2,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  pinEnd: {
    position: "absolute",
    width: 28,
    height: 28,
    borderRadius: 14,
    marginLeft: -14,
    marginTop: -14,
    backgroundColor: "#f3d400",
    borderWidth: 2,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  pinText: { fontWeight: "900", color: "#0b0b0b" },

  dot: {
    position: "absolute",
    width: 14,
    height: 14,
    borderRadius: 7,
    marginLeft: -7,
    marginTop: -7,
    backgroundColor: "#1f6bff",
    borderWidth: 2,
    borderColor: "#fff",
  },
  dotGlow: {
    position: "absolute",
    width: 34,
    height: 34,
    borderRadius: 17,
    marginLeft: -17,
    marginTop: -17,
    backgroundColor: "rgba(31,107,255,0.18)",
  },

  haze: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: "45%",
    backgroundColor: "rgba(255,255,255,0.35)",
  },

  sheet: { paddingHorizontal: 16, paddingVertical: 14 },
  primaryBtn: {
    backgroundColor: "#f3d400",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  primaryText: { fontWeight: "900", color: "#0b0b0b", fontSize: 16 },

  row: { flexDirection: "row", gap: 10, marginTop: 10 },
  secondaryBtn: {
    flex: 1,
    backgroundColor: "#2c3ea3",
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
  },
  secondaryText: { color: "#fff", fontWeight: "900" },

  hint: { marginTop: 10, color: "#555", fontWeight: "700", fontSize: 12, textAlign: "center" },
});
