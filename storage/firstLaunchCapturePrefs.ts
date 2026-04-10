import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_REVEAL = '@chinotto/first_launch_empty_capture_reveal_done_v1';
const KEY_COMPOSER = '@chinotto/first_launch_composer_has_focused_v1';

/**
 * After the first cold launch, the composer auto-focuses immediately again (when appropriate).
 * While `false`, the shell may defer keyboard so the empty-stream art is visible once.
 */
export async function getFirstLaunchEmptyCaptureRevealDone(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(KEY_REVEAL);
    return raw === '1';
  } catch {
    return false;
  }
}

export async function setFirstLaunchEmptyCaptureRevealDone(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY_REVEAL, '1');
  } catch {
    /* ignore */
  }
}

/**
 * Once the user has focused the composer at least once, we may auto-focus on later opens
 * with an empty stream (steady-state capture-first).
 */
export async function getFirstLaunchComposerHasFocused(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(KEY_COMPOSER);
    return raw === '1';
  } catch {
    return false;
  }
}

export async function setFirstLaunchComposerHasFocused(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY_COMPOSER, '1');
  } catch {
    /* ignore */
  }
}

/** Dev / QA: show the one-time empty-stream path again without reinstalling. */
export async function clearFirstLaunchEmptyCaptureRevealDone(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([KEY_REVEAL, KEY_COMPOSER]);
  } catch {
    /* ignore */
  }
}
