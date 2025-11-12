import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import API_URL from '@/constants/api'; // ✅ loads http://10.0.2.2:5000 from .env

export default function ExploreScreen() {
  // 🧠 State: list of buildings + error message
  const [buildings, setBuildings] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('📡 Fetching from:', `${API_URL}/api/buildings`);

    fetch(`${API_URL}/api/buildings`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        console.log('✅ Buildings data received:', data);
        setBuildings(data);
      })
      .catch((err) => {
        console.error('❌ Error fetching buildings:', err);
        setError(err.message);
      });
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>🏫 Campus Buildings</Text>

      {error && <Text style={styles.error}>Error: {error}</Text>}
      {!error && buildings.length === 0 && (
        <Text style={styles.loading}>Loading buildings...</Text>
      )}

      {buildings.map((b, i) => (
        <View key={i} style={styles.card}>
          <Text style={styles.name}>{b.name || `Building ${i + 1}`}</Text>
          {b.address && <Text style={styles.detail}>{b.address}</Text>}
          {b.building_id && (
            <Text style={styles.detail}>ID: {b.building_id}</Text>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: '#fff',
  },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
  loading: { fontSize: 16, color: '#666' },
  error: { color: 'red', fontWeight: 'bold', marginVertical: 8 },
  card: {
    backgroundColor: '#f2f2f2',
    padding: 15,
    marginVertical: 8,
    borderRadius: 8,
    width: '90%',
  },
  name: { fontSize: 18, fontWeight: '600' },
  detail: { fontSize: 15, color: '#555', marginTop: 4 },
});
