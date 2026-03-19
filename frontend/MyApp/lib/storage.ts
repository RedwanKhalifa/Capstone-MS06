import * as FileSystem from 'expo-file-system/legacy';

import type { AnchorPoint, TrainingDataset } from '@/types/fingerprint';

const POINTS_FILE = `${FileSystem.documentDirectory}anchor-points.json`;
const DATASET_FILE = `${FileSystem.documentDirectory}dataset.json`;
const POSITIONING_PROJECT_FILE = `${FileSystem.documentDirectory}positioning-project.json`;
const POSITIONING_MODE_FILE = `${FileSystem.documentDirectory}positioning-mode.json`;

type PositioningProject = {
  points: AnchorPoint[];
  dataset: TrainingDataset;
};

export type PositioningMode = 'bluetooth' | 'manual';

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
