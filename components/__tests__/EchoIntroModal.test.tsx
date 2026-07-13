import { fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { EchoIntroModal } from '../echo/EchoIntroModal';

const safeAreaMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

describe('EchoIntroModal', () => {
  it('renders Echo copy and dismisses on Got it', () => {
    const onDismiss = jest.fn();
    const { getByTestId } = render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <EchoIntroModal visible onDismiss={onDismiss} />
      </SafeAreaProvider>,
    );

    expect(getByTestId('echo-intro-title')).toBeTruthy();
    fireEvent.press(getByTestId('echo-intro-dismiss'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
