import { ECHO_LAYER_MIN_CANDIDATES, ECHO_LAYER_MIN_ENTRY_COUNT } from '../echoLayerVisibility';
import { isEchoLayerMountedForCapture } from '../echoLayerMount';

describe('isEchoLayerMountedForCapture', () => {
  const base = {
    active: true,
    searchActive: false,
    readSheetOpen: false,
    totalEntryCount: ECHO_LAYER_MIN_ENTRY_COUNT,
    candidateCount: ECHO_LAYER_MIN_CANDIDATES,
  };

  it('blocks when search or sheet is open', () => {
    expect(isEchoLayerMountedForCapture({ ...base, searchActive: true })).toBe(false);
    expect(isEchoLayerMountedForCapture({ ...base, readSheetOpen: true })).toBe(false);
  });

  it('in __DEV__ mounts with one candidate regardless of entry count', () => {
    const g = global as typeof globalThis & { __DEV__?: boolean };
    const prevDev = g.__DEV__;
    const prevEnv = process.env.NODE_ENV;
    g.__DEV__ = true;
    process.env.NODE_ENV = 'development';
    try {
      expect(
        isEchoLayerMountedForCapture({
          ...base,
          totalEntryCount: 5,
          candidateCount: 1,
        }),
      ).toBe(true);
    } finally {
      g.__DEV__ = prevDev;
      process.env.NODE_ENV = prevEnv;
    }
  });

  it('requires production entry and candidate thresholds', () => {
    expect(
      isEchoLayerMountedForCapture({
        ...base,
        totalEntryCount: ECHO_LAYER_MIN_ENTRY_COUNT - 1,
        candidateCount: ECHO_LAYER_MIN_CANDIDATES,
      }),
    ).toBe(false);
    expect(
      isEchoLayerMountedForCapture({
        ...base,
        totalEntryCount: ECHO_LAYER_MIN_ENTRY_COUNT,
        candidateCount: ECHO_LAYER_MIN_CANDIDATES - 1,
      }),
    ).toBe(false);
    expect(isEchoLayerMountedForCapture(base)).toBe(true);
  });
});
