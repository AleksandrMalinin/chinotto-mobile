import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@chinotto/settings_appearance_v1';

export type AppearanceMode = 'default' | 'sunlight';

export async function getAppearanceMode(): Promise<AppearanceMode> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw === 'sunlight') {
      return 'sunlight';
    }
    return 'default';
  } catch {
    return 'default';
  }
}

export async function setAppearanceMode(mode: AppearanceMode): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, mode);
  } catch {
    /* ignore */
  }
}
