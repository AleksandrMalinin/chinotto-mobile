import type { Entry } from '../../types/entry';
import { getEntriesOlderThan, getNewestEntryInMonth, getRecentEntries } from '../../storage/entryRepository';
import { loadStreamUntilEntryIncluded, resolveMonthJumpAnchor } from '../temporalJump';

jest.mock('../../storage/entryRepository', () => ({
  getRecentEntries: jest.fn(),
  getEntriesOlderThan: jest.fn(),
  getNewestEntryInMonth: jest.fn(),
}));

const mockRecent = jest.mocked(getRecentEntries);
const mockOlder = jest.mocked(getEntriesOlderThan);
const mockNewestInMonth = jest.mocked(getNewestEntryInMonth);

function entry(id: string, createdAt: string): Entry {
  return { id, text: 't', createdAt };
}

describe('resolveMonthJumpAnchor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses a cached stream row when month summary matches', async () => {
    const cached = entry('cached', '2026-03-15T00:00:00.000Z');
    const anchor = await resolveMonthJumpAnchor(
      '2026-03',
      [cached],
      [
        {
          monthKey: '2026-03',
          count: 2,
          newestCreatedAt: cached.createdAt,
          newestEntryId: cached.id,
        },
      ],
    );
    expect(anchor).toBe(cached);
    expect(mockNewestInMonth).not.toHaveBeenCalled();
  });

  it('falls back to SQLite when anchor is not loaded yet', async () => {
    const dbRow = entry('db', '2026-01-01T00:00:00.000Z');
    mockNewestInMonth.mockResolvedValueOnce(dbRow);
    const anchor = await resolveMonthJumpAnchor(
      '2026-01',
      [],
      [
        {
          monthKey: '2026-01',
          count: 1,
          newestCreatedAt: dbRow.createdAt,
          newestEntryId: dbRow.id,
        },
      ],
    );
    expect(anchor).toBe(dbRow);
    expect(mockNewestInMonth).toHaveBeenCalledWith('2026-01');
  });
});

describe('loadStreamUntilEntryIncluded', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns current when anchor already present', async () => {
    const current = [entry('a', '2026-05-01T00:00:00.000Z')];
    const anchor = entry('a', '2026-05-01T00:00:00.000Z');
    await expect(loadStreamUntilEntryIncluded(anchor, current)).resolves.toEqual(current);
    expect(mockRecent).not.toHaveBeenCalled();
  });

  it('prepends newer anchor', async () => {
    const current = [entry('b', '2026-04-01T00:00:00.000Z')];
    const anchor = entry('a', '2026-06-01T00:00:00.000Z');
    const merged = await loadStreamUntilEntryIncluded(anchor, current);
    expect(merged[0].id).toBe('a');
  });

  it('paginates older until anchor found', async () => {
    mockRecent.mockResolvedValueOnce([entry('top', '2026-05-01T00:00:00.000Z')]);
    mockOlder.mockResolvedValueOnce([entry('target', '2026-01-01T00:00:00.000Z')]);
    const current = [entry('top', '2026-05-01T00:00:00.000Z')];
    const anchor = entry('target', '2026-01-01T00:00:00.000Z');
    const merged = await loadStreamUntilEntryIncluded(anchor, current);
    expect(merged.some((e) => e.id === 'target')).toBe(true);
  });
});
