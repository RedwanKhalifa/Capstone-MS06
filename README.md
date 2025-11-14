# Smart Campus Navigation System

The Smart Campus Navigation System pairs a Node.js/Express backend with an Expo/React Native client to deliver multi-floor indoor routing, accessibility-aware search, live beacon telemetry, and building asset streaming for Toronto Metropolitan University's engineering complex.

## Table of Contents
1. [Repository layout](#repository-layout)
2. [Backend services](#backend-services)
3. [Frontend application](#frontend-application)
4. [Cloud & hardware integrations](#cloud--hardware-integrations)
5. [Local development workflow](#local-development-workflow)
6. [Troubleshooting](#troubleshooting)

## Repository layout

| Path | Description |
| --- | --- |
| `backend/` | Express REST API, MongoDB models, Dijkstra pathfinding service, Firebase auth middleware, hardware & AWS integrations, and Jest coverage. |
| `frontend/` | Expo Router app that renders the interactive map, consumes backend APIs, and overlays hardware telemetry. |

## Backend services

### Tech stack & entry point
The backend boots an Express app, enables CORS/JSON parsing, and exposes the navigation, building, room, connection, auth, system, and hardware routers before connecting to MongoDB Atlas via `MONGO_URI`.【F:backend/server.js†L1-L27】 The package scripts support `npm run start`, `npm run dev`, `npm run seed:rooms`, `npm run seed:connections`, and `npm test` for day-to-day workflows.【F:backend/package.json†L6-L25】

### Environment variables
Create `backend/.env` from the sample file and provide your Atlas URI, Firebase project id, and AWS credentials/bucket to unlock authentication and asset signing features.【F:backend/.env.example†L1-L6】

### Navigation & data layer
Room and connection collections power the Dijkstra implementation in `services/pathfinding.js`, which filters out inaccessible edges when requested and returns the lowest-cost node list plus total distance.【F:backend/services/pathfinding.js†L1-L98】 The navigation controller consumes that service to build turn-by-turn steps for `POST /api/navigation` and to rank candidate amenities for `GET /api/navigation/nearby`, respecting the `accessible` flag and returning structured `from`, `to`, `path`, and `steps` payloads.【F:backend/controllers/navigationController.js†L30-L190】 Routes are surfaced at `/api/navigation` and `/api/navigation/nearby`.【F:backend/routes/navigationRoutes.js†L1-L8】

### Authentication
`POST /api/auth/verify` and `GET /api/auth/me` delegate to `authController`, which validates Firebase ID tokens and derives user metadata/roles. The controller relies on a handcrafted verifier that fetches Google public certificates, enforces issuer/audience checks, and verifies RS256 signatures using the configured `FIREBASE_PROJECT_ID`.【F:backend/controllers/authController.js†L1-L33】【F:backend/utils/firebaseTokenVerifier.js†L1-L107】 The `firebaseAuth` middleware simply rejects requests without a valid Bearer token.【F:backend/middleware/firebaseAuth.js†L1-L18】

### Hardware telemetry
ESP32/BLE beacons push telemetry to `POST /api/hardware/beacons/telemetry`, which upserts status, RSSI, battery, temperature, and XY coordinates while stamping `lastSeen`. Additional routes expose inventories, single devices, and a live-only feed consumed by the mobile client.【F:backend/routes/hardwareRoutes.js†L1-L15】【F:backend/controllers/hardwareController.js†L3-L98】

### System health & AWS assets
`GET /api/system/stats` aggregates counts across rooms, connections, and beacons so clients can display backend health, while `GET /api/system/assets/map` signs Mapbox/SVG files via the AWS Signature V4 helper that uses your region-specific credentials and bucket. Configure `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, and `AWS_MAP_BUCKET` to enable the presigned URL generator.【F:backend/routes/systemRoutes.js†L1-L45】【F:backend/services/aws.js†L1-L83】

### Testing
The Jest suite mocks MongoDB calls to exercise routing and amenity discovery logic end-to-end. Run `npm test` (which sets `NODE_ENV=test`) to execute cases defined in `backend/tests/navigation.test.js`.【F:backend/package.json†L6-L25】【F:backend/tests/navigation.test.js†L1-L66】

## Frontend application

### Tech stack & scripts
The Expo project targets React Native 0.81 with Expo Router, React Navigation, SVG, and image zoom libraries. Scripts cover `npm run start`, platform-specific entry points, and `npm run lint` via `expo lint`.【F:frontend/package.json†L5-L48】

### Environment configuration & API client
Copy `frontend/.env.example` to `.env` and optionally set `EXPO_PUBLIC_API_URL` or `EXPO_PUBLIC_API_PORT`. The `constants/api.ts` helper sanitizes those values, derives a reachable host based on the Expo Go debugger when unset, and exports strongly-typed endpoints (navigation, nearby, rooms, buildings, auth, beacons, system stats) used throughout the UI.【F:frontend/.env.example†L1-L4】【F:frontend/constants/api.ts†L1-L82】 This logic prevents the "Network request failed" error on Expo Go by ensuring clients always produce an absolute backend URL.

### Campus map screen
`app/(tabs)/campusmap.tsx` centralizes the user experience: it loads rooms for marker rendering, fetches system health totals, polls `/api/hardware/beacons/live` every 15s, and recenters when a beacon provides coordinates.【F:frontend/app/(tabs)/campusmap.tsx†L42-L134】 Users can request a Dijkstra path or locate the nearest amenity, toggle accessibility mode (which filters out stairwell markers), and inspect status/error banners driven by the API responses.【F:frontend/app/(tabs)/campusmap.tsx†L135-L239】 Polyline/SVG overlays visualize the returned route while switches/text inputs control the origin and destination.

## Cloud & hardware integrations

1. **MongoDB Atlas** – Supply a database with `rooms`, `connections`, and optional `beacons`. Use the provided seed scripts while connected to your Atlas cluster (`npm run seed:rooms`, `npm run seed:connections`).【F:backend/package.json†L6-L25】
2. **Firebase Authentication** – Populate `FIREBASE_PROJECT_ID` so backend routes can validate ID tokens and gate `/api/auth/me`. The custom verifier fetches Google's signing keys automatically.【F:backend/utils/firebaseTokenVerifier.js†L1-L107】
3. **AWS S3** – Upload indoor map assets to an S3 bucket and set the AWS env vars so `/api/system/assets/map` can mint presigned URLs consumed by the frontend.【F:backend/routes/systemRoutes.js†L1-L45】【F:backend/services/aws.js†L1-L83】
4. **ESP32 Bluetooth beacons** – Flash firmware that periodically POSTs telemetry JSON to `/api/hardware/beacons/telemetry` with `deviceId`, signal metrics, floor/building IDs, and XY coordinates. Mobile clients will automatically visualize entries that remain within the configured `offlineMs` window.【F:backend/controllers/hardwareController.js†L3-L98】

## Local development workflow

1. **Install dependencies** – run `npm install` within both `backend/` and `frontend/`.
2. **Configure env files** – add Atlas, Firebase, and AWS secrets to `backend/.env` and set Expo networking overrides if your backend is not on `localhost:5000`.
3. **Start backend** – `npm run dev --prefix backend` boots the API with file watching.
4. **Seed sample data** – execute the `seed:rooms` and `seed:connections` scripts once per database reset.【F:backend/package.json†L6-L25】
5. **Start Expo** – `npm run start --prefix frontend` launches the Metro bundler; scan the QR code with Expo Go or target simulators via the provided scripts.【F:frontend/package.json†L5-L12】
6. **Validate** – hit `npm test --prefix backend` to exercise route logic and `npm run lint --prefix frontend` before committing.

## Troubleshooting

| Symptom | Mitigation |
| --- | --- |
| "Network request failed" in Expo Go | Ensure the device and backend share a network and leave `EXPO_PUBLIC_API_URL` empty so `constants/api.ts` auto-derives a reachable host/port, or hardcode your backend IP/port in `.env`.【F:frontend/constants/api.ts†L16-L82】 |
| Routes return 503 "Navigation graph is empty" | Run the connection seed or insert `connections` documents referencing valid `Room` IDs so `buildGraph` has edges to traverse.【F:backend/controllers/navigationController.js†L52-L100】 |
| Auth endpoints reject requests | Double-check the Firebase project id and that you are passing a Bearer token signed for that project; `verifyFirebaseToken` enforces issuer/audience and expiration. 【F:backend/utils/firebaseTokenVerifier.js†L51-L104】 |
| Beacons show offline | Devices must post telemetry within the default `offlineMs` window (120 seconds) to appear in `/api/hardware/beacons/live`. Adjust the query string or update your firmware's reporting cadence.【F:backend/controllers/hardwareController.js†L75-L95】 |
