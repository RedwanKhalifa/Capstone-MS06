/**
 * Global positioning context.
 *
 * Owns the single BleManager for the whole app.  BLE scanning and KNN
 * inference run here so that live-position updates continue regardless of
 * which screen is mounted.  Any screen can:
 *   – read the latest prediction / scan state via usePositioning()
 *   – start/stop bluetooth inference
 *   – set a manual position
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { useBeaconRanger } from '@/hooks/use-beacon-ranger';
import { buildKnnCache, regressKnn } from '@/lib/knn';
import { requestBlePermissions } from '@/lib/permissions';
import { loadDataset, loadPositioningMode, savePositioningMode, type PositioningMode } from '@/lib/storage';
import { setLivePosition, setPlanName, type LivePosition } from '@/services/positioning-adapter';
import { BEACON_UUID_DEFAULT, type BeaconReading, type PlanID } from '@/types/fingerprint';

const PLAN_ID: PlanID = 'ENG4_NORTH';
const INFERENCE_INTERVAL_MS = 1000;

export type PositioningContextValue = {
  /** Currently visible beacons from the active BLE scan. */
  beacons: BeaconReading[];
  isScanning: boolean;
  scanError: string | null;
  /** UUID filter used when scanning. */
  uuid: string;
  setUuid: (uuid: string) => void;
  /** Latest KNN-inferred or manually-set position. null until first fix. */
  prediction: LivePosition | null;
  liveMode: PositioningMode;
  setLiveMode: (mode: PositioningMode) => void;
  /** True while the KNN inference loop is actively running. */
  isLiveRunning: boolean;
  liveConfidence: number | null;
  /** Start BLE scan AND run KNN inference (live position mode). */
  startBluetooth: () => Promise<void>;
  /** Stop inference and BLE scan. */
  stopBluetooth: () => void;
  /** Start BLE scan only – no inference (used by fingerprint collection tab). */
  startScanOnly: () => Promise<void>;
  /** Stop BLE scan only (does not clear inference state). */
  stopScan: () => void;
  clearBeacons: () => void;
  /** Publish a manually-chosen position without BLE. Stops any active scan. */
  setManualPosition: (x: number, y: number) => void;
  /**
   * Call after saving a new fingerprint dataset so the context reloads the
   * KNN cache from storage.
   */
  reloadDataset: () => void;
};

const PositioningContext = createContext<PositioningContextValue | undefined>(undefined);

export function PositioningProvider({ children }: { children: React.ReactNode }) {
  const [uuid, setUuid] = useState(BEACON_UUID_DEFAULT);
  const [liveMode, setLiveModeState] = useState<PositioningMode>('bluetooth');
  const [isLiveRunning, setIsLiveRunning] = useState(false);
  const [prediction, setPrediction] = useState<LivePosition | null>(null);
  const [liveConfidence, setLiveConfidence] = useState<number | null>(null);
  const [datasetVersion, setDatasetVersion] = useState(0);

  const knnCacheRef = useRef<ReturnType<typeof buildKnnCache>>(null);
  const prevRef = useRef<{ x: number; y: number } | null>(null);

  const { beacons, isScanning, scanError, start, stop, clear } = useBeaconRanger(uuid);

  const refreshKnnCache = useCallback(async () => {
    const dataset = await loadDataset();
    const cache = buildKnnCache(dataset, PLAN_ID);
    knnCacheRef.current = cache;
    return cache;
  }, []);

  // Keep a ref so the inference-loop closure always reads the latest beacons.
  const latestBeaconsRef = useRef(beacons);
  useEffect(() => {
    latestBeaconsRef.current = beacons;
  }, [beacons]);

  // Reload KNN cache whenever the fingerprint dataset is updated.
  useEffect(() => {
    void refreshKnnCache();
  }, [datasetVersion, refreshKnnCache]);

  // Register plan name with the positioning adapter once on mount.
  useEffect(() => {
    void setPlanName(PLAN_ID);
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      const saved = await loadPositioningMode();
      if (active) setLiveModeState(saved);
    })();
    return () => {
      active = false;
    };
  }, []);

  const setLiveMode = useCallback((mode: PositioningMode) => {
    setLiveModeState(mode);
    void savePositioningMode(mode);
  }, []);

  // KNN inference loop – keeps running across navigations.
  useEffect(() => {
    if (!isLiveRunning) return;

    const tick = () => {
      const cache = knnCacheRef.current;
      if (!cache) return;
      const next = regressKnn(cache, latestBeaconsRef.current, prevRef.current, 5, 0.2);
      if (!next) return;
      const now = Date.now();
      prevRef.current = { x: next.x, y: next.y };
      const pos: LivePosition = { x: next.x, y: next.y, timestamp: now, planId: PLAN_ID };
      setPrediction(pos);
      setLiveConfidence(next.confidence);
      void setLivePosition(next.x, next.y, { timestamp: now, planId: PLAN_ID });
    };

    tick();
    const interval = setInterval(tick, INFERENCE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isLiveRunning]);

  const startBluetooth = useCallback(async () => {
    const granted = await requestBlePermissions();
    if (!granted) throw new Error('BLE permissions not granted');
    const cache = await refreshKnnCache();
    if (!cache) throw new Error('No fingerprint dataset available for this floor plan yet');
    clear();
    prevRef.current = null;
    setPrediction(null);
    setLiveConfidence(null);
    start();
    setLiveMode('bluetooth');
    setIsLiveRunning(true);
  }, [start, clear, refreshKnnCache, setLiveMode]);

  const stopBluetooth = useCallback(() => {
    stop();
    setIsLiveRunning(false);
    setPrediction(null);
    setLiveConfidence(null);
    prevRef.current = null;
  }, [stop]);

  const startScanOnly = useCallback(async () => {
    const granted = await requestBlePermissions();
    if (!granted) throw new Error('BLE permissions not granted');
    clear();
    start();
  }, [start, clear]);

  const stopScan = useCallback(() => {
    stop();
  }, [stop]);

  const clearBeacons = useCallback(() => {
    clear();
  }, [clear]);

  const setManualPosition = useCallback((x: number, y: number) => {
    stop();
    setLiveMode('manual');
    setIsLiveRunning(false);
    prevRef.current = null;
    const now = Date.now();
    const pos: LivePosition = { x, y, timestamp: now, planId: PLAN_ID };
    setPrediction(pos);
    setLiveConfidence(null);
    void setLivePosition(x, y, { timestamp: now, planId: PLAN_ID, accuracy: 0 });
  }, [stop, setLiveMode]);

  const reloadDataset = useCallback(() => {
    setDatasetVersion((v) => v + 1);
  }, []);

  const value = useMemo<PositioningContextValue>(() => ({
    beacons,
    isScanning,
    scanError,
    uuid,
    setUuid,
    prediction,
    liveMode,
    setLiveMode,
    isLiveRunning,
    liveConfidence,
    startBluetooth,
    stopBluetooth,
    startScanOnly,
    stopScan,
    clearBeacons,
    setManualPosition,
    reloadDataset,
  }), [
    beacons, isScanning, scanError, uuid, prediction, liveMode, isLiveRunning, liveConfidence,
    setLiveMode, startBluetooth, stopBluetooth, startScanOnly, stopScan, clearBeacons, setManualPosition, reloadDataset,
  ]);

  return (
    <PositioningContext.Provider value={value}>
      {children}
    </PositioningContext.Provider>
  );
}

export function usePositioning() {
  const ctx = useContext(PositioningContext);
  if (!ctx) throw new Error('usePositioning must be used within PositioningProvider');
  return ctx;
}
