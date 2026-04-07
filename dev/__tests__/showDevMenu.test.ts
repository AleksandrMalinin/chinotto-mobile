import { Alert } from 'react-native';

import { showDevMenu } from '../showDevMenu';

describe('showDevMenu', () => {
  it('includes Preview “Sync enabled” sheet when onPreviewSyncEnabledSheet is set', () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const onPreview = jest.fn();

    showDevMenu({
      onPreviewSyncEnabledSheet: onPreview,
    });

    expect(alertSpy).toHaveBeenCalledWith('Dev menu', undefined, expect.any(Array));
    const buttons = alertSpy.mock.calls[0][2] as { text: string }[];
    expect(buttons.some((b) => b.text.includes('Sync enabled'))).toBe(true);

    alertSpy.mockRestore();
  });

  it('includes Clear local sync paywall flags when onClearLocalSyncPaywallFlags is set', () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    showDevMenu({
      onClearLocalSyncPaywallFlags: jest.fn(),
    });

    const buttons = alertSpy.mock.calls[0][2] as { text: string }[];
    expect(buttons.some((b) => b.text.includes('Clear local sync paywall'))).toBe(true);

    alertSpy.mockRestore();
  });

  it('includes RevenueCat log out when onRevenueCatLogOut is set', () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    showDevMenu({
      onRevenueCatLogOut: jest.fn(),
    });

    const buttons = alertSpy.mock.calls[0][2] as { text: string }[];
    expect(buttons.some((b) => b.text.includes('RevenueCat: refresh'))).toBe(true);

    alertSpy.mockRestore();
  });

  it('includes Reset paywall for purchase testing when onResetPaywallForPurchaseTesting is set', () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    showDevMenu({
      onResetPaywallForPurchaseTesting: jest.fn(),
    });

    const buttons = alertSpy.mock.calls[0][2] as { text: string }[];
    expect(buttons.some((b) => b.text.includes('Reset paywall for purchase testing'))).toBe(true);

    alertSpy.mockRestore();
  });

  it('omits preview action when callback not provided', () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    showDevMenu({
      onClearLocalSyncPaywallFlags: jest.fn(),
    });

    const buttons = alertSpy.mock.calls[0][2] as { text: string }[];
    expect(buttons.some((b) => b.text.includes('Sync enabled'))).toBe(false);

    alertSpy.mockRestore();
  });
});
