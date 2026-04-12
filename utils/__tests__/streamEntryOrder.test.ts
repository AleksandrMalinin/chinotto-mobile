import type { Entry } from '../../types/entry';
import {
  chronologicallyNewestEntryId,
  compareEntriesStreamOrder,
  sortEntriesStreamOrder,
} from '../streamEntryOrder';

describe('streamEntryOrder', () => {
  const e = (id: string, createdAt: string, pinned?: boolean): Entry => ({
    id,
    text: id,
    createdAt,
    ...(pinned ? { pinned: true } : {}),
  });

  it('sorts pinned before unpinned, then newest-first', () => {
    const oldPin = e('p', '2025-01-01T00:00:00.000Z', true);
    const newUn = e('u', '2025-06-01T00:00:00.000Z');
    const sorted = sortEntriesStreamOrder([newUn, oldPin]);
    expect(sorted.map((x) => x.id)).toEqual(['p', 'u']);
  });

  it('among pinned, preserves newest-first (createdAt, id)', () => {
    const a = e('a', '2025-01-02T00:00:00.000Z', true);
    const b = e('b', '2025-01-03T00:00:00.000Z', true);
    expect(compareEntriesStreamOrder(a, b)).toBeGreaterThan(0);
    expect(sortEntriesStreamOrder([a, b]).map((x) => x.id)).toEqual(['b', 'a']);
  });

  it('chronologicallyNewestEntryId ignores pin', () => {
    const oldPin = e('p', '2025-01-01T00:00:00.000Z', true);
    const newUn = e('u', '2025-06-01T00:00:00.000Z');
    expect(chronologicallyNewestEntryId([oldPin, newUn])).toBe('u');
  });
});
