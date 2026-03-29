import { render, screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

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

import { WelcomeOnboardingScreen } from '../WelcomeOnboardingScreen';

function renderWelcome() {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 47, left: 0, right: 0, bottom: 34 },
      }}
    >
      <WelcomeOnboardingScreen onComplete={jest.fn()} />
    </SafeAreaProvider>
  );
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
    expect(await screen.findByText('Write it down. No structure.')).toBeTruthy();
    expect(screen.getByLabelText('Capture it')).toBeTruthy();
    expect(screen.getByTestId('welcome-entrance-visual')).toBeTruthy();
    expect(screen.getByTestId('welcome-entrance-title')).toBeTruthy();
    expect(screen.getByTestId('welcome-entrance-support')).toBeTruthy();
    expect(screen.getByTestId('welcome-entrance-cta')).toBeTruthy();
  });
});
