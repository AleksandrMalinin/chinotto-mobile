import { act, renderHook } from '@testing-library/react-native';
import { Animated } from 'react-native';
import { State } from 'react-native-gesture-handler';

import { sheetDragTranslationY, useSheetDragDismiss } from '../useSheetDragDismiss';

function panEnd(translationY: number, velocityY = 0) {
  return {
    nativeEvent: {
      oldState: State.ACTIVE,
      state: State.END,
      translationY,
      velocityY,
    },
  };
}

describe('useSheetDragDismiss', () => {
  beforeEach(() => {
    jest.spyOn(Animated, 'spring').mockImplementation(() => ({ start: jest.fn() }) as never);
    jest.spyOn(Animated, 'timing').mockImplementation(
      () =>
        ({
          start: (callback?: (result: { finished: boolean }) => void) => {
            callback?.({ finished: true });
          },
        }) as never,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('calls onDismiss via animateDismiss when swipe passes threshold', () => {
    const onDismiss = jest.fn();
    const { result } = renderHook(() =>
      useSheetDragDismiss({ travel: 400, onDismiss }),
    );

    act(() => {
      result.current.onHandlerStateChange(panEnd(48, 500) as never);
    });

    expect(Animated.timing).toHaveBeenCalled();
  });

  it('springs back on small drag', () => {
    const onDismiss = jest.fn();
    const { result } = renderHook(() =>
      useSheetDragDismiss({ travel: 400, onDismiss }),
    );

    act(() => {
      result.current.onHandlerStateChange(panEnd(8, 0) as never);
    });

    expect(Animated.spring).toHaveBeenCalled();
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('clamps upward translation to zero drag offset', () => {
    expect(sheetDragTranslationY(-140)).toBe(0);
    expect(sheetDragTranslationY(48)).toBe(48);
  });
});
