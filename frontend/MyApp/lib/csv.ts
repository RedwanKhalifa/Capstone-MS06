import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Share } from 'react-native';

import { RSSI_FLOOR, type FingerprintCsvRow, type PlanID, type TrainingDataset } from '@/types/fingerprint';

const HEADER = 'timestamp,planID,pointID,pointName,xNorm,yNorm,uuid,major,minor,rssi,mode';

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const m = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) return Math.round((sorted[m - 1] + sorted[m]) / 2);
  return sorted[m];
};

export const rowsToCsv = (rows: FingerprintCsvRow[]) => {
  const lines = [HEADER];
  rows.forEach((r) => {
    lines.push(
      [
        r.timestamp,
        r.planID,
        r.pointID,
        r.pointName,
        r.xNorm.toFixed(6),
        r.yNorm.toFixed(6),
        r.uuid,
        r.major,
        r.minor,
        r.rssi,
        r.mode,
      ].join(',')
    );
  });
  return lines.join('\n');
};

export const exportRowsCsv = async (rows: FingerprintCsvRow[]) => {
  if (!FileSystem.cacheDirectory) throw new Error('No cache directory.');
  const uri = `${FileSystem.cacheDirectory}fingerprints-${Date.now()}.csv`;
  await FileSystem.writeAsStringAsync(uri, rowsToCsv(rows));
  await Share.share({ url: uri, message: uri });
};

export const importCsvText = async () => {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['text/csv', 'text/plain', 'text/*'],
    copyToCacheDirectory: true,
  });
  if (result.canceled || result.assets.length === 0) return null;
  return FileSystem.readAsStringAsync(result.assets[0].uri);
};

const parseLine = (line: string) => line.split(',').map((v) => v.trim());

export const parseCsvRows = (content: string): FingerprintCsvRow[] => {
  const lines = content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];
  return lines
    .slice(1)
    .map((line) => {
      const [timestamp, planID, pointID, pointName, xNorm, yNorm, uuid, major, minor, rssi, mode] =
        parseLine(line);
      return {
        timestamp,
        planID: planID as PlanID,
        pointID,
        pointName,
        xNorm: Number(xNorm),
        yNorm: Number(yNorm),
        uuid,
        major: Number(major),
        minor: Number(minor),
        rssi: Number(rssi),
        mode,
      };
    })
    .filter((r) => Number.isFinite(r.xNorm) && Number.isFinite(r.yNorm) && Number.isFinite(r.rssi));
};

export const buildDataset = (rows: FingerprintCsvRow[]): TrainingDataset => {
  const beaconKeys = Array.from(new Set(rows.map((r) => `${r.major}_${r.minor}`))).sort();
  const groups = new Map<string, FingerprintCsvRow[]>();
  rows.forEach((row) => {
    const sampleKey = `${row.timestamp}|${row.planID}|${row.xNorm}|${row.yNorm}`;
    const bucket = groups.get(sampleKey) ?? [];
    bucket.push(row);
    groups.set(sampleKey, bucket);
  });

  const samples = Array.from(groups.values()).map((sampleRows) => {
    const first = sampleRows[0];
    const perBeacon = new Map<string, number[]>();
    sampleRows.forEach((row) => {
      const key = `${row.major}_${row.minor}`;
      const bucket = perBeacon.get(key) ?? [];
      bucket.push(row.rssi);
      perBeacon.set(key, bucket);
    });

    const vector = beaconKeys.map((key) => {
      const values = perBeacon.get(key);
      return values?.length ? median(values) : RSSI_FLOOR;
    });

    return {
      timestamp: first.timestamp,
      planID: first.planID,
      xNorm: first.xNorm,
      yNorm: first.yNorm,
      vector,
    };
  });

  return { beaconKeys, samples, rows };
};
