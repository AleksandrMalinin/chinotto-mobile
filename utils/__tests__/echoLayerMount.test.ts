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
