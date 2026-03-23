import { isCaptureWidgetDeepLink } from '../isCaptureWidgetDeepLink';

describe('isCaptureWidgetDeepLink', () => {
  it('returns true for the widget capture URL', () => {
    expect(isCaptureWidgetDeepLink('chinotto://capture')).toBe(true);
  });

  it('returns true when extra path or query is present on same host', () => {
    expect(isCaptureWidgetDeepLink('chinotto://capture/')).toBe(true);
    expect(isCaptureWidgetDeepLink('chinotto://capture?x=1')).toBe(true);
  });

  it('returns false for other URLs', () => {
    expect(isCaptureWidgetDeepLink(null)).toBe(false);
    expect(isCaptureWidgetDeepLink('')).toBe(false);
    expect(isCaptureWidgetDeepLink('https://example.com')).toBe(false);
    expect(isCaptureWidgetDeepLink('chinotto://other')).toBe(false);
  });
});
