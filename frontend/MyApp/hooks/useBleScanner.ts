// hooks/useBleScanner.ts

import { useEffect, useState } from "react";
import { Platform, PermissionsAndroid } from "react-native";
import { BleManager } from "react-native-ble-plx";

export type BeaconSample = {
  mac: string;
  rssi: number;
};

export type UseBleScannerResult = {
  beaconData: BeaconSample[];
  bleReady: boolean;
  error?: string;
};

// Create BleManager safely
let manager: BleManager | null = null;

function getBleManager() {
  if (!manager) {
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
      setError("Bluetooth not available (Expo Go cannot use BLE).");
      return;
    }

    const startScan = async () => {
      if (Platform.OS === "android") {
        try {
          const granted = await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN as any,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT as any,
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
              return [...clean, { mac: device.id, rssi: device.rssi! }];
            });
          });

          stateSub.remove();
        }
      }, true);
    };

    startScan();

    return () => {
      stateSub?.remove?.();
      const mgr = getBleManager();
      if (mgr) mgr.stopDeviceScan();
    };
  }, []);

  return { beaconData, bleReady, error };
}
