import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { FloorplanCanvas } from '@/components/maps/floorplan-canvas';
import { usePositioning } from '@/context/positioning';
import { buildDataset } from '@/lib/csv';
import { requestBlePermissions } from '@/lib/permissions';
import {
    deleteFingerprintSet,
    loadFingerprintSets,
    loadPositioningProject,
    loadRoutingGraph,
    overwriteFingerprintSet,
    renameFingerprintSet,
    saveFingerprintSet,
    savePositioningProject,
    type FingerprintSet,
    type RoutingGraph,
} from '@/lib/storage';
import { FLOOR_PLANS, type AnchorPoint, type FingerprintCsvRow, type PlanID, type TrainingDataset } from '@/types/fingerprint';

type SetupTab = 'collect' | 'live' | 'plans';
type FingerprintSetSort = 'newest' | 'oldest' | 'name';

const STALE_AFTER_MS = 6000;
const PLAN_NUDGE_DEFAULT_STEP = 0.002;
const PLAN_NUDGE_STEPS = [0.001, 0.002, 0.0025, 0.005] as const;
const HOLD_INTERVAL_MS = 120;
const HOLD_START_DELAY_MS = 220;
const ROUTING_CANONICAL_WIDTH = 800;
const ROUTING_CANONICAL_HEIGHT = 600;
const ROUTING_IMPORT_FLOOR = 4;
const ROUTING_NODE_NAME_RE = /^N\d+$/i;

const createId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

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
  const [planNudgeStep, setPlanNudgeStep] = useState<number>(PLAN_NUDGE_DEFAULT_STEP);
  const [captureWindow, setCaptureWindow] = useState('3');
  const [isCapturing, setIsCapturing] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [medians, setMedians] = useState<Record<string, number>>({});

  const [fingerprintSetName, setFingerprintSetName] = useState('');
  const [savedFingerprintSets, setSavedFingerprintSets] = useState<FingerprintSet[]>([]);
  const [showSavedFingerprintSets, setShowSavedFingerprintSets] = useState(false);
  const [activeFingerprintSetId, setActiveFingerprintSetId] = useState<string | null>(null);
  const [fingerprintSetSort, setFingerprintSetSort] = useState<FingerprintSetSort>('newest');
  const [renamingSetId, setRenamingSetId] = useState<string | null>(null);
  const [renamingSetName, setRenamingSetName] = useState('');

  const positioning = usePositioning();

  const buffers = useRef<Record<string, number[]>>({});
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdStartRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRepeatingRef = useRef(false);
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

  const visibleFingerprintSets = useMemo(() => {
    const list = [...savedFingerprintSets];
    if (fingerprintSetSort === 'name') {
      return list.sort((a, b) => a.name.localeCompare(b.name));
    }
    if (fingerprintSetSort === 'oldest') {
      return list.sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
    }
    return list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [savedFingerprintSets, fingerprintSetSort]);

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

  const loadSavedFingerprintSets = async () => {
    const sets = await loadFingerprintSets();
    setSavedFingerprintSets(sets);
  };

  const saveFingerprints = async () => {
    const autoName = `ENG4 ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`;
    const name = fingerprintSetName.trim() || autoName;
    const saved = await saveFingerprintSet(name, { points, dataset });
    setActiveFingerprintSetId(saved.id);
    setFingerprintSetName(saved.name);
    await loadSavedFingerprintSets();
    setShowSavedFingerprintSets(true);
    Alert.alert('Saved', `Fingerprint set "${saved.name}" saved in app storage.`);
  };

  const overwriteActiveFingerprints = async () => {
    if (!activeFingerprintSetId) {
      Alert.alert('No active dataset', 'Open a fingerprint set first, then use Overwrite Save.');
      return;
    }
    const preferredName = fingerprintSetName.trim();
    try {
      const updated = await overwriteFingerprintSet(
        activeFingerprintSetId,
        { points, dataset },
        preferredName || undefined
      );
      setFingerprintSetName(updated.name);
      await loadSavedFingerprintSets();
      setShowSavedFingerprintSets(true);
      Alert.alert('Overwritten', `Updated "${updated.name}".`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to overwrite fingerprint set.';
      Alert.alert('Overwrite failed', message);
    }
  };

  const openFingerprints = async (set: FingerprintSet) => {
    setPoints(set.snapshot.points);
    setDataset(set.snapshot.dataset);
    setSelectedPointId(null);
    setActiveFingerprintSetId(set.id);
    setFingerprintSetName(set.name);
    setShowSavedFingerprintSets(false);
    setRenamingSetId(null);
    setRenamingSetName('');
    Alert.alert(
      'Opened',
      `Loaded "${set.name}" with ${set.snapshot.points.length} points and ${set.snapshot.dataset.rows.length} rows.`
    );
  };

  const removeFingerprints = async (set: FingerprintSet) => {
    const deleted = await deleteFingerprintSet(set.id);
    if (!deleted) {
      Alert.alert('Delete failed', 'Fingerprint set was not found.');
      return;
    }
    await loadSavedFingerprintSets();
    if (activeFingerprintSetId === set.id) {
      setActiveFingerprintSetId(null);
    }
    if (fingerprintSetName.trim().toLowerCase() === set.name.toLowerCase()) {
      setFingerprintSetName('');
    }
    if (renamingSetId === set.id) {
      setRenamingSetId(null);
      setRenamingSetName('');
    }
  };

  const startRenameFingerprints = (set: FingerprintSet) => {
    setRenamingSetId(set.id);
    setRenamingSetName(set.name);
  };

  const commitRenameFingerprints = async () => {
    if (!renamingSetId) return;
    const nextName = renamingSetName.trim();
    if (!nextName) {
      Alert.alert('Rename failed', 'Please provide a non-empty dataset name.');
      return;
    }
    try {
      const renamed = await renameFingerprintSet(renamingSetId, nextName);
      await loadSavedFingerprintSets();
      if (activeFingerprintSetId === renamed.id) {
        setFingerprintSetName(renamed.name);
      }
      setRenamingSetId(null);
      setRenamingSetName('');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to rename fingerprint set.';
      Alert.alert('Rename failed', message);
    }
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

  const importRoutingNodes = async () => {
    const emptyGraph: RoutingGraph = { nodes: [], edges: {} };
    const graph = await loadRoutingGraph(emptyGraph);
    const routingNodes = graph.nodes.filter((node) => node.floor === ROUTING_IMPORT_FLOOR);

    if (!routingNodes.length) {
      Alert.alert('No nodes found', 'No routing nodes are available to import yet.');
      return;
    }

    const existingNameSet = new Set(
      points
        .filter((point) => point.planID === selectedPlanID)
        .map((point) => point.name.trim().toLowerCase())
    );

    const imported: AnchorPoint[] = [];
    routingNodes.forEach((node) => {
      const pointName = node.id;
      if (existingNameSet.has(pointName.toLowerCase())) return;
      imported.push({
        id: createId(),
        planID: selectedPlanID,
        name: pointName,
        xNorm: clamp01(node.x / ROUTING_CANONICAL_WIDTH),
        yNorm: clamp01(node.y / ROUTING_CANONICAL_HEIGHT),
      });
    });

    if (!imported.length) {
      Alert.alert('Nothing to import', 'All routing nodes are already present as plan points.');
      return;
    }

    setPoints((prev) => [...prev, ...imported]);
    setSelectedPointId(imported[0].id);
    Alert.alert('Imported nodes', `Imported ${imported.length} routing nodes as plan points.`);
  };

  const syncRoutingNodes = async () => {
    const emptyGraph: RoutingGraph = { nodes: [], edges: {} };
    const graph = await loadRoutingGraph(emptyGraph);
    const routingNodes = graph.nodes.filter((node) => node.floor === ROUTING_IMPORT_FLOOR);

    if (!routingNodes.length) {
      Alert.alert('No nodes found', 'No routing nodes are available to sync.');
      return;
    }

    const routingById = new Map(routingNodes.map((node) => [node.id.toLowerCase(), node]));
    const syncedNodeNames = new Set<string>();
    let updatedCount = 0;
    let removedCount = 0;

    const nextPoints: AnchorPoint[] = [];
    points.forEach((point) => {
      if (point.planID !== selectedPlanID) {
        nextPoints.push(point);
        return;
      }

      if (!ROUTING_NODE_NAME_RE.test(point.name.trim())) {
        nextPoints.push(point);
        return;
      }

      const routingNode = routingById.get(point.name.trim().toLowerCase());
      if (!routingNode) {
        removedCount += 1;
        return;
      }

      syncedNodeNames.add(routingNode.id.toLowerCase());
      const nextXNorm = clamp01(routingNode.x / ROUTING_CANONICAL_WIDTH);
      const nextYNorm = clamp01(routingNode.y / ROUTING_CANONICAL_HEIGHT);
      if (Math.abs(point.xNorm - nextXNorm) > 1e-6 || Math.abs(point.yNorm - nextYNorm) > 1e-6 || point.name !== routingNode.id) {
        updatedCount += 1;
      }
      nextPoints.push({
        ...point,
        name: routingNode.id,
        xNorm: nextXNorm,
        yNorm: nextYNorm,
      });
    });

    const added: AnchorPoint[] = [];
    routingNodes.forEach((node) => {
      const key = node.id.toLowerCase();
      if (syncedNodeNames.has(key)) return;
      added.push({
        id: createId(),
        planID: selectedPlanID,
        name: node.id,
        xNorm: clamp01(node.x / ROUTING_CANONICAL_WIDTH),
        yNorm: clamp01(node.y / ROUTING_CANONICAL_HEIGHT),
      });
    });

    if (!updatedCount && !removedCount && !added.length) {
      Alert.alert('Already synced', 'Node-based points already match the routing graph.');
      return;
    }

    const merged = [...nextPoints, ...added];
    setPoints(merged);

    if (selectedPointId && !merged.some((point) => point.id === selectedPointId)) {
      setSelectedPointId(null);
    }

    Alert.alert(
      'Synced nodes',
      `Updated ${updatedCount}, added ${added.length}, removed ${removedCount}. Custom points were kept.`
    );
  };

  const onDragPoint = (pointId: string, xNorm: number, yNorm: number) => {
    setPoints((prev) => prev.map((p) => (p.id === pointId ? { ...p, xNorm, yNorm } : p)));
  };

  const nudgeSelectedPoint = (dx: number, dy: number) => {
    if (!selectedPointId) return;
    setPoints((prev) =>
      prev.map((p) =>
        p.id === selectedPointId
          ? {
              ...p,
              xNorm: clamp01(p.xNorm + dx),
              yNorm: clamp01(p.yNorm + dy),
            }
          : p
      )
    );
  };

  const stopNudgeHold = () => {
    if (holdStartRef.current) {
      clearTimeout(holdStartRef.current);
      holdStartRef.current = null;
    }
    if (holdTimerRef.current) {
      clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  };

  const beginNudgeHold = (dx: number, dy: number) => {
    stopNudgeHold();
    isRepeatingRef.current = false;
    holdStartRef.current = setTimeout(() => {
      isRepeatingRef.current = true;
      nudgeSelectedPoint(dx, dy);
      holdTimerRef.current = setInterval(() => {
        nudgeSelectedPoint(dx, dy);
      }, HOLD_INTERVAL_MS);
    }, HOLD_START_DELAY_MS);
  };

  const endNudgeHold = () => {
    stopNudgeHold();
    isRepeatingRef.current = false;
  };

  const tapNudge = (dx: number, dy: number) => {
    if (isRepeatingRef.current) return;
    nudgeSelectedPoint(dx, dy);
  };

  useEffect(() => endNudgeHold, []);

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

      <View style={styles.mapContainer}>
        <FloorplanCanvas
          imageSource={selectedPlan.image}
          points={planPoints}
          selectedPointId={selectedPointId}
          showPointLabels
          onSelectPoint={setSelectedPointId}
        />
      </View>
      <Text style={styles.hint}>Double tap a point on the map to select it for capture. Use pan/zoom to navigate.</Text>
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

      <TextInput
        style={styles.input}
        value={fingerprintSetName}
        onChangeText={setFingerprintSetName}
        placeholder="Fingerprint set name"
      />
      {activeFingerprintSetId ? (
        <Text style={styles.hint}>Active save target loaded. Use Overwrite Save to update it.</Text>
      ) : null}

      <View style={styles.rowWrap}>
        <Pressable style={styles.btnOutline} onPress={saveFingerprints}><Text>Save Fingerprints</Text></Pressable>
        {activeFingerprintSetId ? (
          <Pressable style={styles.btnOutline} onPress={overwriteActiveFingerprints}>
            <Text>Overwrite Save</Text>
          </Pressable>
        ) : null}
        <Pressable
          style={styles.btnOutline}
          onPress={async () => {
            await loadSavedFingerprintSets();
            setShowSavedFingerprintSets((current) => !current);
          }}>
          <Text>Open Fingerprints</Text>
        </Pressable>
        <Pressable style={styles.btnDanger} onPress={() => setDataset({ beaconKeys: [], samples: [], rows: [] })}><Text style={styles.btnText}>Clear dataset</Text></Pressable>
      </View>

      {showSavedFingerprintSets ? (
        <View style={styles.savedSetsPanel}>
          <View style={styles.rowWrap}>
            <Text style={styles.savedSetMeta}>Sort:</Text>
            <Pressable
              style={[styles.chip, fingerprintSetSort === 'newest' && styles.chipActive]}
              onPress={() => setFingerprintSetSort('newest')}>
              <Text>Newest</Text>
            </Pressable>
            <Pressable
              style={[styles.chip, fingerprintSetSort === 'oldest' && styles.chipActive]}
              onPress={() => setFingerprintSetSort('oldest')}>
              <Text>Oldest</Text>
            </Pressable>
            <Pressable
              style={[styles.chip, fingerprintSetSort === 'name' && styles.chipActive]}
              onPress={() => setFingerprintSetSort('name')}>
              <Text>Name</Text>
            </Pressable>
          </View>
          {savedFingerprintSets.length === 0 ? (
            <Text style={styles.hint}>No saved fingerprint sets yet.</Text>
          ) : (
            visibleFingerprintSets.map((set) => (
              <View key={set.id} style={styles.savedSetRow}>
                <View style={styles.savedSetInfo}>
                  <View style={styles.savedSetHeader}>
                    {renamingSetId === set.id ? (
                      <TextInput
                        style={styles.input}
                        value={renamingSetName}
                        onChangeText={setRenamingSetName}
                        placeholder="Rename dataset"
                      />
                    ) : (
                      <Text style={styles.savedSetName}>{set.name}</Text>
                    )}
                    {activeFingerprintSetId === set.id ? (
                      <View style={styles.activeBadge}>
                        <Text style={styles.activeBadgeText}>Active</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.savedSetMeta}>
                    {set.snapshot.points.length} points • {set.snapshot.dataset.rows.length} rows • updated {new Date(set.updatedAt).toLocaleString()}
                  </Text>
                </View>
                <Pressable style={styles.btnOutline} onPress={() => void openFingerprints(set)}>
                  <Text>Open</Text>
                </Pressable>
                {renamingSetId === set.id ? (
                  <>
                    <Pressable style={styles.btnOutline} onPress={() => void commitRenameFingerprints()}>
                      <Text>Save Name</Text>
                    </Pressable>
                    <Pressable
                      style={styles.btnOutline}
                      onPress={() => {
                        setRenamingSetId(null);
                        setRenamingSetName('');
                      }}>
                      <Text>Cancel</Text>
                    </Pressable>
                  </>
                ) : (
                  <Pressable style={styles.btnOutline} onPress={() => startRenameFingerprints(set)}>
                    <Text>Rename</Text>
                  </Pressable>
                )}
                <Pressable
                  style={styles.btnDanger}
                  onPress={() => {
                    Alert.alert('Delete dataset?', `Delete "${set.name}"?`, [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: () => {
                          void removeFingerprints(set);
                        },
                      },
                    ]);
                  }}>
                  <Text style={styles.btnText}>Delete</Text>
                </Pressable>
              </View>
            ))
          )}
        </View>
      ) : null}

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
      {selectedPoint ? (
        <View style={styles.topMapActions}>
          <Pressable style={styles.btnOutline} onPress={() => setSelectedPointId(null)}>
            <Text>Deselect</Text>
          </Pressable>
        </View>
      ) : null}
      <View style={styles.mapContainer}>
        <FloorplanCanvas
          imageSource={selectedPlan.image}
          points={planPoints}
          selectedPointId={selectedPointId}
          showPointLabels
          onSelectPoint={setSelectedPointId}
          dragPointId={selectedPointId}
          onDragPoint={onDragPoint}
        />
      </View>

      <View style={styles.rowWrap}>
        <Pressable style={styles.btn} onPress={addNewPoint}><Text style={styles.btnText}>Add New Point</Text></Pressable>
        <Pressable style={styles.btnOutline} onPress={() => void importRoutingNodes()}><Text>Import Nodes</Text></Pressable>
        <Pressable style={styles.btnOutline} onPress={() => void syncRoutingNodes()}><Text>Sync Nodes</Text></Pressable>
      </View>
      <Text style={styles.hint}>Tap a point to select it. While selected, tap the map to move it. Deselect to pan/zoom the map.</Text>

      {selectedPoint ? (
        <View style={styles.nudgeWrap}>
          <Text style={styles.hint}>Nudge {selectedPoint.name}</Text>
          <Pressable
            style={styles.dpadBtn}
            onPressIn={() => beginNudgeHold(0, -planNudgeStep)}
            onPressOut={endNudgeHold}
            onPress={() => tapNudge(0, -planNudgeStep)}>
            <Text style={styles.dpadText}>Up</Text>
          </Pressable>
          <View style={styles.dpadRow}>
            <Pressable
              style={styles.dpadBtn}
              onPressIn={() => beginNudgeHold(-planNudgeStep, 0)}
              onPressOut={endNudgeHold}
              onPress={() => tapNudge(-planNudgeStep, 0)}>
              <Text style={styles.dpadText}>Left</Text>
            </Pressable>
            <Pressable
              style={styles.dpadBtn}
              onPressIn={() => beginNudgeHold(planNudgeStep, 0)}
              onPressOut={endNudgeHold}
              onPress={() => tapNudge(planNudgeStep, 0)}>
              <Text style={styles.dpadText}>Right</Text>
            </Pressable>
          </View>
          <Pressable
            style={styles.dpadBtn}
            onPressIn={() => beginNudgeHold(0, planNudgeStep)}
            onPressOut={endNudgeHold}
            onPress={() => tapNudge(0, planNudgeStep)}>
            <Text style={styles.dpadText}>Down</Text>
          </Pressable>
          <View style={styles.rowWrap}>
            {PLAN_NUDGE_STEPS.map((step) => (
              <Pressable
                key={step}
                style={[styles.chip, planNudgeStep === step && styles.chipActive]}
                onPress={() => setPlanNudgeStep(step)}>
                <Text>{step.toFixed(4)}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

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
  topMapActions: { alignItems: 'flex-end' },
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
  nudgeWrap: {
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  dpadRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dpadBtn: {
    minWidth: 70,
    borderWidth: 1,
    borderColor: '#2c3ea3',
    borderRadius: 10,
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  dpadText: {
    color: '#2c3ea3',
    fontWeight: '700',
  },
  savedSetsPanel: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    padding: 10,
    gap: 8,
  },
  savedSetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  savedSetInfo: {
    flex: 1,
  },
  savedSetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  savedSetName: {
    fontWeight: '700',
    color: '#1e293b',
  },
  savedSetMeta: {
    color: '#475569',
    fontSize: 12,
  },
  activeBadge: {
    borderWidth: 1,
    borderColor: '#1d4ed8',
    backgroundColor: '#dbeafe',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  activeBadgeText: {
    color: '#1d4ed8',
    fontSize: 11,
    fontWeight: '700',
  },
});
