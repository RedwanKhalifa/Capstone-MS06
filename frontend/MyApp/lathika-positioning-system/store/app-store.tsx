import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { buildDataset } from '@/lib/csv';
import { loadDataset, loadPoints, saveDataset, savePoints } from '@/lib/storage';
import { FLOOR_PLANS, type AnchorPoint, type FingerprintCsvRow, type PlanID, type TrainingDataset } from '@/types/fingerprint';

type AppStore = {
  plans: typeof FLOOR_PLANS;
  selectedPlanID: PlanID;
  setSelectedPlanID: (id: PlanID) => void;
  points: AnchorPoint[];
  setPoints: React.Dispatch<React.SetStateAction<AnchorPoint[]>>;
  dataset: TrainingDataset;
  appendRows: (rows: FingerprintCsvRow[]) => void;
  replaceRows: (rows: FingerprintCsvRow[]) => void;
  clearDataset: () => void;
};

const Ctx = createContext<AppStore | null>(null);

export const createId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const [selectedPlanID, setSelectedPlanID] = useState<PlanID>('ENG4_NORTH');
  const [points, setPoints] = useState<AnchorPoint[]>([]);
  const [dataset, setDataset] = useState<TrainingDataset>({ beaconKeys: [], samples: [], rows: [] });

  useEffect(() => {
    loadPoints().then(setPoints);
    loadDataset().then(setDataset);
  }, []);

  useEffect(() => {
    savePoints(points);
  }, [points]);

  useEffect(() => {
    saveDataset(dataset);
  }, [dataset]);

  const appendRows = (rows: FingerprintCsvRow[]) => setDataset((prev) => buildDataset([...prev.rows, ...rows]));
  const replaceRows = (rows: FingerprintCsvRow[]) => setDataset(buildDataset(rows));
  const clearDataset = () => setDataset({ beaconKeys: [], samples: [], rows: [] });

  const value = useMemo(() => ({ plans: FLOOR_PLANS, selectedPlanID, setSelectedPlanID, points, setPoints, dataset, appendRows, replaceRows, clearDataset }), [selectedPlanID, points, dataset]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useAppStore = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAppStore must be used in AppStoreProvider');
  return ctx;
};
