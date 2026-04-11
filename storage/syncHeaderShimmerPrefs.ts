import AsyncStorage from '@react-native-async-storage/async-storage';

import { SYNC_HIGHLIGHT_MAX_IMPRESSIONS } from '../sync/syncHighlightConstants';
import { clearSyncHighlightSignalsForTests, loadSyncHighlightSignals } from './syncHighlightSignals';

const KEY_FIRST = '@chinotto/first_saved_thought_v1';
const KEY_SECOND = '@chinotto/second_saved_thought_v1';
const KEY_CTA = '@chinotto/sync_header_cta_tapped_v1';
const KEY_SHIMMER = '@chinotto/enable_sync_shimmer_done_v1';

export async function hasFirstSavedThought(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEY_FIRST)) === '1';
  } catch {
    return true;
  }
}

/** Call once after the first successful save. */
export async function recordFirstSavedThought(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY_FIRST, '1');
  } catch {
    /* ignore */
  }
}

export async function hasSecondSavedThought(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEY_SECOND)) === '1';
  } catch {
    return true;
  }
}

/** Call once after the second successful save (before scheduling Enable sync label shimmer). */
export async function recordSecondSavedThought(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY_SECOND, '1');
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
    if ((await AsyncStorage.getItem(KEY_SHIMMER)) === '1') {
      return true;
    }
    const s = await loadSyncHighlightSignals();
    return s.shimmerImpressionCount >= SYNC_HIGHLIGHT_MAX_IMPRESSIONS;
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
    await AsyncStorage.multiRemove([KEY_FIRST, KEY_SECOND, KEY_CTA, KEY_SHIMMER]);
    await clearSyncHighlightSignalsForTests();
  } catch {
    /* ignore */
  }
}

/** Dev menu (QA): same as {@link clearEnableSyncShimmerPrefsForTests} — re-run shimmer after reload + two new saves. */
export async function resetSyncHeaderShimmerPrefsForDev(): Promise<void> {
  await clearEnableSyncShimmerPrefsForTests();
}
