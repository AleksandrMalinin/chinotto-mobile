import { Alert } from 'react-native';

import { showDevMenu } from '../showDevMenu';

describe('showDevMenu', () => {
  it('shows a flat list of configured actions', () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    showDevMenu({
      onResetPaywallForPurchaseTesting: jest.fn(),
      onPreviewSyncEnabledSheet: jest.fn(),
      onResetAnalyticsPrompt: jest.fn(),
      onResetSyncCaptureQA: jest.fn(),
      onPreviewAppUpdateModal: jest.fn(),
      onPreviewEchoEdgePeek: jest.fn(),
      onResetEchoEdgePeek: jest.fn(),
    });

    const buttons = alertSpy.mock.calls[0][2] as { text: string }[];
    expect(buttons.some((b) => b.text === 'Reset paywall for testing')).toBe(true);
    expect(buttons.some((b) => b.text.includes('Sync enabled'))).toBe(true);
    expect(buttons.some((b) => b.text === 'Reset analytics prompt')).toBe(true);
    expect(buttons.some((b) => b.text === 'Reset sync & capture QA')).toBe(true);
    expect(buttons.some((b) => b.text === 'Preview app update (soft)')).toBe(true);
    expect(buttons.some((b) => b.text === 'Preview app update (forced)')).toBe(true);
    expect(buttons.some((b) => b.text === 'Preview Echo edge peek')).toBe(true);
    expect(buttons.some((b) => b.text === 'Reset Echo edge peek flag')).toBe(true);
    expect(buttons.some((b) => b.text.includes('Temporal scrubber'))).toBe(false);
    expect(buttons.some((b) => b.text.includes('Echo UI'))).toBe(false);

    alertSpy.mockRestore();
  });

  it('omits actions when callbacks are not provided', () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    showDevMenu({
      onResetPaywallForPurchaseTesting: jest.fn(),
    });

    const buttons = alertSpy.mock.calls[0][2] as { text: string }[];
    expect(buttons.some((b) => b.text.includes('Sync enabled'))).toBe(false);
    expect(buttons.some((b) => b.text.includes('Preview app update'))).toBe(false);

    alertSpy.mockRestore();
  });
});
