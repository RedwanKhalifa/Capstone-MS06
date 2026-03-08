import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { PermissionsAndroid, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const ANDROID_12_API_LEVEL = 31;

const BLE_PERMISSIONS_ANDROID_12 = [
  PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
  PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
];

const BLE_PERMISSIONS_PRE_12 = [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];

type PermissionState = {
  granted: boolean;
  missing: string[];
};

export default function PermissionsScreen() {
  const [permissionState, setPermissionState] = useState<PermissionState>({
    granted: false,
    missing: [],
  });
  const [isRequesting, setIsRequesting] = useState(false);

  const requiredPermissions = useMemo(() => {
    if (Platform.OS !== 'android') {
      return [];
    }
    const apiLevel = Number(Platform.Version) || 0;
    return apiLevel >= ANDROID_12_API_LEVEL ? BLE_PERMISSIONS_ANDROID_12 : BLE_PERMISSIONS_PRE_12;
  }, []);

  const refreshPermissionState = useCallback(async () => {
    if (Platform.OS !== 'android') {
      setPermissionState({ granted: true, missing: [] });
      return;
    }

    const results = await Promise.all(
      requiredPermissions.map(async (permission) => {
        const granted = await PermissionsAndroid.check(permission);
        return { permission, granted };
      })
    );

    const missing = results.filter((result) => !result.granted).map((result) => result.permission);
    setPermissionState({ granted: missing.length === 0, missing });
  }, [requiredPermissions]);

  useEffect(() => {
    refreshPermissionState();
  }, [refreshPermissionState]);

  const requestPermissions = async () => {
    if (Platform.OS !== 'android') {
      return;
    }

    setIsRequesting(true);
    try {
      const result = await PermissionsAndroid.requestMultiple(requiredPermissions);
      const missing = requiredPermissions.filter(
        (permission) => result[permission] !== PermissionsAndroid.RESULTS.GRANTED
      );
      setPermissionState({ granted: missing.length === 0, missing });
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>BLE Permissions</Text>
      <Text style={styles.subtitle}>Android requires runtime permissions before scanning.</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Required permissions</Text>
        {requiredPermissions.length === 0 ? (
          <Text style={styles.value}>Not required on this platform.</Text>
        ) : (
          requiredPermissions.map((permission) => (
            <Text key={permission} style={styles.value}>
              • {permission}
            </Text>
          ))
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Status</Text>
        <Text style={styles.value}>
          {permissionState.granted ? 'All required permissions granted.' : 'Missing permissions.'}
        </Text>
        {permissionState.missing.map((permission) => (
          <Text key={permission} style={styles.missing}>
            ✕ {permission}
          </Text>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.button, isRequesting && styles.buttonDisabled]}
        onPress={requestPermissions}
        disabled={isRequesting || requiredPermissions.length === 0}
      >
        <Text style={styles.buttonText}>{isRequesting ? 'Requesting…' : 'Request permissions'}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryButton} onPress={refreshPermissionState}>
        <Text style={styles.secondaryButtonText}>Refresh status</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#F7F7F9',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  label: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: '#6B7280',
    marginBottom: 8,
  },
  value: {
    fontSize: 14,
    color: '#111827',
    marginBottom: 4,
  },
  missing: {
    fontSize: 14,
    color: '#B91C1C',
    marginBottom: 4,
  },
  button: {
    backgroundColor: '#1D4ED8',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  secondaryButton: {
    marginTop: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#1D4ED8',
    fontWeight: '600',
  },
});
