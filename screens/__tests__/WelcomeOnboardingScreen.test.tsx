import { render, screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { AdaptiveChromeContextValue } from '../../theme';

jest.mock('../../components/AmbientBackground', () => ({
  AmbientBackground: () => null,
}));

jest.mock('../../components/StreamFlowPanel', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    StreamFlowPanel: () =>
      React.createElement(View, { testID: 'stream-flow-panel-mock' }),
  };
});

import { AdaptiveChromeContext } from '../../theme';
import { WelcomeOnboardingScreen } from '../WelcomeOnboardingScreen';

function renderWelcome(chrome?: AdaptiveChromeContextValue) {
  const inner = (
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 47, left: 0, right: 0, bottom: 34 },
      }}
    >
      <WelcomeOnboardingScreen onComplete={jest.fn()} />
    </SafeAreaProvider>
  );
  if (chrome == null) {
    return render(inner);
  }
  return render(<AdaptiveChromeContext.Provider value={chrome}>{inner}</AdaptiveChromeContext.Provider>);
}

describe('WelcomeOnboardingScreen', () => {
  beforeEach(() => {
    jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockImplementation(() => Promise.resolve(true));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders copy, primary action, and staged entrance regions', async () => {
    renderWelcome();
    expect(await screen.findByLabelText('Write it down. No structure.')).toBeTruthy();
    expect(screen.getByLabelText('Capture')).toBeTruthy();
    expect(screen.getByTestId('welcome-entrance-brand')).toBeTruthy();
    expect(screen.getByText('Chinotto')).toBeTruthy();
    expect(screen.getByTestId('welcome-entrance-visual')).toBeTruthy();
    expect(screen.getByTestId('welcome-entrance-title')).toBeTruthy();
    expect(screen.getByTestId('welcome-entrance-support')).toBeTruthy();
    expect(screen.getByTestId('welcome-entrance-cta')).toBeTruthy();
  });

  it('does not depend on adaptive sunlight chrome (headline stays wired to standard dark)', async () => {
    renderWelcome({
      blendProgress: 1,
      displayChrome: 'sunlight',
      setDisplayChrome: jest.fn(),
    });
    expect(await screen.findByLabelText('Write it down. No structure.')).toBeTruthy();
  });
});
