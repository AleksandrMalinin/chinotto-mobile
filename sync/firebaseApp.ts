import { getApp, getApps, initializeApp } from 'firebase/app';

import { getFirebaseWebOptions } from './firebaseConfig';

export function getOrInitApp() {
  if (getApps().length === 0) {
    return initializeApp(getFirebaseWebOptions());
  }
  return getApp();
}
