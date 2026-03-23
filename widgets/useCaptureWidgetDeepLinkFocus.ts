import { useEffect } from 'react';
import * as Linking from 'expo-linking';

import { isExperimentalIosHomeWidgetEnabled } from '../constants/experimentalIosHomeWidget';

import { isCaptureWidgetDeepLink } from './isCaptureWidgetDeepLink';

/**
 * Bumps a counter when the widget capture URL opens the app so capture can focus.
 */
export function useCaptureWidgetDeepLinkFocus(onCaptureDeepLink: () => void): void {
  useEffect(() => {
    const bumpIfCapture = (url: string | null) => {
      if (isExperimentalIosHomeWidgetEnabled() && isCaptureWidgetDeepLink(url)) {
        onCaptureDeepLink();
      }
    };

    const sub = Linking.addEventListener('url', ({ url }) => {
      bumpIfCapture(url);
    });

    void Linking.getInitialURL().then((url) => {
      bumpIfCapture(url);
    });

    return () => {
      sub.remove();
    };
  }, [onCaptureDeepLink]);
}
