import { loadPoints, savePoints } from "@/lib/storage";
import type { PlanID } from "@/types/fingerprint";
import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";

export type LivePosition = {
	x: number;
	y: number;
	timestamp: number;
	accuracy?: number;
	planId?: string;
};
export type PositioningPoint = { id: string; name: string; x: number; y: number };
type PositioningState = { lastKnownPosition: LivePosition; points: PositioningPoint[]; planName: string };
const FILE_URI = `${FileSystem.documentDirectory}positioning-state.json`;
const DEFAULT_STATE: PositioningState = {
	lastKnownPosition: { x: 0.82, y: 0.42, timestamp: Date.now(), planId: "ENG4_NORTH" },
	points: [],
	planName: "ENG4_NORTH"
};
const WEB_STORAGE_KEY = "capstone-ms06:positioning-state";

async function loadState(): Promise<PositioningState> {
	try {
		if (Platform.OS === "web") {
			const text = globalThis.localStorage?.getItem(WEB_STORAGE_KEY);
			if (!text) return DEFAULT_STATE;
			const parsed = { ...DEFAULT_STATE, ...(JSON.parse(text) as Partial<PositioningState>) };
			const lastKnownPosition = parsed.lastKnownPosition ?? DEFAULT_STATE.lastKnownPosition;
			return {
				...parsed,
				lastKnownPosition: {
					x: Number.isFinite(lastKnownPosition.x) ? lastKnownPosition.x : DEFAULT_STATE.lastKnownPosition.x,
					y: Number.isFinite(lastKnownPosition.y) ? lastKnownPosition.y : DEFAULT_STATE.lastKnownPosition.y,
					timestamp: Number.isFinite(lastKnownPosition.timestamp)
						? lastKnownPosition.timestamp
						: Date.now(),
					accuracy: lastKnownPosition.accuracy,
					planId: lastKnownPosition.planId ?? parsed.planName,
				}
			};
		}

		const info = await FileSystem.getInfoAsync(FILE_URI);
		if (!info.exists) return DEFAULT_STATE;
		const text = await FileSystem.readAsStringAsync(FILE_URI);
		const parsed = { ...DEFAULT_STATE, ...(JSON.parse(text) as Partial<PositioningState>) };
		const lastKnownPosition = parsed.lastKnownPosition ?? DEFAULT_STATE.lastKnownPosition;
		return {
			...parsed,
			lastKnownPosition: {
				x: Number.isFinite(lastKnownPosition.x) ? lastKnownPosition.x : DEFAULT_STATE.lastKnownPosition.x,
				y: Number.isFinite(lastKnownPosition.y) ? lastKnownPosition.y : DEFAULT_STATE.lastKnownPosition.y,
				timestamp: Number.isFinite(lastKnownPosition.timestamp)
					? lastKnownPosition.timestamp
					: Date.now(),
				accuracy: lastKnownPosition.accuracy,
				planId: lastKnownPosition.planId ?? parsed.planName,
			}
		};
	} catch {
		return DEFAULT_STATE;
	}
}
async function saveState(state: PositioningState) {
	if (Platform.OS === "web") {
		globalThis.localStorage?.setItem(WEB_STORAGE_KEY, JSON.stringify(state));
		return;
	}
	await FileSystem.writeAsStringAsync(FILE_URI, JSON.stringify(state));
}
export async function getLivePosition() { return (await loadState()).lastKnownPosition; }
export async function setLivePosition(
	x: number,
	y: number,
	options?: { accuracy?: number; timestamp?: number; planId?: string }
) {
	const state = await loadState();
	await saveState({
		...state,
		lastKnownPosition: {
			x,
			y,
			timestamp: options?.timestamp ?? Date.now(),
			accuracy: options?.accuracy,
			planId: options?.planId ?? state.planName,
		},
	});
}
export function subscribeLivePosition(onUpdate: (position: LivePosition) => void, intervalMs = 700) {
	let active = true;
	const pollMs = Math.max(250, intervalMs);

	const tick = async () => {
		try {
			const position = await getLivePosition();
			if (active) onUpdate(position);
		} catch {}
	};

	void tick();
	const timer = setInterval(() => {
		void tick();
	}, pollMs);

	return () => {
		active = false;
		clearInterval(timer);
	};
}
export async function getSetupState() {
	const state = await loadState();
	const anchorPoints = await loadPoints();
	const mappedPoints = anchorPoints
		.filter((p) => p.planID === (state.planName as PlanID))
		.map((p) => ({ id: p.id, name: p.name, x: p.xNorm, y: p.yNorm }));
	return { ...state, points: mappedPoints };
}
export async function addCollectPoint(name: string, x: number, y: number) {
	const state = await loadState();
	const currentPlan = (state.planName as PlanID) || "ENG4_NORTH";
	const existing = await loadPoints();
	const nextPoint = { id: `${Date.now()}`, planID: currentPlan, name, xNorm: x, yNorm: y };
	await savePoints([...existing, nextPoint]);
	const next = {
		...state,
		points: [...state.points, { id: nextPoint.id, name, x, y }],
		lastKnownPosition: {
			x,
			y,
			timestamp: Date.now(),
			planId: currentPlan,
		}
	};
	await saveState(next);
	return next;
}
export async function setPlanName(planName: string) { const state = await loadState(); const next = { ...state, planName }; await saveState(next); return next; }
