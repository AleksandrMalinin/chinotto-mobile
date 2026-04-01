import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_FIRST = '@chinotto/first_saved_thought_v1';
const KEY_CTA = '@chinotto/sync_header_cta_tapped_v1';
const KEY_SHIMMER = '@chinotto/enable_sync_shimmer_done_v1';

export async function hasFirstSavedThought(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEY_FIRST)) === '1';
  } catch {
    return true;
  }
}

/** Call once after the first successful save (before scheduling shimmer). */
export async function recordFirstSavedThought(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY_FIRST, '1');
  } catch {
    /* ignore */
  }
}

export async function hasSyncHeaderCtaBeenTapped(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEY_CTA)) === '1';
  } catch {
    return true;
  }
}

export async function recordSyncHeaderCtaTapped(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY_CTA, '1');
  } catch {
    /* ignore */
  }
}

export async function hasEnableSyncShimmerCompleted(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEY_SHIMMER)) === '1';
  } catch {
    return true;
  }
}

export async function markEnableSyncShimmerCompleted(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY_SHIMMER, '1');
  } catch {
    /* ignore */
  }
}

/** Dev / tests only — reset first-save + CTA + shimmer flags. */
export async function clearEnableSyncShimmerPrefsForTests(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([KEY_FIRST, KEY_CTA, KEY_SHIMMER]);
  } catch {
    /* ignore */
  }
}
