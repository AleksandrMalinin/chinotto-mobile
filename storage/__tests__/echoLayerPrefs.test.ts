import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  clearEchoContinuityPrefs,
  getEchoDisplayCooldownExcludedIds,
  getEchoSessionThread,
  recordEchoCandidatesDisplayed,
  setEchoSessionThread,
} from '../echoLayerPrefs';

describe('echoLayerPrefs', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('cooldown excludes recently displayed entries', async () => {
    const now = new Date('2026-05-24T12:00:00.000Z');
    await recordEchoCandidatesDisplayed(['e1'], now);
    const excluded = await getEchoDisplayCooldownExcludedIds(now);
    expect(excluded.has('e1')).toBe(true);
  });

  it('extends cooldown for opened-without-edit entries', async () => {
    const shown = new Date('2026-05-01T10:00:00.000Z');
    const now = new Date('2026-05-16T12:00:00.000Z');
    await recordEchoCandidatesDisplayed(['e1'], shown);
    const engagement = new Map([['e1', { openCount: 2, editCount: 0 }]]);
    expect((await getEchoDisplayCooldownExcludedIds(now, engagement)).has('e1')).toBe(true);
    expect((await getEchoDisplayCooldownExcludedIds(now)).has('e1')).toBe(false);
  });

  it('session thread round-trips', async () => {
    await setEchoSessionThread('entry-1', new Date('2026-05-24T10:00:00.000Z'));
    expect(await getEchoSessionThread()).toEqual({
      entryId: 'entry-1',
      atIso: '2026-05-24T10:00:00.000Z',
    });
    await clearEchoContinuityPrefs();
    expect(await getEchoSessionThread()).toBeNull();
  });
});
