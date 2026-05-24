import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_EDGE_PEEK = '@chinotto/echo_layer_edge_peek_done_v1';

/** One-time edge peek when Echo first becomes eligible — hints swipe-right without teaching. */
export async function getEchoEdgePeekDone(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(KEY_EDGE_PEEK);
    return raw === '1';
  } catch {
    return false;
  }
}

export async function setEchoEdgePeekDone(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY_EDGE_PEEK, '1');
  } catch {
    /* ignore */
  }
}

/** Dev / QA: replay the one-time Echo edge peek. */
export async function clearEchoEdgePeekDone(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY_EDGE_PEEK);
  } catch {
    /* ignore */
  }
}
