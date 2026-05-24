import { render } from '@testing-library/react-native';
import { Animated } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { EchoPageShell } from '../EchoPageShell';

const safeMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

describe('EchoPageShell', () => {
  it('renders echo layer without page-local ambience', () => {
    const { getByTestId, queryByTestId } = render(
      <SafeAreaProvider initialMetrics={safeMetrics}>
        <EchoPageShell candidates={[]} />
      </SafeAreaProvider>,
    );

    expect(getByTestId('echo-page-shell')).toBeTruthy();
    expect(getByTestId('echo-layer')).toBeTruthy();
    expect(queryByTestId('echo-ambience')).toBeNull();
  });
});
