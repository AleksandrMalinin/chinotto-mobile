import type { Entry } from '../../types/entry';
import { getEntriesOlderThan, getRecentEntries } from '../../storage/entryRepository';
import { loadStreamUntilEntryIncluded } from '../temporalJump';

jest.mock('../../storage/entryRepository', () => ({
  getRecentEntries: jest.fn(),
  getEntriesOlderThan: jest.fn(),
}));

const mockRecent = jest.mocked(getRecentEntries);
const mockOlder = jest.mocked(getEntriesOlderThan);

function entry(id: string, createdAt: string): Entry {
  return { id, text: 't', createdAt };
}

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
