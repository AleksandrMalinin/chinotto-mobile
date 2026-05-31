import {
  TEMPORAL_MONTH_RACK_MAX_VISIBLE_ROWS,
  TEMPORAL_MONTH_RACK_ROW_HEIGHT,
  TEMPORAL_MONTH_RACK_YEAR_HEIGHT,
} from '../../constants/temporalNavigation';
import {
  findMonthIndex,
  monthRackBorderRadius,
  monthRackEdgeAttachRadii,
  monthRackEdgeShellStyle,
  monthRackExpandedHeight,
  monthRackIndexFromScrollOffset,
  monthRackLabelColor,
  monthRackNeedsScrollFade,
  monthRackPlaqueOutline,
  monthRackRowVisual,
  monthRackScrollOffsetForIndex,
  monthRackScrollViewportHeight,
  monthRackShellCornerRadius,
  monthRackVisibleRowSlots,
} from '../monthRack';

describe('monthRack', () => {
  it('monthRackVisibleRowSlots caps at max visible rows', () => {
    expect(monthRackVisibleRowSlots(0)).toBe(0);
    expect(monthRackVisibleRowSlots(2)).toBe(2);
    expect(monthRackVisibleRowSlots(TEMPORAL_MONTH_RACK_MAX_VISIBLE_ROWS)).toBe(
      TEMPORAL_MONTH_RACK_MAX_VISIBLE_ROWS,
    );
    expect(monthRackVisibleRowSlots(12)).toBe(TEMPORAL_MONTH_RACK_MAX_VISIBLE_ROWS);
  });

  it('monthRackScrollViewportHeight follows visible row slots', () => {
    expect(monthRackScrollViewportHeight(2)).toBe(2 * TEMPORAL_MONTH_RACK_ROW_HEIGHT);
    expect(monthRackScrollViewportHeight(12)).toBe(
      TEMPORAL_MONTH_RACK_MAX_VISIBLE_ROWS * TEMPORAL_MONTH_RACK_ROW_HEIGHT,
    );
  });

  it('monthRackNeedsScrollFade only when history overflows viewport', () => {
    expect(monthRackNeedsScrollFade(3)).toBe(false);
    expect(monthRackNeedsScrollFade(TEMPORAL_MONTH_RACK_MAX_VISIBLE_ROWS)).toBe(false);
    expect(monthRackNeedsScrollFade(TEMPORAL_MONTH_RACK_MAX_VISIBLE_ROWS + 1)).toBe(true);
  });

  it('monthRackShellCornerRadius never exceeds half the plaque height', () => {
    expect(monthRackShellCornerRadius(32)).toBe(14);
    expect(monthRackShellCornerRadius(56)).toBe(14);
    expect(monthRackShellCornerRadius(184)).toBe(14);
  });

  it('monthRackBorderRadius caps corner radius for short racks', () => {
    expect(monthRackBorderRadius(TEMPORAL_MONTH_RACK_ROW_HEIGHT)).toBe(14);
    expect(monthRackBorderRadius(TEMPORAL_MONTH_RACK_ROW_HEIGHT * 5)).toBe(14);
  });

  it('monthRackPlaqueOutline rounds leading edge only and omits trailing padding', () => {
    const outline = monthRackPlaqueOutline(56, '#ccc', 1);
    expect(outline.outerRadius).toBe(14);
    expect(outline.innerRadius).toBe(13);
    expect(outline.outer).toEqual(
      expect.objectContaining({
        borderTopLeftRadius: 14,
        borderBottomLeftRadius: 14,
        borderTopRightRadius: 0,
        borderBottomRightRadius: 0,
        backgroundColor: '#ccc',
        paddingLeft: 1,
        paddingTop: 1,
        paddingBottom: 1,
        paddingRight: 0,
      }),
    );
    expect(outline.inner).toEqual(
      expect.objectContaining({
        borderTopLeftRadius: 13,
        borderBottomLeftRadius: 13,
        borderTopRightRadius: 0,
        borderBottomRightRadius: 0,
        overflow: 'hidden',
      }),
    );
  });

  it('monthRackExpandedHeight includes year header', () => {
    expect(monthRackExpandedHeight(2)).toBe(
      TEMPORAL_MONTH_RACK_YEAR_HEIGHT + 2 * TEMPORAL_MONTH_RACK_ROW_HEIGHT,
    );
  });

  it('monthRackEdgeAttachRadii rounds only the leading edge', () => {
    expect(monthRackEdgeAttachRadii(14)).toEqual({
      borderTopLeftRadius: 14,
      borderBottomLeftRadius: 14,
      borderTopRightRadius: 0,
      borderBottomRightRadius: 0,
    });
  });

  it('monthRackScrollOffsetForIndex', () => {
    expect(monthRackScrollOffsetForIndex(2)).toBe(2 * TEMPORAL_MONTH_RACK_ROW_HEIGHT);
  });

  it('monthRackIndexFromScrollOffset rounds to nearest row', () => {
    expect(monthRackIndexFromScrollOffset(0, 5)).toBe(0);
    expect(monthRackIndexFromScrollOffset(TEMPORAL_MONTH_RACK_ROW_HEIGHT * 2 + 4, 5)).toBe(2);
    expect(monthRackIndexFromScrollOffset(9999, 3)).toBe(2);
  });

  it('findMonthIndex falls back to 0', () => {
    expect(findMonthIndex(['2026-05', '2026-04'], '2026-04')).toBe(1);
    expect(findMonthIndex(['2026-05'], '2020-01')).toBe(0);
  });

  it('monthRackRowVisual emphasizes center row', () => {
    expect(monthRackRowVisual(0, false).opacity).toBe(1);
    expect(monthRackRowVisual(0, false).scale).toBe(1);
    expect(monthRackRowVisual(2, false).opacity).toBeLessThan(0.45);
  });

  it('monthRackLabelColor tiers by distance', () => {
    const chrome = { monthActive: 'active', monthNear: 'near', monthFar: 'far' };
    expect(monthRackLabelColor(0, chrome)).toBe('active');
    expect(monthRackLabelColor(1, chrome)).toBe('near');
    expect(monthRackLabelColor(3, chrome)).toBe('far');
  });
});
