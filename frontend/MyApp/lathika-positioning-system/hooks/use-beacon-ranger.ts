import { useCallback, useEffect, useMemo, useState } from 'react';
import { Buffer } from 'buffer';
import { BleManager, type Device } from 'react-native-ble-plx';

import { BEACON_UUID_DEFAULT, type BeaconReading } from '@/types/fingerprint';

const IBEACON_PREFIX = '4c000215';

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

  useEffect(() => () => manager.destroy(), [manager]);

  const upsert = useCallback(
    (device: Device) => {
      const parsed = parseIBeacon(device);
      if (!parsed || device.rssi == null) return;

      const requiredUuid = normalizeUuid(uuidFilter || BEACON_UUID_DEFAULT);
      if (normalizeUuid(parsed.uuid) !== requiredUuid) return;

      const reading: BeaconReading = { ...parsed, rssi: device.rssi, lastSeen: Date.now() };
      setBeacons((prev) => ({ ...prev, [reading.key]: reading }));
    },
    [uuidFilter]
  );

  const start = useCallback(async () => {
    setIsScanning(true);
    manager.startDeviceScan(null, { allowDuplicates: true }, (error, d) => {
      if (error) {
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

  return {
    beacons: Object.values(beacons).sort((a, b) => a.key.localeCompare(b.key)),
    isScanning,
    start,
    stop,
    clear,
  };
};
