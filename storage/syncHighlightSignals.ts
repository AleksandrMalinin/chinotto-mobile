import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  SYNC_HIGHLIGHT_COOLDOWN_MS,
  SYNC_HIGHLIGHT_MAX_IMPRESSIONS,
} from '../sync/syncHighlightConstants';

const KEY_PREFIX = '@chinotto/sync_highlight_v1';

const KEY_APP_LAUNCHES = `${KEY_PREFIX}/app_launches`;
const KEY_SHIMMER_COUNT = `${KEY_PREFIX}/shimmer_count`;
const KEY_LAST_SHIMMER_AT = `${KEY_PREFIX}/last_shimmer_at`;
const KEY_DEEP_SCROLL = `${KEY_PREFIX}/deep_scroll`;
const KEY_OPENED_THOUGHT = `${KEY_PREFIX}/opened_thought`;
const KEY_USED_SEARCH = `${KEY_PREFIX}/used_search`;

/** Legacy one-shot “shimmer done” — migrate to impression budget. */
const KEY_LEGACY_SHIMMER_DONE = '@chinotto/enable_sync_shimmer_done_v1';

export type SyncHighlightSignals = {
  appLaunchCount: number;
  shimmerImpressionCount: number;
  lastShimmerAt: number | null;
  hasDeepScrolledStream: boolean;
  hasOpenedExistingThought: boolean;
  hasUsedSearch: boolean;
};

const defaultSignals: SyncHighlightSignals = {
  appLaunchCount: 0,
  shimmerImpressionCount: 0,
  lastShimmerAt: null,
  hasDeepScrolledStream: false,
  hasOpenedExistingThought: false,
  hasUsedSearch: false,
};

async function getNum(key: string): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw == null) {
      return 0;
    }
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

async function getFlag(key: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(key)) === '1';
  } catch {
    return false;
  }
}

/**
 * Load persisted engagement + shimmer budget. Migrates legacy “shimmer done” to a full budget.
 */
export async function loadSyncHighlightSignals(): Promise<SyncHighlightSignals> {
  try {
    const legacyDone = await AsyncStorage.getItem(KEY_LEGACY_SHIMMER_DONE);
    const storedCount = await getNum(KEY_SHIMMER_COUNT);
    const migratedCount = legacyDone === '1' ? Math.max(storedCount, SYNC_HIGHLIGHT_MAX_IMPRESSIONS) : storedCount;

    const lastAtRaw = await AsyncStorage.getItem(KEY_LAST_SHIMMER_AT);
    let lastShimmerAt: number | null = null;
    if (lastAtRaw != null && lastAtRaw !== '') {
      const n = Number(lastAtRaw);
      lastShimmerAt = Number.isFinite(n) ? n : null;
    }

    return {
      appLaunchCount: await getNum(KEY_APP_LAUNCHES),
      shimmerImpressionCount: migratedCount,
      lastShimmerAt,
      hasDeepScrolledStream: await getFlag(KEY_DEEP_SCROLL),
      hasOpenedExistingThought: await getFlag(KEY_OPENED_THOUGHT),
      hasUsedSearch: await getFlag(KEY_USED_SEARCH),
    };
  } catch {
    return { ...defaultSignals };
  }
}

/** Cold start: call once when app reaches main shell (see App.tsx). */
export async function incrementAppLaunchCountForSyncHighlight(): Promise<void> {
  try {
    const n = await getNum(KEY_APP_LAUNCHES);
    await AsyncStorage.setItem(KEY_APP_LAUNCHES, String(n + 1));
  } catch {
    /* ignore */
  }
}

export async function recordStreamDeepScrolledForSyncHighlight(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY_DEEP_SCROLL, '1');
  } catch {
    /* ignore */
  }
}

export async function recordOpenedExistingThoughtForSyncHighlight(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY_OPENED_THOUGHT, '1');
  } catch {
    /* ignore */
  }
}

export async function recordSearchUsedForSyncHighlight(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY_USED_SEARCH, '1');
  } catch {
    /* ignore */
  }
}

/** After a shimmer animation completes successfully. */
export async function recordSyncShimmerImpression(): Promise<void> {
  try {
    const prev = await getNum(KEY_SHIMMER_COUNT);
    const next = prev + 1;
    await AsyncStorage.setItem(KEY_SHIMMER_COUNT, String(next));
    await AsyncStorage.setItem(KEY_LAST_SHIMMER_AT, String(Date.now()));
    if (next >= SYNC_HIGHLIGHT_MAX_IMPRESSIONS) {
      await AsyncStorage.setItem(KEY_LEGACY_SHIMMER_DONE, '1');
    }
  } catch {
    /* ignore */
  }
}

/** Dev / tests — full reset of highlight signals + legacy key. */
export async function clearSyncHighlightSignalsForTests(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([
      KEY_APP_LAUNCHES,
      KEY_SHIMMER_COUNT,
      KEY_LAST_SHIMMER_AT,
      KEY_DEEP_SCROLL,
      KEY_OPENED_THOUGHT,
      KEY_USED_SEARCH,
      KEY_LEGACY_SHIMMER_DONE,
    ]);
  } catch {
    /* ignore */
  }
}
