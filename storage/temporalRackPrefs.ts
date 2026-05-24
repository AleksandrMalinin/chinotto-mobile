import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_COMPACT = '@chinotto/temporal_rack_compact_v1';

/** User prefers the trailing month rack minimized (bottom pill with year + month). */
export async function getTemporalRackCompact(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEY_COMPACT)) === '1';
  } catch {
    return false;
  }
}

export async function setTemporalRackCompact(compact: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY_COMPACT, compact ? '1' : '0');
  } catch {
    /* ignore */
  }
}

/** Dev / QA: restore default expanded rack. */
export async function clearTemporalRackCompact(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY_COMPACT);
  } catch {
    /* ignore */
  }
}
