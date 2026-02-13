// hooks/useBleScanner.ts

import Constants from "expo-constants";
import { useEffect, useState } from "react";
import { Platform, PermissionsAndroid } from "react-native";

type BleManagerType = {
  onStateChange: (listener: (state: string) => void, emitCurrentState?: boolean) => { remove: () => void };
  startDeviceScan: (
    uuids: string[] | null,
    options: Record<string, unknown> | null,
    callback: (scanError: unknown, device: { id: string; rssi: number | null } | null) => void
  ) => void;
  stopDeviceScan: () => void;
};

type BleManagerCtor = new () => BleManagerType;

let BleManagerClass: BleManagerCtor | null = null;

function loadBleManagerClass(): BleManagerCtor | null {
  // Expo Go does not include custom native BLE modules.
  if (Constants.appOwnership === "expo") {
    return null;
  }

  if (!BleManagerClass) {
    try {
      const blePlx = require("react-native-ble-plx") as { BleManager: BleManagerCtor };
      BleManagerClass = blePlx.BleManager;
    } catch (e) {
      console.log("BLE module unavailable:", e);
      BleManagerClass = null;
    }
  }

  return BleManagerClass;
}

export type BeaconSample = {
  mac: string;
  rssi: number;
};

export type UseBleScannerResult = {
  beaconData: BeaconSample[];
  bleReady: boolean;
  error?: string;
};

let manager: BleManagerType | null = null;

function getBleManager() {
  if (!manager) {
    const BleManager = loadBleManagerClass();

    if (!BleManager) return null;

    try {
      manager = new BleManager();
    } catch (e) {
      console.log("BLE unavailable:", e);
      manager = null;
    }
  }

  return manager;
}

export function useBleScanner(): UseBleScannerResult {
  const [beaconData, setBeaconData] = useState<BeaconSample[]>([]);
  const [bleReady, setBleReady] = useState(false);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    const mgr = getBleManager();
    let stateSub: { remove: () => void } | undefined;

    if (!mgr) {
      setError("Bluetooth scanning is unavailable in Expo Go.");
      return;
    }

    const startScan = async () => {
      if (Platform.OS === "android") {
        try {
          const granted = await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN as never,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT as never,
          ]);

          const ok = Object.values(granted).every(
            (v) => v === PermissionsAndroid.RESULTS.GRANTED
          );

          if (!ok) {
            setError("Bluetooth permissions not granted.");
            return;
          }
        } catch (e) {
          console.log("Permission error:", e);
          setError("Bluetooth permission error.");
          return;
        }
      }

      stateSub = mgr.onStateChange((state) => {
        if (state === "PoweredOn") {
          setBleReady(true);
          mgr.startDeviceScan(null, null, (scanError, device) => {
            if (scanError) {
              console.log("BLE scan error:", scanError);
              setError("Scan failed.");
              return;
            }

            if (!device || typeof device.rssi !== "number") return;

            setBeaconData((prev) => {
              const clean = prev.filter((b) => b.mac !== device.id);
              return [...clean, { mac: device.id, rssi: device.rssi }];
            });
          });

          stateSub?.remove();
        }
      }, true);
    };

    startScan();

    return () => {
      stateSub?.remove?.();
      getBleManager()?.stopDeviceScan();
    };
  }, []);

  return { beaconData, bleReady, error };
}
