import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_TEMPORAL_MAP_HINT = '@chinotto/spatial_temporal_map_hint_dismissed_v1';
const KEY_DEV_GESTURE_HINTS_PREVIEW = '@chinotto/dev_gesture_hints_preview_v1';

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

export async function getTemporalMapHintDismissed(): Promise<boolean> {
  return isDismissed(KEY_TEMPORAL_MAP_HINT);
}

export async function setTemporalMapHintDismissed(): Promise<void> {
  await setDismissed(KEY_TEMPORAL_MAP_HINT);
}

/** Dev / QA — replay one-time spatial hints. */
export async function clearSpatialGestureHints(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([KEY_TEMPORAL_MAP_HINT]);
  } catch {
    /* ignore */
  }
}

/** Dev only — force gesture hints visible on capture (ignores dismissal + eligibility). */
export async function getDevGestureHintsPreviewEnabled(): Promise<boolean> {
  if (!__DEV__) {
    return false;
  }
  try {
    return (await AsyncStorage.getItem(KEY_DEV_GESTURE_HINTS_PREVIEW)) === '1';
  } catch {
    return false;
  }
}

export async function setDevGestureHintsPreviewEnabled(enabled: boolean): Promise<void> {
  if (!__DEV__) {
    return;
  }
  try {
    if (enabled) {
      await AsyncStorage.setItem(KEY_DEV_GESTURE_HINTS_PREVIEW, '1');
    } else {
      await AsyncStorage.removeItem(KEY_DEV_GESTURE_HINTS_PREVIEW);
    }
  } catch {
    /* ignore */
  }
}

export async function toggleDevGestureHintsPreviewEnabled(): Promise<boolean> {
  const next = !(await getDevGestureHintsPreviewEnabled());
  await setDevGestureHintsPreviewEnabled(next);
  return next;
}
