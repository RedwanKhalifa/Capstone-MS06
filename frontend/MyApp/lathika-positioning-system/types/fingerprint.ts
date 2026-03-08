import { ImageSourcePropType } from 'react-native';

export type PlanID = 'ENG4_NORTH' | 'ENG4_SOUTH' | 'HOME_FLOOR';

export type FloorPlanDefinition = {
  id: PlanID;
  title: string;
  image: ImageSourcePropType;
};

export type AnchorPoint = {
  id: string;
  planID: PlanID;
  name: string;
  xNorm: number;
  yNorm: number;
};

export type BeaconIdentity = {
  uuid: string;
  major: number;
  minor: number;
  key: string;
};

export type BeaconReading = BeaconIdentity & {
  rssi: number;
  lastSeen: number;
};

export type FingerprintCsvRow = {
  timestamp: string;
  planID: PlanID;
  pointID: string;
  pointName: string;
  xNorm: number;
  yNorm: number;
  uuid: string;
  major: number;
  minor: number;
  rssi: number;
  mode: string;
};

export type TrainingSample = {
  timestamp: string;
  planID: PlanID;
  xNorm: number;
  yNorm: number;
  vector: number[];
};

export type TrainingDataset = {
  beaconKeys: string[];
  samples: TrainingSample[];
  rows: FingerprintCsvRow[];
};

export const BEACON_UUID_DEFAULT = 'AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE';

export const FLOOR_PLANS: FloorPlanDefinition[] = [
  { id: 'ENG4_NORTH', title: 'ENG4 North', image: require('@/assets/images/eng4_north.png') },
  { id: 'ENG4_SOUTH', title: 'ENG4 South', image: require('@/assets/images/eng4_south.png') },
  { id: 'HOME_FLOOR', title: 'Home Floor', image: require('@/assets/images/homeFloorPlan.png') },
];

export const RSSI_FLOOR = -100;
