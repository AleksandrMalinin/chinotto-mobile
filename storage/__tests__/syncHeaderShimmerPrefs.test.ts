import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  clearEnableSyncShimmerPrefsForTests,
  hasEnableSyncShimmerCompleted,
  hasFirstSavedThought,
  hasSyncHeaderCtaBeenTapped,
  markEnableSyncShimmerCompleted,
  recordFirstSavedThought,
  recordSyncHeaderCtaTapped,
} from '../syncHeaderShimmerPrefs';

describe('syncHeaderShimmerPrefs', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('tracks first saved thought', async () => {
    expect(await hasFirstSavedThought()).toBe(false);
    await recordFirstSavedThought();
    expect(await hasFirstSavedThought()).toBe(true);
  });

  it('tracks sync header CTA tap', async () => {
    expect(await hasSyncHeaderCtaBeenTapped()).toBe(false);
    await recordSyncHeaderCtaTapped();
    expect(await hasSyncHeaderCtaBeenTapped()).toBe(true);
  });

  it('tracks shimmer completion', async () => {
    expect(await hasEnableSyncShimmerCompleted()).toBe(false);
    await markEnableSyncShimmerCompleted();
    expect(await hasEnableSyncShimmerCompleted()).toBe(true);
  });

  it('clearEnableSyncShimmerPrefsForTests resets keys', async () => {
    await recordFirstSavedThought();
    await recordSyncHeaderCtaTapped();
    await markEnableSyncShimmerCompleted();
    await clearEnableSyncShimmerPrefsForTests();
    expect(await hasFirstSavedThought()).toBe(false);
    expect(await hasSyncHeaderCtaBeenTapped()).toBe(false);
    expect(await hasEnableSyncShimmerCompleted()).toBe(false);
  });
});
