import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { FloorplanCanvas } from "@/components/maps/floorplan-canvas";
import { usePositioning } from "@/context/positioning";
import { FLOOR_PLANS } from "@/types/fingerprint";

const FALLBACK_POSITION = { x: 0.82, y: 0.42, timestamp: 0, planId: "ENG4_NORTH" };

export default function IndoorNavigationScreen() {
  const router = useRouter();
  const positioning = usePositioning();
  const currentPosition = positioning.prediction ?? FALLBACK_POSITION;

  const [destinationDot, setDestinationDot] = useState<{ xNorm: number; yNorm: number } | null>(null);
  const [placingDestination, setPlacingDestination] = useState(false);
  const [tracking, setTracking] = useState(true);
  const [recenterTrigger, setRecenterTrigger] = useState(0);

  const plan = FLOOR_PLANS.find((p) => p.id === "ENG4_NORTH")!;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backText}>Back</Text>
      </Pressable>

      <Text style={styles.title}>Indoor Navigation</Text>

      {/* ── Floorplan map ── */}
      <View style={styles.mapContainer}>
        <FloorplanCanvas
          imageSource={plan.image}
          points={[]}
          liveDot={{ xNorm: currentPosition.x, yNorm: currentPosition.y }}
          destinationDot={destinationDot}
          followDot={tracking}
          onUserInteraction={() => setTracking(false)}
          recenterTrigger={recenterTrigger}
          canAddPoint={placingDestination}
          onAddPoint={(xNorm, yNorm) => {
            setDestinationDot({ xNorm, yNorm });
            setPlacingDestination(false);
          }}
        />
        {placingDestination && (
          <View style={styles.mapHintOverlay} pointerEvents="none">
            <Text style={styles.mapHintText}>Tap map to drop destination</Text>
          </View>
        )}
        {!tracking && (
          <Pressable
            style={styles.recenterBtn}
            onPress={() => {
              setRecenterTrigger((v) => v + 1);
              setTracking(true);
            }}>
            <Text style={styles.recenterBtnText}>⊙</Text>
          </Pressable>
        )}
      </View>

      {/* ── Destination controls ── */}
      <View style={styles.controlRow}>
        <Pressable
          style={[styles.btn, placingDestination && styles.btnCancel]}
          onPress={() => setPlacingDestination((v) => !v)}>
          <Text style={styles.btnText}>{placingDestination ? "Cancel" : "Set Destination"}</Text>
        </Pressable>
        {destinationDot && (
          <Pressable style={styles.btnOutline} onPress={() => setDestinationDot(null)}>
            <Text style={styles.btnOutlineText}>Clear Destination</Text>
          </Pressable>
        )}
      </View>
      {destinationDot && (
        <Text style={styles.destLabel}>
          Destination: ({destinationDot.xNorm.toFixed(3)}, {destinationDot.yNorm.toFixed(3)})
        </Text>
      )}

      {/* ── Position card ── */}
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
  warn: { color: "#b91c1c" },
  mapContainer: { height: 420, borderRadius: 12, overflow: "hidden", position: "relative" },
  recenterBtn: {
    position: "absolute",
    bottom: 14,
    right: 14,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  recenterBtnText: { fontSize: 22, color: "#2c3ea3", lineHeight: 26 },
  mapHintOverlay: { position: "absolute", bottom: 12, left: 0, right: 0, alignItems: "center" },
  mapHintText: {
    backgroundColor: "rgba(0,0,0,0.6)",
    color: "#fff",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    fontSize: 13,
    fontWeight: "600",
    overflow: "hidden",
  },
  controlRow: { flexDirection: "row", gap: 10, alignItems: "center", flexWrap: "wrap" },
  btn: { backgroundColor: "#2c3ea3", borderRadius: 8, paddingVertical: 10, paddingHorizontal: 14 },
  btnCancel: { backgroundColor: "#b91c1c" },
  btnText: { color: "#fff", fontWeight: "700" },
  btnOutline: { borderWidth: 1, borderColor: "#2c3ea3", borderRadius: 8, paddingVertical: 10, paddingHorizontal: 14, backgroundColor: "#fff" },
  btnOutlineText: { color: "#2c3ea3", fontWeight: "600" },
  destLabel: { color: "#334155", fontSize: 13 },
  metaCard: { backgroundColor: "#fff", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#ddd" },
  metaTitle: { fontWeight: "700", marginBottom: 4 },
});
