import { groupMonthSummariesByYear, maxMonthThoughtCount } from '../temporalMapGroups';
import type { MonthSummary } from '../../types/temporal';

function summary(monthKey: string, count: number): MonthSummary {
  return {
    monthKey,
    count,
    newestCreatedAt: `${monthKey}-15T12:00:00.000Z`,
    newestEntryId: `id-${monthKey}`,
  };
}

describe('temporalMapGroups', () => {
  it('groupMonthSummariesByYear sorts years descending', () => {
    const groups = groupMonthSummariesByYear([
      summary('2025-11', 1),
      summary('2026-02', 3),
      summary('2026-05', 2),
      summary('2025-12', 4),
    ]);
    expect(groups.map((g) => g.year)).toEqual([2026, 2025]);
    expect(groups[0].months.map((m) => m.monthKey)).toEqual(['2026-02', '2026-05']);
    expect(groups[1].months.map((m) => m.monthKey)).toEqual(['2025-11', '2025-12']);
  });

  it('maxMonthThoughtCount', () => {
    expect(maxMonthThoughtCount([summary('2026-01', 2), summary('2026-02', 9)])).toBe(9);
  });
});
