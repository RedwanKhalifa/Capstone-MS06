import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { NavigationVisual } from "@/components/indoor-navigation/navigation-visual";
import { getLivePosition } from "@/services/positioning-adapter";
import { getRouteForDestination, type RoutePoint } from "@/services/routing-adapter";

export default function IndoorNavigationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ destination?: string }>();
  const destination = useMemo(() => params.destination ?? "ENG", [params.destination]);

  const [route, setRoute] = useState<RoutePoint[]>([]);
  const [currentPosition, setCurrentPosition] = useState({ x: 0.82, y: 0.42 });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Integration glue: routing adapter (thiv) + positioning adapter (lathika) feed into visuals (laith).
    getRouteForDestination(destination)
      .then(setRoute)
      .catch(() => setError("Route unavailable. Showing fallback state."));

    getLivePosition().then(setCurrentPosition).catch(() => {
      // Safe fallback if positioning setup isn't done yet.
      setCurrentPosition({ x: 0.82, y: 0.42 });
    });
  }, [destination]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backText}>Back</Text>
      </Pressable>

      <Text style={styles.title}>Indoor Navigation</Text>
      <Text style={styles.subtitle}>Destination: {destination}</Text>
      {error && <Text style={styles.warn}>{error}</Text>}

      <NavigationVisual route={route} currentPosition={currentPosition} />

      <View style={styles.metaCard}>
        <Text style={styles.metaTitle}>Live Position</Text>
        <Text>X: {currentPosition.x.toFixed(3)}</Text>
        <Text>Y: {currentPosition.y.toFixed(3)}</Text>
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
  subtitle: { color: "#2b3ea0", fontWeight: "600" },
  warn: { color: "#b91c1c" },
  metaCard: { backgroundColor: "#fff", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#ddd" },
  metaTitle: { fontWeight: "700", marginBottom: 4 },
});
