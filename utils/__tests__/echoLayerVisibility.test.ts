import {
  ECHO_LAYER_MIN_CANDIDATES,
  ECHO_LAYER_MIN_ENTRY_COUNT,
  isEchoLayerEligible,
  isEchoPagerInteractive,
} from '../echoLayerVisibility';

describe('echoLayerVisibility', () => {
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
