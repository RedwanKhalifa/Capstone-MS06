import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Polyline } from "react-native-svg";
import type { RoutePoint } from "@/services/routing-adapter";
export function NavigationVisual({ route, currentPosition }: { route: RoutePoint[]; currentPosition: { x: number; y: number } }) {
  const polyline = route.map((pt) => `${pt.x * 100},${pt.y * 100}`).join(" ");
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Indoor Route Overlay</Text>
      <Svg viewBox="0 0 100 100" style={styles.svg}>
        {route.length > 1 && <Polyline points={polyline} fill="none" stroke="#2c3ea3" strokeWidth="2.5" />}
        {route[0] && <Circle cx={route[0].x * 100} cy={route[0].y * 100} r={2.8} fill="#1d4ed8" />}
        {route[route.length - 1] && <Circle cx={route[route.length - 1].x * 100} cy={route[route.length - 1].y * 100} r={2.8} fill="#f3d400" />}
        <Circle cx={currentPosition.x * 100} cy={currentPosition.y * 100} r={2.1} fill="#ef4444" />
      </Svg>
    </View>
  );
}
const styles = StyleSheet.create({ wrap: { backgroundColor: "#fff", borderRadius: 16, padding: 12, borderWidth: 1, borderColor: "#ddd" }, title: { fontWeight: "700", color: "#2c3ea3", marginBottom: 8 }, svg: { width: "100%", aspectRatio: 1.7, backgroundColor: "#f5f6fa", borderRadius: 10 } });
