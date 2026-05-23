import { Keyboard, Platform } from 'react-native';

import { openAfterKeyboardHidden } from '../openAfterKeyboardHidden';

describe('openAfterKeyboardHidden', () => {
  const originalOs = Platform.OS;

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: originalOs });
    jest.restoreAllMocks();
  });

  it('opens immediately on non-iOS platforms', () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
    const onOpen = jest.fn();

    openAfterKeyboardHidden(onOpen);

    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('opens on the next frame when no keyboard is visible on iOS', () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
    jest.spyOn(Keyboard, 'metrics').mockReturnValue({ height: 0, screenX: 0, screenY: 0, width: 390 });
    const rafSpy = jest.spyOn(global, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(0);
      return 0;
    });
    const onOpen = jest.fn();

    openAfterKeyboardHidden(onOpen);

    expect(onOpen).toHaveBeenCalledTimes(1);
    rafSpy.mockRestore();
  });

  it('waits for keyboardWillHide when the keyboard is visible on iOS', () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
    jest.spyOn(Keyboard, 'metrics').mockReturnValue({ height: 336, screenX: 0, screenY: 508, width: 390 });
    const listeners: Record<string, () => void> = {};
    jest.spyOn(Keyboard, 'addListener').mockImplementation(((
      event: string,
      cb: () => void
    ) => {
      listeners[event] = cb;
      return { remove: jest.fn() };
    }) as unknown as typeof Keyboard.addListener);
    const onOpen = jest.fn();

    openAfterKeyboardHidden(onOpen);
    expect(onOpen).not.toHaveBeenCalled();

    listeners.keyboardWillHide?.();
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});
