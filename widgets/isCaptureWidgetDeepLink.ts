import { CHINOTTO_WIDGET_CAPTURE_URL } from './chinottoWidgetConstants';

/**
 * True when the URL should open the main app into the capture flow (widget tap).
 */
export function isCaptureWidgetDeepLink(url: string | null | undefined): boolean {
  if (!url?.trim()) {
    return false;
  }
  try {
    const expected = new URL(CHINOTTO_WIDGET_CAPTURE_URL);
    const actual = new URL(url);
    if (actual.protocol !== expected.protocol) {
      return false;
    }
    return actual.hostname.toLowerCase() === expected.hostname.toLowerCase();
  } catch {
    return false;
  }
}
