import { PermissionsAndroid, Platform } from 'react-native';

export const requestBlePermissions = async () => {
  if (Platform.OS !== 'android') return true;
  const sdk = typeof Platform.Version === 'number' ? Platform.Version : Number(Platform.Version);

  const perms = sdk >= 31
    ? [
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      ]
    : [
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ];

  const result = await PermissionsAndroid.requestMultiple(perms);
  return perms.every((perm) => result[perm] === PermissionsAndroid.RESULTS.GRANTED);
};
