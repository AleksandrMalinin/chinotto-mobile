import * as Linking from 'expo-linking';

import type { ScreenshotScene } from '../src/features/screenshotMode';

const SCENES = new Set<ScreenshotScene>(['capture', 'welcome', 'settings', 'sync', 'sync_apple']);

/**
 * Accepts `chinotto://screenshot?scene=capture` (and the same query on https hosts).
 */
export function parseScreenshotSceneFromUrl(url: string | null | undefined): ScreenshotScene | null {
  if (url == null || url.trim() === '') {
    return null;
  }
  try {
    const { queryParams } = Linking.parse(url);
    const raw = queryParams?.scene;
    const first = Array.isArray(raw) ? raw[0] : raw;
    const fromParams = typeof first === 'string' ? first.trim().toLowerCase() : '';
    if (fromParams !== '' && SCENES.has(fromParams as ScreenshotScene)) {
      return fromParams as ScreenshotScene;
    }
  } catch {
    /* fall through to regex */
  }
  const m = /[?&]scene=([^&]+)/i.exec(url);
  if (m) {
    try {
      const s = decodeURIComponent(m[1]).trim().toLowerCase();
      if (s !== '' && SCENES.has(s as ScreenshotScene)) {
        return s as ScreenshotScene;
      }
    } catch {
      return null;
    }
  }
  return null;
}
