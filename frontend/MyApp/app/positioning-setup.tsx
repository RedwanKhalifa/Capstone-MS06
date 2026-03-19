import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { FloorplanCanvas } from '@/components/maps/floorplan-canvas';
import { usePositioning } from '@/context/positioning';
import { buildDataset, exportRowsCsv, importCsvText, parseCsvRows } from '@/lib/csv';
import { requestBlePermissions } from '@/lib/permissions';
import { loadPositioningProject, savePositioningProject } from '@/lib/storage';
import { FLOOR_PLANS, type AnchorPoint, type FingerprintCsvRow, type PlanID, type TrainingDataset } from '@/types/fingerprint';

type SetupTab = 'collect' | 'live' | 'plans';
const STALE_AFTER_MS = 6000;

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
  const [nowMs, setNowMs] = useState(() => Date.now());

  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const [captureWindow, setCaptureWindow] = useState('3');
  const [isCapturing, setIsCapturing] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [medians, setMedians] = useState<Record<string, number>>({});
  const positioning = usePositioning();

  const buffers = useRef<Record<string, number[]>>({});
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  // Ref so the capture-loop closure always reads the latest beacons.
  const latestBeaconsRef = useRef(positioning.beacons);

  useEffect(() => {
    let mounted = true;
    loadPositioningProject().then(({ points: storedPoints, dataset: storedDataset }) => {
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
    let active = true;
    void (async () => {
      await savePositioningProject({ points, dataset });
      if (active) positioning.reloadDataset();
    })();
    return () => {
      active = false;
    };
  }, [points, dataset, isHydrated, positioning]);

  const selectedPlan = FLOOR_PLANS.find((p) => p.id === selectedPlanID)!;
  const planPoints = useMemo(() => points.filter((p) => p.planID === selectedPlanID), [points, selectedPlanID]);
  const selectedPoint = planPoints.find((p) => p.id === selectedPointId) ?? null;
  const planSamples = dataset.samples.filter((s) => s.planID === selectedPlanID);
  const planTrainingCount = planSamples.length;
  const trainedPointCount = new Set(planSamples.map((s) => `${s.xNorm.toFixed(4)}|${s.yNorm.toFixed(4)}`)).size;
  const planTrainableRows = dataset.rows.filter(
    (r) => r.planID === selectedPlanID && (r.mode.startsWith('median') || r.mode === 'live')
  );
  const capturedPointCount = new Set(planTrainableRows.map((r) => r.pointID)).size;

  useEffect(() => {
    latestBeaconsRef.current = positioning.beacons;
  }, [positioning.beacons]);

  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

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
      latestBeaconsRef.current.forEach((b) => {
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
    const captureTimestamp = new Date().toISOString();
    const rows: FingerprintCsvRow[] = Object.entries(medians).map(([key, rssi]) => {
      const live = positioning.beacons.find((b) => b.key === key);
      const [major, minor] = key.split('_').map(Number);
      return {
        timestamp: captureTimestamp,
        planID: selectedPlanID,
        pointID: selectedPoint.id,
        pointName: selectedPoint.name,
        xNorm: selectedPoint.xNorm,
        yNorm: selectedPoint.yNorm,
        uuid: live?.uuid ?? positioning.uuid,
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
      positioning.beacons.map((b) => ({
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
    try {
      await positioning.startBluetooth();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Bluetooth and Location permissions are required to scan beacons.';
      Alert.alert('Unable to start live Bluetooth mode', message);
    }
  };

  const setManualLivePosition = (xNorm: number, yNorm: number) => {
    positioning.setManualPosition(xNorm, yNorm);
  };

  const handleCollectStart = async () => {
    try {
      await positioning.startScanOnly();
    } catch {
      Alert.alert('Permissions required', 'Bluetooth and Location permissions are required to scan beacons.');
    }
  };

  const handleLiveStop = () => {
    positioning.stopBluetooth();
  };

  const renderCollect = () => (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>Collect Fingerprints</Text>
      <TextInput style={styles.input} value={positioning.uuid} onChangeText={positioning.setUuid} placeholder="Beacon UUID" autoCapitalize="none" />

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
        <Pressable style={styles.btn} onPress={handleCollectStart} disabled={positioning.isScanning}><Text style={styles.btnText}>Start ranging</Text></Pressable>
        <Pressable style={styles.btnOutline} onPress={positioning.stopScan}><Text>Stop</Text></Pressable>
        <Pressable style={styles.btnOutline} onPress={positioning.clearBeacons}><Text>Clear live</Text></Pressable>
      </View>
      <Text>{positioning.isScanning ? `Scanning… Beacons found: ${positioning.beacons.length}` : 'Scanner stopped'}</Text>
      {positioning.scanError ? <Text style={styles.errorText}>Scan error: {positioning.scanError}</Text> : null}
      {positioning.isScanning && positioning.beacons.length === 0 ? <Text style={styles.hint}>If none appear, verify beacon power and UUID filter.</Text> : null}

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
      {positioning.beacons.map((b) => {
        const ageMs = nowMs - b.lastSeen;
        const stale = ageMs >= STALE_AFTER_MS;
        return (
          <Text key={b.key} style={stale ? styles.staleText : undefined}>
            {b.key} ({b.uuid}) RSSI {b.rssi}
            {stale ? ` [stale ${(ageMs / 1000).toFixed(1)}s]` : ''}
          </Text>
        );
      })}
    </View>
  );

  const renderLive = () => (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>Live Position (ENG4 North)</Text>
      <View style={styles.mapContainer}>
        <FloorplanCanvas
          imageSource={selectedPlan.image}
          points={planPoints}
          liveDot={positioning.prediction ? { xNorm: positioning.prediction.x, yNorm: positioning.prediction.y } : null}
          canAddPoint={positioning.liveMode === 'manual'}
          onAddPoint={setManualLivePosition}
        />
      </View>

      <TextInput style={styles.input} value={positioning.uuid} onChangeText={positioning.setUuid} placeholder="Beacon UUID" />
      <View style={styles.rowWrap}>
        <Pressable
          style={[styles.chip, positioning.liveMode === 'manual' && styles.chipActive]}
          onPress={() => {
            positioning.stopBluetooth();
            positioning.setLiveMode('manual');
          }}>
          <Text>Manual mode</Text>
        </Pressable>
        <Pressable
          style={[styles.chip, positioning.liveMode === 'bluetooth' && styles.chipActive]}
          onPress={() => positioning.setLiveMode('bluetooth')}>
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

      {positioning.liveMode === 'manual' ? (
        <Text style={styles.hint}>Manual mode active: tap on the map to set current position for the app.</Text>
      ) : (
        <Text style={styles.hint}>Bluetooth mode active: live regression from beacon scans.</Text>
      )}

      <Text style={styles.hint}>Perm requests Android BLE/location runtime permissions (Scan/Connect/Fine Location).</Text>
      <View style={styles.rowWrap}>
        <Pressable style={styles.btn} onPress={requestBlePermissions}><Text style={styles.btnText}>Perm</Text></Pressable>
        <Pressable style={styles.btn} onPress={handleLiveStart} disabled={positioning.liveMode !== 'bluetooth'}><Text style={styles.btnText}>Start</Text></Pressable>
        <Pressable style={styles.btnOutline} onPress={handleLiveStop}><Text>Stop</Text></Pressable>
      </View>
      <Text>
        {positioning.liveMode === 'manual'
          ? 'Manual mode does not require scanning.'
          : positioning.isScanning
            ? `Scanning… Beacons found: ${positioning.beacons.length}`
            : 'Scanner stopped'}
      </Text>
      {positioning.scanError ? <Text style={styles.errorText}>Scan error: {positioning.scanError}</Text> : null}

      <Text>
        {positioning.prediction
          ? `x=${positioning.prediction.x.toFixed(3)} y=${positioning.prediction.y.toFixed(3)} confidence=${positioning.liveConfidence != null ? `${(positioning.liveConfidence * 100).toFixed(1)}%` : 'N/A'}`
          : 'No prediction yet'}
      </Text>
      <Text>Plan training samples: {planTrainingCount} (captures used by KNN on this floor).</Text>
      <Text>Trainable fingerprint rows: {planTrainableRows.length} (Save Medians + Save Live)</Text>
      <Text>Captured points with trainable rows: {capturedPointCount}</Text>
      <Text>Trained point locations: {trainedPointCount}</Text>
      {planTrainingCount < 4 || trainedPointCount < 3 ? (
        <Text style={styles.errorText}>
          Model under-trained: collect training captures at at least 3-4 different points for stable live tracking.
        </Text>
      ) : null}
      <Text>{positioning.isLiveRunning ? 'Live regression running' : 'Live regression stopped'}</Text>
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
  staleText: { color: '#b45309', fontWeight: '600' },
  pointRow: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 10,
  },
});
