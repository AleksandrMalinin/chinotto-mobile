import { fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { InterfaceGuideModal } from '../InterfaceGuideModal';
import { GUIDE_SLIDES } from '../interfaceGuide/guideSlides';

jest.mock('../temporal/TemporalMonthRack', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    TemporalMonthRack: () => React.createElement(View, { testID: 'mock-temporal-month-rack' }),
  };
});

const safeAreaMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

describe('InterfaceGuideModal', () => {
  it('renders the first slide and advances with Next', () => {
    const onDismiss = jest.fn();
    const { getByTestId } = render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <InterfaceGuideModal visible onDismiss={onDismiss} />
      </SafeAreaProvider>,
    );

    expect(getByTestId('interface-guide-modal')).toBeTruthy();
    expect(getByTestId('interface-guide-slide-capture')).toBeTruthy();
    expect(getByTestId('guide-visual-capture')).toBeTruthy();
    expect(getByTestId('interface-guide-title')).toBeTruthy();
  });

  it('shows Enable sync in guide previews instead of Sync on', () => {
    const { getAllByText, queryByText } = render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <InterfaceGuideModal visible onDismiss={jest.fn()} />
      </SafeAreaProvider>,
    );

    expect(getAllByText('Enable sync').length).toBeGreaterThan(0);
    expect(queryByText('Sync on')).toBeNull();
  });

  it('advances from capture to sync to search', () => {
    const onDismiss = jest.fn();
    const { getByTestId } = render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <InterfaceGuideModal visible onDismiss={onDismiss} />
      </SafeAreaProvider>,
    );

    expect(getByTestId('interface-guide-slide-capture')).toBeTruthy();

    fireEvent.press(getByTestId('interface-guide-next'));
    expect(getByTestId('interface-guide-slide-sync')).toBeTruthy();
    expect(getByTestId('guide-visual-sync')).toBeTruthy();

    fireEvent.press(getByTestId('interface-guide-next'));
    expect(getByTestId('interface-guide-slide-search')).toBeTruthy();
    expect(getByTestId('guide-visual-search')).toBeTruthy();
  });

  it('dismisses on Got it from the last slide', () => {
    const onDismiss = jest.fn();
    const { getByTestId } = render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <InterfaceGuideModal visible onDismiss={onDismiss} />
      </SafeAreaProvider>,
    );

    for (let i = 0; i < GUIDE_SLIDES.length - 1; i += 1) {
      fireEvent.press(getByTestId('interface-guide-next'));
    }

    fireEvent.press(getByTestId('interface-guide-dismiss'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('does not render content when hidden', () => {
    const { queryByTestId } = render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <InterfaceGuideModal visible={false} onDismiss={jest.fn()} />
      </SafeAreaProvider>,
    );

    expect(queryByTestId('interface-guide-modal')).toBeNull();
  });
});
