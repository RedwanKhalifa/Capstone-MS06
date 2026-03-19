import * as FileSystem from 'expo-file-system/legacy';

import type { AnchorPoint, TrainingDataset } from '@/types/fingerprint';

const POINTS_FILE = `${FileSystem.documentDirectory}anchor-points.json`;
const DATASET_FILE = `${FileSystem.documentDirectory}dataset.json`;
const POSITIONING_PROJECT_FILE = `${FileSystem.documentDirectory}positioning-project.json`;
const POSITIONING_MODE_FILE = `${FileSystem.documentDirectory}positioning-mode.json`;
const ROUTING_GRAPH_FILE = `${FileSystem.documentDirectory}routing-graph.json`;
const FINGERPRINT_SETS_FILE = `${FileSystem.documentDirectory}fingerprint-sets.json`;

type PositioningProject = {
  points: AnchorPoint[];
  dataset: TrainingDataset;
};

export type FingerprintSetSnapshot = PositioningProject;

export type FingerprintSet = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  snapshot: FingerprintSetSnapshot;
};

export type PositioningMode = 'bluetooth' | 'manual';

export type RoutingNode = {
  id: string;
  x: number;
  y: number;
  floor: number;
};

export type RoutingEdge = {
  target: string;
  weight: number;
};

export type RoutingGraph = {
  nodes: RoutingNode[];
  edges: Record<string, RoutingEdge[]>;
};

type PositioningModeSnapshot = {
  mode: PositioningMode;
};

const EMPTY_DATASET: TrainingDataset = { beaconKeys: [], samples: [], rows: [] };

async function readJson<T>(uri: string, fallback: T): Promise<T> {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists) return fallback;
    const text = await FileSystem.readAsStringAsync(uri);
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(uri: string, value: unknown) {
  await FileSystem.writeAsStringAsync(uri, JSON.stringify(value));
}

export const loadPoints = () => readJson<AnchorPoint[]>(POINTS_FILE, []);
export const savePoints = (points: AnchorPoint[]) => writeJson(POINTS_FILE, points);

export const loadDataset = () =>
  readJson<TrainingDataset>(DATASET_FILE, EMPTY_DATASET);
export const saveDataset = (dataset: TrainingDataset) => writeJson(DATASET_FILE, dataset);

export const loadPositioningProject = async (): Promise<PositioningProject> => {
  const bundled = await readJson<PositioningProject | null>(POSITIONING_PROJECT_FILE, null);
  if (bundled && Array.isArray(bundled.points) && bundled.dataset) {
    return {
      points: bundled.points,
      dataset: bundled.dataset,
    };
  }

  // Legacy fallback: older app versions saved these independently.
  const [points, dataset] = await Promise.all([loadPoints(), loadDataset()]);
  return { points, dataset };
};

export const savePositioningProject = async (project: PositioningProject) => {
  // Write bundled snapshot atomically for point+fingerprint consistency.
  await writeJson(POSITIONING_PROJECT_FILE, project);

  // Keep legacy files in sync for backward compatibility with existing readers.
  await Promise.all([savePoints(project.points), saveDataset(project.dataset)]);
};

export const loadPositioningMode = async (): Promise<PositioningMode> => {
  const snapshot = await readJson<PositioningModeSnapshot | null>(POSITIONING_MODE_FILE, null);
  if (snapshot?.mode === 'manual' || snapshot?.mode === 'bluetooth') {
    return snapshot.mode;
  }
  return 'bluetooth';
};

export const savePositioningMode = (mode: PositioningMode) =>
  writeJson(POSITIONING_MODE_FILE, { mode });

export const loadRoutingGraph = async (fallback: RoutingGraph): Promise<RoutingGraph> => {
  const graph = await readJson<RoutingGraph | null>(ROUTING_GRAPH_FILE, null);
  if (!graph || !Array.isArray(graph.nodes) || typeof graph.edges !== 'object' || graph.edges == null) {
    return fallback;
  }
  return graph;
};

export const saveRoutingGraph = (graph: RoutingGraph) =>
  writeJson(ROUTING_GRAPH_FILE, graph);

export const loadFingerprintSets = async (): Promise<FingerprintSet[]> => {
  const sets = await readJson<FingerprintSet[] | null>(FINGERPRINT_SETS_FILE, null);
  if (!Array.isArray(sets)) return [];
  return sets.filter((set) =>
    !!set &&
    typeof set.id === 'string' &&
    typeof set.name === 'string' &&
    !!set.snapshot &&
    Array.isArray(set.snapshot.points) &&
    !!set.snapshot.dataset
  );
};

export const saveFingerprintSet = async (
  name: string,
  snapshot: FingerprintSetSnapshot
): Promise<FingerprintSet> => {
  const trimmedName = name.trim();
  if (!trimmedName) throw new Error('Fingerprint set name is required.');

  const now = new Date().toISOString();
  const allSets = await loadFingerprintSets();
  const existing = allSets.find((set) => set.name.toLowerCase() === trimmedName.toLowerCase());

  const nextSet: FingerprintSet = existing
    ? {
        ...existing,
        name: trimmedName,
        updatedAt: now,
        snapshot,
      }
    : {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        name: trimmedName,
        createdAt: now,
        updatedAt: now,
        snapshot,
      };

  const nextSets = existing
    ? allSets.map((set) => (set.id === existing.id ? nextSet : set))
    : [nextSet, ...allSets];

  await writeJson(FINGERPRINT_SETS_FILE, nextSets);
  return nextSet;
};

export const deleteFingerprintSet = async (id: string): Promise<boolean> => {
  const allSets = await loadFingerprintSets();
  const next = allSets.filter((set) => set.id !== id);
  if (next.length === allSets.length) return false;
  await writeJson(FINGERPRINT_SETS_FILE, next);
  return true;
};

export const renameFingerprintSet = async (id: string, nextName: string): Promise<FingerprintSet> => {
  const trimmed = nextName.trim();
  if (!trimmed) throw new Error('Fingerprint set name is required.');

  const allSets = await loadFingerprintSets();
  const target = allSets.find((set) => set.id === id);
  if (!target) throw new Error('Fingerprint set not found.');

  const duplicate = allSets.find(
    (set) => set.id !== id && set.name.toLowerCase() === trimmed.toLowerCase()
  );
  if (duplicate) throw new Error('A fingerprint set with this name already exists.');

  const renamed: FingerprintSet = {
    ...target,
    name: trimmed,
    updatedAt: new Date().toISOString(),
  };

  const nextSets = allSets.map((set) => (set.id === id ? renamed : set));
  await writeJson(FINGERPRINT_SETS_FILE, nextSets);
  return renamed;
};

export const overwriteFingerprintSet = async (
  id: string,
  snapshot: FingerprintSetSnapshot,
  nextName?: string
): Promise<FingerprintSet> => {
  const allSets = await loadFingerprintSets();
  const target = allSets.find((set) => set.id === id);
  if (!target) throw new Error('Fingerprint set not found.');

  const resolvedName = (nextName ?? target.name).trim();
  if (!resolvedName) throw new Error('Fingerprint set name is required.');

  const duplicate = allSets.find(
    (set) => set.id !== id && set.name.toLowerCase() === resolvedName.toLowerCase()
  );
  if (duplicate) throw new Error('A fingerprint set with this name already exists.');

  const overwritten: FingerprintSet = {
    ...target,
    name: resolvedName,
    updatedAt: new Date().toISOString(),
    snapshot,
  };

  const nextSets = allSets.map((set) => (set.id === id ? overwritten : set));
  await writeJson(FINGERPRINT_SETS_FILE, nextSets);
  return overwritten;
};
