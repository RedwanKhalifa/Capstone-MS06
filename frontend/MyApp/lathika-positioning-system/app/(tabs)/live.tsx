import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { FloorplanCanvas } from '@/components/maps/floorplan-canvas';
import { useBeaconRanger } from '@/hooks/use-beacon-ranger';
import { buildKnnCache, regressKnn } from '@/lib/knn';
import { requestBlePermissions } from '@/lib/permissions';
import { useAppStore } from '@/store/app-store';
import { BEACON_UUID_DEFAULT } from '@/types/fingerprint';

export default function LiveScreen() {
  const { plans, selectedPlanID, setSelectedPlanID, points, dataset } = useAppStore();
  const [uuid, setUuid] = useState(BEACON_UUID_DEFAULT);
  const [running, setRunning] = useState(false);
  const [pred, setPred] = useState<{ x: number; y: number; confidence: number } | null>(null);
  const prevRef = useRef<{ x: number; y: number } | null>(null);

  const selectedPlan = plans.find((p) => p.id === selectedPlanID)!;
  const planPoints = points.filter((p) => p.planID === selectedPlanID);
  const { beacons, start, stop } = useBeaconRanger(uuid);
  const cache = useMemo(() => buildKnnCache(dataset, selectedPlanID), [dataset, selectedPlanID]);

  useEffect(() => {
    if (!running || !cache) return;
    const next = regressKnn(cache, beacons, prevRef.current, 5, 0.2);
    if (!next) return;
    prevRef.current = { x: next.x, y: next.y };
    setPred(next);
  }, [beacons, cache, running]);

  const handleStart = () => {
    prevRef.current = null;
    setPred(null);
    start();
    setRunning(true);
  };

  const handleStop = () => {
    stop();
    setRunning(false);
    setPred(null);
    prevRef.current = null;
  };

  return (
    <View style={styles.container}>
      <View style={styles.mapWrap}>
        <FloorplanCanvas
          imageSource={selectedPlan.image}
          points={planPoints}
          liveDot={pred ? { xNorm: pred.x, yNorm: pred.y } : null}
        />
      </View>
      <View style={styles.panel}>
        <View style={styles.row}>
          {plans.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={[styles.chip, p.id === selectedPlanID && styles.chipActive]}
              onPress={() => setSelectedPlanID(p.id)}>
              <Text>{p.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput style={styles.input} value={uuid} onChangeText={setUuid} placeholder="Beacon UUID" />

        <Text style={{ color: '#475569' }}>
          Perm requests Android BLE/location runtime permissions (Scan/Connect/Fine Location).
        </Text>
        <View style={styles.row}>
          <TouchableOpacity style={styles.btn} onPress={requestBlePermissions}>
            <Text style={styles.btnText}>Perm</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btn} onPress={handleStart}>
            <Text style={styles.btnText}>Start</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnOutline} onPress={handleStop}>
            <Text>Stop</Text>
          </TouchableOpacity>
        </View>
        <Text>
          {pred
            ? `x=${pred.x.toFixed(3)} y=${pred.y.toFixed(3)} confidence=${(pred.confidence * 100).toFixed(1)}%`
            : 'No prediction yet'}
        </Text>
        <Text>Plan training samples: {dataset.samples.filter((s) => s.planID === selectedPlanID).length}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  mapWrap: { flex: 1, padding: 12 },
  panel: { padding: 12, gap: 10 },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { borderWidth: 1, borderColor: '#94a3b8', borderRadius: 8, padding: 8, backgroundColor: '#fff' },
  chipActive: { borderColor: '#2563eb', backgroundColor: '#dbeafe' },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 10, backgroundColor: '#fff' },
  btn: { backgroundColor: '#1d4ed8', borderRadius: 8, padding: 10 },
  btnText: { color: '#fff', fontWeight: '600' },
  btnOutline: { borderWidth: 1, borderColor: '#1d4ed8', borderRadius: 8, padding: 10, backgroundColor: '#fff' },
});
