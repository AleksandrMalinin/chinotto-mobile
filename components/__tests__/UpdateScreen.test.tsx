import type { ReactElement } from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AdaptiveChromeContext } from '../../theme';
import { UpdateScreenContent } from '../UpdateScreen';

jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ width: 390, height: 844, scale: 2, fontScale: 1 }),
}));

jest.mock('../StreamFlowPanel', () => ({
  StreamFlowPanel: () => null,
}));

jest.mock('../AmbientBackground', () => ({
  AmbientBackground: () => null,
}));

const safeAreaMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

function wrap(node: ReactElement) {
  return (
    <SafeAreaProvider initialMetrics={safeAreaMetrics}>
      <AdaptiveChromeContext.Provider
        value={{ blendProgress: 0, displayChrome: 'auto', setDisplayChrome: jest.fn() }}
      >
        {node}
      </AdaptiveChromeContext.Provider>
    </SafeAreaProvider>
  );
}

describe('UpdateScreenContent', () => {
  it('renders forced mode without Later', () => {
    const { getByText, queryByText, getByLabelText } = render(
      wrap(
        <UpdateScreenContent
          mode="forced"
          title="Update required"
          message="Please update."
          storeUrl="https://apps.apple.com/app/test"
          onUpdatePress={jest.fn()}
        />,
      ),
    );
    expect(getByText('Update required')).toBeTruthy();
    expect(getByText('Chinotto')).toBeTruthy();
    expect(queryByText('Later')).toBeNull();
    expect(getByLabelText('Update')).toBeTruthy();
  });

  it('renders soft mode with Later', () => {
    const onLater = jest.fn();
    const { getByLabelText } = render(
      wrap(
        <UpdateScreenContent
          mode="soft"
          title="New version"
          message="Stay current."
          storeUrl="https://apps.apple.com/app/test"
          onUpdatePress={jest.fn()}
          onLaterPress={onLater}
        />,
      ),
    );
    fireEvent.press(getByLabelText('Later'));
    expect(onLater).toHaveBeenCalledTimes(1);
  });
});
