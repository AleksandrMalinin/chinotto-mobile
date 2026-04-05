const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on']);

function envFlag(value: string | undefined): boolean {
  if (value == null || value.trim() === '') {
    return false;
  }
  return TRUE_VALUES.has(value.trim().toLowerCase());
}

export type ScreenshotScene = 'capture' | 'welcome' | 'settings' | 'sync' | 'sync_apple';

const SCENES = new Set<ScreenshotScene>(['capture', 'welcome', 'settings', 'sync', 'sync_apple']);

/**
 * App Store screenshot automation (demo stream, `chinotto://screenshot?scene=…`, `scripts/store-screenshots.sh`).
 *
 * **Ship default: off.** Flip to `true` when you need marketing captures again, then set
 * `EXPO_PUBLIC_SCREENSHOT_MODE=1` in `.env` and run `pnpm start -c` (Metro inlines env at bundle time).
 *
 * Related: `linking/screenshotDeepLink.ts`, `src/screenshots/demoEntries.ts`, `CaptureScreen` / `App.tsx`.
 */
export const SCREENSHOT_AUTOMATION_ENABLED = false;

/** Metro inlines `EXPO_PUBLIC_*` at bundle time — rebuild after changing `.env`. */
export function isScreenshotMode(): boolean {
  if (!SCREENSHOT_AUTOMATION_ENABLED) {
    return false;
  }
  return envFlag(process.env.EXPO_PUBLIC_SCREENSHOT_MODE);
}

export function getScreenshotSceneFromEnv(): ScreenshotScene {
  const raw = process.env.EXPO_PUBLIC_SCREENSHOT_SCENE?.trim().toLowerCase();
  if (raw != null && SCENES.has(raw as ScreenshotScene)) {
    return raw as ScreenshotScene;
  }
  return 'capture';
}
