import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { IconSymbol } from "../../components/ui/icon-symbol";
import { useAppState } from "../../context/app-state";

const EMPTY_TEXT = "Add Locations";

const SAMPLE_LOCATIONS = ["ENG 412", "EPH", "DCC", "SCC", "POD"];

export default function SavedScreen() {
  const { saved, setSaved } = useAppState();
  const router = useRouter();
  const [expanded, setExpanded] = useState({
    favorites: false,
    wantToGo: false,
    starred: false,
  });

  const ensureSample = (category: keyof typeof saved) => {
    if (saved[category].length > 0) return;
    setSaved({
      ...saved,
      [category]: SAMPLE_LOCATIONS.slice(0, 3),
    });
  };

  const renderGroup = (label: string, icon: "heart.fill" | "flag.fill" | "star.fill", key: keyof typeof saved) => {
    const items = saved[key];
    const visibleItems = expanded[key] ? items : items.slice(0, 3);
    return (
      <View style={styles.group}>
        <View style={styles.groupHeader}>
          <View style={styles.groupIconCircle}>
            <IconSymbol name={icon} color="#f3d400" size={18} />
          </View>
          <Text style={styles.groupTitle}>{label}</Text>
        </View>
        {items.length === 0 ? (
          <Pressable onPress={() => ensureSample(key)}>
            <Text style={styles.addLocation}>{EMPTY_TEXT}</Text>
          </Pressable>
        ) : (
          <View style={styles.groupCard}>
            {visibleItems.map((item) => (
              <View key={item} style={styles.locationRow}>
                <View style={styles.marker} />
                <View>
                  <Text style={styles.locationTitle}>{item}</Text>
                  <Text style={styles.locationSubtitle}>George Vari Engineering and Computing Centre</Text>
                </View>
                <Pressable style={styles.startButton} onPress={() => router.push("/")}>
                  <IconSymbol name="arrow.up.circle.fill" color="#f3d400" size={28} />
                </Pressable>
              </View>
            ))}
            {items.length > 3 && (
              <Pressable onPress={() => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }))}>
                <Text style={styles.showAll}>{expanded[key] ? "Show less" : "Show all"}</Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>TMU SMART{"\n"}CAMPUS NAVIGATION</Text>
        <View style={styles.profileCircle}>
          <IconSymbol name="person.circle" color="#0b0b0b" size={32} />
        </View>
      </View>
      <View style={styles.savedBadge}>
        <Text style={styles.savedBadgeText}>SAVED</Text>
      </View>
      {renderGroup("Favourites", "heart.fill", "favorites")}
      {renderGroup("Want to go", "flag.fill", "wantToGo")}
      {renderGroup("Starred", "star.fill", "starred")}
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
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0b0b0b",
  },
  profileCircle: {
    backgroundColor: "#f3d400",
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  savedBadge: {
    marginTop: 24,
    alignSelf: "flex-start",
    backgroundColor: "#2c3ea3",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 14,
  },
  savedBadgeText: {
    color: "#f3d400",
    fontWeight: "700",
    fontSize: 16,
  },
  group: {
    marginTop: 24,
  },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  groupIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#2c3ea3",
    alignItems: "center",
    justifyContent: "center",
  },
  groupTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2c3ea3",
  },
  addLocation: {
    marginTop: 12,
    color: "#1c1c1c",
    fontWeight: "600",
  },
  groupCard: {
    marginTop: 12,
    backgroundColor: "#6f7fd4",
    borderRadius: 16,
    padding: 12,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.3)",
    paddingVertical: 10,
  },
  marker: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#f3d400",
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
  },
  locationSubtitle: {
    fontSize: 12,
    color: "#111",
  },
  startButton: {
    marginLeft: "auto",
  },
  showAll: {
    marginTop: 8,
    color: "#f7f0d7",
    fontWeight: "700",
  },
});
