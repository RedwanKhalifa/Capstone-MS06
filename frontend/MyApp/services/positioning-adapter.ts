import * as FileSystem from "expo-file-system/legacy";
export type PositioningPoint = { id: string; name: string; x: number; y: number };
type PositioningState = { lastKnownPosition: { x: number; y: number }; points: PositioningPoint[]; planName: string };
const FILE_URI = `${FileSystem.documentDirectory}positioning-state.json`;
const DEFAULT_STATE: PositioningState = { lastKnownPosition: { x: 0.82, y: 0.42 }, points: [], planName: "ENG4_NORTH" };
async function loadState(): Promise<PositioningState> { try { const info = await FileSystem.getInfoAsync(FILE_URI); if (!info.exists) return DEFAULT_STATE; const text = await FileSystem.readAsStringAsync(FILE_URI); return { ...DEFAULT_STATE, ...(JSON.parse(text) as Partial<PositioningState>) }; } catch { return DEFAULT_STATE; } }
async function saveState(state: PositioningState) { await FileSystem.writeAsStringAsync(FILE_URI, JSON.stringify(state)); }
export async function getLivePosition() { return (await loadState()).lastKnownPosition; }
export async function setLivePosition(x: number, y: number) { const state = await loadState(); await saveState({ ...state, lastKnownPosition: { x, y } }); }
export async function getSetupState() { return loadState(); }
export async function addCollectPoint(name: string, x: number, y: number) { const state = await loadState(); const next = { ...state, points: [...state.points, { id: `${Date.now()}`, name, x, y }], lastKnownPosition: { x, y } }; await saveState(next); return next; }
export async function setPlanName(planName: string) { const state = await loadState(); const next = { ...state, planName }; await saveState(next); return next; }
