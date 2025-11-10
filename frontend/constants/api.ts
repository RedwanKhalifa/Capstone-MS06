import Constants from "expo-constants";

const sanitizeEnvValue = (value?: string | null): string | null => {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed.toLowerCase() === "undefined" || trimmed.toLowerCase() === "null") {
    return null;
  }

  return trimmed;
};

const deriveExpoHost = (port: string): string | null => {
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

  return `http://${host}:${port}`;
};

const envUrl = sanitizeEnvValue(process.env.EXPO_PUBLIC_API_URL);
const envPort = sanitizeEnvValue(process.env.EXPO_PUBLIC_API_PORT);
const fallbackPort = envPort || "5000";

const API_URL = envUrl || deriveExpoHost(fallbackPort) || `http://localhost:${fallbackPort}`;

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
