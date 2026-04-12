const mockSetDefaults = jest.fn().mockResolvedValue(undefined);
const mockSetConfigSettings = jest.fn().mockResolvedValue(undefined);
const mockFetchAndActivate = jest.fn().mockResolvedValue(true);
const mockAsString = jest.fn();

jest.mock('@react-native-firebase/remote-config', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    setDefaults: mockSetDefaults,
    setConfigSettings: mockSetConfigSettings,
    fetchAndActivate: mockFetchAndActivate,
    getValue: jest.fn(() => ({
      asString: mockAsString,
    })),
  })),
}));

import { fetchUpdateConfigFromRemoteConfig } from '../fetchUpdateConfigFromRemoteConfig';

describe('fetchUpdateConfigFromRemoteConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAsString.mockReturnValue(
      JSON.stringify({
        enabled: true,
        minSupportedVersion: '1.0.0',
        latestVersion: '9.9.9',
        forceUpdate: false,
        iosStoreUrl: 'https://example.com/ios',
      }),
    );
  });

  it('sets defaults, fetch/activate, and parses JSON from Remote Config', async () => {
    const c = await fetchUpdateConfigFromRemoteConfig();

    expect(mockSetDefaults).toHaveBeenCalled();
    expect(mockSetConfigSettings).toHaveBeenCalledWith(
      expect.objectContaining({ minimumFetchIntervalMillis: expect.any(Number) }),
    );
    expect(mockFetchAndActivate).toHaveBeenCalled();
    expect(c.enabled).toBe(true);
    expect(c.latestVersion).toBe('9.9.9');
    expect(c.iosStoreUrl).toBe('https://example.com/ios');
  });

  it('throws when remote value is not valid JSON for policy', async () => {
    mockAsString.mockReturnValue('{');
    await expect(fetchUpdateConfigFromRemoteConfig()).rejects.toThrow();
  });
});
