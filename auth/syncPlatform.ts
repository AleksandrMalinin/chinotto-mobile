import { Platform } from 'react-native';

import { isFirebaseSyncConfigured } from '../sync/firebaseConfig';

/** iOS + Android when Firebase sync env is set (companion sync surfaces). */
export function isMobileSyncPlatform(): boolean {
  return (Platform.OS === 'ios' || Platform.OS === 'android') && isFirebaseSyncConfigured();
}

export function isAndroidSyncPlatform(): boolean {
  return Platform.OS === 'android' && isFirebaseSyncConfigured();
}

export function isIosSyncPlatform(): boolean {
  return Platform.OS === 'ios' && isFirebaseSyncConfigured();
}
