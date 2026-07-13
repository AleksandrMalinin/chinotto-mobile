import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_DEV_FIRST_INSTALL_PREVIEW = '@chinotto/dev_first_install_stream_preview_v1';

/** Dev only — hide stream rows and replay first-install empty capture UX (DB untouched). */
export async function getDevFirstInstallStreamPreviewEnabled(): Promise<boolean> {
  if (!__DEV__) {
    return false;
  }
  try {
    return (await AsyncStorage.getItem(KEY_DEV_FIRST_INSTALL_PREVIEW)) === '1';
  } catch {
    return false;
  }
}

export async function setDevFirstInstallStreamPreviewEnabled(enabled: boolean): Promise<void> {
  if (!__DEV__) {
    return;
  }
  try {
    if (enabled) {
      await AsyncStorage.setItem(KEY_DEV_FIRST_INSTALL_PREVIEW, '1');
    } else {
      await AsyncStorage.removeItem(KEY_DEV_FIRST_INSTALL_PREVIEW);
    }
  } catch {
    /* ignore */
  }
}

export async function toggleDevFirstInstallStreamPreviewEnabled(): Promise<boolean> {
  const next = !(await getDevFirstInstallStreamPreviewEnabled());
  await setDevFirstInstallStreamPreviewEnabled(next);
  return next;
}
