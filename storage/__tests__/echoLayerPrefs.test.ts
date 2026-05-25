import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  clearEchoContinuityPrefs,
  clearEchoEdgePeekDone,
  getEchoDisplayCooldownExcludedIds,
  getEchoEdgePeekDone,
  getEchoSessionThread,
  recordEchoCandidatesDisplayed,
  setEchoEdgePeekDone,
  setEchoSessionThread,
} from '../echoLayerPrefs';

describe('echoLayerPrefs', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('tracks one-time echo edge peek', async () => {
    expect(await getEchoEdgePeekDone()).toBe(false);
    await setEchoEdgePeekDone();
    expect(await getEchoEdgePeekDone()).toBe(true);
  });

  it('clears edge peek for dev QA', async () => {
    await setEchoEdgePeekDone();
    await clearEchoEdgePeekDone();
    expect(await getEchoEdgePeekDone()).toBe(false);
  });

  it('cooldown excludes recently displayed entries', async () => {
    const now = new Date('2026-05-24T12:00:00.000Z');
    await recordEchoCandidatesDisplayed(['e1'], now);
    const excluded = await getEchoDisplayCooldownExcludedIds(now);
    expect(excluded.has('e1')).toBe(true);
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
