import { PermissionsAndroid, Platform } from 'react-native';

export const requestBlePermissions = async () => {
  if (Platform.OS !== 'android') return true;
  const perms = [
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
  ].filter(Boolean) as string[];

  const result = await PermissionsAndroid.requestMultiple(perms);
  return perms.every((perm) => result[perm] === PermissionsAndroid.RESULTS.GRANTED);
};
