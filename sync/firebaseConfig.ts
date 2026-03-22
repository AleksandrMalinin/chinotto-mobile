/**
 * Firebase sync is enabled when required web config env vars are present.
 * Set `EXPO_PUBLIC_FIREBASE_*` in `.env` (see `.env.example`).
 */
export function isFirebaseSyncConfigured(): boolean {
  const apiKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY?.trim();
  const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID?.trim();
  return Boolean(apiKey && projectId);
}

export function getFirebaseWebOptions() {
  const apiKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY!.trim();
  const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID!.trim();
  return {
    apiKey,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim(),
    projectId,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim(),
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?.trim(),
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID?.trim(),
  };
}
