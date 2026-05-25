import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  getStreamTideCooldownIds,
  recordStreamTideShown,
  setStreamTideLastBackgroundAt,
  getStreamTideLastBackgroundAt,
} from '../streamTidePrefs';

describe('streamTidePrefs', () => {
  beforeEach(() => {
    AsyncStorage.clear();
  });

  it('records and returns cooldown ids within window', async () => {
    const now = Date.parse('2026-05-25T12:00:00.000Z');
    await recordStreamTideShown(['a'], now);
    const ids = await getStreamTideCooldownIds(now + 1000);
    expect(ids.has('a')).toBe(true);
  });

  it('stores last background timestamp', async () => {
    await setStreamTideLastBackgroundAt('2026-05-25T08:00:00.000Z');
    expect(await getStreamTideLastBackgroundAt()).toBe('2026-05-25T08:00:00.000Z');
  });
});
