import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@chinotto/settings_display_chrome_v1';

/** User override for adaptive contrast. `auto` follows screen brightness. */
export type DisplayChromePreference = 'auto' | 'normal' | 'sunlight';

export async function getDisplayChromePreference(): Promise<DisplayChromePreference> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw === 'normal' || raw === 'sunlight') {
      return raw;
    }
    return 'auto';
  } catch {
    return 'auto';
  }
}

export async function setDisplayChromePreference(next: DisplayChromePreference): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, next);
  } catch {
    /* ignore */
  }
}
