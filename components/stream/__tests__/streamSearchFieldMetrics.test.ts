import { Platform } from 'react-native';

import {
  STREAM_SEARCH_SLOT_TOP,
  streamSearchDisplayBandStyle,
  streamSearchInputStyle,
} from '../streamSearchFieldMetrics';

describe('streamSearchFieldMetrics', () => {
  it('centers a 20px band in the 44px row', () => {
    expect(STREAM_SEARCH_SLOT_TOP).toBe(12);
    expect(streamSearchDisplayBandStyle().top).toBe(12);
    expect(streamSearchDisplayBandStyle().height).toBe(20);
  });

  it('uses transparent ghost input on iOS', () => {
    const original = Platform.OS;
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
    const input = streamSearchInputStyle();
    expect(input.color).toBe('transparent');
    expect(input.top).toBe(12);
    expect(input.height).toBe(20);
    Object.defineProperty(Platform, 'OS', { configurable: true, value: original });
  });
});
