import { parseUpdateConfigJson } from '../parseUpdateConfigJson';

describe('parseUpdateConfigJson', () => {
  it('parses a minimal valid payload without Android store URL', () => {
    const c = parseUpdateConfigJson(
      JSON.stringify({
        enabled: false,
        minSupportedVersion: '1.0.0',
        latestVersion: '1.1.0',
        forceUpdate: false,
        iosStoreUrl: 'https://apps.apple.com/app/x',
      }),
    );
    expect(c).toMatchObject({
      enabled: false,
      minSupportedVersion: '1.0.0',
      latestVersion: '1.1.0',
      forceUpdate: false,
      iosStoreUrl: 'https://apps.apple.com/app/x',
    });
    expect(c.androidStoreUrl).toBeUndefined();
  });

  it('includes optional title and message', () => {
    const c = parseUpdateConfigJson(
      JSON.stringify({
        enabled: true,
        minSupportedVersion: '1.0.0',
        latestVersion: '2.0.0',
        forceUpdate: true,
        iosStoreUrl: '',
        title: '  Hi  ',
        message: 'Please',
      }),
    );
    expect(c.title).toBe('Hi');
    expect(c.message).toBe('Please');
  });

  it('rejects invalid JSON', () => {
    expect(() => parseUpdateConfigJson('not json')).toThrow('invalid JSON');
  });

  it('rejects missing boolean fields', () => {
    expect(() =>
      parseUpdateConfigJson(
        JSON.stringify({
          enabled: 'true',
          minSupportedVersion: '1.0.0',
          latestVersion: '1.0.0',
          forceUpdate: false,
          iosStoreUrl: '',
        }),
      ),
    ).toThrow('enabled must be boolean');
  });
});
