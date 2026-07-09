import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_THREAD_PEEL_HINT = '@chinotto/spatial_thread_peel_hint_dismissed_v1';
const KEY_TEMPORAL_MAP_HINT = '@chinotto/spatial_temporal_map_hint_dismissed_v1';

async function isDismissed(key: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(key)) === '1';
  } catch {
    return false;
  }
}

async function setDismissed(key: string): Promise<void> {
  try {
    await AsyncStorage.setItem(key, '1');
  } catch {
    /* ignore */
  }
}

export async function getThreadPeelHintDismissed(): Promise<boolean> {
  return isDismissed(KEY_THREAD_PEEL_HINT);
}

export async function setThreadPeelHintDismissed(): Promise<void> {
  await setDismissed(KEY_THREAD_PEEL_HINT);
}

export async function getTemporalMapHintDismissed(): Promise<boolean> {
  return isDismissed(KEY_TEMPORAL_MAP_HINT);
}

export async function setTemporalMapHintDismissed(): Promise<void> {
  await setDismissed(KEY_TEMPORAL_MAP_HINT);
}

/** Dev / QA — replay one-time spatial hints. */
export async function clearSpatialGestureHints(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([KEY_THREAD_PEEL_HINT, KEY_TEMPORAL_MAP_HINT]);
  } catch {
    /* ignore */
  }
}
