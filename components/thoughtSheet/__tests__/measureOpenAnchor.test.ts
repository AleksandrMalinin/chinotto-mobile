import type { View } from 'react-native';

import { measureThoughtSheetOpenAnchor } from '../measureOpenAnchor';

describe('measureThoughtSheetOpenAnchor', () => {
  it('calls back without anchor when view is null', () => {
    const callback = jest.fn();
    measureThoughtSheetOpenAnchor(null, callback);
    expect(callback).toHaveBeenCalledWith(undefined);
  });

  it('passes window coordinates from measureInWindow', () => {
    const callback = jest.fn();
    const view = {
      measureInWindow: (cb: (x: number, y: number, w: number, h: number) => void) => {
        cb(0, 480, 390, 64);
      },
    } as unknown as View;

    measureThoughtSheetOpenAnchor(view, callback);
    expect(callback).toHaveBeenCalledWith({ pageY: 480, height: 64 });
  });

  it('falls back without anchor when measure never calls back', () => {
    jest.useFakeTimers();
    const callback = jest.fn();
    const view = {
      measureInWindow: jest.fn(),
    } as unknown as View;

    measureThoughtSheetOpenAnchor(view, callback);
    expect(callback).not.toHaveBeenCalled();

    jest.runOnlyPendingTimers();
    expect(callback).toHaveBeenCalledWith(undefined);

    jest.useRealTimers();
  });
});
