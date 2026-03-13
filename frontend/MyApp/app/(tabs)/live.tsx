import React, { useEffect, useMemo, useState } from "react";
import {
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, { Circle, Line, Polygon } from "react-native-svg";

import { useHeading } from "@/hooks/useHeading";
import {
  getLivePosition,
  setPlanName,
  subscribeLivePosition,
  type LivePosition,
} from "@/services/positioning-adapter";

type LivePlan = {
  id: string;
  title: string;
  image: number;
};

const LIVE_PLANS: LivePlan[] = [
  { id: "ENG_BASEMENT", title: "Basement", image: require("../../assets/eng-floorplans/Copy_of_ENG_BASEMENT_NORTH_SOUTH.png") },
  { id: "ENG_LOWER_GROUND_NORTH", title: "LG North", image: require("../../assets/eng-floorplans/Copy_of_ENG_LOWER_GROUND_FLOOR_NORTH.png") },
  { id: "ENG_LOWER_GROUND_SOUTH", title: "LG South", image: require("../../assets/eng-floorplans/Copy_of_ENG_LOWER_GROUND_FLOOR_SOUTH.png") },
  { id: "ENG1_NORTH", title: "Floor 1 North", image: require("../../assets/eng-floorplans/Copy_of_ENG_1ST_FLOOR_NORTH.png") },
  { id: "ENG1_SOUTH", title: "Floor 1 South", image: require("../../assets/eng-floorplans/Copy_of_ENG_1ST_FLOOR_SOUTH.png") },
  { id: "ENG2_NORTH", title: "Floor 2 North", image: require("../../assets/eng-floorplans/Copy_of_ENG_2ND_FLOOR_NORTH.png") },
  { id: "ENG2_SOUTH", title: "Floor 2 South", image: require("../../assets/eng-floorplans/Copy_of_ENG_2ND_FLOOR_SOUTH.png") },
  { id: "ENG3_NORTH", title: "Floor 3 North", image: require("../../assets/eng-floorplans/Copy_of_ENG_3RD_FLOOR_NORTH.png") },
  { id: "ENG3_SOUTH", title: "Floor 3 South", image: require("../../assets/eng-floorplans/Copy_of_ENG_3RD_FLOOR_SOUTH.png") },
  { id: "ENG4_NORTH", title: "Floor 4 North", image: require("../../assets/eng-floorplans/Copy_of_ENG_4TH_FLOOR_NORTH.png") },
  { id: "ENG4_SOUTH", title: "Floor 4 South", image: require("../../assets/eng-floorplans/Copy_of_ENG_4TH_FLOOR_SOUTH.png") },
  { id: "ENG5_NORTH", title: "Floor 5 North", image: require("../../assets/eng-floorplans/Copy_of_ENG_5TH_FLOOR_NORTH.png") },
  { id: "ENG5_SOUTH", title: "Floor 5 South", image: require("../../assets/eng-floorplans/Copy_of_ENG_5TH_FLOOR_SOUTH.png") },
];

const DEFAULT_POSITION: LivePosition = {
  x: 0.82,
  y: 0.42,
  timestamp: Date.now(),
  planId: "ENG4_NORTH",
};

function headingTriangle(cx: number, cy: number, heading: number) {
  const radius = 9;
  const radians = ((heading - 90) * Math.PI) / 180;
  const nose = {
    x: cx + Math.cos(radians) * radius,
    y: cy + Math.sin(radians) * radius,
  };
  const left = {
    x: cx + Math.cos(radians + 2.38) * 6,
    y: cy + Math.sin(radians + 2.38) * 6,
  };
  const right = {
    x: cx + Math.cos(radians - 2.38) * 6,
    y: cy + Math.sin(radians - 2.38) * 6,
  };

  return `${nose.x},${nose.y} ${left.x},${left.y} ${right.x},${right.y}`;
}

export default function LiveTrackingTab() {
  const heading = useHeading();
  const [currentPosition, setCurrentPosition] = useState<LivePosition>(DEFAULT_POSITION);
  const [selectedPlanId, setSelectedPlanId] = useState<string>(DEFAULT_POSITION.planId ?? "ENG4_NORTH");

  useEffect(() => {
    void getLivePosition().then((position) => {
      setCurrentPosition(position);
      if (position.planId) {
        setSelectedPlanId(position.planId);
      }
    });
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeLivePosition((position) => {
      setCurrentPosition(position);
      if (position.planId) {
        setSelectedPlanId(position.planId);
      }
    }, 700);

    return unsubscribe;
  }, []);

  const selectedPlan = useMemo(
    () => LIVE_PLANS.find((plan) => plan.id === selectedPlanId) ?? LIVE_PLANS.find((plan) => plan.id === "ENG4_NORTH") ?? LIVE_PLANS[0],
    [selectedPlanId]
  );

  const markerX = Math.max(8, Math.min(92, currentPosition.x * 100));
  const markerY = Math.max(8, Math.min(92, currentPosition.y * 100));
  const coneLength = 18;
  const headingRadians = ((heading - 90) * Math.PI) / 180;
  const coneEnd = {
    x: markerX + Math.cos(headingRadians) * coneLength,
    y: markerY + Math.sin(headingRadians) * coneLength,
  };

  const onSelectPlan = async (planId: string) => {
    setSelectedPlanId(planId);
    await setPlanName(planId);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <View style={styles.headerTextWrap}>
          <Text style={styles.title}>Live Tracking</Text>
          <Text style={styles.subtitle}>
            Device position overlay on ENG floor maps using the tracking state already in this repo
          </Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>LIVE</Text>
        </View>
      </View>

      <View style={styles.metaCard}>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>Plan</Text>
          <Text style={styles.metaValue}>{selectedPlan.title}</Text>
        </View>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>Position</Text>
          <Text style={styles.metaValue}>
            {currentPosition.x.toFixed(3)}, {currentPosition.y.toFixed(3)}
          </Text>
        </View>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>Heading</Text>
          <Text style={styles.metaValue}>{Math.round(heading)}°</Text>
        </View>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>Accuracy</Text>
          <Text style={styles.metaValue}>
            {typeof currentPosition.accuracy === "number" ? `${currentPosition.accuracy.toFixed(1)} m` : "N/A"}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Floor maps</Text>
        <View style={styles.selectorGrid}>
          {LIVE_PLANS.map((plan) => {
            const selected = plan.id === selectedPlanId;
            return (
              <Pressable
                key={plan.id}
                style={[styles.selectorButton, selected && styles.selectorButtonSelected]}
                onPress={() => void onSelectPlan(plan.id)}
              >
                <Text style={[styles.selectorButtonText, selected && styles.selectorButtonTextSelected]}>
                  {plan.title}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.mapCard}>
        <ImageBackground source={selectedPlan.image} resizeMode="contain" style={styles.mapCanvas} imageStyle={styles.mapImage}>
          <Svg viewBox="0 0 100 100" style={styles.mapOverlay}>
            <Line
              x1={markerX}
              y1={markerY}
              x2={coneEnd.x}
              y2={coneEnd.y}
              stroke="rgba(37,99,235,0.35)"
              strokeWidth={4}
              strokeLinecap="round"
            />
            <Circle cx={markerX} cy={markerY} r={5.5} fill="rgba(37,99,235,0.18)" />
            <Circle cx={markerX} cy={markerY} r={2.8} fill="#2563eb" stroke="#ffffff" strokeWidth={1.1} />
            <Polygon points={headingTriangle(markerX, markerY, heading)} fill="#2563eb" opacity={0.95} />
          </Svg>
          <View style={styles.mapLabel}>
            <Text style={styles.mapLabelTitle}>{selectedPlan.title}</Text>
            <Text style={styles.mapLabelText}>
              Updated {new Date(currentPosition.timestamp).toLocaleTimeString()}
            </Text>
          </View>
        </ImageBackground>
      </View>

      <View style={styles.noteCard}>
        <Text style={styles.noteTitle}>How this works</Text>
        <Text style={styles.noteText}>
          This tab listens to the existing live-position store and renders the marker on the selected ENG floor map.
          If another part of the app updates the stored position, this view updates automatically.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f7f0d7",
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 100,
    gap: 22,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  headerTextWrap: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0b0b0b",
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: "#43506c",
  },
  badge: {
    backgroundColor: "#0f172a",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  badgeText: {
    color: "#8ec5ff",
    fontWeight: "800",
    fontSize: 12,
  },
  metaCard: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#dde3f4",
    padding: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },
  metaItem: {
    minWidth: 120,
    flex: 1,
  },
  metaLabel: {
    color: "#6b7280",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  metaValue: {
    marginTop: 4,
    color: "#111827",
    fontSize: 18,
    fontWeight: "800",
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    color: "#1f2d86",
    fontSize: 18,
    fontWeight: "800",
  },
  selectorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  selectorButton: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#d8deef",
  },
  selectorButtonSelected: {
    backgroundColor: "#ecf0ff",
    borderColor: "#2c3ea3",
  },
  selectorButtonText: {
    color: "#10204b",
    fontWeight: "800",
    fontSize: 13,
  },
  selectorButtonTextSelected: {
    color: "#2036a4",
  },
  mapCard: {
    backgroundColor: "#ffffff",
    borderRadius: 28,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#dde3f4",
  },
  mapCanvas: {
    width: "100%",
    aspectRatio: 1.55,
    justifyContent: "flex-end",
  },
  mapImage: {
    resizeMode: "contain",
  },
  mapOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  mapLabel: {
    margin: 16,
    alignSelf: "flex-start",
    backgroundColor: "rgba(11,18,39,0.78)",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  mapLabelTitle: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 15,
  },
  mapLabelText: {
    color: "#cbd5e1",
    marginTop: 2,
    fontSize: 12,
  },
  noteCard: {
    backgroundColor: "#fffdf7",
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: "#eadfb8",
  },
  noteTitle: {
    color: "#1f2d86",
    fontWeight: "800",
    marginBottom: 8,
  },
  noteText: {
    color: "#4c5567",
    lineHeight: 21,
  },
});
