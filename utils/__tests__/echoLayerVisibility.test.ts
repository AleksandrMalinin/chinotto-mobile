import {
  ECHO_LAYER_MIN_CANDIDATES,
  ECHO_LAYER_MIN_ENTRY_COUNT,
  isEchoLayerActive,
  isEchoLayerEligible,
  isEchoPagerInteractive,
} from '../echoLayerVisibility';

describe('echoLayerVisibility', () => {
  it('isEchoLayerActive respects global or dev', () => {
    expect(isEchoLayerActive(false, false)).toBe(false);
    expect(isEchoLayerActive(true, false)).toBe(true);
    expect(isEchoLayerActive(false, true)).toBe(true);
  });

  it('isEchoLayerEligible gates search, sheet, count, and candidates', () => {
    expect(
      isEchoLayerEligible({
        active: true,
        searchActive: true,
        readSheetOpen: false,
        totalEntryCount: 100,
        candidateCount: 5,
      }),
    ).toBe(false);

    expect(
      isEchoLayerEligible({
        active: true,
        searchActive: false,
        readSheetOpen: true,
        totalEntryCount: 100,
        candidateCount: 5,
      }),
    ).toBe(false);

    expect(
      isEchoLayerEligible({
        active: true,
        searchActive: false,
        readSheetOpen: false,
        totalEntryCount: ECHO_LAYER_MIN_ENTRY_COUNT - 1,
        candidateCount: ECHO_LAYER_MIN_CANDIDATES,
      }),
    ).toBe(false);

    expect(
      isEchoLayerEligible({
        active: true,
        searchActive: false,
        readSheetOpen: false,
        totalEntryCount: ECHO_LAYER_MIN_ENTRY_COUNT,
        candidateCount: ECHO_LAYER_MIN_CANDIDATES - 1,
      }),
    ).toBe(false);

    expect(
      isEchoLayerEligible({
        active: true,
        searchActive: false,
        readSheetOpen: false,
        totalEntryCount: ECHO_LAYER_MIN_ENTRY_COUNT,
        candidateCount: ECHO_LAYER_MIN_CANDIDATES,
      }),
    ).toBe(true);
  });

  it('isEchoLayerEligible dev bypass allows one candidate and low entry count', () => {
    expect(
      isEchoLayerEligible({
        active: true,
        searchActive: false,
        readSheetOpen: false,
        totalEntryCount: 1,
        candidateCount: 1,
        bypassMinEntryCount: true,
        bypassMinCandidates: true,
      }),
    ).toBe(true);
  });

  it('isEchoPagerInteractive mirrors blocking chrome', () => {
    expect(
      isEchoPagerInteractive({
        eligible: true,
        searchActive: false,
        readSheetOpen: false,
        onEchoPage: false,
      }),
    ).toBe(true);

    expect(
      isEchoPagerInteractive({
        eligible: true,
        searchActive: true,
        readSheetOpen: false,
        onEchoPage: false,
      }),
    ).toBe(false);
  });
});
