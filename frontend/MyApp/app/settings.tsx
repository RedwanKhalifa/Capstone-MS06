import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { IconSymbol } from "../components/ui/icon-symbol";
import { useAppState } from "../context/app-state";

const ABOUT_ITEMS = [
  { key: "project", label: "Project info" },
  { key: "team", label: "Team MS06" },
  { key: "version", label: "Version" },
  { key: "privacy", label: "Privacy" },
] as const;

export default function SettingsScreen() {
  const router = useRouter();
  const { accessibility, setAccessibility, isLoggedIn, devModeEnabled, setDevModeEnabled } = useAppState();
  const [unitsEnabled, setUnitsEnabled] = useState(true);
  const [guestInfoOpen, setGuestInfoOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState({
    project: false,
    team: false,
    version: false,
    privacy: false,
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>TMU SMART{"\n"}CAMPUS NAVIGATION</Text>
        <Pressable style={styles.profileCircle} onPress={() => router.back()}>
          <IconSymbol name="person.circle" color="#0b0b0b" size={32} />
        </Pressable>
      </View>
      <View style={styles.settingsBadge}>
        <Text style={styles.settingsBadgeText}>Settings</Text>
      </View>

      <Text style={styles.sectionTitle}>Accessibility</Text>
      <View style={styles.row}>
        <Text style={styles.rowText}>High-Contrast mode</Text>
        <Switch
          value={accessibility.highContrast}
          onValueChange={(value) =>
            setAccessibility({ ...accessibility, highContrast: value })
          }
        />
      </View>
      <View style={styles.row}>
        <Text style={styles.rowText}>Larger text</Text>
        <Switch
          value={accessibility.largeText}
          onValueChange={(value) =>
            setAccessibility({ ...accessibility, largeText: value })
          }
        />
      </View>
      <View style={styles.row}>
        <Text style={styles.rowText}>Voice prompts</Text>
        <Switch
          value={accessibility.voicePrompts}
          onValueChange={(value) =>
            setAccessibility({ ...accessibility, voicePrompts: value })
          }
        />
      </View>

      <Text style={styles.sectionTitle}>Navigation</Text>
      <View style={styles.row}>
        <Text style={styles.rowText}>Units (Meter/steps)</Text>
        <Switch value={unitsEnabled} onValueChange={setUnitsEnabled} />
      </View>
      <Pressable style={styles.menuButton} onPress={() => router.push("/positioning-setup")}>
        <Text style={styles.menuButtonText}>Open Positioning Setup (Collect / Live / Plans)</Text>
      </Pressable>

      <Text style={styles.sectionTitle}>Developer</Text>
      <View style={styles.row}>
        <Text style={styles.rowText}>Developer mode</Text>
        <Switch value={devModeEnabled} onValueChange={setDevModeEnabled} />
      </View>

      <Text style={styles.sectionTitle}>Account</Text>
      <View style={styles.row}>
        <Text style={styles.rowText}>Login/Logout</Text>
        <Switch value={isLoggedIn} onValueChange={() => {}} disabled />
      </View>
      <Pressable
        style={styles.dropdownRow}
        onPress={() => setGuestInfoOpen((open) => !open)}
      >
        <Text style={styles.rowText}>Guest mode info</Text>
        <IconSymbol name={guestInfoOpen ? "chevron.up" : "chevron.down"} color="#f3d400" size={24} />
      </Pressable>
      {guestInfoOpen && <Text style={styles.dropdownText}>Soon to be updated.</Text>}

      <Text style={styles.sectionTitle}>About</Text>
      {ABOUT_ITEMS.map((item) => (
        <View key={item.key}>
          <Pressable
            style={styles.dropdownRow}
            onPress={() =>
              setAboutOpen((prev) => ({ ...prev, [item.key]: !prev[item.key] }))
            }
          >
            <Text style={styles.rowText}>{item.label}</Text>
            <IconSymbol
              name={aboutOpen[item.key] ? "chevron.up" : "chevron.down"}
              color="#f3d400"
              size={24}
            />
          </Pressable>
          {aboutOpen[item.key] && (
            <Text style={styles.dropdownText}>Soon to be updated.</Text>
          )}
        </View>
      ))}
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
  settingsBadge: {
    marginTop: 24,
    alignSelf: "flex-start",
    backgroundColor: "#2c3ea3",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 14,
  },
  settingsBadgeText: {
    color: "#f3d400",
    fontWeight: "700",
    fontSize: 16,
  },
  sectionTitle: {
    marginTop: 24,
    fontSize: 20,
    fontWeight: "700",
    color: "#2c3ea3",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  rowText: {
    fontSize: 16,
    color: "#2c3ea3",
    fontWeight: "600",
  },
  dropdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  dropdownText: {
    color: "#2c3ea3",
    marginBottom: 12,
  },
  menuButton: {
    backgroundColor: "#2c3ea3",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 8,
  },
  menuButtonText: {
    color: "#f3d400",
    fontWeight: "700",
    textAlign: "center",
  },
});
