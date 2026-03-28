import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { IndoorRoutingMap } from "@/components/indoor-navigation/indoor-routing-map";
import { usePositioning } from "@/context/positioning";
import { FLOOR_PLANS, type PlanID } from "@/types/fingerprint";

const FALLBACK_POSITION = { x: 0.82, y: 0.42, timestamp: 0, planId: "ENG4_NORTH" };
const HOLD_INTERVAL_MS = 120;
const HOLD_START_DELAY_MS = 220;
const STEP_OPTIONS = [0.002, 0.005, 0.01, 0.02] as const;

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

export default function IndoorNavigationScreen() {
  const router = useRouter();
  const positioning = usePositioning();
  const currentPosition = positioning.prediction ?? FALLBACK_POSITION;
  const params = useLocalSearchParams<{ destination?: string }>();
  const requestedDestination =
    typeof params.destination === "string" ? params.destination : undefined;
  const [routeNodeIds, setRouteNodeIds] = useState<string[]>([]);
  const currentPlanId = positioning.activePlanId;
  const [manualStep, setManualStep] = useState<number>(0.01);
  const holdTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdStartRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRepeatingRef = useRef(false);
  const currentPositionRef = useRef(currentPosition);

  useEffect(() => {
    currentPositionRef.current = currentPosition;
  }, [currentPosition]);

  const stopHold = () => {
    if (holdStartRef.current) {
      clearTimeout(holdStartRef.current);
      holdStartRef.current = null;
    }
    if (!holdTimerRef.current) return;
    clearInterval(holdTimerRef.current);
    holdTimerRef.current = null;
  };

  const nudgeManual = (dx: number, dy: number) => {
    const source = currentPositionRef.current;
    const nextX = clamp01(source.x + dx);
    const nextY = clamp01(source.y + dy);
    positioning.setManualPosition(nextX, nextY);
  };

  const beginHold = (dx: number, dy: number) => {
    stopHold();
    isRepeatingRef.current = false;
    holdStartRef.current = setTimeout(() => {
      isRepeatingRef.current = true;
      nudgeManual(dx, dy);
      holdTimerRef.current = setInterval(() => {
        nudgeManual(dx, dy);
      }, HOLD_INTERVAL_MS);
    }, HOLD_START_DELAY_MS);
  };

  const endHold = () => {
    stopHold();
    isRepeatingRef.current = false;
  };

  const tapNudge = (dx: number, dy: number) => {
    if (isRepeatingRef.current) return;
    nudgeManual(dx, dy);
  };

  useEffect(() => endHold, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backText}>Back</Text>
      </Pressable>

      <Text style={styles.title}>Indoor Navigation</Text>

      <View style={styles.planRow}>
        {FLOOR_PLANS.map((plan) => (
          <Pressable
            key={plan.id}
            style={[
              styles.planButton,
              currentPlanId === plan.id && styles.planButtonActive,
            ]}
            onPress={() => positioning.setActivePlan(plan.id)}>
            <Text
              style={
                currentPlanId === plan.id
                  ? styles.planButtonTextActive
                  : styles.planButtonText
              }>
              {plan.title}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.mapContainer}>
        <IndoorRoutingMap destination={requestedDestination} onRouteComputed={setRouteNodeIds} />
      </View>

      <View style={styles.metaCard}>
        <Text style={styles.metaTitle}>Manual D-Pad (Testing)</Text>

        <View style={styles.dpadWrap}>
          <Pressable
            style={styles.dpadBtn}
            onPressIn={() => beginHold(0, -manualStep)}
            onPressOut={endHold}
            onPress={() => tapNudge(0, -manualStep)}>
            <Text style={styles.dpadText}>Up</Text>
          </Pressable>

          <View style={styles.dpadRow}>
            <Pressable
              style={styles.dpadBtn}
              onPressIn={() => beginHold(-manualStep, 0)}
              onPressOut={endHold}
              onPress={() => tapNudge(-manualStep, 0)}>
              <Text style={styles.dpadText}>Left</Text>
            </Pressable>
            <Pressable
              style={styles.dpadBtn}
              onPressIn={() => beginHold(manualStep, 0)}
              onPressOut={endHold}
              onPress={() => tapNudge(manualStep, 0)}>
              <Text style={styles.dpadText}>Right</Text>
            </Pressable>
          </View>

          <Pressable
            style={styles.dpadBtn}
            onPressIn={() => beginHold(0, manualStep)}
            onPressOut={endHold}
            onPress={() => tapNudge(0, manualStep)}>
            <Text style={styles.dpadText}>Down</Text>
          </Pressable>
        </View>

        <View style={styles.stepRow}>
          {STEP_OPTIONS.map((step) => (
            <Pressable
              key={step}
              style={[styles.stepChip, manualStep === step && styles.stepChipActive]}
              onPress={() => setManualStep(step)}>
              <Text style={manualStep === step ? styles.stepChipTextActive : styles.stepChipText}>
                {step.toFixed(3)}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.hintText}>Pressing any direction switches to manual position mode.</Text>
        <Text style={styles.hintText}>Step size: {manualStep.toFixed(3)} normalized units</Text>
        <Text style={styles.hintText}>Mode: {positioning.liveMode.toUpperCase()}</Text>
      </View>

      {requestedDestination ? <Text style={styles.destLabel}>Destination: {requestedDestination}</Text> : null}
      {routeNodeIds.length > 1 ? (
        <Text style={styles.routeLabel}>Dijkstra route: {routeNodeIds.join(" -> ")}</Text>
      ) : null}

      <View style={styles.metaCard}>
        <Text style={styles.metaTitle}>Live Position</Text>
        <Text>X: {currentPosition.x.toFixed(3)}</Text>
        <Text>Y: {currentPosition.y.toFixed(3)}</Text>
        <Text>Last update: {new Date(currentPosition.timestamp).toLocaleTimeString()}</Text>
        <Text>Plan: {currentPosition.planId ?? "ENG4_NORTH"}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f7f0d7" },
  content: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 40, gap: 12 },
  backButton: { marginBottom: 8 },
  backText: { color: "#2b3ea0", fontWeight: "700" },
  title: { fontSize: 24, fontWeight: "700", color: "#0b0b0b" },
  mapContainer: { minHeight: 560, borderRadius: 12, overflow: "hidden" },
  destLabel: { color: "#334155", fontSize: 13 },
  routeLabel: { color: "#2c3ea3", fontSize: 13, fontWeight: "600" },
  metaCard: { backgroundColor: "#fff", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#ddd" },
  metaTitle: { fontWeight: "700", marginBottom: 4 },
  hintText: { color: "#475569", fontSize: 12 },
  stepRow: { flexDirection: "row", gap: 8, marginTop: 10, marginBottom: 2, flexWrap: "wrap" },
  stepChip: {
    borderWidth: 1,
    borderColor: "#94a3b8",
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "#fff",
  },
  stepChipActive: { borderColor: "#1d4ed8", backgroundColor: "#dbeafe" },
  stepChipText: { color: "#334155", fontWeight: "600" },
  stepChipTextActive: { color: "#1e3a8a", fontWeight: "700" },
  dpadWrap: { alignItems: "center", gap: 8, marginTop: 10 },
  dpadRow: { flexDirection: "row", gap: 8 },
  dpadBtn: {
    minWidth: 84,
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#2c3ea3",
    backgroundColor: "#eef2ff",
  },
  dpadText: { color: "#1e3a8a", fontWeight: "700" },
  planRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  planButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#94a3b8",
    backgroundColor: "#fff",
  },
  planButtonActive: {
    backgroundColor: "#2c3ea3",
    borderColor: "#1d4ed8",
  },
  planButtonText: { color: "#0f172a", fontWeight: "700" },
  planButtonTextActive: { color: "#fff", fontWeight: "700" },
});
