import { act, renderHook } from '@testing-library/react-native';
import { Animated } from 'react-native';

import { useSheetEnterAnimation } from '../useSheetEnterAnimation';

describe('useSheetEnterAnimation', () => {
  it('starts at zero opacity when not visible', () => {
    const { result } = renderHook(() => useSheetEnterAnimation(false, 'e1'));
    expect(result.current.scrimOpacity.__getValue()).toBe(0);
    expect(result.current.contentOpacity.__getValue()).toBe(0);
  });

  it('springs toward visible when sheet opens', () => {
    const springSpy = jest.spyOn(Animated, 'spring').mockImplementation((value, config) => ({
      start: (callback) => {
        act(() => {
          value.setValue(config.toValue as number);
        });
        callback?.({ finished: true });
        return { stop: jest.fn() };
      },
      stop: jest.fn(),
      reset: jest.fn(),
    }));

    const { result } = renderHook(() => useSheetEnterAnimation(true, 'e1'));

    expect(springSpy).toHaveBeenCalled();
    expect(result.current.scrimOpacity.__getValue()).toBe(1);
    expect(result.current.contentTranslateY.__getValue()).toBe(0);

    springSpy.mockRestore();
  });
});
