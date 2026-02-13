import React, { createContext, useContext, useMemo, useState } from "react";

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

type AppStateContextValue = {
  isLoggedIn: boolean;
  setIsLoggedIn: (value: boolean) => void;
  accessibility: AccessibilitySettings;
  setAccessibility: (value: AccessibilitySettings) => void;
  setAllAccessibility: (value: boolean) => void;
  saved: SavedCollections;
  setSaved: (value: SavedCollections) => void;
};

const AppStateContext = createContext<AppStateContextValue | undefined>(undefined);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
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

  const setAllAccessibility = (value: boolean) => {
    setAccessibility({
      highContrast: value,
      largeText: value,
      voicePrompts: value,
    });
  };

  const value = useMemo(
    () => ({
      isLoggedIn,
      setIsLoggedIn,
      accessibility,
      setAccessibility,
      setAllAccessibility,
      saved,
      setSaved,
    }),
    [isLoggedIn, accessibility, saved]
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
