import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";

import { addCollectPoint, getSetupState, setLivePosition, setPlanName, type PositioningPoint } from "@/services/positioning-adapter";

type SetupTab = "collect" | "live" | "plans";

export default function PositioningSetupScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<SetupTab>("collect");
  const [points, setPoints] = useState<PositioningPoint[]>([]);
  const [planName, setPlan] = useState("ENG4_NORTH");
  const [xValue, setXValue] = useState("0.82");
  const [yValue, setYValue] = useState("0.42");

  const refresh = () => getSetupState().then((state) => { setPoints(state.points); setPlan(state.planName); setXValue(String(state.lastKnownPosition.x)); setYValue(String(state.lastKnownPosition.y)); });
  useEffect(() => { refresh(); }, []);

  const saveLive = async () => {
    await setLivePosition(Number(xValue) || 0, Number(yValue) || 0);
    await refresh();
  };

  const addPoint = async () => {
    await addCollectPoint(`P${points.length + 1}`, Number(xValue) || 0, Number(yValue) || 0);
    await refresh();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Pressable onPress={() => router.back()}><Text style={styles.back}>Back</Text></Pressable>
      <Text style={styles.title}>Positioning Setup</Text>
      <Text style={styles.sub}>Collect / Live / Plans from lathika workflow (persisted to device file storage).</Text>

      <View style={styles.tabRow}>
        {(["collect", "live", "plans"] as SetupTab[]).map((item) => (
          <Pressable key={item} style={[styles.tab, tab === item && styles.tabActive]} onPress={() => setTab(item)}>
            <Text style={styles.tabText}>{item.toUpperCase()}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.card}>
        <Text>X (0-1)</Text>
        <TextInput value={xValue} onChangeText={setXValue} style={styles.input} keyboardType="decimal-pad" />
        <Text>Y (0-1)</Text>
        <TextInput value={yValue} onChangeText={setYValue} style={styles.input} keyboardType="decimal-pad" />

        {tab === "collect" && <Pressable style={styles.btn} onPress={addPoint}><Text style={styles.btnText}>Save Collect Point</Text></Pressable>}
        {tab === "live" && <Pressable style={styles.btn} onPress={saveLive}><Text style={styles.btnText}>Update Live Position</Text></Pressable>}
        {tab === "plans" && (
          <>
            <Text>Plan Name</Text>
            <TextInput value={planName} onChangeText={setPlan} style={styles.input} />
            <Pressable style={styles.btn} onPress={async () => { await setPlanName(planName); await refresh(); }}><Text style={styles.btnText}>Save Plan</Text></Pressable>
          </>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.section}>Saved Collect Points</Text>
        {points.length === 0 ? <Text>No points saved yet.</Text> : points.map((p) => <Text key={p.id}>{p.name}: ({p.x.toFixed(3)}, {p.y.toFixed(3)})</Text>)}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f7f0d7" }, content: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 40, gap: 12 },
  back: { color: "#2b3ea0", fontWeight: "700" }, title: { fontSize: 24, fontWeight: "700" }, sub: { color: "#334155" },
  tabRow: { flexDirection: "row", gap: 8 }, tab: { backgroundColor: "#d4d0df", borderRadius: 8, padding: 8 }, tabActive: { backgroundColor: "#2c3ea3" }, tabText: { color: "#fff", fontWeight: "700" },
  card: { backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#ddd", padding: 12, gap: 8 }, input: { borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 8, backgroundColor: "#fff", padding: 8 },
  btn: { backgroundColor: "#2c3ea3", borderRadius: 8, padding: 10, alignItems: "center" }, btnText: { color: "#fff", fontWeight: "700" }, section: { fontWeight: "700" },
});
