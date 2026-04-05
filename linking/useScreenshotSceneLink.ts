import { useEffect, useState } from 'react';
import * as Linking from 'expo-linking';

import type { ScreenshotScene } from '../src/features/screenshotMode';
import { getScreenshotSceneFromEnv, isScreenshotMode } from '../src/features/screenshotMode';
import { parseScreenshotSceneFromUrl } from './screenshotDeepLink';

/**
 * Default scene from env; `chinotto://screenshot?scene=…` overrides at runtime (simulator automation).
 */
export function useScreenshotSceneLink(): ScreenshotScene {
  const [scene, setScene] = useState<ScreenshotScene>(() =>
    isScreenshotMode() ? getScreenshotSceneFromEnv() : 'capture'
  );

  useEffect(() => {
    if (!isScreenshotMode()) {
      return;
    }

    const apply = (url: string | null) => {
      const next = parseScreenshotSceneFromUrl(url);
      if (next != null) {
        setScene(next);
      }
    };

    const sub = Linking.addEventListener('url', ({ url }) => {
      apply(url);
    });

    void Linking.getInitialURL().then((url) => {
      apply(url);
    });

    return () => {
      sub.remove();
    };
  }, []);

  return scene;
}
