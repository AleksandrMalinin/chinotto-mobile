import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  clearEchoContinuityPrefs,
  clearEchoEdgePeekDone,
  getEchoDisplayCooldownExcludedIds,
  getEchoEdgePeekDone,
  getEchoEdgePeekLastAt,
  getEchoSessionThread,
  recordEchoCandidatesDisplayed,
  setEchoEdgePeekLastAt,
  setEchoSessionThread,
  shouldOfferEchoEdgePeek,
} from '../echoLayerPrefs';

describe('echoLayerPrefs', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('tracks echo edge peek last at', async () => {
    expect(await getEchoEdgePeekLastAt()).toBeNull();
    const at = new Date('2026-05-01T10:00:00.000Z');
    await setEchoEdgePeekLastAt(at);
    expect((await getEchoEdgePeekLastAt())?.toISOString()).toBe(at.toISOString());
    expect(await getEchoEdgePeekDone()).toBe(true);
  });

  it('offers repeat peek after cooldown days', async () => {
    const now = new Date('2026-05-24T12:00:00.000Z');
    await setEchoEdgePeekLastAt(new Date('2026-05-10T12:00:00.000Z'));
    expect(await shouldOfferEchoEdgePeek(now)).toBe(true);
    await setEchoEdgePeekLastAt(new Date('2026-05-22T12:00:00.000Z'));
    expect(await shouldOfferEchoEdgePeek(now)).toBe(false);
  });

  it('clears edge peek for dev QA', async () => {
    await setEchoEdgePeekLastAt();
    await clearEchoEdgePeekDone();
    expect(await getEchoEdgePeekDone()).toBe(false);
    expect(await getEchoEdgePeekLastAt()).toBeNull();
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
