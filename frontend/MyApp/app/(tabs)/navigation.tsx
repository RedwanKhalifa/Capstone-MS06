import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { IconSymbol } from "../../components/ui/icon-symbol";
import { useAppState } from "../../context/app-state";

const SAMPLE_SCHEDULE = [
  {
    day: "Wednesday",
    classes: [
      { name: "COE817 - LEC", time: "11 - 12 PM", room: "LIB072" },
    ],
  },
  {
    day: "Thursday",
    classes: [
      { name: "COE891 - LEC", time: "8 - 11 AM", room: "LIB072" },
    ],
  },
  {
    day: "Friday",
    classes: [
      { name: "COE70B - LEC", time: "2 - 3 PM", room: "ENG103" },
    ],
  },
];

export default function ScheduleScreen() {
  const { isLoggedIn } = useAppState();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>TMU SMART{"\n"}CAMPUS NAVIGATION</Text>
        <View style={styles.profileCircle}>
          <IconSymbol name="person.circle" color="#0b0b0b" size={32} />
        </View>
      </View>
      <View style={styles.scheduleBadge}>
        <Text style={styles.scheduleBadgeText}>YOUR SCHEDULE THIS SEMESTER</Text>
      </View>
      {!isLoggedIn ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>Login to see your classes (._.)</Text>
          <Pressable style={styles.manualButton}>
            <Text style={styles.manualButtonText}>or create your schedule manually</Text>
          </Pressable>
        </View>
      ) : (
        SAMPLE_SCHEDULE.map((day) => (
          <View key={day.day} style={styles.daySection}>
            <Text style={styles.dayTitle}>{day.day}</Text>
            {day.classes.map((course) => (
              <View key={course.name} style={styles.classCard}>
                <View>
                  <Text style={styles.classTitle}>{course.name}</Text>
                  <Text style={styles.classSubtitle}>{course.time}</Text>
                  <Text style={styles.classSubtitle}>{course.room}</Text>
                </View>
                <Pressable style={styles.startButton}>
                  <IconSymbol name="paperplane.fill" color="#fff" size={16} />
                  <Text style={styles.startButtonText}>Start{"\n"}Navigation</Text>
                </Pressable>
              </View>
            ))}
          </View>
        ))
      )}
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
  scheduleBadge: {
    marginTop: 24,
    backgroundColor: "#2c3ea3",
    paddingVertical: 12,
    borderRadius: 16,
  },
  scheduleBadgeText: {
    color: "#f3d400",
    textAlign: "center",
    fontWeight: "700",
  },
  emptyCard: {
    marginTop: 24,
    backgroundColor: "#6f7fd4",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
  },
  emptyText: {
    color: "#fff",
    fontSize: 16,
    marginBottom: 12,
  },
  manualButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  manualButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  daySection: {
    marginTop: 24,
  },
  dayTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 10,
  },
  classCard: {
    backgroundColor: "#6f7fd4",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  classTitle: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  classSubtitle: {
    color: "#e7e7e7",
  },
  startButton: {
    backgroundColor: "#f3d400",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignItems: "center",
    gap: 4,
  },
  startButtonText: {
    color: "#fff",
    fontWeight: "700",
    textAlign: "center",
    fontSize: 12,
  },
});
