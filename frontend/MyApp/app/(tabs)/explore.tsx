import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { IconSymbol } from "../../components/ui/icon-symbol";
import { type CalendarClassEvent, useAppState } from "../../context/app-state";

const NOW_REFERENCE = new Date("2026-03-11T10:15:00-04:00");

const formatTimeRange = (startIso: string, endIso: string) => {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  });
  return `${formatter.format(new Date(startIso))} - ${new Intl.DateTimeFormat("en-CA", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(endIso))}`;
};

const roomLabel = (event: CalendarClassEvent) => `${event.room}`;

export default function SavedScreen() {
  const { saved, setSaved, calendarEvents, isLoggedIn } = useAppState();
  const router = useRouter();
  const [expanded, setExpanded] = useState({
    favorites: false,
    wantToGo: false,
    starred: false,
  });

  const sortedUpcoming = useMemo(
    () =>
      calendarEvents
        .slice()
        .sort((a, b) => a.startIso.localeCompare(b.startIso))
        .filter((event) => new Date(event.endIso).getTime() >= NOW_REFERENCE.getTime()),
    [calendarEvents]
  );

  const nextClass = sortedUpcoming[0] ?? null;
  const upcomingClasses = sortedUpcoming.slice(0, 4);

  const toggleSavedItem = (category: keyof typeof saved, value: string) => {
    const exists = saved[category].includes(value);
    setSaved({
      ...saved,
      [category]: exists
        ? saved[category].filter((item) => item !== value)
        : [value, ...saved[category]],
    });
  };

  const renderGroup = (
    label: string,
    icon: "heart.fill" | "flag.fill" | "star.fill",
    key: keyof typeof saved
  ) => {
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
          <Text style={styles.emptySavedText}>Save a room from your schedule cards below.</Text>
        ) : (
          <View style={styles.groupCard}>
            {visibleItems.map((item) => (
              <View key={item} style={styles.locationRow}>
                <View style={styles.marker} />
                <View>
                  <Text style={styles.locationTitle}>{item}</Text>
                  <Text style={styles.locationSubtitle}>Saved from your class schedule</Text>
                </View>
                <Pressable
                  style={styles.startButton}
                  onPress={() =>
                    router.push({
                      pathname: "/indoor",
                      params: { destination: item },
                    })
                  }>
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
        <Text style={styles.savedBadgeText}>MY HUB</Text>
      </View>

      {!isLoggedIn ? (
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>Personal hub unlocks after login</Text>
          <Text style={styles.heroText}>
            Create an account and add your classes to get quick access to next class navigation and saved rooms.
          </Text>
          <Pressable style={styles.heroButton} onPress={() => router.push("/calendar-connect")}>
            <Text style={styles.heroButtonText}>Open Login</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <View style={styles.heroCard}>
            <Text style={styles.heroEyebrow}>Next Class</Text>
            {nextClass ? (
              <>
                <Text style={styles.heroTitle}>{nextClass.courseCode}</Text>
                <Text style={styles.heroText}>{nextClass.title}</Text>
                <Text style={styles.heroMeta}>{formatTimeRange(nextClass.startIso, nextClass.endIso)}</Text>
                <Text style={styles.heroMeta}>{nextClass.room} - {nextClass.buildingCode}</Text>
                <Pressable
                  style={styles.heroButton}
                  onPress={() =>
                    router.push({
                      pathname: "/indoor",
                      params: { destination: nextClass.room },
                    })
                  }>
                  <Text style={styles.heroButtonText}>Go To Next Class</Text>
                </Pressable>
              </>
            ) : (
              <Text style={styles.heroText}>No upcoming classes yet. Add one from the Schedule tab.</Text>
            )}
          </View>

          <View style={styles.upcomingCard}>
            <Text style={styles.upcomingTitle}>Upcoming Classes</Text>
            {upcomingClasses.length === 0 ? (
              <Text style={styles.emptySavedText}>Nothing upcoming yet.</Text>
            ) : (
              upcomingClasses.map((event) => (
                <View key={event.id} style={styles.upcomingRow}>
                  <View style={styles.upcomingMain}>
                    <Text style={styles.upcomingCourse}>{event.courseCode}</Text>
                    <Text style={styles.upcomingInfo}>{formatTimeRange(event.startIso, event.endIso)}</Text>
                    <Text style={styles.upcomingInfo}>{event.room} - {event.buildingCode}</Text>
                  </View>
                  <View style={styles.quickActions}>
                    <Pressable
                      style={styles.quickAction}
                      onPress={() => toggleSavedItem("favorites", roomLabel(event))}>
                      <IconSymbol name="heart.fill" color="#2c3ea3" size={18} />
                    </Pressable>
                    <Pressable
                      style={styles.quickAction}
                      onPress={() => toggleSavedItem("wantToGo", roomLabel(event))}>
                      <IconSymbol name="flag.fill" color="#2c3ea3" size={18} />
                    </Pressable>
                    <Pressable
                      style={styles.quickAction}
                      onPress={() => toggleSavedItem("starred", roomLabel(event))}>
                      <IconSymbol name="star.fill" color="#2c3ea3" size={18} />
                    </Pressable>
                    <Pressable
                      style={styles.quickActionPrimary}
                      onPress={() =>
                        router.push({
                          pathname: "/indoor",
                          params: { destination: event.room },
                        })
                      }>
                      <IconSymbol name="arrow.up.circle.fill" color="#f3d400" size={20} />
                    </Pressable>
                  </View>
                </View>
              ))
            )}
          </View>

          {renderGroup("Favourite Rooms", "heart.fill", "favorites")}
          {renderGroup("Want To Go", "flag.fill", "wantToGo")}
          {renderGroup("Starred Rooms", "star.fill", "starred")}
        </>
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
  heroCard: {
    marginTop: 24,
    backgroundColor: "#2c3ea3",
    borderRadius: 20,
    padding: 18,
    gap: 8,
  },
  heroEyebrow: {
    color: "#f9e784",
    fontWeight: "700",
    fontSize: 12,
    textTransform: "uppercase",
  },
  heroTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "700",
  },
  heroText: {
    color: "#eef1ff",
    lineHeight: 21,
  },
  heroMeta: {
    color: "#f9e784",
    fontWeight: "600",
  },
  heroButton: {
    marginTop: 8,
    alignSelf: "flex-start",
    backgroundColor: "#f3d400",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  heroButtonText: {
    color: "#2c3ea3",
    fontWeight: "700",
  },
  upcomingCard: {
    marginTop: 24,
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#d8dcef",
    gap: 12,
  },
  upcomingTitle: {
    color: "#2c3ea3",
    fontSize: 18,
    fontWeight: "700",
  },
  upcomingRow: {
    backgroundColor: "#eef1ff",
    borderRadius: 14,
    padding: 12,
    gap: 10,
  },
  upcomingMain: {
    gap: 2,
  },
  upcomingCourse: {
    color: "#17204f",
    fontWeight: "700",
    fontSize: 16,
  },
  upcomingInfo: {
    color: "#4b587a",
  },
  quickActions: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  quickAction: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  quickActionPrimary: {
    width: 40,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#2c3ea3",
    alignItems: "center",
    justifyContent: "center",
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
  emptySavedText: {
    marginTop: 12,
    color: "#334155",
    lineHeight: 20,
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
