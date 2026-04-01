import AsyncStorage from '@react-native-async-storage/async-storage';

import { getStoredAppIconVariant, setStoredAppIconVariant } from '../appIconPrefs';

describe('appIconPrefs', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('returns null by default', async () => {
    expect(await getStoredAppIconVariant()).toBeNull();
  });

  it('stores and retrieves icon variant ids', async () => {
    await setStoredAppIconVariant('violet');
    expect(await getStoredAppIconVariant()).toBe('violet');
  });
});
