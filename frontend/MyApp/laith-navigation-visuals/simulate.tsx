import { useLocalSearchParams, useRouter } from "expo-router";
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
function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

// angle in degrees from p -> q (0° = right, 90° = down in screen coords)
function angleDeg(p: Pt, q: Pt) {
  const dx = q.x - p.x;
  const dy = q.y - p.y;
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

export default function SimulateScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ from?: string; to?: string }>();

  const fromLabel = params.from ?? "ENG401";
  const toLabel = params.to ?? "ENG411";

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
  const [mapSize, setMapSize] = useState({ w: 1, h: 1 });

  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  const activeStep = useMemo(() => {
    let current = steps[0];
    for (const s of steps) if (t >= s.atT) current = s;
    return current;
  }, [t, steps]);

  // Convert t into point on polyline
  const pos = useMemo(() => {
    const n = route.length;
    if (n < 2) return route[0] ?? { x: 0.1, y: 0.1 };

    const segCount = n - 1;
    const segT = t * segCount;
    const segIdx = Math.min(segCount - 1, Math.max(0, Math.floor(segT)));
    const localT = segT - segIdx;

    return lerpPt(route[segIdx], route[segIdx + 1], localT);
  }, [t, route]);

  // figure out which segment we are on so we can point the arrow forward
  const heading = useMemo(() => {
    const n = route.length;
    if (n < 2) return 0;
    const segCount = n - 1;
    const segT = t * segCount;
    const segIdx = Math.min(segCount - 1, Math.max(0, Math.floor(segT)));
    const a = route[segIdx];
    const b = route[segIdx + 1];
    // our triangle points "up" by default, so rotate to match heading
    // angleDeg uses 0° = right, 90° = down
    // if triangle points up, we want 0° = up, so adjust:
    const ang = angleDeg(a, b); // 0 right, 90 down
    return ang + 90; // rotate so "up" becomes the forward direction
  }, [t, route]);

  // Camera anchor (dot slightly below center)
  const camAnchor = { x: 0.5, y: 0.68 };

  const camTranslate = useMemo(() => {
    const tx = (camAnchor.x - pos.x) * mapSize.w;
    const ty = (camAnchor.y - pos.y) * mapSize.h;
    return {
      x: clamp(tx, -mapSize.w * 0.45, mapSize.w * 0.45),
      y: clamp(ty, -mapSize.h * 0.45, mapSize.h * 0.45),
    };
  }, [pos.x, pos.y, mapSize.w, mapSize.h]);

  // Animation loop
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
          <Text style={styles.title}>Navigation Demo</Text>
          <Text style={styles.subTitle}>
            {fromLabel} → {toLabel}
          </Text>
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
      <View
        style={styles.mapArea}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          setMapSize({ w: Math.max(1, width), h: Math.max(1, height) });
        }}
      >
        {/* WORLD with camera-follow */}
        <View
          style={[
            styles.world3D,
            {
              transform: [
                { translateX: camTranslate.x },
                { translateY: camTranslate.y },
                { perspective: 900 },
                { rotateX: "55deg" },
                { scale: 1.2 },
              ],
            },
          ]}
          pointerEvents="none"
        >
          <View style={styles.floor} />

          {/* Corridors */}
          <View style={[styles.corridor, { left: "10%", top: "18%", width: "18%", height: "72%" }]} />
          <View style={[styles.corridor, { left: "10%", top: "54%", width: "48%", height: "18%" }]} />
          <View style={[styles.corridor, { left: "26%", top: "32%", width: "18%", height: "40%" }]} />
          <View style={[styles.corridor, { left: "26%", top: "32%", width: "52%", height: "18%" }]} />

          {/* Rooms */}
          <Room x={0.36} y={0.80} w={0.18} h={0.12} label="ENG401" />
          <Room x={0.60} y={0.80} w={0.20} h={0.12} label="Lab A" />
          <Room x={0.36} y={0.18} w={0.20} h={0.12} label="ENG411" />
          <Room x={0.62} y={0.18} w={0.24} h={0.12} label="Elevators" />

          {/* Doors */}
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

          {/* Pins */}
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

          {/* ✅ GOOGLE-MAPS STYLE USER MARKER */}
          <View style={[styles.userPulse, { left: `${pos.x * 100}%`, top: `${pos.y * 100}%` }]} />

          {/* heading cone */}
          <View
            style={[
              styles.userConeWrap,
              { left: `${pos.x * 100}%`, top: `${pos.y * 100}%`, transform: [{ rotate: `${heading}deg` }] },
            ]}
          >
            <View style={styles.userCone} />
          </View>

          {/* main blue dot */}
          <View style={[styles.userDot, { left: `${pos.x * 100}%`, top: `${pos.y * 100}%` }]}>
            <View style={styles.userInnerWhite} />

            {/* arrow */}
            <View style={[styles.userArrow, { transform: [{ rotate: `${heading}deg` }] }]} />
          </View>
        </View>

        {/* Haze overlay */}
        <View style={styles.haze} pointerEvents="none" />
      </View>

      {/* Controls */}
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
            onPress={() => Alert.alert("Demo mode", "User marker is Google-Maps style (dot + arrow + cone).")}
          >
            <Text style={styles.secondaryText}>Info</Text>
          </Pressable>
        </View>

        <Text style={styles.hint}>Blue dot is the main focal point (arrow + cone + strong glow).</Text>
      </View>
    </View>
  );
}

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
  subTitle: { marginTop: 2, color: "#666", fontWeight: "800", fontSize: 12 },

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
  world3D: { flex: 1 },

  floor: { ...StyleSheet.absoluteFillObject, backgroundColor: "#f5f7fb" },

  corridor: {
    position: "absolute",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.10)",
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

  // ✅ Google Maps style user marker
  userPulse: {
    position: "absolute",
    width: 70,
    height: 70,
    borderRadius: 35,
    marginLeft: -35,
    marginTop: -35,
    backgroundColor: "rgba(31,107,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(31,107,255,0.30)",
  },

  userConeWrap: {
    position: "absolute",
    width: 120,
    height: 120,
    marginLeft: -60,
    marginTop: -60,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  userCone: {
    width: 0,
    height: 0,
    borderLeftWidth: 26,
    borderRightWidth: 26,
    borderBottomWidth: 70,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "rgba(31,107,255,0.20)",
    borderRadius: 10,
  },

  userDot: {
    position: "absolute",
    width: 26,
    height: 26,
    borderRadius: 13,
    marginLeft: -13,
    marginTop: -13,
    backgroundColor: "#1f6bff",
    borderWidth: 2,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",

    shadowColor: "#000",
    shadowOpacity: 0.28,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  userInnerWhite: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#fff",
    opacity: 0.95,
  },
  // little triangle arrow (points up by default)
  userArrow: {
    position: "absolute",
    top: -10,
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderBottomWidth: 12,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "#1f6bff",
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
