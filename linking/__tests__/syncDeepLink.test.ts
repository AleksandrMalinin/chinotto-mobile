import {
  CHINOTTO_SYNC_UNIVERSAL_HOST,
  isSyncDeepLinkUrl,
  isValidDesktopSyncSessionId,
  parseDesktopSyncSessionIdFromUrl,
} from '../syncDeepLink';

const SAMPLE_DS =
  'a1b2c3d4-e5f6-4789-a012-3456789abcde' as const;

describe('isSyncDeepLinkUrl', () => {
  it('accepts HTTPS sync URL on configured host', () => {
    expect(isSyncDeepLinkUrl(`https://${CHINOTTO_SYNC_UNIVERSAL_HOST}/sync`)).toBe(true);
    expect(isSyncDeepLinkUrl(`https://${CHINOTTO_SYNC_UNIVERSAL_HOST}/sync/`)).toBe(true);
    expect(isSyncDeepLinkUrl(`https://${CHINOTTO_SYNC_UNIVERSAL_HOST}/sync?x=1`)).toBe(true);
    expect(isSyncDeepLinkUrl(`https://${CHINOTTO_SYNC_UNIVERSAL_HOST}/sync/sub`)).toBe(false);
  });

  it('rejects other paths on the same host', () => {
    expect(isSyncDeepLinkUrl(`https://${CHINOTTO_SYNC_UNIVERSAL_HOST}/`)).toBe(false);
    expect(isSyncDeepLinkUrl(`https://${CHINOTTO_SYNC_UNIVERSAL_HOST}/about`)).toBe(false);
    expect(isSyncDeepLinkUrl(`https://${CHINOTTO_SYNC_UNIVERSAL_HOST}/syncing`)).toBe(false);
  });

  it('rejects other hosts', () => {
    expect(isSyncDeepLinkUrl('https://evil.example/sync')).toBe(false);
    expect(isSyncDeepLinkUrl('https://sub.getchinotto.app/sync')).toBe(false);
  });

  it('accepts chinotto custom scheme variants', () => {
    expect(isSyncDeepLinkUrl('chinotto://sync')).toBe(true);
    expect(isSyncDeepLinkUrl('chinotto:///sync')).toBe(true);
    expect(isSyncDeepLinkUrl('chinotto:///sync?a=b')).toBe(true);
    expect(isSyncDeepLinkUrl('CHINOTTO://sync')).toBe(true);
  });

  it('rejects empty and unrelated', () => {
    expect(isSyncDeepLinkUrl(null)).toBe(false);
    expect(isSyncDeepLinkUrl('')).toBe(false);
    expect(isSyncDeepLinkUrl('chinotto://capture')).toBe(false);
  });
});

describe('parseDesktopSyncSessionIdFromUrl', () => {
  it('parses ds from HTTPS sync URL', () => {
    expect(
      parseDesktopSyncSessionIdFromUrl(`https://${CHINOTTO_SYNC_UNIVERSAL_HOST}/sync?ds=${SAMPLE_DS}`)
    ).toBe(SAMPLE_DS);
  });

  it('parses ds from chinotto scheme', () => {
    expect(parseDesktopSyncSessionIdFromUrl(`chinotto:///sync?ds=${SAMPLE_DS}`)).toBe(SAMPLE_DS);
  });

  it('rejects non-v4 or missing ds', () => {
    expect(parseDesktopSyncSessionIdFromUrl(`https://${CHINOTTO_SYNC_UNIVERSAL_HOST}/sync`)).toBeNull();
    expect(
      parseDesktopSyncSessionIdFromUrl(
        `https://${CHINOTTO_SYNC_UNIVERSAL_HOST}/sync?ds=not-a-uuid`
      )
    ).toBeNull();
  });
});

describe('isValidDesktopSyncSessionId', () => {
  it('accepts v4 uuid only', () => {
    expect(isValidDesktopSyncSessionId(SAMPLE_DS)).toBe(true);
    expect(isValidDesktopSyncSessionId('6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toBe(false);
  });
});
