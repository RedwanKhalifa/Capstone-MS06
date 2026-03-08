import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Buffer } from 'buffer';
import { BleManager, type Device } from 'react-native-ble-plx';

export type BleDeviceReading = {
  id: string;
  name: string | null;
  rssi: number;
  lastSeen: number;
};

type BleScannerOptions = {
  onDeviceSeen?: (device: BleDeviceReading) => void;
  targetUuid?: string;
};

const APPLE_IBEACON_PREFIX = '4c000215';

const normalizeUuid = (value: string) => value.trim().toLowerCase();

const hexToUuid = (hex: string) => {
  const cleanHex = hex.replace(/[^0-9a-f]/gi, '').toLowerCase();
  if (cleanHex.length < 32) {
    return null;
  }
  const value = cleanHex.slice(0, 32);
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20, 32)}`;
};

const hasTargetIBeaconUuid = (device: Device, targetUuid: string) => {
  const normalizedTarget = normalizeUuid(targetUuid);

  const serviceMatch = device.serviceUUIDs?.some((serviceUuid) => {
    return normalizeUuid(serviceUuid) === normalizedTarget;
  });
  if (serviceMatch) {
    return true;
  }

  if (!device.manufacturerData) {
    return false;
  }

  const manufacturerHex = Buffer.from(device.manufacturerData, 'base64').toString('hex').toLowerCase();
  const prefixIndex = manufacturerHex.indexOf(APPLE_IBEACON_PREFIX);
  if (prefixIndex < 0) {
    return false;
  }

  const beaconUuidHex = manufacturerHex.slice(prefixIndex + APPLE_IBEACON_PREFIX.length, prefixIndex + APPLE_IBEACON_PREFIX.length + 32);
  const beaconUuid = hexToUuid(beaconUuidHex);
  return beaconUuid != null && normalizeUuid(beaconUuid) === normalizedTarget;
};

export const useBleScanner = (options: BleScannerOptions = {}) => {
  const manager = useMemo(() => new BleManager(), []);
  const [isScanning, setIsScanning] = useState(false);
  const [devices, setDevices] = useState<Record<string, BleDeviceReading>>({});
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    return () => {
      manager.destroy();
    };
  }, [manager]);

  const handleDevice = useCallback(
    (device: Device) => {
      if (device.rssi == null) {
        return;
      }
      if (optionsRef.current.targetUuid && !hasTargetIBeaconUuid(device, optionsRef.current.targetUuid)) {
        return;
      }
      const reading: BleDeviceReading = {
        id: device.id,
        name: device.name ?? device.localName ?? null,
        rssi: device.rssi,
        lastSeen: Date.now(),
      };
      setDevices((current) => ({
        ...current,
        [device.id]: reading,
      }));
      optionsRef.current.onDeviceSeen?.(reading);
    },
    []
  );

  const startScan = useCallback(() => {
    if (isScanning) {
      return;
    }
    setIsScanning(true);
    manager.startDeviceScan(null, { allowDuplicates: true }, (error, device) => {
      if (error) {
        setIsScanning(false);
        return;
      }
      if (device) {
        handleDevice(device);
      }
    });
  }, [handleDevice, isScanning, manager]);

  const stopScan = useCallback(() => {
    if (!isScanning) {
      return;
    }
    manager.stopDeviceScan();
    setIsScanning(false);
  }, [isScanning, manager]);

  const resetDevices = useCallback(() => {
    setDevices({});
  }, []);

  return {
    devices,
    isScanning,
    startScan,
    stopScan,
    resetDevices,
  };
};
