import { useEffect } from 'react';
import * as Linking from 'expo-linking';

import { isExperimentalIosHomeWidgetEnabled } from '../constants/experimentalIosHomeWidget';
import { parseWidgetDeepLink } from './parseWidgetDeepLink';

/**
 * Handles widget deep links:
 * - `chinotto://capture`
 * - `chinotto://capture?mode=voice`
 * - `chinotto://thought/<id>`
 */
export function useCaptureWidgetDeepLinkFocus(options: {
  onCaptureDeepLink: () => void;
  onVoiceCaptureDeepLink?: () => void;
  onThoughtDeepLink?: (thoughtId: string) => void;
}): void {
  const { onCaptureDeepLink, onVoiceCaptureDeepLink, onThoughtDeepLink } = options;

  useEffect(() => {
    const handleWidgetDeepLink = (url: string | null) => {
      if (!isExperimentalIosHomeWidgetEnabled()) {
        return;
      }
      const action = parseWidgetDeepLink(url);
      if (!action) {
        return;
      }
      if (action.type === 'capture') {
        if (action.mode === 'voice') {
          onVoiceCaptureDeepLink?.();
        } else {
          onCaptureDeepLink();
        }
        return;
      }
      onThoughtDeepLink?.(action.thoughtId);
    };

    const sub = Linking.addEventListener('url', ({ url }) => {
      handleWidgetDeepLink(url);
    });

    void Linking.getInitialURL().then((url) => {
      handleWidgetDeepLink(url);
    });

    return () => {
      sub.remove();
    };
  }, [onCaptureDeepLink, onVoiceCaptureDeepLink, onThoughtDeepLink]);
}
