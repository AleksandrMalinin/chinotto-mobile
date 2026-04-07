import { parseScreenshotSceneFromUrl } from '../screenshotDeepLink';

describe('parseScreenshotSceneFromUrl', () => {
  it('parses chinotto scheme with scene query', () => {
    expect(parseScreenshotSceneFromUrl('chinotto://screenshot?scene=settings')).toBe('settings');
    expect(parseScreenshotSceneFromUrl('chinotto://foo?scene=capture')).toBe('capture');
    expect(parseScreenshotSceneFromUrl('chinotto://foo?scene=sync')).toBe('sync');
    expect(parseScreenshotSceneFromUrl('chinotto://foo?scene=sync_apple')).toBe('sync_apple');
  });

  it('returns null for missing or invalid scene', () => {
    expect(parseScreenshotSceneFromUrl(null)).toBeNull();
    expect(parseScreenshotSceneFromUrl('')).toBeNull();
    expect(parseScreenshotSceneFromUrl('chinotto://foo')).toBeNull();
    expect(parseScreenshotSceneFromUrl('chinotto://foo?scene=nope')).toBeNull();
  });
});
