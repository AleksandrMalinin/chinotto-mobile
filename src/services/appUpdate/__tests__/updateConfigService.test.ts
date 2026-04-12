import { fetchUpdateConfig, fetchUpdateConfigFromMock } from '../updateConfigService';

describe('fetchUpdateConfig', () => {
  it('returns mock policy by default', async () => {
    const c = await fetchUpdateConfig();
    expect(c).toMatchObject({ enabled: false });
  });

  it('accepts injected fetcher', async () => {
    const c = await fetchUpdateConfig(async () => ({
      enabled: true,
      minSupportedVersion: '1.0.0',
      latestVersion: '1.0.0',
      forceUpdate: false,
    }));
    expect(c.enabled).toBe(true);
  });

  it('exposes mock loader', async () => {
    const c = await fetchUpdateConfigFromMock();
    expect(c.minSupportedVersion).toBeDefined();
  });
});
