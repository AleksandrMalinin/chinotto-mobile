import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  clearFirstLaunchEmptyCaptureRevealDone,
  getFirstLaunchComposerHasFocused,
  getFirstLaunchEmptyCaptureRevealDone,
  setFirstLaunchComposerHasFocused,
  setFirstLaunchEmptyCaptureRevealDone,
} from '../firstLaunchCapturePrefs';

describe('firstLaunchCapturePrefs', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('defaults reveal-done to false', async () => {
    expect(await getFirstLaunchEmptyCaptureRevealDone()).toBe(false);
  });

  it('persists reveal-done flag', async () => {
    await setFirstLaunchEmptyCaptureRevealDone();
    expect(await getFirstLaunchEmptyCaptureRevealDone()).toBe(true);
  });

  it('defaults composer-focused to false', async () => {
    expect(await getFirstLaunchComposerHasFocused()).toBe(false);
  });

  it('persists composer-focused flag', async () => {
    await setFirstLaunchComposerHasFocused();
    expect(await getFirstLaunchComposerHasFocused()).toBe(true);
  });

  it('clears reveal-done and composer flags', async () => {
    await setFirstLaunchEmptyCaptureRevealDone();
    await setFirstLaunchComposerHasFocused();
    await clearFirstLaunchEmptyCaptureRevealDone();
    expect(await getFirstLaunchEmptyCaptureRevealDone()).toBe(false);
    expect(await getFirstLaunchComposerHasFocused()).toBe(false);
  });
});
