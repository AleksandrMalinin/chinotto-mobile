import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  clearSpatialGestureHints,
  getTemporalMapHintDismissed,
  getThreadPeelHintDismissed,
  setTemporalMapHintDismissed,
  setThreadPeelHintDismissed,
} from '../spatialGesturePrefs';

describe('spatialGesturePrefs', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('tracks thread peel hint dismissal', async () => {
    expect(await getThreadPeelHintDismissed()).toBe(false);
    await setThreadPeelHintDismissed();
    expect(await getThreadPeelHintDismissed()).toBe(true);
  });

  it('tracks temporal map hint dismissal', async () => {
    expect(await getTemporalMapHintDismissed()).toBe(false);
    await setTemporalMapHintDismissed();
    expect(await getTemporalMapHintDismissed()).toBe(true);
  });

  it('clears both hints for dev QA', async () => {
    await setThreadPeelHintDismissed();
    await setTemporalMapHintDismissed();
    await clearSpatialGestureHints();
    expect(await getThreadPeelHintDismissed()).toBe(false);
    expect(await getTemporalMapHintDismissed()).toBe(false);
  });
});
