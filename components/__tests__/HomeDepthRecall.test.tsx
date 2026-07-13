import { fireEvent, render } from '@testing-library/react-native';
import { Animated } from 'react-native';

import { HomeDepthRecall } from '../HomeDepthRecall';

const candidate = {
  id: 'echo-1',
  text: 'API refactor needs error handling',
  createdAt: '2026-05-01T10:00:00.000Z',
  kind: 'temporal' as const,
  reason: 'From last week',
};

jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    PanGestureHandler: ({ children }: { children: React.ReactNode }) =>
      React.createElement(View, { testID: 'echo-pan-handler' }, children),
    State: { ACTIVE: 4, END: 5, CANCELLED: 3, FAILED: 2 },
  };
});

describe('HomeDepthRecall', () => {
  beforeEach(() => {
    jest.spyOn(Animated, 'timing').mockImplementation(() => ({
      start: (callback?: (result: { finished: boolean }) => void) => {
        callback?.({ finished: true });
        return { stop: jest.fn() } as never;
      },
      stop: jest.fn(),
      reset: jest.fn(),
    }));
    jest.spyOn(Animated, 'parallel').mockImplementation((animations) => ({
      start: (callback?: (result: { finished: boolean }) => void) => {
        animations.forEach((animation) => animation.start?.());
        callback?.({ finished: true });
        return { stop: jest.fn() } as never;
      },
      stop: jest.fn(),
      reset: jest.fn(),
    }));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('calls onDismiss with the candidate when dismiss is pressed', () => {
    const onDismiss = jest.fn();
    const { getByTestId } = render(
      <HomeDepthRecall candidate={candidate} onDismiss={onDismiss} />,
    );

    fireEvent.press(getByTestId('echo-recall-dismiss'));

    expect(onDismiss).toHaveBeenCalledWith(candidate);
  });

  it('wraps echo in a pan handler when dismissible', () => {
    const { getByTestId } = render(
      <HomeDepthRecall candidate={candidate} onDismiss={jest.fn()} />,
    );

    expect(getByTestId('echo-pan-handler')).toBeTruthy();
  });
});
