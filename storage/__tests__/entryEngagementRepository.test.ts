import { getDatabase } from '../db';
import {
  getEchoCandidates,
  getEntryEngagement,
  recordEntryEdited,
  recordEntryOpened,
  resolveEchoCandidates,
} from '../entryEngagementRepository';

jest.mock('../db', () => ({
  getDatabase: jest.fn(),
}));

const mockGetDatabase = jest.mocked(getDatabase);

describe('entryEngagementRepository', () => {
  const runAsync = jest.fn();
  const getAllAsync = jest.fn();
  const getFirstAsync = jest.fn();

  const dbHandle = { runAsync, getAllAsync, getFirstAsync };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDatabase.mockResolvedValue(dbHandle as never);
    runAsync.mockResolvedValue({ changes: 1 });
    getAllAsync.mockResolvedValue([]);
    getFirstAsync.mockResolvedValue(null);
  });

  it('recordEntryOpened upserts open count', async () => {
    await recordEntryOpened('e1', new Date('2026-05-24T12:00:00.000Z'));

    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO entry_engagement'),
      'e1',
      '2026-05-24T12:00:00.000Z',
    );
  });

  it('recordEntryEdited upserts edit count', async () => {
    await recordEntryEdited('e1', new Date('2026-05-24T12:00:00.000Z'));

    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining('edit_count = edit_count + 1'),
      'e1',
      '2026-05-24T12:00:00.000Z',
    );
  });

  it('getEntryEngagement returns row or null', async () => {
    getFirstAsync.mockResolvedValueOnce({
      entryId: 'e1',
      openCount: 2,
      editCount: 1,
      lastOpenedAt: '2026-05-20T00:00:00.000Z',
      lastEditedAt: null,
    });

    await expect(getEntryEngagement('e1')).resolves.toEqual({
      entryId: 'e1',
      openCount: 2,
      editCount: 1,
      lastOpenedAt: '2026-05-20T00:00:00.000Z',
      lastEditedAt: null,
    });
  });

  it('getEchoCandidates maps join rows through selector', async () => {
    getAllAsync.mockResolvedValueOnce([
      {
        id: 'a',
        text: 'alpha',
        createdAt: '2025-01-01T00:00:00.000Z',
        openCount: 3,
        editCount: 0,
        lastOpenedAt: '2026-05-20T00:00:00.000Z',
        lastEditedAt: null,
      },
      {
        id: 'b',
        text: 'beta',
        createdAt: '2025-02-01T00:00:00.000Z',
        openCount: 0,
        editCount: 0,
        lastOpenedAt: null,
        lastEditedAt: null,
      },
      {
        id: 'c',
        text: 'gamma',
        createdAt: '2025-03-01T00:00:00.000Z',
        openCount: 0,
        editCount: 0,
        lastOpenedAt: null,
        lastEditedAt: null,
      },
    ]);

    const candidates = await getEchoCandidates(1);
    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.text.length).toBeGreaterThan(0);
  });

  it('resolveEchoCandidates uses stream fallback when DB is sparse', async () => {
    getAllAsync.mockResolvedValueOnce([]);

    const candidates = await resolveEchoCandidates({
      preferStreamFallback: true,
      fallbackEntries: [
        { id: 'a', text: 'one', createdAt: '2025-01-01T00:00:00.000Z' },
        { id: 'b', text: 'two', createdAt: '2025-02-01T00:00:00.000Z' },
      ],
    });
    expect(candidates).toHaveLength(1);
    expect(['a', 'b']).toContain(candidates[0]?.id);
  });

  it('resolveEchoCandidates uses stream fallback when DB read throws', async () => {
    getAllAsync.mockRejectedValueOnce(new Error('db unavailable'));

    const candidates = await resolveEchoCandidates({
      preferStreamFallback: true,
      fallbackEntries: [
        { id: 'a', text: 'alpha', createdAt: '2025-01-01T00:00:00.000Z' },
        { id: 'b', text: 'beta', createdAt: '2025-02-01T00:00:00.000Z' },
        { id: 'c', text: 'gamma', createdAt: '2025-03-01T00:00:00.000Z' },
      ],
    });
    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.id).toBeTruthy();
  });
});
