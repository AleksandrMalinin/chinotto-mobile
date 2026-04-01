import { CHINOTTO_SYNC_UNIVERSAL_HOST, isSyncDeepLinkUrl } from '../syncDeepLink';

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
