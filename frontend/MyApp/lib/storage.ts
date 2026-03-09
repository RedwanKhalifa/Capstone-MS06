import * as FileSystem from 'expo-file-system/legacy';

import type { AnchorPoint, TrainingDataset } from '@/types/fingerprint';

const POINTS_FILE = `${FileSystem.documentDirectory}anchor-points.json`;
const DATASET_FILE = `${FileSystem.documentDirectory}dataset.json`;

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
  readJson<TrainingDataset>(DATASET_FILE, { beaconKeys: [], samples: [], rows: [] });
export const saveDataset = (dataset: TrainingDataset) => writeJson(DATASET_FILE, dataset);
