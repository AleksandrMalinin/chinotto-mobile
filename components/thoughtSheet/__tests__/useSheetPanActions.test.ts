import { act, renderHook } from '@testing-library/react-native';
import { State } from 'react-native-gesture-handler';

import { useSheetPanActions } from '../useSheetPanActions';

function panEnd(translationY: number, velocityY = 0) {
  return {
    nativeEvent: {
      state: State.END,
      translationY,
      velocityY,
    },
  };
}

describe('useSheetPanActions', () => {
  it('calls onExpand when swiping up in compact mode', () => {
    const onExpand = jest.fn();
    const scrollYRef = { current: 0 };
    const { result } = renderHook(() =>
      useSheetPanActions({
        mode: 'compact',
        scrollYRef,
        onExpand,
        onCollapse: jest.fn(),
        onDismiss: jest.fn(),
      })
    );

    act(() => {
      result.current.onHandlerStateChange(panEnd(-40, -500) as never);
    });

    expect(onExpand).toHaveBeenCalledTimes(1);
  });

  it('calls onDismiss when swiping down in compact mode', () => {
    const onDismiss = jest.fn();
    const scrollYRef = { current: 0 };
    const { result } = renderHook(() =>
      useSheetPanActions({
        mode: 'compact',
        scrollYRef,
        onExpand: jest.fn(),
        onCollapse: jest.fn(),
        onDismiss,
      })
    );

    act(() => {
      result.current.onHandlerStateChange(panEnd(48, 500) as never);
    });

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('calls onCollapse when swiping down in expanded mode', () => {
    const onCollapse = jest.fn();
    const scrollYRef = { current: 0 };
    const { result } = renderHook(() =>
      useSheetPanActions({
        mode: 'expanded',
        scrollYRef,
        onExpand: jest.fn(),
        onCollapse,
        onDismiss: jest.fn(),
      })
    );

    act(() => {
      result.current.onHandlerStateChange(panEnd(48, 400) as never);
    });

    expect(onCollapse).toHaveBeenCalledTimes(1);
  });
});
