import {
  findMonthIndex,
  monthRackIndexFromScrollOffset,
  monthRackLabelColor,
  monthRackRowVisual,
  monthRackScrollOffsetForIndex,
} from '../monthRack';
import { TEMPORAL_MONTH_RACK_ROW_HEIGHT } from '../../constants/temporalNavigation';

describe('monthRack', () => {
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
