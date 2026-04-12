import type { Entry } from '../../types/entry';
import {
  buildStreamListModel,
  formatPinnedEntryTemporal,
  groupEntriesByDate,
  localDateKey,
} from '../groupEntriesByDate';

describe('groupEntriesByDate', () => {
  /** Fixed local “now” for stable buckets across machines. */
  const ref = new Date(2025, 5, 15, 12, 0, 0);

  it('groups Today, Yesterday, and older days', () => {
    const entries: Entry[] = [
      { id: '1', text: 'now', createdAt: new Date(2025, 5, 15, 10, 0, 0).toISOString() },
      { id: '2', text: 'earlier today', createdAt: new Date(2025, 5, 15, 8, 0, 0).toISOString() },
      { id: '3', text: 'yest', createdAt: new Date(2025, 5, 14, 18, 0, 0).toISOString() },
      { id: '4', text: 'old', createdAt: new Date(2025, 5, 10, 9, 0, 0).toISOString() },
    ];

    const groups = groupEntriesByDate(entries, ref);

    expect(groups.map((g) => g.label)).toEqual(['Today', 'Yesterday', expect.any(String)]);
    expect(groups[0].items.map((e) => e.id)).toEqual(['1', '2']);
    expect(groups[1].items.map((e) => e.id)).toEqual(['3']);
    expect(groups[2].items.map((e) => e.id)).toEqual(['4']);
  });

  it('omits empty sections', () => {
    const entries: Entry[] = [
      { id: '1', text: 'a', createdAt: new Date(2025, 5, 15, 10, 0, 0).toISOString() },
    ];
    const groups = groupEntriesByDate(entries, ref);
    expect(groups).toEqual([{ label: 'Today', items: entries }]);
  });

  it('sorts entries newest-first within each bucket', () => {
    const entries: Entry[] = [
      { id: 'a', text: 'older', createdAt: new Date(2025, 5, 15, 8, 0, 0).toISOString() },
      { id: 'b', text: 'newer', createdAt: new Date(2025, 5, 15, 10, 0, 0).toISOString() },
    ];
    const groups = groupEntriesByDate(entries, ref);
    expect(groups[0].items.map((e) => e.id)).toEqual(['b', 'a']);
  });

  it('buildStreamListModel: pinned lead then Today for unpinned (calendar order preserved)', () => {
    const today = new Date(2025, 5, 15, 10, 0, 0).toISOString();
    const olderPinned = new Date(2025, 5, 10, 9, 0, 0).toISOString();
    const entries: Entry[] = [
      { id: 'u-today', text: 'today', createdAt: today },
      { id: 'p-old', text: 'pin', createdAt: olderPinned, pinned: true },
    ];
    const { pinnedLead, dayGroups } = buildStreamListModel(entries, ref);
    expect(pinnedLead.map((e) => e.id)).toEqual(['p-old']);
    expect(dayGroups.map((g) => g.label)).toEqual(['Today']);
    expect(dayGroups[0].items.map((e) => e.id)).toEqual(['u-today']);
  });
});

describe('formatPinnedEntryTemporal', () => {
  const ref = new Date(2025, 5, 15, 12, 0, 0);

  it('labels today, yesterday, and older days consistently with stream sections', () => {
    const todayIso = new Date(2025, 5, 15, 10, 5, 0).toISOString();
    const yestIso = new Date(2025, 5, 14, 18, 40, 0).toISOString();
    const oldIso = new Date(2025, 5, 10, 9, 0, 0).toISOString();
    expect(formatPinnedEntryTemporal(todayIso, ref)).toMatch(/^Today/);
    expect(formatPinnedEntryTemporal(yestIso, ref)).toMatch(/^Yesterday/);
    expect(formatPinnedEntryTemporal(oldIso, ref)).toMatch(/Jun/);
    expect(formatPinnedEntryTemporal(oldIso, ref)).toMatch(/10/);
  });
});

describe('localDateKey', () => {
  it('uses local calendar day', () => {
    const d = new Date(2025, 5, 15, 23, 59);
    expect(localDateKey(d)).toBe('2025-06-15');
  });
});
