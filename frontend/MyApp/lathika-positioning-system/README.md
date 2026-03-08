# Campus Navigation Fingerprint Collector (Expo + React Native)

This app implements Android fingerprint collection + floorplan point editing + live kNN regression for:
- `ENG4_NORTH`
- `ENG4_SOUTH`

## Why development build is required
BLE iBeacon scanning (`react-native-ble-plx`) does **not** work in Expo Go. Use a dev client.

## Setup
```bash
npm install
npx expo prebuild
npx expo run:android
```

For EAS dev build:
```bash
eas build -p android --profile development
```

## Permissions (Android)
Configured in `app.json`:
- `ACCESS_FINE_LOCATION`
- `BLUETOOTH_SCAN`
- `BLUETOOTH_CONNECT`

Use the **Perm** button in Collect/Live screens to request runtime permissions.

## Tabs
- **Collect**
  - Select plan + anchor point
  - Start/stop ranging
  - Capture window (2..30s), median RSSI per beacon
  - Save Medians / Save Live
  - Export CSV / Import CSV
- **Live**
  - Plan selection
  - UUID filter
  - Start/stop live regression
  - Blue dot + confidence
- **Plans**
  - Tap map to add anchor points
  - Rename/delete/clear points
  - Pinch + pan map
  - Select point and use “Move Selected Point” then tap map to reposition

## CSV schema
Header:
```csv
timestamp,planID,pointID,pointName,xNorm,yNorm,uuid,major,minor,rssi,mode
```

Import behavior:
- Group each fingerprint sample by `(timestamp, planID, xNorm, yNorm)`
- For duplicate beacon rows in a sample, median RSSI is used
- Build global sorted beacon list from `major_minor`
- Fill missing features with `RSSI_FLOOR=-100`

## Regression
- Plan-filtered training cache
- Feature normalization by training mean/std (`+1e-6`)
- Euclidean distance
- `k=5`
- Weighted average with `w=1/(d+1e-3)`
- Clamp output to `[0,1]`
- EMA smoothing `alpha=0.35`
- Confidence: `1/(1+avgNeighborDistance)`


## Troubleshooting
- If you see `No matching version found for expo-document-picker@~13.0.6`, install using Expo-managed versions:
  ```bash
  npx expo install expo-document-picker expo-file-system react-native-gesture-handler
  ```
- After dependency changes, rebuild native app:
  ```bash
  npx expo prebuild --clean
  npx expo run:android
  ```
