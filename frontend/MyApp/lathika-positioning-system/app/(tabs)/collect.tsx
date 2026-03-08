import React, { useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { buildDataset, exportRowsCsv, importCsvText, parseCsvRows } from '@/lib/csv';
import { requestBlePermissions } from '@/lib/permissions';
import { useBeaconRanger } from '@/hooks/use-beacon-ranger';
import { useAppStore } from '@/store/app-store';
import { BEACON_UUID_DEFAULT, type FingerprintCsvRow } from '@/types/fingerprint';

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const m = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? Math.round((sorted[m - 1] + sorted[m]) / 2) : sorted[m];
};

export default function CollectScreen() {
  const { plans, selectedPlanID, setSelectedPlanID, points, dataset, appendRows, replaceRows, clearDataset } = useAppStore();
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const [uuid, setUuid] = useState(BEACON_UUID_DEFAULT);
  const [captureWindow, setCaptureWindow] = useState('3');
  const [isCapturing, setIsCapturing] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [medians, setMedians] = useState<Record<string, number>>({});

  const buffers = useRef<Record<string, number[]>>({});
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const { beacons, isScanning, start, stop, clear } = useBeaconRanger(uuid);

  const planPoints = points.filter((p) => p.planID === selectedPlanID);
  const point = planPoints.find((p) => p.id === selectedPointId) ?? null;

  const beginCapture = () => {
    if (!point) return Alert.alert('Select point first');
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

  const saveMedians = () => {
    if (!point) return Alert.alert('Pick anchor point first');
    const rows: FingerprintCsvRow[] = Object.entries(medians).map(([key, rssi]) => {
      const live = beacons.find((b) => b.key === key);
      const [major, minor] = key.split('_').map(Number);
      return {
        timestamp: new Date().toISOString(),
        planID: selectedPlanID,
        pointID: point.id,
        pointName: point.name,
        xNorm: point.xNorm,
        yNorm: point.yNorm,
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
    if (!point) return Alert.alert('Pick anchor point first');
    const ts = new Date().toISOString();
    appendRows(beacons.map((b) => ({ timestamp: ts, planID: selectedPlanID, pointID: point.id, pointName: point.name, xNorm: point.xNorm, yNorm: point.yNorm, uuid: b.uuid, major: b.major, minor: b.minor, rssi: b.rssi, mode: 'live' })));
  };

  const importCsv = async () => {
    const txt = await importCsvText();
    if (!txt) return;
    const rows = parseCsvRows(txt);
    replaceRows(rows);
    Alert.alert('Imported', `${rows.length} CSV rows loaded, ${buildDataset(rows).samples.length} sample vectors built.`);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Collect</Text>
      <View style={styles.row}>{plans.map((p) => <TouchableOpacity key={p.id} style={[styles.chip, p.id === selectedPlanID && styles.chipActive]} onPress={() => setSelectedPlanID(p.id)}><Text>{p.title}</Text></TouchableOpacity>)}</View>
      <TextInput style={styles.input} value={uuid} onChangeText={setUuid} placeholder="Beacon UUID" autoCapitalize="none" />
      <View style={styles.row}>{planPoints.map((p) => <TouchableOpacity key={p.id} style={[styles.chip, p.id === selectedPointId && styles.chipActive]} onPress={() => setSelectedPointId(p.id)}><Text>{p.name}</Text></TouchableOpacity>)}</View>
      <Text>{point ? `Selected: (${point.xNorm.toFixed(3)}, ${point.yNorm.toFixed(3)})` : 'No point selected'}</Text>


      <Text style={{ color: '#475569' }}>Perm requests Android BLE/location runtime permissions (Scan/Connect/Fine Location).</Text>
      <View style={styles.row}><TouchableOpacity style={styles.btn} onPress={requestBlePermissions}><Text style={styles.btnText}>Perm</Text></TouchableOpacity><TouchableOpacity style={styles.btn} onPress={start} disabled={isScanning}><Text style={styles.btnText}>Start ranging</Text></TouchableOpacity><TouchableOpacity style={styles.btnOutline} onPress={stop}><Text>Stop</Text></TouchableOpacity><TouchableOpacity style={styles.btnOutline} onPress={clear}><Text>Clear live</Text></TouchableOpacity></View>

      <View style={styles.row}><TextInput style={[styles.input, { width: 80 }]} value={captureWindow} onChangeText={setCaptureWindow} keyboardType="numeric" /><TouchableOpacity style={styles.btn} onPress={beginCapture} disabled={isCapturing}><Text style={styles.btnText}>{isCapturing ? `${secondsLeft}s` : 'Capture'}</Text></TouchableOpacity><TouchableOpacity style={styles.btnOutline} onPress={stopCapture}><Text>Stop Capture</Text></TouchableOpacity><TouchableOpacity style={styles.btn} onPress={saveMedians}><Text style={styles.btnText}>Save Medians</Text></TouchableOpacity><TouchableOpacity style={styles.btnOutline} onPress={captureSnapshot}><Text>Save Live</Text></TouchableOpacity></View>

      <View style={styles.row}><TouchableOpacity style={styles.btnOutline} onPress={() => exportRowsCsv(dataset.rows)}><Text>Export CSV</Text></TouchableOpacity><TouchableOpacity style={styles.btnOutline} onPress={importCsv}><Text>Import CSV</Text></TouchableOpacity><TouchableOpacity style={styles.btnDanger} onPress={clearDataset}><Text style={styles.btnText}>Clear dataset</Text></TouchableOpacity></View>
      <Text>Rows: {dataset.rows.length} • Training samples: {dataset.samples.length} • Beacon features: {dataset.beaconKeys.length}</Text>

      {Object.entries(medians).map(([k, r]) => <Text key={k}>median {k}: {r}</Text>)}
      {beacons.map((b) => <Text key={b.key}>{b.key} ({b.uuid}) RSSI {b.rssi}</Text>)}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 12, gap: 10 },
  title: { fontSize: 20, fontWeight: '700' },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { borderWidth: 1, borderColor: '#94a3b8', borderRadius: 8, padding: 8, backgroundColor: '#fff' },
  chipActive: { borderColor: '#2563eb', backgroundColor: '#dbeafe' },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 10, backgroundColor: '#fff', minWidth: 180 },
  btn: { backgroundColor: '#1d4ed8', borderRadius: 8, padding: 10 },
  btnText: { color: '#fff', fontWeight: '600' },
  btnOutline: { borderWidth: 1, borderColor: '#1d4ed8', borderRadius: 8, padding: 10, backgroundColor: '#fff' },
  btnDanger: { backgroundColor: '#b91c1c', borderRadius: 8, padding: 10 },
});
