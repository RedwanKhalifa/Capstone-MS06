// app/services/api.ts
const BASE_URL = "http://192.168.x.x:5000"; // 🔧 replace with your PC's IP address

export async function getRooms() {
  const res = await fetch(`${BASE_URL}/rooms`);
  if (!res.ok) throw new Error("Failed to fetch rooms");
  return await res.json();
}

export async function getBuildings() {
  const res = await fetch(`${BASE_URL}/buildings`);
  if (!res.ok) throw new Error("Failed to fetch buildings");
  return await res.json();
}

export async function getRoute(start: string, end: string, accessible = false) {
  const res = await fetch(
    `${BASE_URL}/navigate?start=${start}&end=${end}&accessible=${accessible}`
  );
  if (!res.ok) throw new Error("Failed to fetch route");
  return await res.json();
}
