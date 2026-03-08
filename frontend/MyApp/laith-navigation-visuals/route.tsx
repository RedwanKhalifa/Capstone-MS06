import { useRouter } from "expo-router";
import React from "react";
import {
    Alert,
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { IconSymbol } from "../../components/ui/icon-symbol";

export default function RouteScreen() {
  const router = useRouter();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.title}>NAVIGATION ROUTE</Text>
        <View style={styles.profileCircle}>
          <IconSymbol name="person.circle" color="#0b0b0b" size={32} />
        </View>
      </View>

      {/* Current Location */}
      <View style={styles.card}>
        <View style={styles.iconCircle}>
          <IconSymbol name="location.fill" color="#2c3ea3" size={20} />
        </View>
        <View>
          <Text style={styles.cardLabel}>Current Location</Text>
          <Text style={styles.cardValue}>ENG Building - Room 412</Text>
        </View>
      </View>

      {/* Destination */}
      <View style={styles.card}>
        <View style={styles.iconCircle}>
          <IconSymbol name="flag.fill" color="#2c3ea3" size={20} />
        </View>
        <View>
          <Text style={styles.cardLabel}>Destination</Text>
          <Text style={styles.cardValue}>Library Building</Text>
        </View>
      </View>

      {/* Route Summary */}
      <View style={styles.routeSummary}>
        <Text style={styles.routeText}>Distance: 120m</Text>
        <Text style={styles.routeText}>Estimated Time: 2 min</Text>
      </View>

      {/* Floorplan + Route Overlay (MOCK) */}
      <View style={styles.mapWrap}>
        {/* IMPORTANT:
            Put your image at: assets/floorplans/eng_04.png
            If your file name/path is different, update the require(...) line.
        */}
        <Image
source={require("../../assets/images/eng_04.png")}
          style={styles.mapImage}
          resizeMode="contain"
        />

        {/* Overlay layer */}
        <View style={styles.overlay} pointerEvents="none">
          {/* Start marker */}
          <View style={[styles.pinStart, { left: "22%", top: "55%" }]}>
            <Text style={styles.pinText}>S</Text>
          </View>

          {/* End marker */}
          <View style={[styles.pinEnd, { left: "70%", top: "32%" }]}>
            <Text style={styles.pinText}>E</Text>
          </View>

          {/* Route line mock (3 segments) */}
          <View
            style={[
              styles.routeSeg,
              { left: "24%", top: "56%", width: "25%", transform: [{ rotate: "0deg" }] },
            ]}
          />
          <View
            style={[
              styles.routeSeg,
              { left: "45%", top: "48%", width: "18%", transform: [{ rotate: "-35deg" }] },
            ]}
          />
          <View
            style={[
              styles.routeSeg,
              { left: "58%", top: "38%", width: "16%", transform: [{ rotate: "0deg" }] },
            ]}
          />
        </View>
      </View>

      {/* Buttons */}
      <Pressable
        style={styles.startButton}
        onPress={() => Alert.alert("Navigation Started", "Mock navigation is now running.")}
      >
        <IconSymbol name="paperplane.fill" color="#0b0b0b" size={18} />
        <Text style={styles.startText}>Start Navigation</Text>
      </Pressable>

      <Pressable style={styles.cancelButton} onPress={() => router.back()}>
        <Text style={styles.cancelText}>Cancel</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f7f0d7" },
  content: { paddingHorizontal: 20, paddingTop: 50, paddingBottom: 100 },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: { fontSize: 22, fontWeight: "700", color: "#0b0b0b" },

  profileCircle: {
    backgroundColor: "#f3d400",
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },

  card: {
    marginTop: 20,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(44,62,163,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardLabel: { fontSize: 12, color: "#666" },
  cardValue: { fontSize: 16, fontWeight: "700", color: "#0b0b0b" },

  routeSummary: {
    marginTop: 20,
    backgroundColor: "#2c3ea3",
    borderRadius: 16,
    padding: 16,
  },
  routeText: {
    color: "#fff",
    fontWeight: "700",
    textAlign: "center",
  },

  mapWrap: {
    marginTop: 20,
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    height: 320,
  },
  mapImage: {
    width: "100%",
    height: "100%",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },

  pinStart: {
    position: "absolute",
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#2c3ea3",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  pinEnd: {
    position: "absolute",
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#f3d400",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  pinText: {
    fontWeight: "900",
    color: "#0b0b0b",
  },

  routeSeg: {
    position: "absolute",
    height: 6,
    borderRadius: 3,
    backgroundColor: "#2c3ea3",
    opacity: 0.9,
  },

  startButton: {
    marginTop: 24,
    backgroundColor: "#f3d400",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  startText: { fontWeight: "700", color: "#0b0b0b" },

  cancelButton: {
    marginTop: 12,
    backgroundColor: "#999",
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
  },
  cancelText: { color: "#fff", fontWeight: "700" },
});
