import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { IndoorRoutingMap } from "@/components/indoor-navigation/indoor-routing-map";
import { subscribeLivePosition, type LivePosition } from "@/services/positioning-adapter";

export default function IndoorNavigationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ destination?: string }>();
  const requestedDestination =
    typeof params.destination === "string" ? params.destination : undefined;

  const [currentPosition, setCurrentPosition] = useState<LivePosition>({
    x: 0.82,
    y: 0.42,
    timestamp: Date.now(),
    planId: "ENG4_NORTH",
  });
  const [routeNodeIds, setRouteNodeIds] = useState<string[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeLivePosition(setCurrentPosition, 700);
    return unsubscribe;
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backText}>Back</Text>
      </Pressable>

      <Text style={styles.title}>Indoor Navigation</Text>

      <View style={styles.mapContainer}>
        <IndoorRoutingMap destination={requestedDestination} onRouteComputed={setRouteNodeIds} />
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
});
