import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  clearSpatialGestureHints,
  getDevGestureHintsPreviewEnabled,
  getTemporalMapHintDismissed,
  setDevGestureHintsPreviewEnabled,
  setTemporalMapHintDismissed,
  toggleDevGestureHintsPreviewEnabled,
} from '../spatialGesturePrefs';

describe('spatialGesturePrefs', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('tracks temporal map hint dismissal', async () => {
    expect(await getTemporalMapHintDismissed()).toBe(false);
    await setTemporalMapHintDismissed();
    expect(await getTemporalMapHintDismissed()).toBe(true);
  });

  it('clears temporal hint for dev QA', async () => {
    await setTemporalMapHintDismissed();
    await clearSpatialGestureHints();
    expect(await getTemporalMapHintDismissed()).toBe(false);
  });

  it('toggles dev gesture hints preview', async () => {
    expect(await getDevGestureHintsPreviewEnabled()).toBe(false);
    await setDevGestureHintsPreviewEnabled(true);
    expect(await getDevGestureHintsPreviewEnabled()).toBe(true);
    const next = await toggleDevGestureHintsPreviewEnabled();
    expect(next).toBe(false);
    expect(await getDevGestureHintsPreviewEnabled()).toBe(false);
  });
});
