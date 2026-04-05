import AsyncStorage from '@react-native-async-storage/async-storage';

import { getAppearanceMode, setAppearanceMode } from '../appearancePrefs';

describe('appearancePrefs', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('defaults to default appearance', async () => {
    expect(await getAppearanceMode()).toBe('default');
  });

  it('persists sunlight mode', async () => {
    await setAppearanceMode('sunlight');
    expect(await getAppearanceMode()).toBe('sunlight');

    await setAppearanceMode('default');
    expect(await getAppearanceMode()).toBe('default');
  });
});
