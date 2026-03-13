import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { FloorplanCanvas } from '@/components/maps/floorplan-canvas';
import { useBeaconRanger } from '@/hooks/use-beacon-ranger';
import { buildDataset, exportRowsCsv, importCsvText, parseCsvRows } from '@/lib/csv';
import { buildKnnCache, regressKnn } from '@/lib/knn';
import { requestBlePermissions } from '@/lib/permissions';
import { loadDataset, loadPoints, saveDataset, savePoints } from '@/lib/storage';
import { setLivePosition, setPlanName, type LivePosition } from '@/services/positioning-adapter';
import { BEACON_UUID_DEFAULT, FLOOR_PLANS, type AnchorPoint, type FingerprintCsvRow, type PlanID, type TrainingDataset } from '@/types/fingerprint';

type SetupTab = 'collect' | 'live' | 'plans';
type LiveMode = 'bluetooth' | 'manual';
const LIVE_INFERENCE_INTERVAL_MS = 1000;

const createId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const m = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? Math.round((sorted[m - 1] + sorted[m]) / 2) : sorted[m];
};

export default function PositioningSetupScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<SetupTab>('collect');

  const selectedPlanID: PlanID = 'ENG4_NORTH';
  const [points, setPoints] = useState<AnchorPoint[]>([]);
  const [dataset, setDataset] = useState<TrainingDataset>({ beaconKeys: [], samples: [], rows: [] });
  const [isHydrated, setIsHydrated] = useState(false);

  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const [uuid, setUuid] = useState(BEACON_UUID_DEFAULT);
  const [captureWindow, setCaptureWindow] = useState('3');
  const [isCapturing, setIsCapturing] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [medians, setMedians] = useState<Record<string, number>>({});
  const [runningLive, setRunningLive] = useState(false);
  const [liveMode, setLiveMode] = useState<LiveMode>('bluetooth');
  const [prediction, setPrediction] = useState<LivePosition | null>(null);
  const [liveConfidence, setLiveConfidence] = useState<number | null>(null);
  const { beacons, isScanning, scanError, start, stop, clear } = useBeaconRanger(uuid);

  const buffers = useRef<Record<string, number[]>>({});
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevRef = useRef<{ x: number; y: number } | null>(null);
  const latestBeaconsRef = useRef(beacons);
  const latestCacheRef = useRef<ReturnType<typeof buildKnnCache> | null>(null);
  const latestPlanIdRef = useRef<PlanID>(selectedPlanID);

  useEffect(() => {
    let mounted = true;
    Promise.all([loadPoints(), loadDataset()]).then(([storedPoints, storedDataset]) => {
      if (!mounted) return;
      setPoints(storedPoints);
      setDataset(storedDataset);
      setIsHydrated(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    savePoints(points);
  }, [points, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    saveDataset(dataset);
  }, [dataset, isHydrated]);

  useEffect(() => {
    setPlanName(selectedPlanID);
  }, [selectedPlanID]);

  const selectedPlan = FLOOR_PLANS.find((p) => p.id === selectedPlanID)!;
  const planPoints = useMemo(() => points.filter((p) => p.planID === selectedPlanID), [points, selectedPlanID]);
  const selectedPoint = planPoints.find((p) => p.id === selectedPointId) ?? null;
  const cache = useMemo(() => buildKnnCache(dataset, selectedPlanID), [dataset, selectedPlanID]);

  useEffect(() => {
    latestBeaconsRef.current = beacons;
  }, [beacons]);

  useEffect(() => {
    latestCacheRef.current = cache;
  }, [cache]);

  useEffect(() => {
    latestPlanIdRef.current = selectedPlanID;
  }, [selectedPlanID]);

  useEffect(() => {
    if (!runningLive) return;

    const tick = () => {
      const latestCache = latestCacheRef.current;
      if (!latestCache) return;

      const next = regressKnn(latestCache, latestBeaconsRef.current, prevRef.current, 5, 0.2);
      if (!next) return;

      const now = Date.now();
      const planId = latestPlanIdRef.current;

      prevRef.current = { x: next.x, y: next.y };
      setPrediction({
        x: next.x,
        y: next.y,
        timestamp: now,
        planId,
      });
      setLiveConfidence(next.confidence);
      void setLivePosition(next.x, next.y, { timestamp: now, planId });
    };

    tick();
    const interval = setInterval(tick, LIVE_INFERENCE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [runningLive]);

  const beginCapture = () => {
    if (!selectedPoint) {
      Alert.alert('Select point first');
      return;
    }
    const seconds = Math.max(2, Math.min(30, Number(captureWindow) || 8));
    setCaptureWindow(String(seconds));
    setSecondsLeft(seconds);
    setMedians({});
    buffers.current = {};
    setIsCapturing(true);
    timer.current && clearInterval(timer.current);
    timer.current = setInterval(() => {
      beacons.forEach((b) => {
        const bucket = buffers.current[b.key] ?? [];
        bucket.push(b.rssi);
        buffers.current[b.key] = bucket;
      });
      setSecondsLeft((s) => {
        if (s <= 1) {
          stopCapture();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  const stopCapture = () => {
    timer.current && clearInterval(timer.current);
    timer.current = null;
    setIsCapturing(false);
    const next: Record<string, number> = {};
    Object.entries(buffers.current).forEach(([key, values]) => {
      if (values.length) next[key] = median(values);
    });
    setMedians(next);
  };

  const appendRows = (rows: FingerprintCsvRow[]) => {
    setDataset((prev) => buildDataset([...prev.rows, ...rows]));
  };

  const saveMedians = () => {
    if (!selectedPoint) {
      Alert.alert('Pick anchor point first');
      return;
    }
    const rows: FingerprintCsvRow[] = Object.entries(medians).map(([key, rssi]) => {
      const live = beacons.find((b) => b.key === key);
      const [major, minor] = key.split('_').map(Number);
      return {
        timestamp: new Date().toISOString(),
        planID: selectedPlanID,
        pointID: selectedPoint.id,
        pointName: selectedPoint.name,
        xNorm: selectedPoint.xNorm,
        yNorm: selectedPoint.yNorm,
        uuid: live?.uuid ?? uuid,
        major,
        minor,
        rssi,
        mode: `median${captureWindow}s`,
      };
    });
    appendRows(rows);
  };

  const captureSnapshot = () => {
    if (!selectedPoint) {
      Alert.alert('Pick anchor point first');
      return;
    }
    const ts = new Date().toISOString();
    appendRows(
      beacons.map((b) => ({
        timestamp: ts,
        planID: selectedPlanID,
        pointID: selectedPoint.id,
        pointName: selectedPoint.name,
        xNorm: selectedPoint.xNorm,
        yNorm: selectedPoint.yNorm,
        uuid: b.uuid,
        major: b.major,
        minor: b.minor,
        rssi: b.rssi,
        mode: 'live',
      }))
    );
  };

  const importCsv = async () => {
    const txt = await importCsvText();
    if (!txt) return;
    const rows = parseCsvRows(txt);
    const next = buildDataset(rows);
    setDataset(next);
    Alert.alert('Imported', `${rows.length} CSV rows loaded, ${next.samples.length} sample vectors built.`);
  };

  const addNewPoint = () => {
    const next = {
      id: createId(),
      planID: selectedPlanID,
      name: `P${planPoints.length + 1}`,
      xNorm: 0.5,
      yNorm: 0.5,
    };
    setPoints((prev) => [...prev, next]);
    setSelectedPointId(next.id);
  };

  const onDragPoint = (pointId: string, xNorm: number, yNorm: number) => {
    setPoints((prev) => prev.map((p) => (p.id === pointId ? { ...p, xNorm, yNorm } : p)));
  };

  const handleLiveStart = async () => {
    setLiveMode('bluetooth');
    const granted = await requestBlePermissions();
    if (!granted) {
      Alert.alert('Permissions required', 'Bluetooth and Location permissions are required to scan beacons.');
      return;
    }
    prevRef.current = null;
    setPrediction(null);
    clear();
    start();
    setRunningLive(true);
  };

  const setManualLivePosition = (xNorm: number, yNorm: number) => {
    const now = Date.now();
    const planId = selectedPlanID;
    stop();
    setRunningLive(false);
    prevRef.current = null;
    setLiveMode('manual');
    setLiveConfidence(null);
    setPrediction({ x: xNorm, y: yNorm, timestamp: now, planId });
    void setLivePosition(xNorm, yNorm, { timestamp: now, planId, accuracy: 0 });
  };

  const handleCollectStart = async () => {
    const granted = await requestBlePermissions();
    if (!granted) {
      Alert.alert('Permissions required', 'Bluetooth and Location permissions are required to scan beacons.');
      return;
    }
    clear();
    start();
  };

  const handleLiveStop = () => {
    stop();
    setRunningLive(false);
    setPrediction(null);
    prevRef.current = null;
  };

  const renderCollect = () => (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>Collect Fingerprints</Text>
      <TextInput style={styles.input} value={uuid} onChangeText={setUuid} placeholder="Beacon UUID" autoCapitalize="none" />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rowWrap}>
        {planPoints.map((p) => (
          <Pressable key={p.id} style={[styles.chip, p.id === selectedPointId && styles.chipActive]} onPress={() => setSelectedPointId(p.id)}>
            <Text>{p.name}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <Text>{selectedPoint ? `Selected: (${selectedPoint.xNorm.toFixed(3)}, ${selectedPoint.yNorm.toFixed(3)})` : 'No point selected'}</Text>

      <Text style={styles.hint}>Perm requests Android BLE/location runtime permissions (Scan/Connect/Fine Location).</Text>
      <View style={styles.rowWrap}>
        <Pressable style={styles.btn} onPress={requestBlePermissions}><Text style={styles.btnText}>Perm</Text></Pressable>
        <Pressable style={styles.btn} onPress={handleCollectStart} disabled={isScanning}><Text style={styles.btnText}>Start ranging</Text></Pressable>
        <Pressable style={styles.btnOutline} onPress={stop}><Text>Stop</Text></Pressable>
        <Pressable style={styles.btnOutline} onPress={clear}><Text>Clear live</Text></Pressable>
      </View>
      <Text>{isScanning ? `Scanning… Beacons found: ${beacons.length}` : 'Scanner stopped'}</Text>
      {scanError ? <Text style={styles.errorText}>Scan error: {scanError}</Text> : null}
      {isScanning && beacons.length === 0 ? <Text style={styles.hint}>If none appear, verify beacon power and UUID filter.</Text> : null}

      <View style={styles.rowWrap}>
        <TextInput style={[styles.input, styles.smallInput]} value={captureWindow} onChangeText={setCaptureWindow} keyboardType="numeric" />
        <Pressable style={styles.btn} onPress={beginCapture} disabled={isCapturing}><Text style={styles.btnText}>{isCapturing ? `${secondsLeft}s` : 'Capture'}</Text></Pressable>
        <Pressable style={styles.btnOutline} onPress={stopCapture}><Text>Stop Capture</Text></Pressable>
        <Pressable style={styles.btn} onPress={saveMedians}><Text style={styles.btnText}>Save Medians</Text></Pressable>
        <Pressable style={styles.btnOutline} onPress={captureSnapshot}><Text>Save Live</Text></Pressable>
      </View>

      <View style={styles.rowWrap}>
        <Pressable style={styles.btnOutline} onPress={() => exportRowsCsv(dataset.rows)}><Text>Export CSV</Text></Pressable>
        <Pressable style={styles.btnOutline} onPress={importCsv}><Text>Import CSV</Text></Pressable>
        <Pressable style={styles.btnDanger} onPress={() => setDataset({ beaconKeys: [], samples: [], rows: [] })}><Text style={styles.btnText}>Clear dataset</Text></Pressable>
      </View>

      <Text>Rows: {dataset.rows.length} • Samples: {dataset.samples.length} • Features: {dataset.beaconKeys.length}</Text>
      {Object.entries(medians).map(([k, r]) => <Text key={k}>median {k}: {r}</Text>)}
      {beacons.map((b) => <Text key={b.key}>{b.key} ({b.uuid}) RSSI {b.rssi}</Text>)}
    </View>
  );

  const renderLive = () => (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>Live Position (ENG4 North)</Text>
      <View style={styles.mapContainer}>
        <FloorplanCanvas
          imageSource={selectedPlan.image}
          points={planPoints}
          liveDot={prediction ? { xNorm: prediction.x, yNorm: prediction.y } : null}
          canAddPoint={liveMode === 'manual'}
          onAddPoint={setManualLivePosition}
        />
      </View>

      <TextInput style={styles.input} value={uuid} onChangeText={setUuid} placeholder="Beacon UUID" />
      <View style={styles.rowWrap}>
        <Pressable
          style={[styles.chip, liveMode === 'manual' && styles.chipActive]}
          onPress={() => {
            stop();
            setRunningLive(false);
            prevRef.current = null;
            setLiveMode('manual');
            setLiveConfidence(null);
          }}>
          <Text>Manual mode</Text>
        </Pressable>
        <Pressable
          style={[styles.chip, liveMode === 'bluetooth' && styles.chipActive]}
          onPress={() => setLiveMode('bluetooth')}>
          <Text>Bluetooth mode</Text>
        </Pressable>
        <Pressable
          style={styles.btnOutline}
          disabled={!selectedPoint}
          onPress={() => {
            if (!selectedPoint) return;
            setManualLivePosition(selectedPoint.xNorm, selectedPoint.yNorm);
          }}>
          <Text>{selectedPoint ? `Use ${selectedPoint.name}` : 'Select point in Collect/Plans'}</Text>
        </Pressable>
      </View>

      {liveMode === 'manual' ? (
        <Text style={styles.hint}>Manual mode active: tap on the map to set current position for the app.</Text>
      ) : (
        <Text style={styles.hint}>Bluetooth mode active: live regression from beacon scans.</Text>
      )}

      <Text style={styles.hint}>Perm requests Android BLE/location runtime permissions (Scan/Connect/Fine Location).</Text>
      <View style={styles.rowWrap}>
        <Pressable style={styles.btn} onPress={requestBlePermissions}><Text style={styles.btnText}>Perm</Text></Pressable>
        <Pressable style={styles.btn} onPress={handleLiveStart} disabled={liveMode !== 'bluetooth'}><Text style={styles.btnText}>Start</Text></Pressable>
        <Pressable style={styles.btnOutline} onPress={handleLiveStop}><Text>Stop</Text></Pressable>
      </View>
      <Text>
        {liveMode === 'manual'
          ? 'Manual mode does not require scanning.'
          : isScanning
            ? `Scanning… Beacons found: ${beacons.length}`
            : 'Scanner stopped'}
      </Text>
      {scanError ? <Text style={styles.errorText}>Scan error: {scanError}</Text> : null}

      <Text>
        {prediction
          ? `x=${prediction.x.toFixed(3)} y=${prediction.y.toFixed(3)} confidence=${liveConfidence != null ? `${(liveConfidence * 100).toFixed(1)}%` : 'N/A'}`
          : 'No prediction yet'}
      </Text>
      <Text>Plan training samples: {dataset.samples.filter((s) => s.planID === selectedPlanID).length}</Text>
      <Text>{runningLive ? 'Live regression running' : 'Live regression stopped'}</Text>
    </View>
  );

  const renderPlans = () => (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>Plan Points (ENG4 North)</Text>
      <View style={styles.mapContainer}>
        <FloorplanCanvas
          imageSource={selectedPlan.image}
          points={planPoints}
          selectedPointId={selectedPointId}
          dragPointId={selectedPointId}
          onDragPoint={onDragPoint}
        />
      </View>

      <Pressable style={styles.btn} onPress={addNewPoint}><Text style={styles.btnText}>Add New Point</Text></Pressable>
      <Text style={styles.hint}>New points appear at map center. Select a point and drag on map to place it.</Text>

      {selectedPoint ? (
        <TextInput
          style={styles.input}
          value={selectedPoint.name}
          onChangeText={(name) =>
            setPoints((prev) => prev.map((p) => (p.id === selectedPoint.id ? { ...p, name } : p)))
          }
        />
      ) : null}

      <View style={styles.rowWrap}>
        <Pressable style={styles.btnOutline} onPress={() => setSelectedPointId(null)}><Text>Deselect</Text></Pressable>
        <Pressable style={styles.btnDanger} onPress={() => setPoints((prev) => prev.filter((p) => p.id !== selectedPointId))}><Text style={styles.btnText}>Delete</Text></Pressable>
        <Pressable style={styles.btnDanger} onPress={() => setPoints((prev) => prev.filter((p) => p.planID !== selectedPlanID))}><Text style={styles.btnText}>Clear plan points</Text></Pressable>
      </View>

      {planPoints.map((p) => (
        <Pressable key={p.id} style={styles.pointRow} onPress={() => setSelectedPointId(p.id)}>
          <Text>{p.name} ({p.xNorm.toFixed(3)}, {p.yNorm.toFixed(3)})</Text>
        </Pressable>
      ))}
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Pressable onPress={() => router.back()}><Text style={styles.back}>Back</Text></Pressable>
      <Text style={styles.title}>Positioning Setup</Text>
      <Text style={styles.sub}>Full setup for ENG4 North: place points, collect fingerprints, and run live position view.</Text>

      <View style={styles.tabRow}>
        {(['collect', 'live', 'plans'] as SetupTab[]).map((item) => (
          <Pressable key={item} style={[styles.tab, tab === item && styles.tabActive]} onPress={() => setTab(item)}>
            <Text style={styles.tabText}>{item.toUpperCase()}</Text>
          </Pressable>
        ))}
      </View>

      {tab === 'collect' && renderCollect()}
      {tab === 'live' && renderLive()}
      {tab === 'plans' && renderPlans()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f0d7' },
  content: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 40, gap: 12 },
  back: { color: '#2b3ea0', fontWeight: '700' },
  title: { fontSize: 24, fontWeight: '700' },
  sub: { color: '#334155' },

  tabRow: { flexDirection: 'row', gap: 8 },
  tab: { backgroundColor: '#d4d0df', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 },
  tabActive: { backgroundColor: '#2c3ea3' },
  tabText: { color: '#fff', fontWeight: '700' },

  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    gap: 10,
  },
  sectionTitle: { fontWeight: '700', fontSize: 16, color: '#2c3ea3' },
  mapContainer: { height: 320 },
  rowWrap: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center' },
  chip: { borderWidth: 1, borderColor: '#94a3b8', borderRadius: 8, padding: 8, backgroundColor: '#fff' },
  chipActive: { borderColor: '#2563eb', backgroundColor: '#dbeafe' },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, backgroundColor: '#fff', padding: 10, minWidth: 180 },
  smallInput: { width: 80, minWidth: 80 },
  btn: { backgroundColor: '#2c3ea3', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12 },
  btnText: { color: '#fff', fontWeight: '700' },
  btnOutline: { borderWidth: 1, borderColor: '#2c3ea3', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: '#fff' },
  btnDanger: { backgroundColor: '#b91c1c', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12 },
  hint: { color: '#475569' },
  errorText: { color: '#b91c1c', fontWeight: '600' },
  pointRow: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 10,
  },
});
