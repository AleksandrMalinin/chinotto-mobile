import type { Entry } from '../../types/entry';
import { mergeStreamTideEntries, pickStreamTideEntryIds } from '../streamTide';

function entry(id: string, iso: string): Entry {
  return { id, text: `thought ${id}`, createdAt: iso };
}

describe('streamTide', () => {
  const ref = new Date('2026-05-25T12:00:00.000Z');

  it('picks last opened and echo ids not from today', () => {
    const entries = [
      entry('new', '2026-05-25T10:00:00.000Z'),
      entry('old', '2026-05-10T10:00:00.000Z'),
      entry('echo', '2026-04-01T10:00:00.000Z'),
    ];
    const ids = pickStreamTideEntryIds(entries, {
      referenceDate: ref,
      lastOpenedId: 'old',
      echoCandidateIds: ['echo'],
      max: 2,
    });
    expect(ids).toEqual(['old', 'echo']);
  });

  it('skips cooldown and newest', () => {
    const entries = [
      entry('new', '2026-05-25T10:00:00.000Z'),
      entry('old', '2026-05-10T10:00:00.000Z'),
    ];
    const ids = pickStreamTideEntryIds(entries, {
      referenceDate: ref,
      lastOpenedId: 'new',
      cooldownIds: new Set(['old']),
    });
    expect(ids).toEqual([]);
  });

  it('merges tide rows after today block', () => {
    const entries = [
      entry('today', '2026-05-25T09:00:00.000Z'),
      entry('yesterday', '2026-05-24T09:00:00.000Z'),
      entry('tide', '2026-05-01T09:00:00.000Z'),
    ];
    const merged = mergeStreamTideEntries(entries, ['tide'], ref);
    expect(merged.map((e) => e.id)).toEqual(['today', 'tide', 'yesterday']);
  });
});
