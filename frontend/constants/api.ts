import Constants from "expo-constants";

const deriveExpoHost = (): string | null => {
  const expoHost =
    Constants.expoConfig?.hostUri ||
    // Expo SDK 50+ exposes hostUri under manifest2.extra.expoClient for Expo Go
    (Constants as any).manifest2?.extra?.expoClient?.hostUri ||
    // Legacy manifest debugger host (SDK < 50)
    (Constants as any).manifest?.debuggerHost;

  if (!expoHost) {
    return null;
  }

  const normalized = expoHost.includes("://") ? expoHost : `http://${expoHost}`;
  let host: string | null = null;
  try {
    host = new URL(normalized).hostname;
  } catch (err) {
    host = null;
  }

  if (!host) {
    return null;
  }

  const port = process.env.EXPO_PUBLIC_API_PORT || "5000";
  return `http://${host}:${port}`;
};

const API_URL = process.env.EXPO_PUBLIC_API_URL || deriveExpoHost() || "http://localhost:5000";

export const endpoints = {
  navigation: `${API_URL}/api/navigation`,
  nearby: `${API_URL}/api/navigation/nearby`,
  rooms: `${API_URL}/api/rooms`,
  buildings: `${API_URL}/api/buildings`,
  authMe: `${API_URL}/api/auth/me`,
  beacons: `${API_URL}/api/hardware/beacons/live`,
  systemStats: `${API_URL}/api/system/stats`,
};

export default API_URL;
