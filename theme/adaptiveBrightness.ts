import { Platform } from 'react-native';
import * as Brightness from 'expo-brightness';

/** Enter high-brightness readability chrome at or above this level (inclusive). */
export const BRIGHTNESS_ENTER_SUNLIGHT = 0.75;
/** Drop back to normal chrome below this level while in sunlight (exclusive of band for hysteresis). */
export const BRIGHTNESS_EXIT_SUNLIGHT = 0.65;

/**
 * Hysteresis: between {@link BRIGHTNESS_EXIT_SUNLIGHT} and {@link BRIGHTNESS_ENTER_SUNLIGHT}
 * the previous mode is kept to avoid flicker when the slider hovers near the threshold.
 */
export function nextSunlightTarget(currentSunlight: boolean, brightness: number): boolean {
  if (currentSunlight) {
    return brightness >= BRIGHTNESS_EXIT_SUNLIGHT;
  }
  return brightness >= BRIGHTNESS_ENTER_SUNLIGHT;
}

/**
 * Screen brightness 0–1, or `null` if unavailable (fallback: stay / force normal in hook).
 */
export async function readDeviceBrightness(): Promise<number | null> {
  try {
    const available = await Brightness.isAvailableAsync();
    if (!available) {
      return null;
    }
    if (Platform.OS === 'android') {
      try {
        return await Brightness.getSystemBrightnessAsync();
      } catch {
        return await Brightness.getBrightnessAsync();
      }
    }
    return await Brightness.getBrightnessAsync();
  } catch {
    return null;
  }
}
