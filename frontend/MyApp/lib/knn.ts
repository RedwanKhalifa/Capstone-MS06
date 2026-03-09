import { RSSI_FLOOR, type BeaconReading, type PlanID, type TrainingDataset } from '@/types/fingerprint';

type KNNCache = {
  mean: number[];
  std: number[];
  trainX: number[][];
  trainY: Array<{ x: number; y: number }>;
  beaconKeys: string[];
};

const euclidean = (a: number[], b: number[]) => Math.sqrt(a.reduce((s, v, i) => s + (v - b[i]) ** 2, 0));

export const buildKnnCache = (dataset: TrainingDataset, planID: PlanID): KNNCache | null => {
  const filtered = dataset.samples.filter((s) => s.planID === planID);
  if (filtered.length === 0 || dataset.beaconKeys.length === 0) return null;

  const n = dataset.beaconKeys.length;
  const mean = Array.from({ length: n }, (_, j) => filtered.reduce((s, row) => s + row.vector[j], 0) / filtered.length);
  const std = Array.from({ length: n }, (_, j) => {
    const variance = filtered.reduce((s, row) => s + (row.vector[j] - mean[j]) ** 2, 0) / filtered.length;
    return Math.sqrt(variance) + 1e-6;
  });

  const trainX = filtered.map((row) => row.vector.map((v, j) => (v - mean[j]) / std[j]));
  const trainY = filtered.map((row) => ({ x: row.xNorm, y: row.yNorm }));
  return { mean, std, trainX, trainY, beaconKeys: dataset.beaconKeys };
};

export const buildLiveVector = (beacons: BeaconReading[], beaconKeys: string[]) => {
  const byKey = new Map(beacons.map((b) => [b.key, b.rssi]));
  return beaconKeys.map((key) => byKey.get(key) ?? RSSI_FLOOR);
};

export const regressKnn = (
  cache: KNNCache,
  beacons: BeaconReading[],
  prev: { x: number; y: number } | null,
  k = 5,
  alpha = 0.35
) => {
  if (beacons.length === 0) return null;
  const raw = buildLiveVector(beacons, cache.beaconKeys);
  const live = raw.map((v, i) => (v - cache.mean[i]) / cache.std[i]);

  const dists = cache.trainX.map((train, i) => ({ i, d: euclidean(train, live) })).sort((a, b) => a.d - b.d);
  const neighbors = dists.slice(0, Math.min(k, dists.length));
  const eps = 1e-3;
  let wx = 0;
  let wy = 0;
  let wSum = 0;
  neighbors.forEach((n) => {
    const w = 1 / (n.d + eps);
    wx += w * cache.trainY[n.i].x;
    wy += w * cache.trainY[n.i].y;
    wSum += w;
  });
  if (wSum === 0) return null;

  let x = Math.max(0, Math.min(1, wx / wSum));
  let y = Math.max(0, Math.min(1, wy / wSum));
  if (prev) {
    x = prev.x + alpha * (x - prev.x);
    y = prev.y + alpha * (y - prev.y);
  }
  const avgD = neighbors.reduce((s, n) => s + n.d, 0) / neighbors.length;
  return { x, y, confidence: 1 / (1 + avgD) };
};
