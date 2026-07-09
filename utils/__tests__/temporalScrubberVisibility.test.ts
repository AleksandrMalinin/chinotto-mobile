import {
  isTemporalScrubberEligible,
  isTemporalScrubberVisible,
  shouldPeekTemporalScrubber,
} from '../temporalScrubberVisibility';
import {
  TEMPORAL_NAV_MIN_ENTRY_COUNT,
  TEMPORAL_NAV_MIN_SCROLL_Y,
  TEMPORAL_NAV_SCROLL_VELOCITY_PEEK,
} from '../../constants/temporalNavigation';

describe('temporalScrubberVisibility', () => {
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
        active: false,
        searchActive: false,
        totalEntryCount: TEMPORAL_NAV_MIN_ENTRY_COUNT,
        hasStreamRows: true,
      }),
    ).toBe(false);
  });

  it('bypassMinEntryCount surfaces the scrubber below the entry threshold (dev QA)', () => {
    expect(
      isTemporalScrubberEligible({
        active: true,
        searchActive: false,
        totalEntryCount: 1,
        hasStreamRows: true,
        bypassMinEntryCount: true,
      }),
    ).toBe(true);
    expect(
      isTemporalScrubberEligible({
        active: true,
        searchActive: true,
        totalEntryCount: 1,
        hasStreamRows: true,
        bypassMinEntryCount: true,
      }),
    ).toBe(false);
    expect(
      isTemporalScrubberEligible({
        active: true,
        searchActive: false,
        totalEntryCount: 1,
        hasStreamRows: false,
        bypassMinEntryCount: true,
      }),
    ).toBe(false);
  });

  it('shouldPeekTemporalScrubber hides at capture and when returning to top', () => {
    expect(shouldPeekTemporalScrubber(0, 0)).toBe(false);
    expect(shouldPeekTemporalScrubber(0, TEMPORAL_NAV_SCROLL_VELOCITY_PEEK)).toBe(false);
    expect(shouldPeekTemporalScrubber(24, -TEMPORAL_NAV_SCROLL_VELOCITY_PEEK)).toBe(false);
    expect(shouldPeekTemporalScrubber(TEMPORAL_NAV_MIN_SCROLL_Y, 0)).toBe(true);
    expect(shouldPeekTemporalScrubber(48, TEMPORAL_NAV_SCROLL_VELOCITY_PEEK)).toBe(true);
  });

  it('isTemporalScrubberVisible hides at capture even when peek would pass', () => {
    expect(
      isTemporalScrubberVisible({
        eligible: true,
        atCapture: true,
        streamScrollY: TEMPORAL_NAV_MIN_SCROLL_Y,
        scrollVelocityY: 0,
      }),
    ).toBe(false);
    expect(
      isTemporalScrubberVisible({
        eligible: true,
        atCapture: false,
        streamScrollY: TEMPORAL_NAV_MIN_SCROLL_Y,
        scrollVelocityY: 0,
      }),
    ).toBe(true);
    expect(
      isTemporalScrubberVisible({
        eligible: false,
        atCapture: false,
        streamScrollY: TEMPORAL_NAV_MIN_SCROLL_Y,
        scrollVelocityY: 0,
      }),
    ).toBe(false);
    expect(
      isTemporalScrubberVisible({
        eligible: true,
        atCapture: false,
        streamScrollY: 0,
        scrollVelocityY: 0,
      }),
    ).toBe(false);
  });
});
