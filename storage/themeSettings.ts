import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_THEMES_ENABLED = '@chinotto/settings_themes_enabled_v1';

export async function isThemesEnabled(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(KEY_THEMES_ENABLED);
    if (raw == null) {
      return true;
    }
    return raw === '1';
  } catch {
    return true;
  }
}

export async function setThemesEnabled(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY_THEMES_ENABLED, enabled ? '1' : '0');
  } catch {
    /* ignore */
  }
}
