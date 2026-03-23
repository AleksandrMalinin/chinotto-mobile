import { useEffect } from 'react';
import { Platform } from 'react-native';

import { isExperimentalIosHomeWidgetEnabled } from '../constants/experimentalIosHomeWidget';

import { registerCaptureHomeWidget } from './registerCaptureHomeWidget';

/**
 * Registers the home screen widget layout when the experimental widget is enabled.
 */
export function useExperimentalIosHomeWidgetRegistration(dbReady: boolean): void {
  useEffect(() => {
    if (Platform.OS !== 'ios' || !dbReady || !isExperimentalIosHomeWidgetEnabled()) {
      return;
    }
    try {
      registerCaptureHomeWidget();
    } catch (err) {
      if (__DEV__) {
        console.warn('registerCaptureHomeWidget failed', err);
      }
    }
  }, [dbReady]);
}
