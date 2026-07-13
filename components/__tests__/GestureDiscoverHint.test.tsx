import { fireEvent, render } from '@testing-library/react-native';
import { Animated } from 'react-native';

import {
  GestureDiscoverHint,
  shouldDismissGestureHintSwipe,
} from '../GestureDiscoverHint';

describe('shouldDismissGestureHintSwipe', () => {
  it('dismisses on sideways drag past threshold', () => {
    expect(shouldDismissGestureHintSwipe(50, 0)).toBe(true);
    expect(shouldDismissGestureHintSwipe(-50, 0)).toBe(true);
    expect(shouldDismissGestureHintSwipe(20, 0)).toBe(false);
  });

  it('dismisses on sideways flick velocity', () => {
    expect(shouldDismissGestureHintSwipe(0, 0.5)).toBe(true);
    expect(shouldDismissGestureHintSwipe(0, -0.5)).toBe(true);
  });
});

describe('GestureDiscoverHint', () => {
  beforeEach(() => {
    jest.spyOn(Animated, 'parallel').mockImplementation(
      () =>
        ({
          start: (callback?: (result: { finished: boolean }) => void) => {
            callback?.({ finished: true });
          },
        }) as never,
    );
    jest.spyOn(Animated, 'timing').mockImplementation(
      () =>
        ({
          start: (callback?: (result: { finished: boolean }) => void) => {
            callback?.({ finished: true });
          },
          stop: jest.fn(),
        }) as never,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders pill with message when visible', () => {
    const { getByTestId, getByText } = render(
      <GestureDiscoverHint
        testID="temporal-map-gesture-hint"
        message="Hold a date label for the timeline map"
        visible
        onDismiss={jest.fn()}
      />,
    );

    expect(getByTestId('temporal-map-gesture-hint')).toBeTruthy();
    expect(getByText('Hold a date label for the timeline map')).toBeTruthy();
  });

  it('does not render when hidden', () => {
    const { queryByTestId } = render(
      <GestureDiscoverHint
        testID="temporal-map-gesture-hint"
        message="Hold a date label for the timeline map"
        visible={false}
        onDismiss={jest.fn()}
      />,
    );
    expect(queryByTestId('temporal-map-gesture-hint')).toBeNull();
  });

  it('calls onDismiss when dismiss is pressed', () => {
    const onDismiss = jest.fn();
    const { getByLabelText } = render(
      <GestureDiscoverHint
        testID="temporal-map-gesture-hint"
        message="Hold a date label for the timeline map"
        visible
        onDismiss={onDismiss}
      />,
    );

    fireEvent.press(getByLabelText('Dismiss hint'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
