import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@chinotto/welcome_v1';

export async function hasCompletedWelcome(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(KEY);
    return v === '1';
  } catch {
    return true;
  }
}

export async function setWelcomeCompleted(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, '1');
  } catch {
    /* ignore */
  }
}

/** Dev / tests: show first-launch welcome again. */
export async function clearWelcomeFlag(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
