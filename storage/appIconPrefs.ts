import AsyncStorage from '@react-native-async-storage/async-storage';

import type { AppIconVariantId } from '../src/services/icons/iconVariants';

const KEY_APP_ICON = '@chinotto/app_icon_variant_v1';

export async function getStoredAppIconVariant(): Promise<AppIconVariantId | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY_APP_ICON);
    if (
      raw === 'default' ||
      raw === 'light' ||
      raw === 'violet' ||
      raw === 'cyan' ||
      raw === 'orange' ||
      raw === 'gradient'
    ) {
      return raw;
    }
    return null;
  } catch {
    return null;
  }
}

export async function setStoredAppIconVariant(id: AppIconVariantId): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY_APP_ICON, id);
  } catch {
    /* ignore */
  }
}
