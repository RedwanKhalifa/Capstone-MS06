import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { IconSymbol } from "../../components/ui/icon-symbol";
import {
  type CalendarClassEvent,
  type EditableClassInput,
  useAppState,
} from "../../context/app-state";

type DayGroup = {
  dayLabel: string;
  items: CalendarClassEvent[];
};

const EMPTY_FORM: EditableClassInput = {
  title: "",
  courseCode: "",
  room: "",
  dayKey: "mon",
  startTime: "09:00",
  endTime: "10:00",
};

const DAY_OPTIONS: { key: EditableClassInput["dayKey"]; label: string }[] = [
  { key: "mon", label: "Mon" },
  { key: "tue", label: "Tue" },
  { key: "wed", label: "Wed" },
  { key: "thu", label: "Thu" },
  { key: "fri", label: "Fri" },
];

const DAY_KEY_FROM_DATE: Record<string, EditableClassInput["dayKey"]> = {
  "2026-03-09": "mon",
  "2026-03-10": "tue",
  "2026-03-11": "wed",
  "2026-03-12": "thu",
  "2026-03-13": "fri",
};

const formatDayLabel = (value: string) =>
  new Intl.DateTimeFormat("en-CA", {
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(new Date(value));

const formatTimeRange = (startIso: string, endIso: string) => {
  const startDate = new Date(startIso);
  const endDate = new Date(endIso);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return "Invalid class time";
  }

  const formatter = new Intl.DateTimeFormat("en-CA", {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${formatter.format(startDate)} - ${formatter.format(endDate)}`;
};

const isoToTime = (value: string) => value.slice(11, 16);

function eventToEditable(event: CalendarClassEvent): EditableClassInput {
  const dateKey = event.startIso.slice(0, 10);
  return {
    id: event.id,
    title: event.title,
    courseCode: event.courseCode,
    room: event.room,
    dayKey: DAY_KEY_FROM_DATE[dateKey] ?? "mon",
    startTime: isoToTime(event.startIso),
    endTime: isoToTime(event.endIso),
  };
}

export default function ScheduleScreen() {
  const router = useRouter();
  const {
    isLoggedIn,
    studentAccount,
    connectedCalendars,
    setCalendarSelected,
    calendarEvents,
    upsertManualClass,
    deleteManualClass,
    logoutUser,
  } = useAppState();
  const [form, setForm] = useState<EditableClassInput>(EMPTY_FORM);
  const [saveError, setSaveError] = useState<string | null>(null);

  const visibleEvents = useMemo(() => {
    const selectedCalendarIds = new Set(
      connectedCalendars.filter((calendar) => calendar.selected).map((calendar) => calendar.id)
    );
    return calendarEvents.filter((event) => selectedCalendarIds.has(event.calendarId));
  }, [calendarEvents, connectedCalendars]);

  const groupedEvents = useMemo<DayGroup[]>(() => {
    const groups = new Map<string, CalendarClassEvent[]>();

    visibleEvents
      .slice()
      .sort((a, b) => a.startIso.localeCompare(b.startIso))
      .forEach((event) => {
        const key = event.startIso.slice(0, 10);
        const bucket = groups.get(key) ?? [];
        bucket.push(event);
        groups.set(key, bucket);
      });

    return Array.from(groups.entries()).map(([day, items]) => ({
      dayLabel: formatDayLabel(day),
      items,
    }));
  }, [visibleEvents]);

  const handleSaveClass = () => {
    if (!form.courseCode.trim() || !form.room.trim() || !form.startTime || !form.endTime) {
      setSaveError("Course code, room, start time, and end time are required.");
      return;
    }
    const result = upsertManualClass(form);
    if (!result.ok) {
      setSaveError(result.message ?? "Unable to save this class.");
      return;
    }
    setSaveError(null);
    setForm(EMPTY_FORM);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>TMU SMART{"\n"}CAMPUS NAVIGATION</Text>
        <View style={styles.profileCircle}>
          <IconSymbol name="person.circle" color="#0b0b0b" size={32} />
        </View>
      </View>

      <View style={styles.scheduleBadge}>
        <Text style={styles.scheduleBadgeText}>YOUR CLASS SCHEDULE</Text>
      </View>

      {!isLoggedIn ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Create an account first</Text>
          <Text style={styles.emptyText}>
            Sign up with an email and password to keep a manual class schedule that you can edit in-app.
          </Text>
          <Pressable style={styles.primaryButton} onPress={() => router.push("/calendar-connect")}>
            <Text style={styles.primaryButtonText}>Open Login Screen</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <View style={styles.accountCard}>
            <View style={styles.accountHeading}>
              <View>
                <Text style={styles.accountName}>{studentAccount?.fullName}</Text>
                <Text style={styles.accountEmail}>{studentAccount?.schoolEmail}</Text>
              </View>
              <Pressable style={styles.disconnectButton} onPress={logoutUser}>
                <Text style={styles.disconnectButtonText}>Log Out</Text>
              </Pressable>
            </View>
            <Text style={styles.accountProvider}>
              Connected through {studentAccount?.providerLabel}. You can edit classes below.
            </Text>
          </View>

          <View style={styles.calendarCard}>
            <Text style={styles.sectionTitle}>Manual Schedule Source</Text>
            {connectedCalendars.map((calendar) => (
              <View key={calendar.id} style={styles.calendarRow}>
                <View style={styles.calendarMeta}>
                  <View style={[styles.calendarDot, { backgroundColor: calendar.color }]} />
                  <View>
                    <Text style={styles.calendarName}>{calendar.name}</Text>
                    <Text style={styles.calendarProvider}>{calendar.provider}</Text>
                  </View>
                </View>
                <Pressable
                  style={[styles.toggleChip, !calendar.selected && styles.toggleChipOff]}
                  onPress={() => setCalendarSelected(calendar.id, !calendar.selected)}>
                  <Text style={calendar.selected ? styles.toggleChipText : styles.toggleChipTextOff}>
                    {calendar.selected ? "Visible" : "Hidden"}
                  </Text>
                </Pressable>
              </View>
            ))}
          </View>

          <View style={styles.editorCard}>
            <Text style={styles.sectionTitle}>{form.id ? "Edit Class" : "Add Class"}</Text>

            <TextInput
              style={styles.input}
              placeholder="Class title"
              placeholderTextColor="#66708e"
              value={form.title}
              onChangeText={(value) => setForm((current) => ({ ...current, title: value }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Course code"
              placeholderTextColor="#66708e"
              value={form.courseCode}
              onChangeText={(value) => setForm((current) => ({ ...current, courseCode: value }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Room"
              placeholderTextColor="#66708e"
              value={form.room}
              onChangeText={(value) => setForm((current) => ({ ...current, room: value }))}
            />

            <View style={styles.dayRow}>
              {DAY_OPTIONS.map((option) => (
                <Pressable
                  key={option.key}
                  style={[styles.dayChip, form.dayKey === option.key && styles.dayChipActive]}
                  onPress={() => setForm((current) => ({ ...current, dayKey: option.key }))}>
                  <Text style={form.dayKey === option.key ? styles.dayChipTextActive : styles.dayChipText}>
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.timeRow}>
              <TextInput
                style={[styles.input, styles.timeInput]}
                placeholder="Start 09:00 or 1pm"
                placeholderTextColor="#66708e"
                value={form.startTime}
                onChangeText={(value) => setForm((current) => ({ ...current, startTime: value }))}
              />
              <TextInput
                style={[styles.input, styles.timeInput]}
                placeholder="End 10:00 or 2pm"
                placeholderTextColor="#66708e"
                value={form.endTime}
                onChangeText={(value) => setForm((current) => ({ ...current, endTime: value }))}
              />
            </View>

            <View style={styles.editorActions}>
              <Pressable style={styles.primaryButton} onPress={handleSaveClass}>
                <Text style={styles.primaryButtonText}>{form.id ? "Save Changes" : "Add Class"}</Text>
              </Pressable>
              {form.id ? (
                <Pressable
                  style={styles.secondaryButton}
                  onPress={() => {
                    setForm(EMPTY_FORM);
                    setSaveError(null);
                  }}>
                  <Text style={styles.secondaryButtonText}>Cancel Edit</Text>
                </Pressable>
              ) : null}
            </View>
            {saveError ? <Text style={styles.formError}>{saveError}</Text> : null}
          </View>

          {groupedEvents.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No classes yet</Text>
              <Text style={styles.emptyText}>Add your first class above to start building the schedule.</Text>
            </View>
          ) : (
            groupedEvents.map((group) => (
              <View key={group.dayLabel} style={styles.daySection}>
                <Text style={styles.dayTitle}>{group.dayLabel}</Text>
                {group.items.map((course) => (
                  <View key={course.id} style={styles.classCard}>
                    <View style={styles.classBody}>
                      <Text style={styles.classTitle}>{course.title}</Text>
                      <Text style={styles.classSubtitle}>{formatTimeRange(course.startIso, course.endIso)}</Text>
                      <Text style={styles.classSubtitle}>
                        {course.room} - {course.buildingCode}
                      </Text>
                      <Text style={styles.classSource}>{course.sourceLabel}</Text>
                    </View>
                    <View style={styles.classActions}>
                      <Pressable
                        style={styles.editButton}
                        onPress={() => setForm(eventToEditable(course))}>
                        <Text style={styles.editButtonText}>Edit</Text>
                      </Pressable>
                      <Pressable
                        style={styles.deleteButton}
                        onPress={() => deleteManualClass(course.id)}>
                        <Text style={styles.deleteButtonText}>Delete</Text>
                      </Pressable>
                      <Pressable
                        style={styles.startButton}
                        onPress={() =>
                          router.push({
                            pathname: "/indoor",
                            params: { destination: course.room },
                          })
                        }>
                        <IconSymbol name="paperplane.fill" color="#fff" size={16} />
                        <Text style={styles.startButtonText}>Navigate</Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            ))
          )}
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
    gap: 12,
  },
  emptyTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  emptyText: {
    color: "#eef1ff",
    lineHeight: 21,
  },
  primaryButton: {
    backgroundColor: "#f3d400",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignSelf: "flex-start",
  },
  primaryButtonText: {
    color: "#2c3ea3",
    fontWeight: "700",
  },
  accountCard: {
    marginTop: 24,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#d8dcef",
    gap: 10,
  },
  accountHeading: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  accountName: {
    color: "#18214a",
    fontWeight: "700",
    fontSize: 18,
  },
  accountEmail: {
    color: "#53608b",
  },
  disconnectButton: {
    backgroundColor: "#eef1ff",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: "flex-start",
  },
  disconnectButtonText: {
    color: "#2c3ea3",
    fontWeight: "700",
  },
  accountProvider: {
    color: "#445074",
    lineHeight: 20,
  },
  calendarCard: {
    marginTop: 18,
    backgroundColor: "#fff5c2",
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  sectionTitle: {
    color: "#2c3ea3",
    fontSize: 18,
    fontWeight: "700",
  },
  calendarRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  calendarMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  calendarDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  calendarName: {
    color: "#1c285e",
    fontWeight: "700",
  },
  calendarProvider: {
    color: "#5d6791",
    fontSize: 12,
  },
  toggleChip: {
    backgroundColor: "#2c3ea3",
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  toggleChipOff: {
    backgroundColor: "#d8dcef",
  },
  toggleChipText: {
    color: "#f3d400",
    fontWeight: "700",
  },
  toggleChipTextOff: {
    color: "#475569",
    fontWeight: "700",
  },
  editorCard: {
    marginTop: 18,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: "#d8dcef",
  },
  input: {
    backgroundColor: "#f7f0d7",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#18214a",
  },
  dayRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  dayChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#c8d0ee",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#fff",
  },
  dayChipActive: {
    backgroundColor: "#2c3ea3",
    borderColor: "#2c3ea3",
  },
  dayChipText: {
    color: "#2c3ea3",
    fontWeight: "700",
  },
  dayChipTextActive: {
    color: "#f3d400",
    fontWeight: "700",
  },
  timeRow: {
    flexDirection: "row",
    gap: 10,
  },
  timeInput: {
    flex: 1,
  },
  editorActions: {
    flexDirection: "row",
    gap: 10,
  },
  secondaryButton: {
    backgroundColor: "#eef1ff",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignSelf: "flex-start",
  },
  secondaryButtonText: {
    color: "#2c3ea3",
    fontWeight: "700",
  },
  formError: {
    color: "#8a1c1c",
    lineHeight: 20,
  },
  daySection: {
    marginTop: 24,
  },
  dayTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 10,
    color: "#2c3ea3",
  },
  classCard: {
    backgroundColor: "#6f7fd4",
    borderRadius: 16,
    padding: 16,
    gap: 12,
    marginBottom: 12,
  },
  classBody: {
    flex: 1,
  },
  classTitle: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  classSubtitle: {
    color: "#e7e7e7",
    marginTop: 2,
  },
  classSource: {
    color: "#f9e784",
    marginTop: 8,
    fontSize: 12,
    fontWeight: "600",
  },
  classActions: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  editButton: {
    backgroundColor: "#fff5c2",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  editButtonText: {
    color: "#2c3ea3",
    fontWeight: "700",
  },
  deleteButton: {
    backgroundColor: "#ffd9d9",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  deleteButtonText: {
    color: "#8a1c1c",
    fontWeight: "700",
  },
  startButton: {
    backgroundColor: "#f3d400",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  startButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
});
