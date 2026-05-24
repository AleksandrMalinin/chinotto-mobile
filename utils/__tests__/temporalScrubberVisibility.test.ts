import {
  isTemporalNavigationActive,
  isTemporalScrubberEligible,
  shouldPeekTemporalScrubber,
} from '../temporalScrubberVisibility';
import {
  TEMPORAL_NAV_MIN_ENTRY_COUNT,
  TEMPORAL_NAV_MIN_SCROLL_Y,
  TEMPORAL_NAV_SCROLL_VELOCITY_PEEK,
} from '../../constants/temporalNavigation';

describe('temporalScrubberVisibility', () => {
  it('isTemporalNavigationActive respects global or dev', () => {
    expect(isTemporalNavigationActive(false, false)).toBe(false);
    expect(isTemporalNavigationActive(true, false)).toBe(true);
    expect(isTemporalNavigationActive(false, true)).toBe(true);
  });

  it('isTemporalScrubberEligible gates search, read sheet, and entry count', () => {
    expect(
      isTemporalScrubberEligible({
        active: true,
        searchActive: true,
        totalEntryCount: 100,
        hasStreamRows: true,
      }),
    ).toBe(false);
    expect(
      isTemporalScrubberEligible({
        active: true,
        searchActive: false,
        readSheetOpen: true,
        totalEntryCount: 100,
        hasStreamRows: true,
      }),
    ).toBe(false);
    expect(
      isTemporalScrubberEligible({
        active: true,
        searchActive: false,
        totalEntryCount: TEMPORAL_NAV_MIN_ENTRY_COUNT - 1,
        hasStreamRows: true,
      }),
    ).toBe(false);
    expect(
      isTemporalScrubberEligible({
        active: true,
        searchActive: false,
        totalEntryCount: TEMPORAL_NAV_MIN_ENTRY_COUNT,
        hasStreamRows: true,
      }),
    ).toBe(true);
    expect(
      isTemporalScrubberEligible({
        active: true,
        searchActive: false,
        totalEntryCount: 1,
        hasStreamRows: true,
        bypassMinEntryCount: true,
      }),
    ).toBe(true);
  });

  it('shouldPeekTemporalScrubber hides at capture and when returning to top', () => {
    expect(shouldPeekTemporalScrubber(0, 0)).toBe(false);
    expect(shouldPeekTemporalScrubber(0, TEMPORAL_NAV_SCROLL_VELOCITY_PEEK)).toBe(false);
    expect(shouldPeekTemporalScrubber(24, -TEMPORAL_NAV_SCROLL_VELOCITY_PEEK)).toBe(false);
    expect(shouldPeekTemporalScrubber(TEMPORAL_NAV_MIN_SCROLL_Y, 0)).toBe(true);
    expect(shouldPeekTemporalScrubber(48, TEMPORAL_NAV_SCROLL_VELOCITY_PEEK)).toBe(true);
  });
});
