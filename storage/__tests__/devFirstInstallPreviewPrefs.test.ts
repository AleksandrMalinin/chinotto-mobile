import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  getDevFirstInstallStreamPreviewEnabled,
  setDevFirstInstallStreamPreviewEnabled,
  toggleDevFirstInstallStreamPreviewEnabled,
} from '../devFirstInstallPreviewPrefs';

describe('devFirstInstallPreviewPrefs', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('defaults to off and toggles in dev', async () => {
    expect(await getDevFirstInstallStreamPreviewEnabled()).toBe(false);
    await setDevFirstInstallStreamPreviewEnabled(true);
    expect(await getDevFirstInstallStreamPreviewEnabled()).toBe(true);
    const next = await toggleDevFirstInstallStreamPreviewEnabled();
    expect(next).toBe(false);
    expect(await getDevFirstInstallStreamPreviewEnabled()).toBe(false);
  });
});
