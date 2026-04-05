import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  getDisplayChromePreference,
  setDisplayChromePreference,
} from '../displayChromePrefs';

describe('displayChromePrefs', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('defaults to auto when unset', async () => {
    expect(await getDisplayChromePreference()).toBe('auto');
  });

  it('persists normal, sunlight, and auto', async () => {
    await setDisplayChromePreference('normal');
    expect(await getDisplayChromePreference()).toBe('normal');

    await setDisplayChromePreference('sunlight');
    expect(await getDisplayChromePreference()).toBe('sunlight');

    await setDisplayChromePreference('auto');
    expect(await getDisplayChromePreference()).toBe('auto');
  });
});
