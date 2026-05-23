import type { Entry } from '../../types/entry';
import {
  buildMonthAnchorsFromEntries,
  formatMonthScrubberLabel,
  formatMonthThoughtCount,
  monthActivityRatio,
  monthKeyFromIso,
  pickVisibleMonthKeyFromAnchors,
  pickVisibleMonthKeyFromEntries,
  sortMonthSummariesNewestFirst,
} from '../streamMonthIndex';

function entry(id: string, createdAt: string): Entry {
  return { id, text: 'x', createdAt };
}

describe('streamMonthIndex', () => {
  it('monthKeyFromIso uses local calendar month', () => {
    const d = new Date(2026, 4, 15, 12, 0, 0);
    expect(monthKeyFromIso(d.toISOString())).toBe('2026-05');
  });

  it('formatMonthScrubberLabel omits year within reference year', () => {
    const label = formatMonthScrubberLabel('2026-03', '2026-05', 'en-US');
    expect(label).toMatch(/March/);
    expect(label).not.toMatch(/2026/);
  });

  it('formatMonthScrubberLabel includes year when crossing years', () => {
    const label = formatMonthScrubberLabel('2025-12', '2026-05', 'en-US');
    expect(label).toMatch(/2025/);
  });

  it('formatMonthThoughtCount uses calm copy', () => {
    expect(formatMonthThoughtCount(0)).toBeNull();
    expect(formatMonthThoughtCount(1)).toBe('1 thought');
    expect(formatMonthThoughtCount(3)).toBe('3 thoughts');
  });

  it('monthActivityRatio clamps to max', () => {
    expect(monthActivityRatio(5, 10)).toBe(0.5);
    expect(monthActivityRatio(20, 10)).toBe(1);
  });

  it('sortMonthSummariesNewestFirst', () => {
    const sorted = sortMonthSummariesNewestFirst([
      {
        monthKey: '2026-01',
        count: 1,
        newestCreatedAt: 'a',
        newestEntryId: 'a',
      },
      {
        monthKey: '2026-05',
        count: 2,
        newestCreatedAt: 'b',
        newestEntryId: 'b',
      },
    ]);
    expect(sorted[0].monthKey).toBe('2026-05');
  });

  it('buildMonthAnchorsFromEntries keeps first seen per month in stream order', () => {
    const anchors = buildMonthAnchorsFromEntries([
      entry('a', '2026-05-20T12:00:00.000Z'),
      entry('b', '2026-05-10T12:00:00.000Z'),
      entry('c', '2026-04-01T12:00:00.000Z'),
    ]);
    expect(anchors).toHaveLength(2);
    expect(anchors[0]).toMatchObject({ monthKey: '2026-05', firstEntryId: 'a' });
    expect(anchors[1]).toMatchObject({ monthKey: '2026-04', firstEntryId: 'c' });
  });

  it('pickVisibleMonthKeyFromAnchors chooses latest anchor above scroll', () => {
    const key = pickVisibleMonthKeyFromAnchors(
      [
        { monthKey: '2026-05', firstEntryId: 'a', contentOffsetY: 400 },
        { monthKey: '2026-04', firstEntryId: 'b', contentOffsetY: 100 },
      ],
      250,
    );
    expect(key).toBe('2026-04');
  });

  it('pickVisibleMonthKeyFromEntries respects offsets', () => {
    const entries = [
      entry('a', '2026-05-20T12:00:00.000Z'),
      entry('c', '2026-04-01T12:00:00.000Z'),
    ];
    const offsets = new Map([
      ['a', 300],
      ['c', 50],
    ]);
    expect(pickVisibleMonthKeyFromEntries(entries, 200, offsets, 0, 0)).toBe('2026-04');
  });
});
