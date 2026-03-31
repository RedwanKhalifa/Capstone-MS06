import * as FileSystem from "expo-file-system/legacy";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";

type AccessibilitySettings = {
  highContrast: boolean;
  largeText: boolean;
  voicePrompts: boolean;
};

type SavedCollections = {
  favorites: string[];
  wantToGo: string[];
  starred: string[];
};

export type ConnectedCalendar = {
  id: string;
  name: string;
  provider: "Manual";
  color: string;
  selected: boolean;
};

export type StudentAccount = {
  fullName: string;
  schoolEmail: string;
  providerLabel: string;
};

export type CalendarClassEvent = {
  id: string;
  title: string;
  courseCode: string;
  room: string;
  buildingCode: string;
  startIso: string;
  endIso: string;
  calendarId: string;
  sourceLabel: string;
};

type LocalAccountRecord = StudentAccount & {
  password: string;
};

export type EditableClassInput = {
  id?: string;
  title: string;
  courseCode: string;
  room: string;
  dayKey: "mon" | "tue" | "wed" | "thu" | "fri";
  startTime: string;
  endTime: string;
};

type AppStateContextValue = {
  isLoggedIn: boolean;
  studentAccount: StudentAccount | null;
  registerLocalAccount: (fullName: string, email: string, password: string) => { ok: boolean; message?: string };
  loginLocalAccount: (email: string, password: string) => { ok: boolean; message?: string };
  logoutUser: () => void;
  connectedCalendars: ConnectedCalendar[];
  setCalendarSelected: (calendarId: string, selected: boolean) => void;
  calendarEvents: CalendarClassEvent[];
  upsertManualClass: (input: EditableClassInput) => { ok: boolean; message?: string };
  deleteManualClass: (eventId: string) => void;
  setIsLoggedIn: (value: boolean) => void;
  devModeEnabled: boolean;
  setDevModeEnabled: (value: boolean) => void;
  accessibility: AccessibilitySettings;
  setAccessibility: (value: AccessibilitySettings) => void;
  setAllAccessibility: (value: boolean) => void;
  saved: SavedCollections;
  setSaved: (value: SavedCollections) => void;
};

const MANUAL_CALENDAR: ConnectedCalendar = {
  id: "manual-schedule",
  name: "Manual Class Schedule",
  provider: "Manual",
  color: "#2c3ea3",
  selected: true,
};

const DAY_PREFIX: Record<EditableClassInput["dayKey"], string> = {
  mon: "2026-03-09",
  tue: "2026-03-10",
  wed: "2026-03-11",
  thu: "2026-03-12",
  fri: "2026-03-13",
};

const STARTER_TIMETABLE: CalendarClassEvent[] = [
  {
    id: "coe818-mon-lec",
    title: "COE818 - 061 - LEC",
    courseCode: "COE818",
    room: "DCC208",
    buildingCode: "DCC",
    startIso: "2026-03-09T12:00:00-04:00",
    endIso: "2026-03-09T15:00:00-04:00",
    calendarId: MANUAL_CALENDAR.id,
    sourceLabel: "Manual schedule",
  },
  {
    id: "coe848-tue-lec",
    title: "COE848 - 031 - LEC",
    courseCode: "COE848",
    room: "CAR02",
    buildingCode: "CAR",
    startIso: "2026-03-10T08:00:00-04:00",
    endIso: "2026-03-10T11:00:00-04:00",
    calendarId: MANUAL_CALENDAR.id,
    sourceLabel: "Manual schedule",
  },
  {
    id: "cen800-tue-lec",
    title: "CEN800 - 021 - LEC",
    courseCode: "CEN800",
    room: "TRS1067",
    buildingCode: "TRS",
    startIso: "2026-03-10T13:00:00-04:00",
    endIso: "2026-03-10T16:00:00-04:00",
    calendarId: MANUAL_CALENDAR.id,
    sourceLabel: "Manual schedule",
  },
  {
    id: "ele709-wed-lec",
    title: "ELE709 - 011 - LEC",
    courseCode: "ELE709",
    room: "DSQ10",
    buildingCode: "DSQ",
    startIso: "2026-03-11T08:00:00-04:00",
    endIso: "2026-03-11T11:00:00-04:00",
    calendarId: MANUAL_CALENDAR.id,
    sourceLabel: "Manual schedule",
  },
  {
    id: "ele709-wed-lab",
    title: "ELE709 - 012 - LAB",
    courseCode: "ELE709",
    room: "ENG413",
    buildingCode: "ENG",
    startIso: "2026-03-11T11:00:00-04:00",
    endIso: "2026-03-11T12:00:00-04:00",
    calendarId: MANUAL_CALENDAR.id,
    sourceLabel: "Manual schedule",
  },
  {
    id: "coe838-thu-lab",
    title: "COE838 - 012 - LAB",
    courseCode: "COE838",
    room: "ENG412",
    buildingCode: "ENG",
    startIso: "2026-03-12T15:00:00-04:00",
    endIso: "2026-03-12T16:00:00-04:00",
    calendarId: MANUAL_CALENDAR.id,
    sourceLabel: "Manual schedule",
  },
  {
    id: "coe848-thu-lab",
    title: "COE848 - 032 - LAB",
    courseCode: "COE848",
    room: "ENG411",
    buildingCode: "ENG",
    startIso: "2026-03-12T16:00:00-04:00",
    endIso: "2026-03-12T17:00:00-04:00",
    calendarId: MANUAL_CALENDAR.id,
    sourceLabel: "Manual schedule",
  },
  {
    id: "coe838-fri-lec",
    title: "COE838 - 011 - LEC",
    courseCode: "COE838",
    room: "LIB072",
    buildingCode: "LIB",
    startIso: "2026-03-13T08:00:00-04:00",
    endIso: "2026-03-13T11:00:00-04:00",
    calendarId: MANUAL_CALENDAR.id,
    sourceLabel: "Manual schedule",
  },
  {
    id: "coe818-fri-lab",
    title: "COE818 - 062 - LAB",
    courseCode: "COE818",
    room: "ENG412",
    buildingCode: "ENG",
    startIso: "2026-03-13T13:00:00-04:00",
    endIso: "2026-03-13T14:00:00-04:00",
    calendarId: MANUAL_CALENDAR.id,
    sourceLabel: "Manual schedule",
  },
  {
    id: "coe70b-fri-lab-long",
    title: "COE70B - 011 - LAB",
    courseCode: "COE70B",
    room: "ENG311",
    buildingCode: "ENG",
    startIso: "2026-03-13T14:00:00-04:00",
    endIso: "2026-03-13T19:00:00-04:00",
    calendarId: MANUAL_CALENDAR.id,
    sourceLabel: "Manual schedule",
  },
  {
    id: "coe70b-fri-lab-alt",
    title: "COE70B - 011 - LAB",
    courseCode: "COE70B",
    room: "ENG103",
    buildingCode: "ENG",
    startIso: "2026-03-13T14:00:00-04:00",
    endIso: "2026-03-13T17:00:00-04:00",
    calendarId: MANUAL_CALENDAR.id,
    sourceLabel: "Manual schedule",
  },
  {
    id: "coe70b-fri-lec",
    title: "COE70B - 012 - LEC",
    courseCode: "COE70B",
    room: "ENG103",
    buildingCode: "ENG",
    startIso: "2026-03-13T14:00:00-04:00",
    endIso: "2026-03-13T15:00:00-04:00",
    calendarId: MANUAL_CALENDAR.id,
    sourceLabel: "Manual schedule",
  },
];

const APP_STATE_STORAGE_KEY = "capstone-ms06:app-state";
const DEV_MODE_STORAGE_FILE = `${FileSystem.documentDirectory}dev-mode.json`;

const loadNativeDevMode = async (): Promise<boolean | null> => {
  try {
    const info = await FileSystem.getInfoAsync(DEV_MODE_STORAGE_FILE);
    if (!info.exists) return null;
    const raw = await FileSystem.readAsStringAsync(DEV_MODE_STORAGE_FILE);
    const parsed = JSON.parse(raw) as { devModeEnabled?: boolean };
    return typeof parsed.devModeEnabled === "boolean" ? parsed.devModeEnabled : null;
  } catch {
    return null;
  }
};

const saveNativeDevMode = async (value: boolean) => {
  try {
    await FileSystem.writeAsStringAsync(
      DEV_MODE_STORAGE_FILE,
      JSON.stringify({ devModeEnabled: value })
    );
  } catch {
    // Ignore persistence failures so the app remains usable.
  }
};

const AppStateContext = createContext<AppStateContextValue | undefined>(undefined);

const normalizeEmail = (value: string) => value.trim().toLowerCase();
const normalizeRoom = (value: string) => value.trim().toUpperCase();
const inferBuildingCode = (room: string) => room.match(/^[A-Z]{3,4}/)?.[0] ?? "TMU";

const normalizeTimeInput = (value: string) => {
  const trimmed = value.trim();
  const meridiem = trimmed.match(/^(\d{1,2})(?::?(\d{2}))?\s*([ap]m)$/i);
  if (meridiem) {
    const rawHours = Number(meridiem[1]);
    const minutes = Number(meridiem[2] ?? "0");
    const period = meridiem[3].toLowerCase();
    if (rawHours >= 1 && rawHours <= 12 && minutes >= 0 && minutes <= 59) {
      let hours = rawHours % 12;
      if (period === "pm") {
        hours += 12;
      }
      return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
    }
    return null;
  }

  const hhmm = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (hhmm) {
    const hours = Number(hhmm[1]);
    const minutes = Number(hhmm[2]);
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
    }
    return null;
  }

  const compact = trimmed.match(/^(\d{1,2})(\d{2})$/);
  if (compact) {
    const hours = Number(compact[1]);
    const minutes = Number(compact[2]);
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
    }
  }

  return null;
};

const createEventIso = (dayKey: EditableClassInput["dayKey"], time: string) => {
  return `${DAY_PREFIX[dayKey]}T${time}:00-04:00`;
};

const toEventTitle = (input: EditableClassInput) => input.title.trim() || `${input.courseCode.trim().toUpperCase()} Class`;

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [accountRecord, setAccountRecord] = useState<LocalAccountRecord | null>(null);
  const [studentAccount, setStudentAccount] = useState<StudentAccount | null>(null);
  const [connectedCalendars, setConnectedCalendars] = useState<ConnectedCalendar[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarClassEvent[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [devModeEnabled, setDevModeEnabled] = useState(true);
  const [accessibility, setAccessibility] = useState<AccessibilitySettings>({
    highContrast: true,
    largeText: true,
    voicePrompts: true,
  });
  const [saved, setSaved] = useState<SavedCollections>({
    favorites: [],
    wantToGo: [],
    starred: [],
  });

  useEffect(() => {
    if (Platform.OS === "web") {
      try {
        const raw = globalThis.localStorage?.getItem(APP_STATE_STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw) as {
          accountRecord?: LocalAccountRecord | null;
          studentAccount?: StudentAccount | null;
          connectedCalendars?: ConnectedCalendar[];
          calendarEvents?: CalendarClassEvent[];
          devModeEnabled?: boolean;
          accessibility?: AccessibilitySettings;
          saved?: SavedCollections;
        };

        if (parsed.accountRecord) setAccountRecord(parsed.accountRecord);
        if (parsed.studentAccount) setStudentAccount(parsed.studentAccount);
        if (parsed.connectedCalendars) setConnectedCalendars(parsed.connectedCalendars);
        if (parsed.calendarEvents) setCalendarEvents(parsed.calendarEvents);
        if (typeof parsed.devModeEnabled === "boolean") setDevModeEnabled(parsed.devModeEnabled);
        if (parsed.accessibility) setAccessibility(parsed.accessibility);
        if (parsed.saved) setSaved(parsed.saved);
      } catch {
        // Ignore corrupted local state and continue with defaults.
      }
      return;
    }

    loadNativeDevMode().then((value) => {
      if (typeof value === "boolean") {
        setDevModeEnabled(value);
      }
    });
  }, []);

  useEffect(() => {
    if (Platform.OS === "web") {
      try {
        globalThis.localStorage?.setItem(
          APP_STATE_STORAGE_KEY,
          JSON.stringify({
            accountRecord,
            studentAccount,
            connectedCalendars,
            calendarEvents,
            devModeEnabled,
            accessibility,
            saved,
          })
        );
      } catch {
        // Ignore persistence failures so the app remains usable.
      }
      return;
    }

    saveNativeDevMode(devModeEnabled);
  }, [accountRecord, studentAccount, connectedCalendars, calendarEvents, devModeEnabled, accessibility, saved]);

  const setAllAccessibility = (value: boolean) => {
    setAccessibility({
      highContrast: value,
      largeText: value,
      voicePrompts: value,
    });
  };

  const registerLocalAccount = (fullName: string, email: string, password: string) => {
    const normalizedEmail = normalizeEmail(email);
    const trimmedPassword = password.trim();
    const trimmedName = fullName.trim();

    if (!trimmedName || !normalizedEmail || !trimmedPassword) {
      return { ok: false, message: "Name, email, and password are required." };
    }

    const nextAccount: LocalAccountRecord = {
      fullName: trimmedName,
      schoolEmail: normalizedEmail,
      providerLabel: "Manual account",
      password: trimmedPassword,
    };

    setAccountRecord(nextAccount);
    setStudentAccount({
      fullName: nextAccount.fullName,
      schoolEmail: nextAccount.schoolEmail,
      providerLabel: nextAccount.providerLabel,
    });
    setConnectedCalendars([MANUAL_CALENDAR]);
    setCalendarEvents(STARTER_TIMETABLE);
    return { ok: true };
  };

  const loginLocalAccount = (email: string, password: string) => {
    const normalizedEmail = normalizeEmail(email);
    const trimmedPassword = password.trim();

    if (!accountRecord) {
      return { ok: false, message: "Create an account first." };
    }
    if (accountRecord.schoolEmail !== normalizedEmail || accountRecord.password !== trimmedPassword) {
      return { ok: false, message: "Invalid email or password." };
    }

    setStudentAccount({
      fullName: accountRecord.fullName,
      schoolEmail: accountRecord.schoolEmail,
      providerLabel: accountRecord.providerLabel,
    });
    setConnectedCalendars([MANUAL_CALENDAR]);
    if (!calendarEvents.length) {
      setCalendarEvents(STARTER_TIMETABLE);
    }
    return { ok: true };
  };

  const logoutUser = () => {
    setStudentAccount(null);
    setConnectedCalendars([]);
  };

  const setCalendarSelected = (calendarId: string, selected: boolean) => {
    setConnectedCalendars((current) =>
      current.map((calendar) =>
        calendar.id === calendarId ? { ...calendar, selected } : calendar
      )
    );
  };

  const upsertManualClass = (input: EditableClassInput) => {
    const normalizedStartTime = normalizeTimeInput(input.startTime);
    const normalizedEndTime = normalizeTimeInput(input.endTime);
    if (!normalizedStartTime || !normalizedEndTime) {
      return { ok: false, message: "Use a time like 09:00, 14:30, 1pm, or 3:30pm." };
    }

    const room = normalizeRoom(input.room);
    const nextEvent: CalendarClassEvent = {
      id: input.id ?? `manual-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      title: toEventTitle(input),
      courseCode: input.courseCode.trim().toUpperCase(),
      room,
      buildingCode: inferBuildingCode(room),
      startIso: createEventIso(input.dayKey, normalizedStartTime),
      endIso: createEventIso(input.dayKey, normalizedEndTime),
      calendarId: MANUAL_CALENDAR.id,
      sourceLabel: "Manual schedule",
    };

    setCalendarEvents((current) => {
      const existingIndex = current.findIndex((event) => event.id === nextEvent.id);
      if (existingIndex === -1) {
        return [...current, nextEvent];
      }
      return current.map((event) => (event.id === nextEvent.id ? nextEvent : event));
    });
    return { ok: true };
  };

  const deleteManualClass = (eventId: string) => {
    setCalendarEvents((current) => current.filter((event) => event.id !== eventId));
  };

  const value = useMemo(
    () => ({
      isLoggedIn: studentAccount !== null || isLoggedIn,
      studentAccount,
      registerLocalAccount,
      loginLocalAccount,
      logoutUser,
      connectedCalendars,
      setCalendarSelected,
      calendarEvents,
      upsertManualClass,
      deleteManualClass,
      setIsLoggedIn,
      devModeEnabled,
      setDevModeEnabled,
      accessibility,
      setAccessibility,
      setAllAccessibility,
      saved,
      setSaved,
    }),
    [
      studentAccount,
      isLoggedIn,
      devModeEnabled,
      accessibility,
      saved,
      connectedCalendars,
      calendarEvents,
    ]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error("useAppState must be used within AppStateProvider");
  }
  return context;
}
