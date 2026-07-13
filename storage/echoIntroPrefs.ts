import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_ECHO_INTRO_SEEN = '@chinotto/echo_intro_seen_v1';

export async function getEchoIntroSeen(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEY_ECHO_INTRO_SEEN)) === '1';
  } catch {
    return false;
  }
}

export async function setEchoIntroSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY_ECHO_INTRO_SEEN, '1');
  } catch {
    /* ignore */
  }
}

export async function clearEchoIntroSeen(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY_ECHO_INTRO_SEEN);
  } catch {
    /* ignore */
  }
}
