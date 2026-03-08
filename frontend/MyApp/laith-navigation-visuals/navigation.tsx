import React, { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { IconSymbol } from "../../components/ui/icon-symbol";
import { useAppState } from "../../context/app-state";

const RECENT_PLACES = [
  { id: "1", title: "George Vari Engineering & Computing Centre", code: "ENG" },
  { id: "2", title: "Library Building", code: "LIB" },
  { id: "3", title: "Student Campus Centre", code: "SCC" },
  { id: "4", title: "Kerr Hall", code: "KHW/KHN/KHE/KHS" },
];

export default function NavigationScreen() {
  const { isLoggedIn } = useAppState();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return RECENT_PLACES;

    return RECENT_PLACES.filter(
      (p) =>
        p.title.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)
    );
  }, [query]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.title}>TMU SMART{"\n"}CAMPUS NAVIGATION</Text>
        <View style={styles.profileCircle}>
          <IconSymbol name="person.circle" color="#0b0b0b" size={32} />
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchBar}>
        <IconSymbol name="magnifyingglass" color="#777" size={18} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search Buildings..."
          placeholderTextColor="#777"
          style={styles.searchInput}
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery("")} hitSlop={10}>
            <IconSymbol name="xmark.circle.fill" color="#777" size={18} />
          </Pressable>
        )}
      </View>

      {/* Recent */}
      <Text style={styles.sectionLabel}>Recent</Text>

      {filtered.map((place) => (
        <Pressable
          key={place.id}
          style={styles.recentRow}
          onPress={() => setQuery(place.title)}
        >
          <View style={styles.pinCircle}>
            <IconSymbol name="location.fill" color="#2c3ea3" size={16} />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.recentTitle} numberOfLines={1}>
              {place.title}
            </Text>
            <Text style={styles.recentSub}>{place.code}</Text>
          </View>

          <IconSymbol name="chevron.right" color="#0b0b0b" size={16} />
        </Pressable>
      ))}

      {/* Bottom buttons */}
      <View style={{ marginTop: 18, gap: 12 }}>
        <Pressable style={styles.accessBtn} onPress={() => {}}>
          <IconSymbol name="figure.walk" color="#fff" size={18} />
          <Text style={styles.accessText}>Accessibility Mode</Text>
        </Pressable>

        <Pressable
          style={[styles.startBtn, !isLoggedIn && styles.startBtnDisabled]}
          disabled={!isLoggedIn}
          onPress={() => {}}
        >
          <IconSymbol name="paperplane.fill" color="#0b0b0b" size={16} />
          <Text style={styles.startText}>
            {isLoggedIn ? "Start Navigation" : "Login to Start Navigation"}
          </Text>
        </Pressable>
      </View>
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
  title: { fontSize: 20, fontWeight: "700", color: "#0b0b0b" },
  profileCircle: {
    backgroundColor: "#f3d400",
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },

  searchBar: {
    marginTop: 16,
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },
  searchInput: { flex: 1, fontSize: 14, color: "#0b0b0b" },

  sectionLabel: {
    marginTop: 18,
    marginBottom: 10,
    fontSize: 14,
    fontWeight: "700",
    color: "#0b0b0b",
  },

  recentRow: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    marginBottom: 10,
  },
  pinCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(44,62,163,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  recentTitle: { fontSize: 15, fontWeight: "700", color: "#0b0b0b" },
  recentSub: { marginTop: 2, fontSize: 12, color: "#666" },

  accessBtn: {
    backgroundColor: "#2c3ea3",
    borderRadius: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  accessText: { color: "#fff", fontWeight: "700" },

  startBtn: {
    backgroundColor: "#f3d400",
    borderRadius: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  startBtnDisabled: {
    opacity: 0.6,
  },
  startText: { color: "#0b0b0b", fontWeight: "700" },
});
