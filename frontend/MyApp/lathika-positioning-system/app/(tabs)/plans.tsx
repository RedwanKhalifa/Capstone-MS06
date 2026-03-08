import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { FloorplanCanvas } from '@/components/maps/floorplan-canvas';
import { createId, useAppStore } from '@/store/app-store';

export default function PlansScreen() {
  const { plans, selectedPlanID, setSelectedPlanID, points, setPoints } = useAppStore();
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);

  const selectedPlan = plans.find((p) => p.id === selectedPlanID)!;
  const planPoints = useMemo(
    () => points.filter((p) => p.planID === selectedPlanID),
    [points, selectedPlanID]
  );
  const selectedPoint = planPoints.find((p) => p.id === selectedPointId) ?? null;

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

  return (
    <View style={styles.container}>
      <View style={styles.mapWrap}>
        <FloorplanCanvas
          imageSource={selectedPlan.image}
          points={planPoints}
          selectedPointId={selectedPointId}
          dragPointId={selectedPointId}
          onDragPoint={onDragPoint}
        />
      </View>
      <ScrollView contentContainerStyle={styles.panel}>
        <View style={styles.row}>
          {plans.map((plan) => (
            <TouchableOpacity
              key={plan.id}
              style={[styles.chip, plan.id === selectedPlanID && styles.chipActive]}
              onPress={() => setSelectedPlanID(plan.id)}>
              <Text>{plan.title}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.btnPrimary} onPress={addNewPoint}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>Add New Point</Text>
        </TouchableOpacity>
        <Text style={styles.helpText}>
          New points appear at map center. Select a point, then drag anywhere on the map to place it.
        </Text>

        {selectedPoint ? (
          <TextInput
            style={styles.input}
            value={selectedPoint.name}
            onChangeText={(name) =>
              setPoints((prev) => prev.map((p) => (p.id === selectedPoint.id ? { ...p, name } : p)))
            }
          />
        ) : null}

        <View style={styles.row}>
          <TouchableOpacity style={styles.btnOutline} onPress={() => setSelectedPointId(null)}>
            <Text>Deselect</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.btnDanger}
            onPress={() => setPoints((prev) => prev.filter((p) => p.id !== selectedPointId))}>
            <Text style={{ color: '#fff' }}>Delete</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.btnDanger}
            onPress={() => setPoints((prev) => prev.filter((p) => p.planID !== selectedPlanID))}>
            <Text style={{ color: '#fff' }}>Clear plan points</Text>
          </TouchableOpacity>
        </View>

        {planPoints.map((p) => (
          <TouchableOpacity key={p.id} style={styles.pointRow} onPress={() => setSelectedPointId(p.id)}>
            <Text>
              {p.name} ({p.xNorm.toFixed(3)}, {p.yNorm.toFixed(3)})
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  mapWrap: { height: 360, padding: 12 },
  panel: { padding: 12, gap: 10 },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: {
    borderWidth: 1,
    borderColor: '#94a3b8',
    borderRadius: 8,
    padding: 8,
    backgroundColor: '#fff',
  },
  chipActive: { backgroundColor: '#dbeafe', borderColor: '#2563eb' },
  helpText: { color: '#475569' },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    backgroundColor: '#fff',
    padding: 10,
  },
  btnPrimary: { backgroundColor: '#1d4ed8', borderRadius: 8, padding: 10, alignSelf: 'flex-start' },
  btnOutline: {
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#fff',
  },
  btnDanger: { backgroundColor: '#b91c1c', borderRadius: 8, padding: 10 },
  pointRow: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 10,
  },
});
