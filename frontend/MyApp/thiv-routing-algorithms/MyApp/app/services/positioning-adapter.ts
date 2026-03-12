import * as FileSystem from "expo-file-system/legacy";

export type LivePosition = {
  x: number;
  y: number;
  timestamp: number;
  accuracy?: number;
  planId?: string;
};

type PositioningState = {
  lastKnownPosition?: Partial<LivePosition>;
  planName?: string;
};

const FILE_URI = `${FileSystem.documentDirectory}positioning-state.json`;
const POSITION_ENDPOINT = process.env.EXPO_PUBLIC_POSITION_ENDPOINT;
const MAX_AGE_MS = 30_000;

const DEFAULT_POSITION: LivePosition = {
  x: 0,
  y: 0,
  timestamp: 0,
  planId: "ENG4_NORTH",
};

const normalizeLivePosition = (
  candidate?: Partial<LivePosition>,
  fallbackPlanId?: string,
): LivePosition => ({
  x: Number.isFinite(candidate?.x) ? Number(candidate?.x) : DEFAULT_POSITION.x,
  y: Number.isFinite(candidate?.y) ? Number(candidate?.y) : DEFAULT_POSITION.y,
  timestamp: Number.isFinite(candidate?.timestamp)
    ? Number(candidate?.timestamp)
    : DEFAULT_POSITION.timestamp,
  accuracy: Number.isFinite(candidate?.accuracy)
    ? Number(candidate?.accuracy)
    : undefined,
  planId: candidate?.planId ?? fallbackPlanId ?? DEFAULT_POSITION.planId,
});

function isFresh(position: LivePosition): boolean {
  return Date.now() - position.timestamp <= MAX_AGE_MS;
}

async function getLivePositionFromEndpoint(): Promise<LivePosition | null> {
  if (!POSITION_ENDPOINT) return null;

  try {
    const res = await fetch(POSITION_ENDPOINT);
    if (!res.ok) return null;

    const parsed = (await res.json()) as Partial<PositioningState>;
    const normalized = normalizeLivePosition(
      parsed.lastKnownPosition,
      parsed.planName,
    );

    return normalized.timestamp > 0 ? normalized : null;
  } catch {
    return null;
  }
}

async function getLivePositionFromLocalState(): Promise<LivePosition | null> {
  try {
    const info = await FileSystem.getInfoAsync(FILE_URI);
    if (!info.exists) return null;

    const raw = await FileSystem.readAsStringAsync(FILE_URI);
    const parsed = JSON.parse(raw) as Partial<PositioningState>;
    const normalized = normalizeLivePosition(
      parsed.lastKnownPosition,
      parsed.planName,
    );

    return normalized.timestamp > 0 ? normalized : null;
  } catch {
    return null;
  }
}

export async function getLivePosition(): Promise<LivePosition> {
  const endpointPosition = await getLivePositionFromEndpoint();
  if (endpointPosition && isFresh(endpointPosition)) return endpointPosition;

  const localPosition = await getLivePositionFromLocalState();
  if (localPosition && isFresh(localPosition)) return localPosition;

  return DEFAULT_POSITION;
}
