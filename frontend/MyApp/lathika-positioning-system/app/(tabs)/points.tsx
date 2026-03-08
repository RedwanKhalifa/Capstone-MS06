import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import FloorPlanView from '@/components/floor-plan-view';
import { createId, type FingerprintPoint, useFingerprintStore } from '@/context/fingerprint-store';

export default function PointsScreen() {
  const {
    addPoint,
    floorPlanId,
    floorPlans,
    pixelsPerMeter,
    points,
    selectedFloorPlanId,
    selectedPointId,
    setSelectedFloorPlanId,
    setSelectedPointId,
    removePoint,
  } = useFingerprintStore();
  const [label, setLabel] = useState('P1');

  const selectedFloorPlan =
    floorPlans.find((floorPlan) => floorPlan.id === selectedFloorPlanId) ?? floorPlans[0];

  const pointsForFloorPlan = useMemo(
    () => points.filter((point) => point.floorPlanId === selectedFloorPlanId),
    [points, selectedFloorPlanId]
  );

  const selectedPoint = useMemo(
    () => pointsForFloorPlan.find((point) => point.id === selectedPointId) ?? null,
    [pointsForFloorPlan, selectedPointId]
  );

  const handleMapPress = (imageX: number, imageY: number, imageWidth: number, imageHeight: number) => {
    const nextLabel = label.trim() || `P${pointsForFloorPlan.length + 1}`;
    const xMeters = Number((imageX / pixelsPerMeter).toFixed(2));
    const yMeters = Number(((imageHeight - imageY) / pixelsPerMeter).toFixed(2));
    const point: FingerprintPoint = {
      id: createId(),
      label: nextLabel,
      floorPlanId,
      xPx: imageX,
      yPx: imageY,
      xMeters,
      yMeters,
    };
    addPoint(point);
    setLabel(`P${pointsForFloorPlan.length + 2}`);
  };

  return (
    <View style={styles.container}>
      <View style={styles.mapCard}>
        <FloorPlanView
          imageSource={selectedFloorPlan.image}
          points={pointsForFloorPlan}
          activePointId={selectedPointId}
          onPress={handleMapPress}
        />
      </View>

      <ScrollView contentContainerStyle={styles.panel}>
        <Text style={styles.title}>Point selection</Text>
        <Text style={styles.subtitle}>Choose a floor plan, then tap to create labeled points.</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Floor plan</Text>
          <View style={styles.roomRow}>
            {floorPlans.map((floorPlan) => {
              const active = floorPlan.id === selectedFloorPlanId;
              return (
                <TouchableOpacity
                  key={floorPlan.id}
                  style={[styles.roomButton, active && styles.roomButtonActive]}
                  onPress={() => setSelectedFloorPlanId(floorPlan.id)}
                >
                  <Text style={[styles.roomButtonText, active && styles.roomButtonTextActive]}>
                    {floorPlan.title}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.caption}>Scale: {pixelsPerMeter} px/m</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Next label</Text>
          <TextInput value={label} onChangeText={setLabel} placeholder="P1" style={styles.input} />
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Active point</Text>
          {selectedPoint ? (
            <Text style={styles.value}>
              {selectedPoint.label} → x={selectedPoint.xMeters}m, y={selectedPoint.yMeters}m
            </Text>
          ) : (
            <Text style={styles.value}>No point selected yet.</Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Points in selected floor plan ({pointsForFloorPlan.length})</Text>
          {pointsForFloorPlan.length === 0 ? (
            <Text style={styles.value}>Tap the map to add the first point.</Text>
          ) : (
            pointsForFloorPlan.map((point) => (
              <View key={point.id} style={styles.pointRow}>
                <TouchableOpacity style={styles.pointButton} onPress={() => setSelectedPointId(point.id)}>
                  <Text style={styles.pointText}>
                    {point.label} · x={point.xMeters}m y={point.yMeters}m
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => removePoint(point.id)}>
                  <Text style={styles.remove}>Remove</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  mapCard: {
    height: 300,
    padding: 12,
  },
  panel: {
    padding: 16,
    gap: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  subtitle: {
    color: '#475569',
  },
  row: {
    gap: 8,
  },
  label: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: '#64748B',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  roomRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  roomButton: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#FFFFFF',
  },
  roomButtonActive: {
    borderColor: '#1D4ED8',
    backgroundColor: '#DBEAFE',
  },
  roomButtonText: {
    color: '#0F172A',
    fontWeight: '500',
  },
  roomButtonTextActive: {
    color: '#1D4ED8',
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  value: {
    color: '#0F172A',
  },
  caption: {
    marginTop: 6,
    color: '#64748B',
    fontSize: 12,
  },
  pointRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  pointButton: {
    flex: 1,
    paddingRight: 8,
  },
  pointText: {
    color: '#0F172A',
  },
  remove: {
    color: '#B91C1C',
    fontWeight: '600',
  },
});
