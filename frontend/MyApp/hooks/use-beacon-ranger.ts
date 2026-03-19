import { Buffer } from 'buffer';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { BleManager, type Device } from 'react-native-ble-plx';

import { BEACON_UUID_DEFAULT, type BeaconReading } from '@/types/fingerprint';

const IBEACON_PREFIX = '4c000215';
// Android scan callbacks can be bursty; keep beacons visible longer before pruning.
const OFFLINE_TIMEOUT_MS = 12000;
const LAST_SEEN_HEARTBEAT_MS = 500;

const toHex = (value: string) => Buffer.from(value, 'base64').toString('hex').toLowerCase();
const normalizeUuid = (value: string) => value.trim().toLowerCase();

const parseIBeacon = (device: Device) => {
  if (!device.manufacturerData || device.rssi == null) return null;
  const hex = toHex(device.manufacturerData);
  const idx = hex.indexOf(IBEACON_PREFIX);
  if (idx < 0) return null;
  const body = hex.slice(idx + IBEACON_PREFIX.length);
  const uuidHex = body.slice(0, 32);
  const major = parseInt(body.slice(32, 36), 16);
  const minor = parseInt(body.slice(36, 40), 16);
  if (!Number.isFinite(major) || !Number.isFinite(minor) || uuidHex.length < 32) return null;
  const uuid = `${uuidHex.slice(0, 8)}-${uuidHex.slice(8, 12)}-${uuidHex.slice(12, 16)}-${uuidHex.slice(
    16,
    20
  )}-${uuidHex.slice(20, 32)}`;
  return { uuid, major, minor, key: `${major}_${minor}` };
};

export const useBeaconRanger = (uuidFilter: string) => {
  const manager = useMemo(() => new BleManager(), []);
  const [beacons, setBeacons] = useState<Record<string, BeaconReading>>({});
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      manager.stopDeviceScan();
    };
  }, [manager]);

  useEffect(() => {
    const timer = setInterval(() => {
      const cutoff = Date.now() - OFFLINE_TIMEOUT_MS;
      setBeacons((prev) => {
        let changed = false;
        const next: Record<string, BeaconReading> = {};

        Object.entries(prev).forEach(([key, reading]) => {
          if (reading.lastSeen >= cutoff) {
            next[key] = reading;
          } else {
            changed = true;
          }
        });

        return changed ? next : prev;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const upsert = useCallback(
    (device: Device) => {
      const parsed = parseIBeacon(device);
      if (!parsed || device.rssi == null) return;

      const requiredUuid = normalizeUuid(uuidFilter || BEACON_UUID_DEFAULT);
      if (normalizeUuid(parsed.uuid) !== requiredUuid) return;

      const now = Date.now();
      const reading: BeaconReading = { ...parsed, rssi: device.rssi, lastSeen: now };
      setBeacons((prev) => {
        const existing = prev[reading.key];
        if (
          existing &&
          existing.rssi === reading.rssi &&
          existing.uuid === reading.uuid &&
          now - existing.lastSeen < LAST_SEEN_HEARTBEAT_MS
        ) {
          return prev;
        }
        return { ...prev, [reading.key]: reading };
      });
    },
    [uuidFilter]
  );

  const start = useCallback(async () => {
    setScanError(null);
    setIsScanning(true);
    manager.startDeviceScan(null, { allowDuplicates: true }, (error, d) => {
      if (error) {
        setScanError(error.message || 'Failed to start BLE scan');
        setIsScanning(false);
        return;
      }
      if (d) upsert(d);
    });
  }, [manager, upsert]);

  const stop = useCallback(() => {
    manager.stopDeviceScan();
    setIsScanning(false);
  }, [manager]);

  const clear = useCallback(() => setBeacons({}), []);

  const sortedBeacons = useMemo(
    () => Object.values(beacons).sort((a, b) => a.key.localeCompare(b.key)),
    [beacons]
  );

  return {
    beacons: sortedBeacons,
    isScanning,
    scanError,
    start,
    stop,
    clear,
  };
};
