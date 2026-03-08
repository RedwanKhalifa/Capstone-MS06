import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import FloorPlanView from '@/components/floor-plan-view';
import { useFingerprintStore } from '@/context/fingerprint-store';

export default function NavigateScreen() {
  const { floorPlans, points, samples, selectedFloorPlanId, selectedPointId, setSelectedFloorPlanId } =
    useFingerprintStore();

  const lastSample = samples[samples.length - 1];
  const activeFloorPlanId = lastSample?.floorPlanId || selectedFloorPlanId;
  const activePointId = lastSample?.pointId || selectedPointId;

  const activeFloorPlan =
    floorPlans.find((floorPlan) => floorPlan.id === activeFloorPlanId) ?? floorPlans[0];

  const pointsForFloorPlan = useMemo(
    () => points.filter((point) => point.floorPlanId === activeFloorPlan.id),
    [activeFloorPlan.id, points]
  );

  const activePoint = useMemo(
    () => points.find((point) => point.id === activePointId) ?? null,
    [points, activePointId]
  );

  return (
    <View style={styles.container}>
      <View style={styles.mapCard}>
        <FloorPlanView
          imageSource={activeFloorPlan.image}
          points={pointsForFloorPlan}
          activePointId={activePointId}
        />
      </View>
      <ScrollView contentContainerStyle={styles.panel}>
        <Text style={styles.title}>Navigation view</Text>
        <Text style={styles.subtitle}>Shows the latest fingerprint point on the selected floor plan.</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Floor plan</Text>
          <View style={styles.roomRow}>
            {floorPlans.map((floorPlan) => {
              const active = floorPlan.id === activeFloorPlan.id;
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
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Current estimate</Text>
          {activePoint ? (
            <Text style={styles.value}>
              {activePoint.label} · x={activePoint.xMeters}m y={activePoint.yMeters}m
            </Text>
          ) : (
            <Text style={styles.value}>Capture a fingerprint sample to set a position.</Text>
          )}
          <Text style={styles.caption}>Last sample: {lastSample?.timestamp ?? 'none'}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Points loaded</Text>
          <Text style={styles.value}>{pointsForFloorPlan.length} points on this floor plan.</Text>
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
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  label: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: '#64748B',
    marginBottom: 6,
  },
  value: {
    color: '#0F172A',
  },
  caption: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 6,
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
});
