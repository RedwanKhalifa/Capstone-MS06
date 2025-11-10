const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';

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
