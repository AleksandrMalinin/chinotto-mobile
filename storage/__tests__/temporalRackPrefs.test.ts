import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  clearTemporalRackCompact,
  getTemporalRackCompact,
  setTemporalRackCompact,
} from '../temporalRackPrefs';

describe('temporalRackPrefs', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('defaults to expanded rack', async () => {
    expect(await getTemporalRackCompact()).toBe(false);
  });

  it('persists compact preference', async () => {
    await setTemporalRackCompact(true);
    expect(await getTemporalRackCompact()).toBe(true);
    await setTemporalRackCompact(false);
    expect(await getTemporalRackCompact()).toBe(false);
  });

  it('clears compact for dev QA', async () => {
    await setTemporalRackCompact(true);
    await clearTemporalRackCompact();
    expect(await getTemporalRackCompact()).toBe(false);
  });
});
